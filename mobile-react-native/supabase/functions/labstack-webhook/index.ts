// labstack-webhook: LabStack tells us something changed; we check it came
// from them, note it once, and pull the truth from the API.
//
// One URL per kind, so each can be registered where LabStack asks for it:
//   .../functions/v1/labstack-webhook?source=labs       Diagnostics Webhook URL
//   .../functions/v1/labstack-webhook?source=pharma     pharmacy webhook URL
//   .../functions/v1/labstack-webhook?source=provider   appointment + instant consult webhook URL
//
// VERIFY. Provider deliveries are signed: x-labstack-signature = hex
// HMAC-SHA256 of the raw body with LABSTACK_SIGNING_SECRET. Labs and pharmacy
// deliveries carry the store key agreed with LabStack in a header (`key`
// unless LabStack set another, see LABSTACK_WEBHOOK_HEADER), compared with
// LABSTACK_WEBHOOK_SECRET. If a signature is present on any kind, it is
// checked too. Anything that fails is refused before it is read.
//
// ONCE. Delivery is at least once. partner_events is unique on
// (source, ref, event, status); a repeat is acknowledged and dropped.
//
// PULL, DON'T TRUST. The body only says which order changed. Status,
// reports and links are read from the API (partner.ts refresh*), the same
// code the app uses, so a forged or stale body can't move anything.
//
// Deploy:  supabase functions deploy labstack-webhook --no-verify-jwt
//          (LabStack has no Supabase login; the checks above replace it)

import { db, one, patch, refreshConsult, refreshLab, refreshPharma, type ConsultRow, type LabRow, type PharmaRow } from "../labstack/partner.ts";

const SIGNING_SECRET = Deno.env.get("LABSTACK_SIGNING_SECRET") ?? "";
const WEBHOOK_SECRET = Deno.env.get("LABSTACK_WEBHOOK_SECRET") ?? "";
const WEBHOOK_HEADER = (Deno.env.get("LABSTACK_WEBHOOK_HEADER") ?? "key").toLowerCase();

const ok = (body: unknown = { ok: true }, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

async function hmacHex(secret: string, body: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verified(req: Request, source: string, raw: Uint8Array<ArrayBuffer>): Promise<boolean> {
  const signature = req.headers.get("x-labstack-signature");
  if (signature) {
    if (!SIGNING_SECRET) return false;
    if (!same(signature.toLowerCase(), await hmacHex(SIGNING_SECRET, raw))) return false;
    return true;
  }
  if (source === "provider") return false; // provider deliveries are always signed
  const key = req.headers.get(WEBHOOK_HEADER);
  return Boolean(WEBHOOK_SECRET && key && same(key, WEBHOOK_SECRET));
}

/** True the first time this exact change arrives. */
async function firstTime(source: string, ref: string, event: string, status: string): Promise<boolean> {
  const res = await db<unknown[]>("/rest/v1/partner_events?on_conflict=source,ref,event,status", {
    method: "POST",
    body: { source, ref, event, status },
    prefer: "resolution=ignore-duplicates,return=representation",
  });
  return Array.isArray(res) && res.length > 0;
}

const done = (source: string, ref: string, event: string, status: string, error: string | null) =>
  patch("partner_events", `source=eq.${source}&ref=eq.${encodeURIComponent(ref)}&event=eq.${encodeURIComponent(event)}&status=eq.${encodeURIComponent(status)}`, {
    processed_at: new Date().toISOString(),
    error,
  }).catch(() => undefined);

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok({ error: "method" }, 405);
  const source = new URL(req.url).searchParams.get("source") ?? "";
  if (!["labs", "pharma", "provider"].includes(source)) return ok({ error: "source" }, 400);

  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.length > 256 * 1024) return ok({ error: "too large" }, 413);
  if (!(await verified(req, source, raw))) return ok({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return ok({ error: "bad json" }, 400);
  }

  // Which thing changed, and what to call this delivery.
  let kind = source;
  let ref = "";
  let event = "";
  let status = "";
  if (source === "labs") {
    ref = String(body.orderId ?? "");
    event = Array.isArray(body.events) ? (body.events as string[]).slice().sort().join(",") : "STATUS_CHANGED";
    status = String(body.orderStatus ?? "");
  } else if (source === "pharma") {
    ref = String(body.orderId ?? "");
    event = String(body.event ?? "orderStatus");
    status = String(body.orderStatus ?? body.paymentStatus ?? "");
  } else if (body.requestId !== undefined) {
    kind = "instant";
    ref = String(body.requestId);
    event = String(body.event ?? "");
    status = String(body.ts ?? "");
  } else {
    ref = String(body.appointmentId ?? "");
    event = String(body.event ?? body.appointmentStatus ?? "update");
    status = String(body.appointmentStatus ?? body.ts ?? "");
  }
  if (!/^\d{1,18}$/.test(ref)) return ok({ ignored: "no id" });
  if (!(await firstTime(kind, ref, event.slice(0, 200), status.slice(0, 100)))) return ok({ duplicate: true });

  try {
    if (kind === "labs") {
      const row = await one<LabRow>("lab_bookings", `ls_order_id=eq.${ref}&select=*`);
      if (row) await refreshLab(row);
    } else if (kind === "pharma") {
      const row = await one<PharmaRow>("pharma_orders", `ls_order_id=eq.${ref}&select=*`);
      if (row) await refreshPharma(row);
    } else if (kind === "instant") {
      // The app polls getInstantStatus while it waits; this just keeps our row honest for later.
      const next = event === "consult.claimed" ? "CLAIMED" : event === "consult.expired" ? "EXPIRED" : event === "consult.canceled" ? "CANCELED" : event === "consult.doctor_no_show" ? "BROADCASTING" : null;
      if (next) await patch("instant_consults", `ls_request_id=eq.${ref}`, { status: next, ls_appointment_id: body.appointmentId ?? null, updated_at: new Date().toISOString() });
      if (body.appointmentId && (event === "consult.completed" || event === "prescription.ready")) {
        const row = await one<ConsultRow>("consult_appointments", `ls_appointment_id=eq.${Number(body.appointmentId)}&select=*`);
        if (row) await refreshConsult(row);
      }
    } else {
      const row = await one<ConsultRow>("consult_appointments", `ls_appointment_id=eq.${ref}&select=*`);
      if (row) await refreshConsult(row);
    }
    await done(kind, ref, event.slice(0, 200), status.slice(0, 100), null);
    return ok();
  } catch {
    // Forget this delivery so LabStack's retry is processed, and ask for one.
    await db(`/rest/v1/partner_events?source=eq.${kind}&ref=eq.${ref}&event=eq.${encodeURIComponent(event.slice(0, 200))}&status=eq.${encodeURIComponent(status.slice(0, 100))}`, { method: "DELETE" }).catch(() => undefined);
    return ok({ ok: false }, 503);
  }
});
