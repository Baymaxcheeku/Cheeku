// labstack: the app's one door to partner labs, pharmacies and doctors.
//
// The app sends { op, input } (src/lib/partner/labstack.ts) and gets back the
// shapes in src/lib/partner/types.ts. This function:
//   1. checks who is signed in (asked of Auth, never read from the body);
//   2. checks the family member is on their plan (covered_profile_ids);
//   3. checks every field again with the same rules the screens use
//      (validate.ts, a copy of src/lib/partner/validate.ts);
//   4. talks to LabStack with the API key, which never leaves this function;
//   5. keeps our own rows (lab_bookings, pharma_orders, consult_appointments,
//      instant_consults) so the family sees one history.
//
// Ownership: an order can only be read or changed by the account that placed
// it. Every lookup filters on user_id = caller.
//
// Deploy:  supabase functions deploy labstack   (JWT verification ON)
// Secrets: LABSTACK_API_KEY, LABSTACK_BASE_URL   (supabase secrets set ...)
// Needs:   migration 0045.

import {
  checkAddress, checkDob, checkEmail, checkLength, checkMobile, checkName, checkPincode, checkQuantity, checkQuery, imageUrl, joinAddress,
  type AddressParts,
} from "./validate.ts";
import {
  consultOut, Fail, fileBase64, SERVICE_KEY, SUPABASE_URL, insert, itemOut, labOrderOut, ls, one, packOf, patch, pharmaOut, pickupOut, refreshConsult, refreshLab, refreshPharma, remove, rows, rpc,
  type ConsultRow, type LabRow, type PharmaRow,
} from "./partner.ts";

const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body ?? null), { status, headers: { "content-type": "application/json", ...CORS } });
}

async function caller(authorization: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: authorization } });
  if (!res.ok) return null;
  const user = (await res.json().catch(() => null)) as { id?: string } | null;
  return typeof user?.id === "string" ? user.id : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_IST = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(\+05:30|Z)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- input --

type In = Record<string, unknown>;
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const ids = (v: unknown, max = 20) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, max) : []);
function uuid(v: unknown, what = "id"): string {
  if (typeof v !== "string" || !UUID.test(v)) throw new Fail(`That ${what} isn't valid.`, "invalid");
  return v;
}
function when(v: unknown): string {
  if (typeof v !== "string" || !ISO_IST.test(v)) throw new Fail("Pick a time again.", "invalid");
  if (Date.parse(v) < Date.now() - 5 * 60_000) throw new Fail("That time has passed. Pick another.", "invalid");
  return v;
}
function must<T>(c: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!c.ok) throw new Fail(c.error, "invalid");
  return c.value;
}

const loc = (q: In) => ({ pincode: str(q.pincode, 6) || undefined, latitude: num(q.latitude) ?? undefined, longitude: num(q.longitude) ?? undefined });

type PatientIn = { uniqueId: string; name: string; gender: string | null; dateOfBirth: string | null; age: number | null; mobile: string; email: string; altContact: string | null; mainUserUniqueId: string | null; relationship: string | null };

/** The patient block, checked field by field. Identity is the member, never a value from the body. */
function patientOf(v: unknown, profileId: string, holderId: string | null, needEmail: boolean) {
  const p = (v ?? {}) as Partial<PatientIn>;
  const gender = p.gender === "MALE" || p.gender === "FEMALE" || p.gender === "OTHERS" ? p.gender : null;
  if (!gender) throw new Fail("Pick male, female or other.", "invalid");
  const dob = p.dateOfBirth ? must(checkDob(p.dateOfBirth)) : null;
  if (!dob) throw new Fail("Add the date of birth.", "invalid");
  const mobile = must(checkMobile(p.mobile ?? ""));
  const email = needEmail || p.email ? must(checkEmail(p.email ?? "")) : "";
  const alt = p.altContact ? checkMobile(p.altContact) : null;
  const dependant = holderId && holderId !== profileId;
  return {
    uniqueId: profileId,
    name: must(checkName(p.name ?? "")),
    gender,
    dateOfBirth: dob,
    mobile,
    ...(email ? { email } : {}),
    ...(alt?.ok && alt.value !== mobile ? { altContact: alt.value } : {}),
    ...(dependant ? { mainUserUniqueId: holderId, relationship: typeof p.relationship === "string" ? p.relationship : "OTHER" } : {}),
  };
}

function addressOf(v: unknown, kind: "lab" | "pharmacy" | "visit") {
  const a = (v ?? {}) as Partial<AddressParts>;
  const parts: AddressParts = {
    unitFloorBuilding: str(a.unitFloorBuilding, 120), address: str(a.address, 200), locality: str(a.locality, 120), city: str(a.city, 80), state: str(a.state, 80),
    pincode: str(a.pincode, 6), latitude: num(a.latitude), longitude: num(a.longitude),
  };
  const e = checkAddress(parts, kind);
  const first = Object.values(e)[0];
  if (first) throw new Fail(first, "invalid");
  return { ...parts, latitude: parts.latitude ?? undefined, longitude: parts.longitude ?? undefined };
}

// ------------------------------------------------------------ the person --

type Ctx = { uid: string; covered: string[]; holderId: string | null };

async function context(uid: string): Promise<Ctx> {
  const covered = (await rpc<({ covered_profile_ids: string } | string)[]>("covered_profile_ids", { p_user_id: uid })).map((r) => (typeof r === "string" ? r : r.covered_profile_ids));
  const holder = await one<{ id: string }>("profiles", `user_id=eq.${uid}&is_primary=eq.true&select=id`).catch(() => null);
  return { uid, covered, holderId: holder?.id ?? null };
}

