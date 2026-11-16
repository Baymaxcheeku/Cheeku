import { startsAt, useAppointments, whenLabel } from "@/lib/booking/appointments";
import { DOCTORS, SPECIALTIES, doctorById } from "@/lib/booking/catalog";
import { bookLab, cancelLab } from "@/lib/labs/queries";
import { WINDOWS, type SlotWindow } from "@/lib/labs/logic";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";

import type { LabStack } from "./labstack";
import { PartnerError, type Consult, type Drug, type InstantStatus, type LabOrder, type LabStatus, type PharmaOrder, type PharmaStatus, type Pharmacy, type PriceLine } from "./types";
import { joinAddress } from "./validate";

/*
 * PREVIEW: LabStack's shapes, our sample data, nothing booked with anyone.
 *
 * Runs until EXPO_PUBLIC_LABSTACK=live. Lab orders still go through our own
 * `create_lab_booking` so the booking, its timeline and the result filing
 * work end to end today; pharmacy orders and instant consults are kept on
 * the phone; doctor visits use the sample doctors and the appointments
 * store, exactly as before. Every screen says "Preview" where money or a
 * real partner would be involved.
 */

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const DAY = 864e5;

// ------------------------------------------------------------------ labs --

/** "08:15" times a preview lab offers on a day, never in the next two hours, mornings only when fasting. */
function labTimes(date: string, fastingHours: number, home: boolean): string[] {
  const all = home ? ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "11:00", "16:00", "16:30", "17:00", "17:30"] : ["08:00", "09:00", "10:00", "11:00", "12:00", "15:00", "16:00", "17:00", "18:00"];
  const now = Date.now();
  return all.filter((t) => {
    const at = Date.parse(`${date}T${t}:00+05:30`);
    if (at < now + 2 * 36e5) return false;
    if (fastingHours >= 8 && Number(t.slice(0, 2)) >= 11) return false;
    return true;
  });
}

/** The old two-hour window a preview time falls in, for create_lab_booking. */
function windowFor(time: string): SlotWindow {
  const h = Number(time.slice(0, 2));
  return (h < 8 ? WINDOWS[0] : h < 10 ? WINDOWS[1] : h < 12 ? WINDOWS[2] : WINDOWS[3]) as SlotWindow;
}

const OLD_TO_LS: Record<string, LabStatus> = { booked: "ORDER_SCHEDULED", assigned: "PHLEBO_ASSIGNED", collected: "SAMPLE_COLLECTED", processing: "SAMPLE_PROCESSED", ready: "REPORT_DELIVERED", cancelled: "CANCELED" };

async function partners(): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase.from("lab_partners").select("id, name").order("name");
  return (data ?? []).map((p) => ({ id: String(p.id), name: String(p.name) }));
}

type LabMeta = { appointment?: string; orderType?: "HOME_SAMPLE" | "CENTER_VISIT"; escalations?: { issue: string; details: string; at: string }[]; cancelReason?: string };
const labMetaKey = (id: string) => `cheeku.preview.lab.${id}`;
async function labMeta(id: string): Promise<LabMeta> {
  try {
    return JSON.parse((await kv.get(labMetaKey(id))) ?? "{}") as LabMeta;
  } catch {
    return {};
  }
}
async function setLabMeta(id: string, patch: LabMeta) {
  await kv.set(labMetaKey(id), JSON.stringify({ ...(await labMeta(id)), ...patch }));
}

// -------------------------------------------------------------- pharmacy --

const D = (id: string, name: string, salt: string, pack: string, mrp: number, price: number, rx = false, notForSale = false): Drug => ({ drugMasterId: id, name, salt, pack, prescriptionRequired: rx, notForSale, price, mrp });

