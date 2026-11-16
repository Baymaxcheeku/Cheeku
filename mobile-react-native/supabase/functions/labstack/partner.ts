// Shared by the `labstack` gateway and the `labstack-webhook` receiver:
// the LabStack client, the service-role database helper, the mappers from
// LabStack's shapes to ours (src/lib/partner/types.ts), and the "pull the
// latest and save it" functions both of them use.
//
// Nothing in here trusts the caller. The gateway checks who is asking before
// it calls any of this; the webhook only ever uses an id to pull.

import { imageUrl } from "./validate.ts";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
export const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LS_BASE = (Deno.env.get("LABSTACK_BASE_URL") ?? "https://integration.labstack.in").replace(/\/+$/, "");
const LS_KEY = Deno.env.get("LABSTACK_API_KEY") ?? "";

export type Code = "invalid" | "unavailable" | "unauthorized" | "busy" | "failed";

/** An error the app can show as is. Never carries the partner's name. */
export class Fail extends Error {
  constructor(message: string, readonly code: Code = "failed", readonly status = 400) {
    super(message);
  }
}

// ------------------------------------------------------------- LabStack --

type Query = Record<string, string | number | boolean | null | undefined>;

/** One call to LabStack. Throws Fail with a message fit for the screen. */
export async function ls<T>(method: "GET" | "POST", path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T & { _status: number }> {
  if (!LS_KEY) throw new Fail("Bookings aren't switched on yet.", "unavailable", 503);
  const url = new URL(LS_BASE + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "ls-api-key": LS_KEY, accept: "application/json", ...(opts.body ? { "content-type": "application/json" } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new Fail("The partner didn't answer in time. Try again in a minute.", "unavailable", 503);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) return { ...(data as T), _status: res.status };
  const said = typeof data.error === "string" ? data.error : typeof data.message === "string" ? data.message : "";
  const clean = said.replace(/labstack/gi, "partner").slice(0, 200);
  if (res.status === 401) throw new Fail("Bookings are paused for a moment. We're on it.", "unauthorized", 503);
  if (res.status === 429) throw new Fail("Too many tries. Give it a minute.", "busy", 429);
  if (res.status === 409) throw new Fail(clean || "This is already booked.", "invalid", 409);
  if (res.status === 403) throw new Fail(clean || "That isn't available right now.", "unavailable", 403);
  if (res.status >= 500) throw new Fail("The partner is having trouble. Try again in a few minutes.", "unavailable", 503);
  throw new Fail(clean || "Some details weren't accepted. Check them and try again.", "invalid", 400);
}

// ------------------------------------------------------------- database --

/** PostgREST and Storage with the service key. Only after the caller is checked. */
export async function db<T = unknown>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Fail("Couldn't save that. Try again.", "failed", 500);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const rows = <T>(table: string, query: string) => db<T[]>(`/rest/v1/${table}?${query}`);
export const one = async <T>(table: string, query: string) => (await rows<T>(table, `${query}&limit=1`))[0] ?? null;
export const insert = <T>(table: string, row: unknown) => db<T[]>(`/rest/v1/${table}`, { method: "POST", body: row, prefer: "return=representation" }).then((r) => r[0]);
export const patch = (table: string, query: string, values: unknown) => db(`/rest/v1/${table}?${query}`, { method: "PATCH", body: values });
export const remove = (table: string, query: string) => db(`/rest/v1/${table}?${query}`, { method: "DELETE" });
export const rpc = <T>(fn: string, args: unknown) => db<T>(`/rest/v1/rpc/${fn}`, { method: "POST", body: args });

/** A stored file as base64, for prescriptions sent with an order. */
export async function fileBase64(storagePath: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Fail("Couldn't read that record. Try a different one.", "invalid", 400);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) throw new Fail("That record is over 10 MB.", "invalid", 400);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function upload(storagePath: string, bytes: Uint8Array<ArrayBuffer>, mime: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/documents/${storagePath}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "content-type": mime, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Fail("Couldn't store the report.", "failed", 500);
}

// ------------------------------------------------------------------ labs --

export type LabRow = {
  id: string; user_id: string; profile_id: string; tests: string[]; status: string; ls_order_id: number | null; ls_status: string | null;
  order_type: "HOME_SAMPLE" | "CENTER_VISIT"; appointment_at: string | null; slot_date: string; lab_name: string | null; lab_logo: string | null; lab_address: string | null;
  phlebo: { name: string; phone: string | null; startedAt: string | null } | null; result_document_id: string | null; cancel_reason: string | null;
  report_values_at: string | null; notes: string | null;
};

type LsLabDetails = {
  orderId: number; orderType: "HOME_SAMPLE" | "CENTER_VISIT"; orderStatus: string; appointment: string; phleboName: string | null; phleboNumber: string | null;
  labName: string | null; labLogo: string | null; preparations: string | null; reports: { link: string; type: "FULL" | "PARTIAL" }[] | null; cancelReason: string | null; updatedAt: string | null;
};

/** Pull one lab order from LabStack, save what changed, file the report once it's out. */
export async function refreshLab(row: LabRow): Promise<{ row: LabRow; details: LsLabDetails | null }> {
  if (!row.ls_order_id) return { row, details: null };
  const r = await ls<{ orderDetails: LsLabDetails }>("GET", "/api/v1.3/order/getOrderDetails", { query: { orderId: row.ls_order_id } });
  const d = r.orderDetails;
  const phlebo = d.phleboName ? { name: d.phleboName, phone: d.phleboNumber, startedAt: d.orderStatus === "PHLEBO_STARTED" ? d.updatedAt : row.phlebo?.startedAt ?? null } : null;
  const changes = {
    ls_status: d.orderStatus,
    appointment_at: d.appointment ?? row.appointment_at,
    slot_date: (d.appointment ?? row.appointment_at ?? row.slot_date).slice(0, 10),
    lab_name: d.labName ?? row.lab_name,
    lab_logo: imageUrl(d.labLogo) ?? row.lab_logo,
    phlebo,
    cancel_reason: d.cancelReason ?? row.cancel_reason,
  };
  await patch("lab_bookings", `id=eq.${row.id}`, changes);
  let next: LabRow = { ...row, ...changes };

  let doc: string | null = row.result_document_id;
  if (d.orderStatus === "REPORT_DELIVERED" && !doc) doc = await fileLabReport(next, d).catch(() => null);
  if (d.orderStatus !== row.ls_status || doc !== row.result_document_id) {
    await rpc("apply_partner_lab_status", { p_id: row.id, p_ls_status: d.orderStatus, p_doc: doc });
    const fresh = await one<LabRow>("lab_bookings", `id=eq.${row.id}&select=*`);
    if (fresh) next = fresh;
  }
  return { row: next, details: d };
}

type RawValue = { testName: string; value: string; units: string | null; matchedRange: { color: "GREEN" | "YELLOW" | "RED"; low: number | null; high: number | null } | null; ranges: { low: number | null; high: number | null; color: string }[] | null };

/**
 * The report as a record: the PDF into Storage, a filed document, and each
 * value as an entity (harmonized by LabStack, so names and units are steady
 * across labs). The document trigger tells the family it's filed.
 */
async function fileLabReport(row: LabRow, d: LsLabDetails): Promise<string | null> {
  const full = (d.reports ?? []).findIndex((r) => r.type === "FULL");
  const reportId = full >= 0 ? full : 0;
  if (!(d.reports ?? []).length) return null;

  const pdf = await fetch(new URL(`${LS_BASE}/api/v1.3/order/getReport?orderId=${row.ls_order_id}&reportId=${reportId}`), {
    headers: { "ls-api-key": LS_KEY },
    signal: AbortSignal.timeout(30000),
  });
  if (!pdf.ok) return null;
  const path = `${row.user_id}/${row.profile_id}/lab-${row.id}.pdf`;
  await upload(path, new Uint8Array(await pdf.arrayBuffer()), "application/pdf");

  const tests = await rows<{ name: string }>("lab_tests", `id=in.(${row.tests.map(encodeURIComponent).join(",")})&select=name`).catch(() => []);
  const title = tests.map((t) => t.name).join(" + ").slice(0, 80) || "Lab report";
  const docRow = await insert<{ id: string }>("documents", {
    profile_id: row.profile_id, user_id: row.user_id, storage_path: path, mime_type: "application/pdf", doc_type: "lab_report", status: "filed",
    event_date: (row.appointment_at ?? row.slot_date).slice(0, 10), facility: row.lab_name, confidence: 1,
    raw_text: `Results from ${row.lab_name ?? "the lab"} for booking ${row.id}`,
    extraction: { title, source: "lab_partner", booking_id: row.id, partner: row.lab_name, ls_order_id: row.ls_order_id },
  });

  const values = await ls<{ testValues: RawValue[] }>("GET", "/api/v1.3/order/getReportRawValues", { query: { orderId: row.ls_order_id } })
    .then((r) => (r._status === 200 ? r.testValues ?? [] : []))
    .catch(() => [] as RawValue[]);
  const seen = new Set<string>();
  const entities = values.flatMap((v) => {
    const canonical = v.testName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
    if (!canonical || seen.has(canonical)) return [];
    seen.add(canonical);
    const n = Number(v.value);
    const range = v.ranges?.find((x) => x.color === "GREEN");
    const flag = !v.matchedRange ? null : v.matchedRange.color === "GREEN" ? "normal"
      : range && Number.isFinite(n) && range.high !== null && n > range.high ? "high"
      : range && Number.isFinite(n) && range.low !== null && n < range.low ? "low" : "caution";
    return [{
      profile_id: row.profile_id, user_id: row.user_id, document_id: docRow.id, kind: "lab_value", name: v.testName.slice(0, 120), canonical_name: canonical,
      value: Number.isFinite(n) ? n : null, value_text: Number.isFinite(n) ? null : v.value?.slice(0, 200) ?? null, unit: v.units, flag,
      ref_range: range ? [range.low, range.high].filter((x) => x !== null).join(" - ") || null : null, event_date: (row.appointment_at ?? row.slot_date).slice(0, 10),
    }];
  });
  if (entities.length) await db("/rest/v1/entities", { method: "POST", body: entities });
  if (values.length) await patch("lab_bookings", `id=eq.${row.id}`, { report_values_at: new Date().toISOString() });
  return docRow.id;
}

export function labOrderOut(row: LabRow, d: LsLabDetails | null) {
  return {
    bookingId: row.id,
    lsOrderId: row.ls_order_id,
    status: row.ls_status ?? "PENDING",
    orderType: row.order_type,
    appointment: row.appointment_at ?? `${row.slot_date}T08:00:00+05:30`,
    labName: row.lab_name,
    labLogo: row.lab_logo,
    labAddress: row.lab_address,
    phlebo: row.phlebo,
    preparations: d?.preparations ?? null,
    reports: d?.reports ?? [],
    resultDocumentId: row.result_document_id,
    cancelReason: row.cancel_reason,
  };
}

// -------------------------------------------------------------- pharmacy --

type LsPrice = { mrpTotal: number; subTotal: number; additionalCharges: number; totalAmount: number; items: LsItem[] };
type LsItem = { drugMasterId: string; name: string; packContainer: string | null; packQty: number | null; packUnit: string | null; quantity: number; mrp: number | null; unitPrice: number; linePrice: number; available?: boolean; prescriptionRequired?: boolean };
type LsPickup = { address: string; locality: string | null; city: string | null; openingTime: string | null; closingTime: string | null } | null;

export const packOf = (d: { packQty: number | null; packUnit: string | null; packContainer: string | null }) =>
  [d.packQty ? `${d.packQty}` : "", d.packUnit ?? "", d.packContainer ? `in a ${d.packContainer.toLowerCase()}` : ""].filter(Boolean).join(" ") || "1 pack";

export const itemOut = (i: LsItem) => ({
  drugMasterId: i.drugMasterId, name: i.name, pack: packOf(i), quantity: i.quantity, mrp: i.mrp ?? i.unitPrice, unitPrice: i.unitPrice, linePrice: i.linePrice,
  available: i.available ?? true, prescriptionRequired: i.prescriptionRequired ?? false,
});

export const pickupOut = (p: LsPickup) => (p ? { address: [p.address, p.locality, p.city].filter(Boolean).join(", "), opens: p.openingTime, closes: p.closingTime } : null);

export type PharmaRow = {
  id: string; user_id: string; profile_id: string; ls_order_id: number | null; pharmacy_name: string; order_type: "HOME_DELIVERY" | "PICKUP"; shipment_speed: string | null;
  status: string; items: ReturnType<typeof itemOut>[]; total: number; tracking_id: string | null; pickup: ReturnType<typeof pickupOut>; related: { lsOrderId: number; status: string }[];
  cancel_reason: string | null; placed_at: string;
};

export async function refreshPharma(row: PharmaRow): Promise<PharmaRow> {
  if (!row.ls_order_id) return row;
  const r = await ls<{ order: { orderStatus: string; shipmentSpeed: string | null; shipmentTrackingId: string | null; pharmacyName: string; pickupLocation: LsPickup; relatedOrders: { orderId: number; orderStatus: string }[] | null; totalAmount: number | null; cancelReason: string | null; price: LsPrice | null } }>(
    "GET", "/api/pharma/v1.0/order/getOrderDetails", { query: { orderId: row.ls_order_id } },
  );
  const o = r.order;
  const changes = {
    status: o.orderStatus, shipment_speed: o.shipmentSpeed, tracking_id: o.shipmentTrackingId, pharmacy_name: o.pharmacyName ?? row.pharmacy_name,
    pickup: pickupOut(o.pickupLocation), related: (o.relatedOrders ?? []).map((x) => ({ lsOrderId: x.orderId, status: x.orderStatus })),
    total: o.totalAmount ?? row.total, items: o.price ? o.price.items.map(itemOut) : row.items, cancel_reason: o.cancelReason, updated_at: new Date().toISOString(),
  };
  await patch("pharma_orders", `id=eq.${row.id}`, changes);
  return { ...row, ...changes };
}

export const pharmaOut = (row: PharmaRow) => ({
  orderId: row.id, lsOrderId: row.ls_order_id, status: row.status, orderType: row.order_type, pharmacyName: row.pharmacy_name, speed: row.shipment_speed,
  total: Number(row.total), items: row.items, trackingId: row.tracking_id, related: row.related, pickup: row.pickup, placedAt: row.placed_at,
  cancelReason: row.cancel_reason, profileId: row.profile_id,
});

// --------------------------------------------------------- consultations --

export type ConsultRow = {
  id: string; user_id: string; profile_id: string; ls_appointment_id: number | null; doctor_name: string; speciality: string | null; appointment_type: string;
  meeting_type: "VIDEO" | "AUDIO_ONLY"; appointment_at: string; status: string; prescription_document_id: string | null;
};

export async function refreshConsult(row: ConsultRow): Promise<ConsultRow> {
  if (!row.ls_appointment_id) return row;
  const r = await ls<{ appointmentDetails: { appointmentStatus: string; appointment: string; providerName: string; documents: { type: string; mime: string; link: string }[] | null } }>(
    "GET", "/api/v1.0/appointment/getAppointmentDetails", { query: { appointmentId: row.ls_appointment_id } },
  );
  const a = r.appointmentDetails;
  let doc = row.prescription_document_id;
  const rx = (a.documents ?? []).find((x) => x.type === "PRESCRIPTION");
  if (rx && !doc) doc = await fileConsultPrescription(row).catch(() => null);
  const changes = { status: a.appointmentStatus, appointment_at: a.appointment ?? row.appointment_at, doctor_name: a.providerName ?? row.doctor_name, prescription_document_id: doc, updated_at: new Date().toISOString() };
  await patch("consult_appointments", `id=eq.${row.id}`, changes);
  return { ...row, ...changes };
}

/** The doctor's prescription PDF, filed under the member like any record. */
async function fileConsultPrescription(row: ConsultRow): Promise<string | null> {
  const pdf = await fetch(`${LS_BASE}/api/v1.0/appointment/getPrescriptionPdf?appointmentId=${row.ls_appointment_id}`, { headers: { "ls-api-key": LS_KEY }, signal: AbortSignal.timeout(30000) });
  if (!pdf.ok) return null;
  const path = `${row.user_id}/${row.profile_id}/consult-${row.id}.pdf`;
  await upload(path, new Uint8Array(await pdf.arrayBuffer()), "application/pdf");
  const doc = await insert<{ id: string }>("documents", {
    profile_id: row.profile_id, user_id: row.user_id, storage_path: path, mime_type: "application/pdf", doc_type: "prescription", status: "filed",
    event_date: row.appointment_at.slice(0, 10), facility: row.doctor_name, extraction: { title: `Prescription from ${row.doctor_name}`, source: "consult_partner", appointment_id: row.id },
  });
  return doc.id;
}

export const consultOut = (row: ConsultRow) => ({
  appointmentId: row.id, lsAppointmentId: row.ls_appointment_id, status: row.status, type: row.appointment_type, meetingType: row.meeting_type, doctor: row.doctor_name,
  speciality: row.speciality, appointment: row.appointment_at, prescriptionDocumentId: row.prescription_document_id, profileId: row.profile_id,
});