function member(ctx: Ctx, v: unknown): string {
  const id = uuid(v, "family member");
  if (!ctx.covered.includes(id)) throw new Fail("This family member isn't on your plan.", "unauthorized", 403);
  return id;
}

// ------------------------------------------------------------------ labs --

async function lsTests(testIds: string[]): Promise<{ testIds: string[]; packageIds: string[]; subtotal: number }> {
  if (!testIds.length) throw new Fail("Pick at least one test.", "invalid");
  const list = await rows<{ id: string; kind: string; ls_id: string | null; base_price: number }>("lab_tests", `id=in.(${testIds.map(encodeURIComponent).join(",")})&select=id,kind,ls_id,base_price`);
  if (list.length !== testIds.length || list.some((t) => !t.ls_id)) throw new Fail("Some of these tests can't be booked with the partner labs yet.", "unavailable");
  return {
    testIds: list.filter((t) => t.kind === "test").map((t) => t.ls_id!),
    packageIds: list.filter((t) => t.kind === "package").map((t) => t.ls_id!),
    subtotal: list.reduce((s, t) => s + t.base_price, 0),
  };
}

async function labRow(ctx: Ctx, v: unknown): Promise<LabRow> {
  const row = await one<LabRow>("lab_bookings", `id=eq.${uuid(v, "booking")}&user_id=eq.${ctx.uid}&select=*`);
  if (!row) throw new Fail("That booking isn't here.", "invalid", 404);
  return row;
}

const labs = {
  async serviceable(_: Ctx, q: In) {
    const t = await lsTests(ids(q.tests));
    const r = await ls<{ labs: { type: string[]; labName: string; lsLabId: number }[] }>("GET", "/api/v1.3/availability/checkServiceability", {
      query: { ...loc(q), service: str(q.service, 20) || undefined, testIds: t.testIds.join(","), packageIds: t.packageIds.join(",") },
    });
    return (r.labs ?? []).map((l) => ({ lsLabId: l.lsLabId, labName: l.labName, services: l.type }));
  },

  async slots(_: Ctx, q: In) {
    const date = str(q.date, 10);
    if (!DATE.test(date)) throw new Fail("Pick a day.", "invalid");
    const service = q.service === "CENTER_VISIT" ? "CENTER_VISIT" : "HOME_SAMPLE";
    const t = await lsTests(ids(q.tests));
    const fasting = num(q.fastingHours) ?? 0;
    const r = await ls<{ slots: { labName: string; labLogo: string | null; lsLabId: number; service: "HOME_SAMPLE" | "CENTER_VISIT"; timing: string[]; distance: number | null }[] }>("GET", "/api/v1.3/availability/getSlots", {
      query: { date, service, ...loc(q), labId: num(q.lsLabId) ?? undefined, testIds: t.testIds.join(","), packageIds: t.packageIds.join(",") },
    });
    const soon = Date.now() + 2 * 3600_000;
    return (r.slots ?? [])
      .map((s) => ({
        lsLabId: s.lsLabId, labName: s.labName, labLogo: imageUrl(s.labLogo), service: s.service, distanceKm: s.distance ?? null,
        times: (s.timing ?? []).filter((x) => Date.parse(`${date}T${x}:00+05:30`) > soon && !(fasting >= 8 && Number(x.slice(0, 2)) >= 11)),
      }))
      .filter((s) => s.times.length > 0);
  },

  async place(ctx: Ctx, q: In) {
    const profileId = member(ctx, q.profileId);
    const orderType = q.orderType === "CENTER_VISIT" ? "CENTER_VISIT" : "HOME_SAMPLE";
    const appointment = when(q.appointment);
    const tests = ids(q.tests);
    const t = await lsTests(tests);
    const patient = patientOf(q.patient, profileId, ctx.holderId, true);
    const address = orderType === "HOME_SAMPLE" ? addressOf(q.address, "lab") : { pincode: must(checkPincode(str((q.address as In | undefined)?.pincode, 6))) };
    const notes = must(checkLength(str(q.notes, 400), 300, "The note"));
    const lsLabId = num(q.lsLabId);
    const rx = typeof q.prescriptionDocumentId === "string" && UUID.test(q.prescriptionDocumentId) ? q.prescriptionDocumentId : null;

    // Our row first, so its id is the referenceId (lets us find the order if the call times out).
    const row = await insert<LabRow>("lab_bookings", {
      user_id: ctx.uid, profile_id: profileId, partner_id: "labstack", tests, subtotal: t.subtotal, collection_fee: 0, total: t.subtotal,
      slot_date: appointment.slice(0, 10), slot_window: null, appointment_at: appointment, order_type: orderType, ls_lab_id: lsLabId, ls_status: "PENDING",
      address: "unitFloorBuilding" in address ? joinAddress(address) : `Lab visit, ${address.pincode}`, address_parts: address, notes: notes || null,
      prescription_document_id: rx,
    });
    try {
      const r = await ls<{ order: { orderId: number; orderStatus: string; labName: string | null; labLogo: string | null; labAddress: string | null; labLocality: string | null; labCity: string | null; lsLabId: number | null } }>(
        "POST", "/api/v1.3/order/placeOrder", {
          body: {
            orderType, appointment, referenceId: row.id, testIds: t.testIds, packageIds: t.packageIds, ...(lsLabId ? { labId: lsLabId } : {}),
            ...patient, ...address, ...(notes ? { notes } : {}), isPaymentRequired: false,
          },
        },
      );
      const o = r.order;
      await patch("lab_bookings", `id=eq.${row.id}`, {
        ls_order_id: o.orderId, ls_status: o.orderStatus, ls_lab_id: o.lsLabId ?? lsLabId, lab_name: o.labName, lab_logo: imageUrl(o.labLogo),
        lab_address: [o.labAddress, o.labLocality, o.labCity].filter(Boolean).join(", ") || null,
      });
      return { bookingId: row.id };
    } catch (e) {
      await remove("lab_bookings", `id=eq.${row.id}`).catch(() => undefined);
      throw e;
    }
  },

  async order(ctx: Ctx, q: In) {
    const row = await labRow(ctx, q.bookingId);
    const { row: next, details } = await refreshLab(row);
    return labOrderOut(next, details);
  },

  async reschedule(ctx: Ctx, q: In) {
    const row = await labRow(ctx, q.bookingId);
    const appointment = when(q.appointment);
    if (!row.ls_order_id) throw new Fail("This booking can't be moved here.", "invalid");
    await ls("GET", "/api/v1.3/order/rescheduleOrder", { query: { orderId: row.ls_order_id, appointment } });
    await patch("lab_bookings", `id=eq.${row.id}`, { appointment_at: appointment, slot_date: appointment.slice(0, 10) });
    return null;
  },

  async cancel(ctx: Ctx, q: In) {
    const row = await labRow(ctx, q.bookingId);
    const reason = str(q.reason, 200);
    if (row.ls_order_id) await ls("GET", "/api/v1.3/order/cancelOrder", { query: { orderId: row.ls_order_id, reason } });
    await patch("lab_bookings", `id=eq.${row.id}`, { cancel_reason: reason || null });
    await rpc("apply_partner_lab_status", { p_id: row.id, p_ls_status: "CANCELED", p_doc: null });
    return null;
  },

  async escalate(ctx: Ctx, q: In) {
    const row = await labRow(ctx, q.bookingId);
    return escalate(ctx, "lab", row.id, row.ls_order_id, "/api/v1.3/order/escalation", "orderId", q);
  },
};