/** Sample catalogue by salt. No real brand names: these are illustrative packs. */
const DRUGS: Drug[] = [
  D("PV-MET500-15", "Metformin 500 mg tablet", "Metformin (500mg)", "Strip of 15 tablets", 45, 38, true),
  D("PV-MET500-G", "Metformin 500 mg tablet (generic)", "Metformin (500mg)", "Strip of 15 tablets", 28, 22, true),
  D("PV-MET1000-10", "Metformin 1000 mg SR tablet", "Metformin (1000mg)", "Strip of 10 tablets", 62, 54, true),
  D("PV-TEL40-15", "Telmisartan 40 mg tablet", "Telmisartan (40mg)", "Strip of 15 tablets", 120, 102, true),
  D("PV-TEL40-G", "Telmisartan 40 mg tablet (generic)", "Telmisartan (40mg)", "Strip of 15 tablets", 64, 51, true),
  D("PV-AML5-15", "Amlodipine 5 mg tablet", "Amlodipine (5mg)", "Strip of 15 tablets", 52, 44, true),
  D("PV-ATO10-15", "Atorvastatin 10 mg tablet", "Atorvastatin (10mg)", "Strip of 15 tablets", 98, 83, true),
  D("PV-ATO10-G", "Atorvastatin 10 mg tablet (generic)", "Atorvastatin (10mg)", "Strip of 15 tablets", 49, 39, true),
  D("PV-ROS10-10", "Rosuvastatin 10 mg tablet", "Rosuvastatin (10mg)", "Strip of 10 tablets", 160, 136, true),
  D("PV-LEV50-100", "Levothyroxine 50 mcg tablet", "Levothyroxine (50mcg)", "Bottle of 100 tablets", 190, 171, true),
  D("PV-PAN40-15", "Pantoprazole 40 mg tablet", "Pantoprazole (40mg)", "Strip of 15 tablets", 140, 112, true),
  D("PV-PCM650-15", "Paracetamol 650 mg tablet", "Paracetamol (650mg)", "Strip of 15 tablets", 34, 30),
  D("PV-CET10-10", "Cetirizine 10 mg tablet", "Cetirizine (10mg)", "Strip of 10 tablets", 22, 19),
  D("PV-VD3-60K-4", "Vitamin D3 60,000 IU sachet", "Cholecalciferol (60000IU)", "Box of 4 sachets", 140, 126),
  D("PV-IFA-30", "Iron and folic acid tablet", "Ferrous ascorbate + Folic acid", "Strip of 30 tablets", 150, 128),
  D("PV-AZI500-3", "Azithromycin 500 mg tablet", "Azithromycin (500mg)", "Strip of 3 tablets", 120, 104, true),
  D("PV-MON10-10", "Montelukast 10 mg tablet", "Montelukast (10mg)", "Strip of 10 tablets", 210, 178, true),
  D("PV-GLI1-15", "Glimepiride 1 mg tablet", "Glimepiride (1mg)", "Strip of 15 tablets", 72, 61, true),
  D("PV-ALP025-15", "Alprazolam 0.25 mg tablet", "Alprazolam (0.25mg)", "Strip of 15 tablets", 40, 34, true, true),
];

const PHARMACIES: Pharmacy[] = [
  { lsPharmacyId: 9001, name: "Partner pharmacy, Indiranagar", orderTypes: ["HOME_DELIVERY", "PICKUP"], speeds: ["STANDARD", "SAME_DAY"], distanceKm: 1.2, pickup: { address: "12th Main, Indiranagar, Bengaluru 560038", opens: "08:00", closes: "22:00" } },
  { lsPharmacyId: 9002, name: "Partner pharmacy, HSR Layout", orderTypes: ["HOME_DELIVERY"], speeds: ["STANDARD", "EXPRESS"], distanceKm: 5.4, pickup: null },
];

const PHARMA_KEY = "cheeku.preview.pharma";
async function pharmaOrders(): Promise<PharmaOrder[]> {
  try {
    return JSON.parse((await kv.get(PHARMA_KEY)) ?? "[]") as PharmaOrder[];
  } catch {
    return [];
  }
}
async function savePharma(list: PharmaOrder[]) {
  await kv.set(PHARMA_KEY, JSON.stringify(list.slice(0, 20)));
}

/** A preview order moves on by the clock: placed, confirmed, shipped, delivered. */
function pharmaStatus(o: PharmaOrder): PharmaStatus {
  if (o.status === "CANCELLED") return o.status;
  const mins = (Date.now() - Date.parse(o.placedAt)) / 6e4;
  return mins < 2 ? "PLACED" : mins < 15 ? "CONFIRMED" : mins < 120 ? "SHIPPED" : "FULL_DELIVERED";
}

function priceLines(lines: { drugMasterId: string; quantity: number }[]): PriceLine[] {
  return lines.map((l) => {
    const d = DRUGS.find((x) => x.drugMasterId === l.drugMasterId);
    const unit = d?.price ?? 0;
    return { drugMasterId: l.drugMasterId, name: d?.name ?? l.drugMasterId, pack: d?.pack ?? "", quantity: l.quantity, mrp: d?.mrp ?? unit, unitPrice: unit, linePrice: unit * l.quantity, available: Boolean(d && !d.notForSale), prescriptionRequired: Boolean(d?.prescriptionRequired) };
  });
}

// --------------------------------------------------------- consultations --

const lsOfDoctor = (i: number) => 1001 + i;
const doctorOfLs = (ls: number) => DOCTORS[ls - 1001];

