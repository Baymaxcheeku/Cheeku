// labstack-webhook, as ONE file for the Supabase dashboard editor (Edge Functions >
// Deploy a new function > Via Editor, name it "labstack-webhook", and turn OFF "Enforce JWT verification").
// Generated from labstack/validate.ts + labstack/partner.ts + labstack-webhook/index.ts. Don't edit here: change the source and
// run  node supabase/functions/labstack/bundle.mjs

/*
 * WHAT LABSTACK WILL ACCEPT, CHECKED BEFORE WE ASK.
 *
 * Every rule here is quoted from LabStack's API specs (docs/labstack-api).
 * The screens run these as the person types, and the gateway Edge Function
 * runs the same file again, so a person never meets a LabStack 400 and the
 * wording is always ours: what is wrong, and what to type instead.
 *
 * Pure: no imports from the app. The Edge Function copies this file as is.
 */

type Check = { ok: true; value: string } | { ok: false; error: string };

const ok = (value: string): Check => ({ ok: true, value });
const no = (error: string): Check => ({ ok: false, error });

/** 10 digits, not starting with 0. "+91", spaces and dashes are taken off first. */
function checkMobile(raw: string): Check {
  const d = raw.replace(/[\s-]/g, "").replace(/^\+?91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
  if (!d) return no("Add a mobile number.");
  if (!/^\d+$/.test(d)) return no("Only digits, please.");
  if (d.length !== 10) return no("A 10-digit mobile number.");
  if (d.startsWith("0")) return no("A 10-digit mobile number, without the 0 at the start.");
  return ok(d);
}

/** Exactly 6 digits. */
function checkPincode(raw: string): Check {
  const d = raw.replace(/\s/g, "");
  if (!d) return no("Add the pincode.");
  if (!/^\d{6}$/.test(d)) return no("A 6-digit pincode.");
  if (d.startsWith("0")) return no("Pincodes don't start with 0.");
  return ok(d);
}

/** Letters, digits and spaces; 1 to 50 after cleaning (LabStack strips the rest). */
function checkName(raw: string): Check {
  const v = raw.normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  if (!v) return no("Add a name.");
  if (v.length > 50) return no("Up to 50 letters.");
  return ok(v);
}

function checkEmail(raw: string): Check {
  const v = raw.trim().toLowerCase();
  if (!v) return no("Add an email address. Reports and receipts go there.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return no("That email doesn't look right.");
  return ok(v);
}

/** YYYY-MM-DD, a real date, not in the future, age 0 to 120. */
function checkDob(raw: string, today: Date = new Date()): Check {
  const v = raw.trim();
  if (!v) return no("Add the date of birth.");
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return no("Date of birth as YYYY-MM-DD.");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return no("That date doesn't exist.");
  if (d.getTime() > today.getTime()) return no("Date of birth can't be in the future.");
  if (ageOn(v, today) > 120) return no("Check the year.");
  return ok(v);
}

function ageOn(dob: string, today: Date = new Date()): number {
  const [y, mo, d] = dob.split("-").map(Number) as [number, number, number];
  let a = today.getFullYear() - y;
  if (today.getMonth() + 1 < mo || (today.getMonth() + 1 === mo && today.getDate() < d)) a--;
  return a;
}

type Gender = "MALE" | "FEMALE" | "OTHERS";

/** Our profile sex to LabStack's gender. Null: we have to ask (prefer not to say, or empty). */
function genderFrom(sex: string | null | undefined): Gender | null {
  return sex === "male" ? "MALE" : sex === "female" ? "FEMALE" : sex === "other" ? "OTHERS" : null;
}

type AddressParts = {
  unitFloorBuilding: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
};

/** The address as LabStack assembles it: "{unit}, {address}, {locality}, {city}, {state}". */
function joinAddress(a: Pick<AddressParts, "unitFloorBuilding" | "address" | "locality" | "city" | "state">): string {
  return [a.unitFloorBuilding, a.address, a.locality, a.city, a.state].map((s) => s.trim()).filter(Boolean).join(", ");
}

type AddressErrors = Partial<Record<keyof AddressParts | "whole", string>>;

/**
 * An address for a home service. `kind` sets the extra rule: lab home
 * collection wants the whole address 20 to 200 characters; pharmacy home
 * delivery caps the street line at 200.
 */
function checkAddress(a: AddressParts, kind: "lab" | "pharmacy" | "visit"): AddressErrors {
  const e: AddressErrors = {};
  if (!a.address.trim()) e.address = "Add the street and area.";
  else if (kind === "pharmacy" && a.address.trim().length > 200) e.address = "Up to 200 characters.";
  if (!a.city.trim()) e.city = "Add the city.";
  if (!a.state.trim()) e.state = "Add the state.";
  const pin = checkPincode(a.pincode);
  if (!pin.ok) e.pincode = pin.error;
  if (kind === "lab" && !e.address) {
    const n = joinAddress(a).length;
    if (n < 20) e.whole = "Add a little more: flat, building or a landmark, so the collector finds you.";
    else if (n > 200) e.whole = "The full address is over 200 characters. Shorten the street or landmark.";
  }
  return e;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** pdf, jpg, jpeg or png; at most 10 MB. */
function checkFile(fileName: string, bytes: number): Check {
  if (!/\.(pdf|jpe?g|png)$/i.test(fileName)) return no("A PDF, JPG or PNG, please.");
  if (bytes > MAX_FILE_BYTES) return no("That file is over 10 MB.");
  return ok(fileName);
}

/** Pharmacy: 1 to 100 of any one drug. */
function checkQuantity(n: number): Check {
  if (!Number.isInteger(n) || n < 1) return no("At least 1.");
  if (n > 100) return no("At most 100 of one medicine.");
  return ok(String(n));
}

/** Pharmacy search: at least 3 characters. */
function checkQuery(raw: string): Check {
  const v = raw.trim();
  return v.length >= 3 ? ok(v) : no("Type at least 3 letters.");
}

function checkLength(raw: string, max: number, what: string): Check {
  return raw.trim().length <= max ? ok(raw.trim()) : no(`${what}: up to ${max} characters.`);
}

/**
 * A picture link fit to show: https only (phones block plain http), with a
 * missing scheme added ("www.x.com/a.png"). Anything else is no picture.
 */
function imageUrl(raw: string | null | undefined): string | null {
  const u = (raw ?? "").trim();
  if (!u) return null;
  const withScheme = u.startsWith("//") ? `https:${u}` : /^[a-z]+:\/\//i.test(u) ? u.replace(/^http:\/\//i, "https://") : `https://${u}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "https:" && url.hostname.includes(".") && /\.(png|jpe?g|webp|gif)$|\/[^.]*$/i.test(url.pathname) ? url.toString() : null;
  } catch {
    return null;
  }
}

// Shared by the `labstack` gateway and the `labstack-webhook` receiver:
// the LabStack client, the service-role database helper, the mappers from
// LabStack's shapes to ours (src/lib/partner/types.ts), and the "pull the
// latest and save it" functions both of them use.
//
// Nothing in here trusts the caller. The gateway checks who is asking before
// it calls any of this; the webhook only ever uses an id to pull.


const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LS_BASE = (Deno.env.get("LABSTACK_BASE_URL") ?? "https://integration.labstack.in").replace(/\/+$/, "");
const LS_KEY = Deno.env.get("LABSTACK_API_KEY") ?? "";

type Code = "invalid" | "unavailable" | "unauthorized" | "busy" | "failed";

/** An error the app can show as is. Never carries the partner's name. */
class Fail extends Error {
  constructor(message: string, readonly code: Code = "failed", readonly status = 400) {
    super(message);
  }
}

// ------------------------------------------------------------- LabStack --

type Query = Record<string, string | number | boolean | null | undefined>;

/** One call to LabStack. Throws Fail with a message fit for the screen. */
async function ls<T>(method: "GET" | "POST", path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T & { _status: number }> {
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
async function db<T = unknown>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
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

const rows = <T>(table: string, query: string) => db<T[]>(`/rest/v1/${table}?${query}`);
const one = async <T>(table: string, query: string) => (await rows<T>(table, `${query}&limit=1`))[0] ?? null;
const insert = <T>(table: string, row: unknown) => db<T[]>(`/rest/v1/${table}`, { method: "POST", body: row, prefer: "return=representation" }).then((r) => r[0]);
const patch = (table: string, query: string, values: unknown) => db(`/rest/v1/${table}?${query}`, { method: "PATCH", body: values });
const remove = (table: string, query: string) => db(`/rest/v1/${table}?${query}`, { method: "DELETE" });
const rpc = <T>(fn: string, args: unknown) => db<T>(`/rest/v1/rpc/${fn}`, { method: "POST", body: args });

/** A stored file as base64, for prescriptions sent with an order. */
async function fileBase64(storagePath: string): Promise<string> {
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

type LabRow = {
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
async function refreshLab(row: LabRow): Promise<{ row: LabRow; details: LsLabDetails | null }> {
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

function labOrderOut(row: LabRow, d: LsLabDetails | null) {
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

const packOf = (d: { packQty: number | null; packUnit: string | null; packContainer: string | null }) =>
  [d.packQty ? `${d.packQty}` : "", d.packUnit ?? "", d.packContainer ? `in a ${d.packContainer.toLowerCase()}` : ""].filter(Boolean).join(" ") || "1 pack";

const itemOut = (i: LsItem) => ({
  drugMasterId: i.drugMasterId, name: i.name, pack: packOf(i), quantity: i.quantity, mrp: i.mrp ?? i.unitPrice, unitPrice: i.unitPrice, linePrice: i.linePrice,
  available: i.available ?? true, prescriptionRequired: i.prescriptionRequired ?? false,
});

const pickupOut = (p: LsPickup) => (p ? { address: [p.address, p.locality, p.city].filter(Boolean).join(", "), opens: p.openingTime, closes: p.closingTime } : null);

type PharmaRow = {
  id: string; user_id: string; profile_id: string; ls_order_id: number | null; pharmacy_name: string; order_type: "HOME_DELIVERY" | "PICKUP"; shipment_speed: string | null;
  status: string; items: ReturnType<typeof itemOut>[]; total: number; tracking_id: string | null; pickup: ReturnType<typeof pickupOut>; related: { lsOrderId: number; status: string }[];
  cancel_reason: string | null; placed_at: string;
};

async function refreshPharma(row: PharmaRow): Promise<PharmaRow> {
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

const pharmaOut = (row: PharmaRow) => ({
  orderId: row.id, lsOrderId: row.ls_order_id, status: row.status, orderType: row.order_type, pharmacyName: row.pharmacy_name, speed: row.shipment_speed,
  total: Number(row.total), items: row.items, trackingId: row.tracking_id, related: row.related, pickup: row.pickup, placedAt: row.placed_at,
  cancelReason: row.cancel_reason, profileId: row.profile_id,
});

// --------------------------------------------------------- consultations --

type ConsultRow = {
  id: string; user_id: string; profile_id: string; ls_appointment_id: number | null; doctor_name: string; speciality: string | null; appointment_type: string;
  meeting_type: "VIDEO" | "AUDIO_ONLY"; appointment_at: string; status: string; prescription_document_id: string | null;
};

async function refreshConsult(row: ConsultRow): Promise<ConsultRow> {
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

const consultOut = (row: ConsultRow) => ({
  appointmentId: row.id, lsAppointmentId: row.ls_appointment_id, status: row.status, type: row.appointment_type, meetingType: row.meeting_type, doctor: row.doctor_name,
  speciality: row.speciality, appointment: row.appointment_at, prescriptionDocumentId: row.prescription_document_id, profileId: row.profile_id,
});

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


const SIGNING_SECRET = Deno.env.get("LABSTACK_SIGNING_SECRET") ?? "";
const WEBHOOK_SECRET = Deno.env.get("LABSTACK_WEBHOOK_SECRET") ?? "";
const WEBHOOK_HEADER = (Deno.env.get("LABSTACK_WEBHOOK_HEADER") ?? "key").toLowerCase();

const reply = (body: unknown = { ok: true }, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

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
  if (req.method !== "POST") return reply({ error: "method" }, 405);
  const source = new URL(req.url).searchParams.get("source") ?? "";
  if (!["labs", "pharma", "provider"].includes(source)) return reply({ error: "source" }, 400);

  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.length > 256 * 1024) return reply({ error: "too large" }, 413);
  if (!(await verified(req, source, raw))) return reply({ error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return reply({ error: "bad json" }, 400);
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
  if (!/^\d{1,18}$/.test(ref)) return reply({ ignored: "no id" });
  if (!(await firstTime(kind, ref, event.slice(0, 200), status.slice(0, 100)))) return reply({ duplicate: true });

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
    return reply();
  } catch {
    // Forget this delivery so LabStack's retry is processed, and ask for one.
    await db(`/rest/v1/partner_events?source=eq.${kind}&ref=eq.${ref}&event=eq.${encodeURIComponent(event.slice(0, 200))}&status=eq.${encodeURIComponent(status.slice(0, 100))}`, { method: "DELETE" }).catch(() => undefined);
    return reply({ ok: false }, 503);
  }
});