async function escalate(ctx: Ctx, kind: "lab" | "consult", ref: string, lsId: number | null, path: string, key: string, q: In) {
  const issue = str(q.issue, 60);
  const details = str(q.details, 500);
  if (!issue) throw new Fail("Pick what went wrong.", "invalid");
  if (details.length < 5) throw new Fail("Add a line on what happened.", "invalid");
  let lsEsc: number | null = null;
  if (lsId) {
    const r = await ls<{ escalation: { id: number } }>("POST", path, { body: { [key]: lsId, complaint: issue, severity: "MEDIUM", description: details } });
    lsEsc = r.escalation?.id ?? null;
  }
  await insert("partner_escalations", { user_id: ctx.uid, kind, ref, ls_escalation_id: lsEsc, issue, details });
  return null;
}

// -------------------------------------------------------------- pharmacy --

type LsDrug = { drugMasterId: string; name: string; saltCompositionName: string | null; prescriptionRequired: boolean; notForSale: boolean; packContainer: string | null; packQty: number | null; packUnit: string | null; pharmacies: { mrp: number | null; customerPrice: number | null }[] | null };

const drugOut = (d: LsDrug) => {
  const prices = (d.pharmacies ?? []).filter((p) => p.customerPrice !== null);
  const best = prices.sort((a, b) => (a.customerPrice ?? 0) - (b.customerPrice ?? 0))[0];
  return { drugMasterId: d.drugMasterId, name: d.name, salt: d.saltCompositionName, pack: packOf(d), prescriptionRequired: d.prescriptionRequired, notForSale: d.notForSale, price: best?.customerPrice ?? null, mrp: best?.mrp ?? null };
};

type LsPharmacy = { lsPharmacyId: number; pharmacyName: string; orderTypes: ("HOME_DELIVERY" | "PICKUP")[]; shipmentSpeeds: string[]; distance: number | null; pickupLocation: Parameters<typeof pickupOut>[0] };

function lines(v: unknown) {
  const list = Array.isArray(v) ? v : [];
  if (!list.length) throw new Fail("The cart is empty.", "invalid");
  if (list.length > 30) throw new Fail("Up to 30 medicines in one order.", "invalid");
  return list.map((l) => {
    const x = l as { drugMasterId?: unknown; quantity?: unknown };
    const drugMasterId = str(x.drugMasterId, 60);
    if (!drugMasterId) throw new Fail("A medicine in the cart isn't valid.", "invalid");
    return { drugMasterId, quantity: must(checkQuantity(Number(x.quantity))) };
  });
}

const orderTypeOf = (v: unknown) => (v === "PICKUP" ? "PICKUP" : "HOME_DELIVERY");
const speedOf = (v: unknown) => (v === "STANDARD" || v === "EXPRESS" || v === "SAME_DAY" || v === "PAN_INDIA" ? v : undefined);

async function pharmaRow(ctx: Ctx, v: unknown): Promise<PharmaRow> {
  const row = await one<PharmaRow>("pharma_orders", `id=eq.${uuid(v, "order")}&user_id=eq.${ctx.uid}&select=*`);
  if (!row) throw new Fail("That order isn't here.", "invalid", 404);
  return row;
}