const INSTANT_KEY = "cheeku.preview.instant";
type InstantRow = { requestId: string; createdAt: string; cancelled?: boolean };

export const preview: LabStack = {
  labs: {
    async serviceable(q) {
      await wait();
      if (!q.pincode && q.latitude == null) throw new PartnerError("Add a pincode to see labs that come to you.", "invalid");
      return (await partners()).map((p, i) => ({ lsLabId: 5001 + i, labName: p.name, services: ["HOME_SAMPLE", "CENTER_VISIT"] }));
    },
    async slots(q) {
      await wait();
      const list = await partners();
      return list
        .map((p, i) => ({ lsLabId: 5001 + i, labName: p.name, labLogo: null, service: q.service, times: labTimes(q.date, q.fastingHours, q.service === "HOME_SAMPLE"), distanceKm: q.service === "CENTER_VISIT" ? 1.5 + i * 1.7 : null }))
        .filter((s) => (q.lsLabId ? s.lsLabId === q.lsLabId : true) && s.times.length > 0);
    },
    async place(input) {
      const partnerId = input.partnerId ?? (await partners())[0]?.id;
      if (!partnerId) throw new PartnerError("No lab is set up for the preview.", "unavailable");
      const time = input.appointment.slice(11, 16);
      const r = await bookLab({ profileId: input.profileId, partnerId, tests: input.tests, date: input.appointment.slice(0, 10), window: windowFor(time), address: joinAddress(input.address) + `, ${input.address.pincode}`, prescriptionId: input.prescriptionDocumentId });
      if (!r.ok) throw new PartnerError(r.message, "invalid");
      await setLabMeta(r.id, { appointment: input.appointment, orderType: input.orderType });
      return { bookingId: r.id };
    },
    async order(bookingId) {
      const { data } = await supabase.from("lab_bookings").select("*, lab_partners(name)").eq("id", bookingId).maybeSingle();
      if (!data) throw new PartnerError("That booking isn't here.", "invalid");
      const meta = await labMeta(bookingId);
      const status = OLD_TO_LS[String(data.status)] ?? "ORDER_SCHEDULED";
      const assigned = ["PHLEBO_ASSIGNED", "SAMPLE_COLLECTED", "SAMPLE_PROCESSED", "REPORT_DELIVERED"].includes(status);
      const order: LabOrder = {
        bookingId,
        lsOrderId: null,
        status,
        orderType: meta.orderType ?? "HOME_SAMPLE",
        appointment: meta.appointment ?? `${data.slot_date}T07:00:00+05:30`,
        labName: (data.lab_partners as { name?: string } | null)?.name ?? null,
        labLogo: null,
        labAddress: null,
        phlebo: assigned && meta.orderType !== "CENTER_VISIT" ? { name: "Ravi K. (sample)", phone: "9800000000", startedAt: null } : null,
        preparations: null,
        reports: [],
        resultDocumentId: (data.result_document_id as string | null) ?? null,
        cancelReason: meta.cancelReason ?? null,
      };
      return order;
    },
    async reschedule(bookingId, appointment) {
      await wait();
      await setLabMeta(bookingId, { appointment });
      await supabase.from("lab_bookings").update({ slot_date: appointment.slice(0, 10), slot_window: windowFor(appointment.slice(11, 16)) }).eq("id", bookingId);
    },
    async cancel(bookingId, reason) {
      const ok = await cancelLab(bookingId);
      if (!ok) throw new PartnerError("That couldn't be cancelled now. The sample may already be collected.", "invalid");
      await setLabMeta(bookingId, { cancelReason: reason });
    },
    async escalate(bookingId, issue, details) {
      await wait();
      const meta = await labMeta(bookingId);
      await setLabMeta(bookingId, { escalations: [...(meta.escalations ?? []), { issue, details, at: new Date().toISOString() }] });
    },
  },

  pharma: {
    async search(query) {
      await wait(250);
      const q = query.trim().toLowerCase();
      return DRUGS.filter((d) => d.name.toLowerCase().includes(q) || (d.salt ?? "").toLowerCase().includes(q)).slice(0, 20);
    },
    async alternatives(id) {
      await wait(250);
      const d = DRUGS.find((x) => x.drugMasterId === id);
      return d ? DRUGS.filter((x) => x.salt === d.salt && x.drugMasterId !== id) : [];
    },
    async pharmacies(q) {
      await wait();
      if (!q.pincode && q.latitude == null) throw new PartnerError("Add a pincode to see pharmacies that deliver to you.", "invalid");
      return PHARMACIES.filter((p) => p.orderTypes.includes(q.orderType));
    },
    async estimate(q) {
      await wait();
      const ph = PHARMACIES.find((p) => p.lsPharmacyId === q.lsPharmacyId) ?? PHARMACIES[0]!;
      const items = priceLines(q.lines.map((l) => ({ drugMasterId: l.drug.drugMasterId, quantity: l.quantity })));
      const sub = items.filter((i) => i.available).reduce((s, i) => s + i.linePrice, 0);
      const charges = q.orderType === "PICKUP" || sub >= 500 ? 0 : q.speed === "SAME_DAY" || q.speed === "EXPRESS" ? 60 : 40;
      return {
        lsPharmacyId: ph.lsPharmacyId,
        pharmacyName: ph.name,
        orderType: q.orderType,
        speed: q.speed ?? ph.speeds[0] ?? null,
        speeds: ph.speeds,
        allAvailable: items.every((i) => i.available),
        prescriptionRequired: items.some((i) => i.prescriptionRequired),
        mrpTotal: items.reduce((s, i) => s + i.mrp * i.quantity, 0),
        subTotal: sub,
        charges,
        total: sub + charges,
        items,
      };
    },
    async place(input) {
      await wait(500);
      const ph = PHARMACIES.find((p) => p.lsPharmacyId === input.lsPharmacyId) ?? PHARMACIES[0]!;
      const items = priceLines(input.lines);
      if (items.some((i) => i.prescriptionRequired) && !input.prescriptionDocumentIds.length) throw new PartnerError("One of these needs a prescription. Attach it from your records.", "invalid");
      const sub = items.reduce((s, i) => s + i.linePrice, 0);
      const order: PharmaOrder = {
        orderId: `pv${Date.now().toString(36)}`,
        lsOrderId: null,
        status: "PLACED",
        orderType: input.orderType,
        pharmacyName: ph.name,
        speed: input.speed,
        total: sub + (input.orderType === "PICKUP" || sub >= 500 ? 0 : 40),
        items,
        trackingId: null,
        related: [],
        pickup: input.orderType === "PICKUP" ? ph.pickup : null,
        placedAt: new Date().toISOString(),
        cancelReason: null,
        profileId: input.profileId,
      };
      await savePharma([order, ...(await pharmaOrders())]);
      return { orderId: order.orderId };
    },
    async order(id) {
      const o = (await pharmaOrders()).find((x) => x.orderId === id);
      if (!o) throw new PartnerError("That order isn't here.", "invalid");
      const status = pharmaStatus(o);
      return { ...o, status, trackingId: status === "SHIPPED" || status === "FULL_DELIVERED" ? `TRK${o.orderId.slice(-6).toUpperCase()}` : null };
    },
    async orders() {
      return (await pharmaOrders()).map((o) => ({ ...o, status: pharmaStatus(o) }));
    },
    async cancel(id, reason) {
      const list = await pharmaOrders();
      const o = list.find((x) => x.orderId === id);
      if (!o) throw new PartnerError("That order isn't here.", "invalid");
      if (["SHIPPED", "FULL_DELIVERED", "COMPLETED"].includes(pharmaStatus(o))) throw new PartnerError("It has already left the pharmacy, so it can't be cancelled now.", "invalid");
      await savePharma(list.map((x) => (x.orderId === id ? { ...x, status: "CANCELLED", cancelReason: reason } : x)));
    },
  },

  consult: {
    async specialities() {
      return Object.values(SPECIALTIES).map((s) => ({ name: s.label, count: DOCTORS.filter((d) => d.specialty === s.id).length })).filter((s) => s.count > 0);
    },
    async providers(q) {
      await wait();
      return DOCTORS.map((d, i) => ({ d, i }))
        .filter(({ d }) => (q.speciality ? SPECIALTIES[d.specialty].label === q.speciality : true) && (q.type === "ONLINE" ? d.fee.online != null : d.fee.clinic != null))
        .map(({ d, i }) => ({
          lsId: lsOfDoctor(i),
          name: d.name,
          gender: null,
          specialities: [SPECIALTIES[d.specialty].label],
          languages: d.languages,
          years: d.years,
          rating: null,
          ratings: 0,
          types: [...(d.fee.online != null ? (["ONLINE"] as const) : []), ...(d.fee.clinic != null ? (["CENTER_VISIT"] as const) : [])],
          photo: null,
          place: `${d.clinic.name}, ${d.clinic.area}`,
          distanceKm: q.type === "CENTER_VISIT" ? d.clinic.km : null,
          followUpUntil: null,
        }));
    },
    async slots(q) {
      await wait();
      const d = doctorOfLs(q.lsProviderId);
      if (!d) return [];
      const times = ["10:00", "10:30", "11:00", "11:30", "12:00", "17:00", "17:30", "18:00", "18:30", "19:00"].filter((t) => Date.parse(`${q.date}T${t}:00+05:30`) > Date.now() + 30 * 6e4);
      return [{ lsId: q.lsProviderId, name: d.name, times: times.map((t) => ({ start: `${q.date}T${t}:00+05:30`, end: `${q.date}T${t.slice(0, 3)}${t.endsWith("30") ? "59" : "29"}:00+05:30` })) }];
    },
    async book(input) {
      await wait(400);
      const d = doctorOfLs(input.lsProviderId);
      if (!d) throw new PartnerError("That doctor isn't available in the preview.", "invalid");
      const at = new Date(input.appointment);
      const day = new Date(at);
      day.setHours(0, 0, 0, 0);
      const h = at.getHours();
      const slotLabel = `${h % 12 || 12}:${String(at.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
      const a = useAppointments.getState().add({ doctorId: d.id, mode: input.appointmentType === "ONLINE" ? "online" : "clinic", day: day.toISOString(), slotLabel, forName: input.patient.name.split(" ")[0] ?? "", concern: input.notes.slice(0, 120), profileId: input.profileId });
      return { appointmentId: a.id };
    },
    async appointment(id) {
      await useAppointments.getState().load();
      const a = useAppointments.getState().items.find((x) => x.id === id);
      if (!a) throw new PartnerError("That appointment isn't here.", "invalid");
      const d = doctorById(a.doctorId);
      const start = startsAt(a).getTime();
      const status = a.status === "cancelled" ? "CANCELED" : Date.now() > start + 30 * 6e4 ? "COMPLETED" : "CONFIRMED";
      const c: Consult = { appointmentId: a.id, lsAppointmentId: null, status, type: a.mode === "online" ? "ONLINE" : "CENTER_VISIT", meetingType: "VIDEO", doctor: d?.name ?? "Your doctor", speciality: d ? SPECIALTIES[d.specialty].label : null, appointment: startsAt(a).toISOString(), prescriptionDocumentId: null, profileId: a.profileId ?? "" };
      return c;
    },
    async meetingLink(id) {
      await useAppointments.getState().load();
      const a = useAppointments.getState().items.find((x) => x.id === id);
      if (!a) throw new PartnerError("That appointment isn't here.", "invalid");
      const start = startsAt(a).getTime();
      return { link: "", opensAt: new Date(start - 10 * 6e4).toISOString(), closesAt: new Date(start + 60 * 6e4).toISOString() };
    },
    async reschedule(id, appointment) {
      const at = new Date(appointment);
      const day = new Date(at);
      day.setHours(0, 0, 0, 0);
      const h = at.getHours();
      useAppointments.getState().reschedule(id, day.toISOString(), `${h % 12 || 12}:${String(at.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`);
    },
    async cancel(id) {
      useAppointments.getState().cancel(id);
    },
    async escalate() {
      await wait();
    },
    async instant() {
      await wait(400);
      const row: InstantRow = { requestId: `iv${Date.now().toString(36)}`, createdAt: new Date().toISOString() };
      await kv.set(INSTANT_KEY, JSON.stringify(row));
      return { requestId: row.requestId, status: "BROADCASTING", expiresAt: new Date(Date.now() + 5 * 6e4).toISOString(), meetingLink: null, appointmentId: null };
    },
    async instantStatus(requestId): Promise<InstantStatus> {
      let row: InstantRow | null = null;
      try {
        row = JSON.parse((await kv.get(INSTANT_KEY)) ?? "null") as InstantRow | null;
      } catch {
        row = null;
      }
      if (!row || row.requestId !== requestId) return { requestId, status: "EXPIRED", expiresAt: null, meetingLink: null, appointmentId: null };
      if (row.cancelled) return { requestId, status: "CANCELED", expiresAt: null, meetingLink: null, appointmentId: null };
      const secs = (Date.now() - Date.parse(row.createdAt)) / 1000;
      return secs < 12 ? { requestId, status: "BROADCASTING", expiresAt: new Date(Date.parse(row.createdAt) + 5 * 6e4).toISOString(), meetingLink: null, appointmentId: null } : { requestId, status: "CLAIMED", expiresAt: null, meetingLink: "", appointmentId: null };
    },
    async cancelInstant(requestId) {
      await kv.set(INSTANT_KEY, JSON.stringify({ requestId, createdAt: new Date().toISOString(), cancelled: true }));
    },
  },
};

export { whenLabel, DAY };
