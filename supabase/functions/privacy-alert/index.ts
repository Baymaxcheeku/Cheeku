// privacy-alert: tells the Grievance Officer the moment someone opens a
// privacy request, so the 90-day clock is never discovered late.
//
// Called by a Supabase Database Webhook on INSERT into public.privacy_requests
// (Dashboard > Database > Webhooks). It sends one short email to the privacy
// inbox and nothing else.
//
// WHAT IT SENDS. The kind of request, when it came in, when the answer is
// due and the request id. Never what the person wrote and never who they
// are: those stay in the database, read through privacy_queue (0041).
//
// WITHOUT A MAIL KEY it does nothing and says so, so the webhook can be set up
// before the mail account exists. Requests are still in privacy_queue.
//
// Deploy:  supabase functions deploy privacy-alert --no-verify-jwt
//          From the dashboard instead: Edge Functions > Deploy a new function
//          > Via Editor, name privacy-alert, paste this file, turn JWT
//          verification OFF (the webhook secret below guards it).
// Secrets: PRIVACY_WEBHOOK_SECRET=<long random string>
//          RESEND_API_KEY=<from resend.com, with cheekuai.in verified>
//          (optional) PRIVACY_INBOX, default privacy@cheekuai.in
//          (optional) ALERT_FROM, default Cheeku AI <alerts@cheekuai.in>
// Webhook: table privacy_requests, event INSERT, type Supabase Edge Function,
//          header  x-webhook-secret: <the same string>

type Row = {
  id: string;
  kind: string;
  status: string;
  due_by: string;
  created_at: string;
};

const SECRET = Deno.env.get("PRIVACY_WEBHOOK_SECRET") ?? "";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const INBOX = Deno.env.get("PRIVACY_INBOX") ?? "privacy@cheekuai.in";
const FROM = Deno.env.get("ALERT_FROM") ?? "Cheeku AI <alerts@cheekuai.in>";

const KIND_LABEL: Record<string, string> = {
  access: "Access (how their data is used)",
  correction: "Correction",
  erasure: "Erasure",
  grievance: "Grievance",
  nomination: "Nomination",
  withdrawal: "Consent withdrawal",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Same length and every byte compared, so the secret cannot be guessed a character at a time. */
function sameSecret(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function longDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function message(row: Row): { subject: string; text: string } {
  const kind = KIND_LABEL[row.kind] ?? row.kind;
  const due = longDate(row.due_by);
  return {
    subject: `New privacy request: ${kind}, answer due ${due}`,
    text: [
      `A privacy request came in through the app.`,
      ``,
      `Kind: ${kind}`,
      `Received: ${longDate(row.created_at)}`,
      `Answer due by: ${due}`,
      `Request id: ${row.id}`,
      ``,
      `What they wrote and their account email are in the database, not in this email.`,
      `Supabase, SQL editor:`,
      `  select * from privacy_queue;`,
      `  select answer_privacy_request('${row.id}', 'in_progress', null, 'Athar');`,
      `  select answer_privacy_request('${row.id}', 'resolved', '<the reply they will read>', 'Athar');`,
      ``,
      `How to handle each kind: docs/privacy/requests.md in the repo.`,
    ].join("\n"),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!sameSecret(req.headers.get("x-webhook-secret") ?? "", SECRET)) return json({ error: "forbidden" }, 403);

  const payload = (await req.json().catch(() => null)) as { type?: string; table?: string; record?: Row } | null;
  const row = payload?.record;
  if (payload?.type !== "INSERT" || payload?.table !== "privacy_requests" || !row?.id) return json({ ok: true, skipped: "not_a_new_request" });

  if (!RESEND_KEY) return json({ ok: true, skipped: "no_mail_key" });

  const { subject, text } = message(row);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [INBOX], subject, text }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res?.ok) return json({ error: "mail_failed", status: res?.status ?? null }, 502);
  return json({ ok: true, sent: true });
});