const pharma = {
  async search(_: Ctx, q: In) {
    const query = must(checkQuery(str(q.query, 80)));
    const r = await ls<{ drugs: LsDrug[] }>("GET", "/api/pharma/v1.0/catalog/searchDrugs", { query: { query, pageSize: 20 } });
    return (r.drugs ?? []).map(drugOut);
  },

  async alternatives(_: Ctx, q: In) {
    const id = str(q.drugMasterId, 60);
    if (!id) throw new Fail("Pick a medicine.", "invalid");
    const r = await ls<{ alternatives: LsDrug[] }>("GET", "/api/pharma/v1.0/catalog/getAlternatives", { query: { drugMasterId: id, pageSize: 10 } });
    return (r.alternatives ?? []).map(drugOut);
  },

  async pharmacies(_: Ctx, q: In) {
    const r = await ls<{ pharmacies: LsPharmacy[] }>("GET", "/api/pharma/v1.0/network/checkServiceability", { query: { ...loc(q), orderType: orderTypeOf(q.orderType) } });
    return (r.pharmacies ?? []).map((p) => ({ lsPharmacyId: p.lsPharmacyId, name: p.pharmacyName, orderTypes: p.orderTypes, speeds: p.shipmentSpeeds, distanceKm: p.distance ?? null, pickup: pickupOut(p.pickupLocation) }));
  },

  async estimate(_: Ctx, q: In) {
    const lsPharmacyId = num(q.lsPharmacyId);
    if (!lsPharmacyId) throw new Fail("Pick a pharmacy.", "invalid");
    const orderType = orderTypeOf(q.orderType);
    const r = await ls<{ estimate: { lsPharmacyId: number; pharmacyName: string; orderType: "HOME_DELIVERY" | "PICKUP"; shipmentSpeed: string | null; shipmentSpeeds: string[] | null; allItemsAvailable: boolean; prescriptionRequired: boolean; price: { mrpTotal: number; subTotal: number; additionalCharges: number; totalAmount: number; items: Parameters<typeof itemOut>[0][] } } }>(
      "POST", "/api/pharma/v1.0/order/getEstimate", { body: { orderType, lsPharmacyId, drugs: lines(q.lines), ...loc(q), shipmentSpeed: speedOf(q.speed) } },
    );
    const e = r.estimate;
    return {
      lsPharmacyId: e.lsPharmacyId, pharmacyName: e.pharmacyName, orderType: e.orderType, speed: e.shipmentSpeed, speeds: e.shipmentSpeeds ?? [], allAvailable: e.allItemsAvailable,
      prescriptionRequired: e.prescriptionRequired, mrpTotal: e.price.mrpTotal, subTotal: e.price.subTotal, charges: e.price.additionalCharges, total: e.price.totalAmount,
      items: e.price.items.map(itemOut),
    };
  },

  async place(ctx: Ctx, q: In) {
    const profileId = member(ctx, q.profileId);
    const lsPharmacyId = num(q.lsPharmacyId);
    if (!lsPharmacyId) throw new Fail("Pick a pharmacy.", "invalid");
    const orderType = orderTypeOf(q.orderType);
    const drugs = lines(q.lines);
    const patient = patientOf(q.patient, profileId, ctx.holderId, false);
    const address = orderType === "HOME_DELIVERY" ? addressOf(q.address, "pharmacy") : { pincode: must(checkPincode(str((q.address as In | undefined)?.pincode, 6))) };
    const notes = must(checkLength(str(q.notes, 600), 500, "The note"));

    // Prescriptions: the member's own records only, as base64. HEIC isn't accepted by pharmacies.
    const docIds = ids(q.prescriptionDocumentIds, 5).filter((d) => UUID.test(d));
    const docs = docIds.length ? await rows<{ id: string; profile_id: string; storage_path: string; mime_type: string }>("documents", `id=in.(${docIds.join(",")})&select=id,profile_id,storage_path,mime_type`) : [];
    if (docs.some((d) => d.profile_id !== profileId)) throw new Fail("A prescription you picked belongs to someone else.", "invalid");
    if (docs.some((d) => d.mime_type === "image/heic")) throw new Fail("One prescription is a HEIC photo. Pick a PDF, JPG or PNG copy.", "invalid");
    const documents = await Promise.all(docs.map(async (d) => ({ content: await fileBase64(d.storage_path), fileName: `prescription-${d.id.slice(0, 8)}.${d.mime_type === "application/pdf" ? "pdf" : d.mime_type === "image/png" ? "png" : "jpg"}` })));

    const row = await insert<PharmaRow>("pharma_orders", {
      user_id: ctx.uid, profile_id: profileId, ls_pharmacy_id: lsPharmacyId, pharmacy_name: "Partner pharmacy", order_type: orderType, shipment_speed: speedOf(q.speed) ?? null,
      status: "PENDING", prescription_document_ids: docs.map((d) => d.id),
    });
    try {
      const r = await ls<{ order: { orderId: number; orderStatus: string; pharmacyName: string; shipmentSpeed: string | null; pharmaSuperOrderId: number | null; pickupLocation: Parameters<typeof pickupOut>[0]; price: { totalAmount: number; items: Parameters<typeof itemOut>[0][] } | null } }>(
        "POST", "/api/pharma/v1.0/order/placeOrder", {
          body: { orderType, lsPharmacyId, drugs, referenceId: row.id, ...patient, altNumber: (patient as { altContact?: string }).altContact, ...address, shipmentSpeed: speedOf(q.speed), ...(notes ? { notes } : {}), isPaymentRequired: false, ...(documents.length ? { documents } : {}) },
        },
      );
      const o = r.order;
      await patch("pharma_orders", `id=eq.${row.id}`, {
        ls_order_id: o.orderId, ls_super_order_id: o.pharmaSuperOrderId, status: o.orderStatus, pharmacy_name: o.pharmacyName, shipment_speed: o.shipmentSpeed,
        pickup: pickupOut(o.pickupLocation), items: (o.price?.items ?? []).map(itemOut), total: o.price?.totalAmount ?? 0,
      });
      return { orderId: row.id };
    } catch (e) {
      await remove("pharma_orders", `id=eq.${row.id}`).catch(() => undefined);
      throw e;
    }
  },

  async order(ctx: Ctx, q: In) {
    return pharmaOut(await refreshPharma(await pharmaRow(ctx, q.orderId)));
  },

  async orders(ctx: Ctx) {
    const list = await rows<PharmaRow>("pharma_orders", `user_id=eq.${ctx.uid}&profile_id=in.(${ctx.covered.join(",") || "00000000-0000-0000-0000-000000000000"})&select=*&order=placed_at.desc&limit=50`);
    return list.map(pharmaOut);
  },

  async cancel(ctx: Ctx, q: In) {
    const row = await pharmaRow(ctx, q.orderId);
    const reason = str(q.reason, 200);
    if (row.ls_order_id) await ls("POST", "/api/pharma/v1.0/order/cancelOrder", { body: { orderId: row.ls_order_id, reason } });
    await patch("pharma_orders", `id=eq.${row.id}`, { status: "CANCELLED", cancel_reason: reason || null, updated_at: new Date().toISOString() });
    return null;
  },
};

// --------------------------------------------------------- consultations --

/** Due tests arrive as names ("HbA1c", "Lipid profile"); the partner wants its own test ids. Unknown names are dropped. */
async function suggestedLsIds(names: string[]): Promise<string[]> {
  const out = new Set<string>();
  for (const raw of names) {
    const n = raw.replace(/[^a-zA-Z0-9 ()-]/g, "").trim().slice(0, 60);
    if (n.length < 3) continue;
    const hit = await one<{ ls_id: string | null }>("lab_tests", `ls_id=not.is.null&or=(name.ilike.*${encodeURIComponent(n)}*,keywords.cs.{${encodeURIComponent(`"${n.toLowerCase()}"`)}})&select=ls_id`).catch(() => null);
    if (hit?.ls_id) out.add(hit.ls_id);
  }
  return [...out];
}

const apptType = (v: unknown) => (v === "CENTER_VISIT" || v === "HOME_VISIT" ? v : "ONLINE");

async function consultRow(ctx: Ctx, v: unknown): Promise<ConsultRow> {
  const row = await one<ConsultRow>("consult_appointments", `id=eq.${uuid(v, "appointment")}&user_id=eq.${ctx.uid}&select=*`);
  if (!row) throw new Fail("That appointment isn't here.", "invalid", 404);
  return row;
}

const consult = {
  async specialities() {
    const r = await ls<{ specialities: { name: string; providerCount: number }[] }>("GET", "/api/v1.0/availability/getSpecialities", { query: { providerType: "Doctor" } });
    return (r.specialities ?? []).map((s) => ({ name: s.name, count: s.providerCount }));
  },

  async providers(ctx: Ctx, q: In) {
    type Providers = { providers: { lsId: number; name: string; gender: string | null; specialities: string[]; languagesKnown: string[] | null; yearsExperience: number | null; rating: number | null; totalRatings: number | null; supportedAppointmentTypes: string[]; profileUrl: string | null; locality: string | null; city: string | null; distance: number | null; followUpUntil: string | null }[] };
    const query = { providerType: "Doctor", appointmentType: apptType(q.type), speciality: str(q.speciality, 80) || undefined, ...loc(q), perPage: 30 };
    /*
     * userUniqueId only adds follow-up windows for someone LabStack already
     * knows. A family that has never booked isn't registered there yet, and
     * LabStack refuses the whole list ("No user found with the given
     * userUniqueId"), so the doctor list was empty for every new family
     * (found 2026-11-17). Ask again without it: the list is the same.
     */
    let r: Providers;
    try {
      r = await ls<Providers>("GET", "/api/v1.0/availability/getProviders", { query: { ...query, userUniqueId: ctx.holderId ?? undefined } });
    } catch (e) {
      if (!(ctx.holderId && e instanceof Fail && /no user found/i.test(e.message))) throw e;
      r = await ls<Providers>("GET", "/api/v1.0/availability/getProviders", { query });
    }
    return (r.providers ?? []).map((p) => ({
      lsId: p.lsId, name: p.name, gender: p.gender, specialities: p.specialities ?? [], languages: p.languagesKnown ?? [], years: p.yearsExperience, rating: p.rating, ratings: p.totalRatings ?? 0,
      types: p.supportedAppointmentTypes ?? [], photo: imageUrl(p.profileUrl), place: [p.locality, p.city].filter(Boolean).join(", ") || null, distanceKm: p.distance ?? null, followUpUntil: p.followUpUntil,
    }));
  },

  async slots(_: Ctx, q: In) {
    const date = str(q.date, 10);
    if (!DATE.test(date)) throw new Fail("Pick a day.", "invalid");
    const lsProviderId = num(q.lsProviderId);
    if (!lsProviderId) throw new Fail("Pick a doctor.", "invalid");
    const r = await ls<{ slots: { lsId: number; providerName: string; timing: { startTime: string; endTime: string }[] }[] }>("GET", "/api/v1.0/availability/getAppointmentSlots", {
      query: { providerType: "Doctor", appointmentType: apptType(q.type), date, providerIds: lsProviderId, ...loc(q) },
    });
    const soon = Date.now() + 30 * 60_000;
    return (r.slots ?? []).map((s) => ({ lsId: s.lsId, name: s.providerName, times: (s.timing ?? []).filter((t) => Date.parse(t.startTime) > soon).map((t) => ({ start: t.startTime, end: t.endTime })) }));
  },

  async book(ctx: Ctx, q: In) {
    const profileId = member(ctx, q.profileId);
    const lsProviderId = num(q.lsProviderId);
    if (!lsProviderId) throw new Fail("Pick a doctor.", "invalid");
    const appointmentType = apptType(q.appointmentType);
    const appointment = when(q.appointment);
    const meetingType = q.meetingType === "AUDIO_ONLY" ? "AUDIO_ONLY" : "VIDEO";
    const patient = patientOf(q.patient, profileId, ctx.holderId, true);
    const address = appointmentType === "HOME_VISIT" ? addressOf(q.address, "visit") : {};
    const notes = must(checkLength(str(q.notes, 600), 500, "The note"));
    const couponCode = str(q.couponCode, 40);
    const referenceId = crypto.randomUUID();

    const r = await ls<{ appointment: { appointmentId: number; appointmentStatus: string; providerName: string } }>("POST", "/api/v1.0/appointment/bookAppointment", {
      body: {
        lsProviderId, appointmentType, appointment, referenceId, meetingType, ...patient, ...address, ...(notes ? { notes } : {}), ...(couponCode ? { couponCode } : {}),
        storeSuggestedTestIds: await suggestedLsIds(ids(q.suggestedTestIds, 6)), isPaymentRequired: false,
      },
    });
    const a = r.appointment;
    const speciality = str(q.speciality, 80) || null;
    let row: ConsultRow;
    try {
      row = await insert<ConsultRow>("consult_appointments", {
        id: referenceId, user_id: ctx.uid, profile_id: profileId, ls_appointment_id: a.appointmentId, ls_provider_id: lsProviderId, doctor_name: a.providerName ?? "Doctor",
        speciality, appointment_type: appointmentType, meeting_type: meetingType, appointment_at: appointment, status: a.appointmentStatus,
      });
    } catch (e) {
      // Booked with them but not saved with us: undo theirs rather than leave a visit nobody can see.
      await ls("GET", "/api/v1.0/appointment/cancelAppointment", { query: { appointmentId: a.appointmentId, reason: "Could not be saved" } }).catch(() => undefined);
      throw e;
    }

    // Reports the person chose to share go with the visit. Best effort: the booking stands either way.
    const share = ids(q.shareDocumentIds, 5).filter((d) => UUID.test(d));
    if (share.length) {
      const docs = await rows<{ id: string; profile_id: string; storage_path: string; mime_type: string; doc_type: string }>("documents", `id=in.(${share.join(",")})&select=id,profile_id,storage_path,mime_type,doc_type`).catch(() => []);
      const mine = docs.filter((d) => d.profile_id === profileId && d.mime_type !== "image/heic");
      const documents = await Promise.all(mine.map(async (d) => ({
        content: await fileBase64(d.storage_path), fileName: `${d.doc_type}-${d.id.slice(0, 8)}.${d.mime_type === "application/pdf" ? "pdf" : d.mime_type === "image/png" ? "png" : "jpg"}`,
        docType: d.doc_type === "prescription" ? "PRIOR_PRESCRIPTION" : "OTHER",
      }))).catch(() => []);
      if (documents.length) await ls("POST", "/api/v1.0/appointment/uploadDocument", { body: { appointmentId: a.appointmentId, documents } }).catch(() => undefined);
    }
    return { appointmentId: row.id };
  },

  async appointment(ctx: Ctx, q: In) {
    return consultOut(await refreshConsult(await consultRow(ctx, q.appointmentId)));
  },

  async meetingLink(ctx: Ctx, q: In) {
    const row = await consultRow(ctx, q.appointmentId);
    if (!row.ls_appointment_id) throw new Fail("There's no call for this visit.", "invalid");
    const r = await ls<{ meetingLink: string; windowStart: string | null; windowEnd: string | null }>("GET", "/api/v1.0/appointment/getAuthenticatedMeetingLink", { query: { appointmentId: row.ls_appointment_id, participantType: "MAIN_PARTICIPANT" } });
    return { link: r.meetingLink, opensAt: r.windowStart, closesAt: r.windowEnd };
  },

  async reschedule(ctx: Ctx, q: In) {
    const row = await consultRow(ctx, q.appointmentId);
    const appointment = when(q.appointment);
    if (!row.ls_appointment_id) throw new Fail("This visit can't be moved here.", "invalid");
    const r = await ls<{ appointment: { appointmentStatus: string } }>("GET", "/api/v1.0/appointment/rescheduleAppointment", { query: { appointmentId: row.ls_appointment_id, appointmentTime: appointment } });
    await patch("consult_appointments", `id=eq.${row.id}`, { appointment_at: appointment, status: r.appointment?.appointmentStatus ?? "RESCHEDULED", updated_at: new Date().toISOString() });
    return null;
  },

  async cancel(ctx: Ctx, q: In) {
    const row = await consultRow(ctx, q.appointmentId);
    const reason = str(q.reason, 200);
    if (row.ls_appointment_id) await ls("GET", "/api/v1.0/appointment/cancelAppointment", { query: { appointmentId: row.ls_appointment_id, reason } });
    await patch("consult_appointments", `id=eq.${row.id}`, { status: "CANCELED", cancel_reason: reason || null, updated_at: new Date().toISOString() });
    return null;
  },

  async escalate(ctx: Ctx, q: In) {
    const row = await consultRow(ctx, q.appointmentId);
    return escalate(ctx, "consult", row.id, row.ls_appointment_id, "/api/v1.0/appointment/escalation", "appointmentId", q);
  },

  async instant(ctx: Ctx, q: In) {
    const profileId = member(ctx, q.profileId);
    const p = patientOf(q.patient, profileId, ctx.holderId, false);
    const notes = must(checkLength(str(q.notes, 1200), 1000, "The note"));
    if (!notes) throw new Fail("Add a line on what's going on.", "invalid");
    const c = (q.context ?? {}) as In;
    const clinicalContext = Object.fromEntries(
      (["chiefComplaint", "allergies", "medications", "bloodGroup", "briefHistory"] as const).map((k) => [k, str(c[k], 500)]).filter(([, v]) => v),
    );
    const r = await ls<{ status: string; requestId: number; expiresAt: string | null }>("POST", "/api/v1.0/consult/createInstant", {
      body: { name: p.name, mobile: p.mobile, gender: p.gender, dateOfBirth: p.dateOfBirth, uniqueId: profileId, notes, ...(Object.keys(clinicalContext).length ? { clinicalContext } : {}) },
    });
    await db_upsertInstant({ ls_request_id: r.requestId, user_id: ctx.uid, profile_id: profileId, status: r.status ?? "BROADCASTING", expires_at: r.expiresAt });
    return { requestId: String(r.requestId), status: r.status ?? "BROADCASTING", expiresAt: r.expiresAt, meetingLink: null, appointmentId: null };
  },

  async instantStatus(ctx: Ctx, q: In) {
    const id = await instantId(ctx, q.requestId);
    const r = await ls<{ status: "BROADCASTING" | "CLAIMED" | "EXPIRED" | "CANCELED"; expiresAt: string | null; appointmentId: number | null; meetingLink: string | null }>("GET", "/api/v1.0/consult/getInstantStatus", { query: { requestId: id } });
    await patch("instant_consults", `ls_request_id=eq.${id}`, { status: r.status, ls_appointment_id: r.appointmentId, updated_at: new Date().toISOString() });
    return { requestId: String(id), status: r.status, expiresAt: r.expiresAt, meetingLink: r.meetingLink, appointmentId: r.appointmentId ? String(r.appointmentId) : null };
  },

  async cancelInstant(ctx: Ctx, q: In) {
    const id = await instantId(ctx, q.requestId);
    await ls("POST", "/api/v1.0/consult/cancelInstant", { body: { requestId: id } });
    await patch("instant_consults", `ls_request_id=eq.${id}`, { status: "CANCELED", updated_at: new Date().toISOString() });
    return null;
  },
};

async function instantId(ctx: Ctx, v: unknown): Promise<number> {
  const id = Number(v);
  if (!Number.isInteger(id) || id <= 0) throw new Fail("That request isn't valid.", "invalid");
  const row = await one<{ ls_request_id: number }>("instant_consults", `ls_request_id=eq.${id}&user_id=eq.${ctx.uid}&select=ls_request_id`);
  if (!row) throw new Fail("That request isn't here.", "invalid", 404);
  return id;
}

const db_upsertInstant = (row: unknown) => upsert("instant_consults", row);

// ------------------------------------------------------------ catalogue --

/**
 * Link our lab catalogue to the partner's. Run by the owner from the Supabase
 * dashboard (Edge Functions > labstack > Test, role service_role, body
 * {"op":"admin.syncCatalogue","input":{"pincode":"560038"}}). Never by an app user.
 *
 *  - Tests: ours get `ls_id` when the partner has one with the same name or
 *    alias (case and punctuation ignored). Price stays ours until the payment
 *    model is settled; the partner's bill is what counts.
 *  - Packages: brought in as our own rows (`ls-pkg-…`) with the partner's
 *    price, so they can be booked live.
 * Returns what matched and what didn't, so the gaps can be fixed by hand.
 */
async function syncCatalogue(input: In) {
  const pincode = str(input.pincode, 6) || "560038";
  const norm = (x: string) => x.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const [t, pk, ours] = await Promise.all([
    ls<{ tests: { lsId: string; name: string; aliases: string[] | null }[] }>("GET", "/api/v1.3/network/getTests", { query: { pincode } }),
    ls<{ packages: { packageId: string; packageName: string; displayName: string | null; description: string | null; price: number; maxMrp: number | null; tat: number | null; sampleType: string[] | null; tests: { testName: string; lsTestId: string }[] | null; tags: { tagName: string }[] | null }[] }>("GET", "/api/v1.3/network/getPackages", { query: { pincode } }),
    rows<{ id: string; name: string; kind: string; keywords: string[] }>("lab_tests", "select=id,name,kind,keywords&id=not.like.ls-pkg-*"),
  ]);
  const byName = new Map<string, string>();
  for (const x of t.tests ?? []) for (const n of [x.name, ...(x.aliases ?? [])]) if (n && !byName.has(norm(n))) byName.set(norm(n), x.lsId);

  const linked: string[] = [];
  const missing: string[] = [];
  for (const o of ours.filter((r) => r.kind === "test")) {
    const hit = [o.name, o.id, ...(o.keywords ?? [])].map((n) => byName.get(norm(n))).find(Boolean);
    if (hit) {
      await patch("lab_tests", `id=eq.${encodeURIComponent(o.id)}`, { ls_id: hit, synced_at: new Date().toISOString() });
      await upsert("lab_offers", { partner_id: "labstack", test_id: o.id, price: await basePrice(o.id), mrp: await basePrice(o.id) });
      linked.push(o.name);
    } else missing.push(o.name);
  }

  const lsToOurs = new Map<string, string>();
  for (const o of await rows<{ id: string; ls_id: string | null }>("lab_tests", "select=id,ls_id&ls_id=not.is.null")) if (o.ls_id) lsToOurs.set(o.ls_id, o.id);
  let packages = 0;
  for (const p of (pk.packages ?? []).slice(0, 300)) {
    const price = Math.round(p.price);
    if (!(price > 0)) continue;
    const id = `ls-pkg-${p.packageId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
    const name = (p.displayName || p.packageName).slice(0, 120);
    await upsert("lab_tests", {
      id, name, kind: "package", categories: (p.tags ?? []).map((x) => x.tagName).slice(0, 6), sample: (p.sampleType ?? ["Blood"]).join(", ") || "Blood",
      fasting_hours: /fasting|lipid|glucose|sugar/i.test(name) ? 10 : 0, parameters: Math.max(1, (p.tests ?? []).length),
      includes: (p.tests ?? []).map((x) => lsToOurs.get(x.lsTestId)).filter((x): x is string => Boolean(x)), about: (p.description ?? name).slice(0, 600),
      keywords: [norm(name)], base_price: price, popular: false, ls_id: p.packageId, synced_at: new Date().toISOString(),
    });
    await upsert("lab_offers", { partner_id: "labstack", test_id: id, price, mrp: Math.max(price, Math.round(p.maxMrp ?? price)) });
    packages++;
  }
  return { tests: { partner: (t.tests ?? []).length, linked: linked.length, notFound: missing }, packages };
}

const prices = new Map<string, number>();
async function basePrice(id: string): Promise<number> {
  if (!prices.has(id)) prices.set(id, (await one<{ base_price: number }>("lab_tests", `id=eq.${encodeURIComponent(id)}&select=base_price`))?.base_price ?? 1);
  return prices.get(id)!;
}

const upsert = (table: string, row: unknown) =>
  fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(row),
  }).then((r) => {
    if (!r.ok) throw new Fail(`Couldn't save ${table}.`);
  });

// ---------------------------------------------------------------- owner --

/** Same length and every byte equal, without stopping early (no timing hints). */
function same(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Owner-only upkeep (the catalogue sync). Either:
 *  - header x-admin-token equal to the LABSTACK_ADMIN_TOKEN secret (a long
 *    password the owner makes up; used from the dashboard's Test panel), or
 *  - the service role key itself (scripts, the CLI).
 * App users never have either.
 */
const ADMIN_TOKEN = Deno.env.get("LABSTACK_ADMIN_TOKEN") ?? "";
function isOwner(req: Request, authorization: string): boolean {
  const token = req.headers.get("x-admin-token") ?? "";
  if (ADMIN_TOKEN.length >= 16 && token && same(token, ADMIN_TOKEN)) return true;
  return Boolean(SERVICE_KEY) && same(authorization, `Bearer ${SERVICE_KEY}`);
}

// ----------------------------------------------------------------- serve --

type Op = (ctx: Ctx, input: In) => Promise<unknown>;
const OPS: Record<string, Op> = {};
for (const [group, table] of Object.entries({ labs, pharma, consult } as Record<string, Record<string, Op>>)) {
  for (const [name, fn] of Object.entries(table)) OPS[`${group}.${name}`] = fn;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  const body = (await req.json().catch(() => null)) as { op?: unknown; input?: unknown } | null;

  // Owner-only upkeep, with the service role key (never in the app).
  if (body?.op === "admin.syncCatalogue") {
    if (!isOwner(req, authorization)) {
      return json({ error: "Not allowed. Add the header x-admin-token with the value of your LABSTACK_ADMIN_TOKEN secret (GO-LIVE.md, step 4).", code: "unauthorized" }, 403);
    }
    try {
      return json(await syncCatalogue((body.input ?? {}) as In));
    } catch (e) {
      return json({ error: e instanceof Fail ? e.message : "Sync failed.", code: "failed" }, 500);
    }
  }

  const uid = await caller(authorization);
  if (!uid) return json({ error: "Sign in again to continue.", code: "unauthorized" }, 401);

  const op = typeof body?.op === "string" ? OPS[body.op] : undefined;
  if (!op) return json({ error: "Unknown request.", code: "invalid" }, 400);

  try {
    const ctx = await context(uid);
    return json(await op(ctx, (body?.input ?? {}) as In));
  } catch (e) {
    if (e instanceof Fail) return json({ error: e.message, code: e.code }, e.status);
    return json({ error: "That didn't go through. Try again.", code: "failed" }, 500);
  }
});
