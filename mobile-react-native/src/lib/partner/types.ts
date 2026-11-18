import type { AddressParts, Gender } from "./validate";
import type { Patient } from "./patient";

/*
 * The shapes the app uses for LabStack, trimmed from the specs in
 * docs/labstack-api/raw. The gateway (supabase/functions/labstack) returns
 * exactly these, live or preview, so the screens never see raw API output.
 */

// ------------------------------------------------------------------ labs --

export type LabService = "HOME_SAMPLE" | "CENTER_VISIT";

/** Home collection, in the order LabStack moves through it (triggerOrderLifecycle). */
export const LAB_STATUSES = [
  "PENDING", "CREATED", "ORDER_SCHEDULED", "PHLEBO_ASSIGNED", "PHLEBO_STARTED", "PATIENT_VISITED", "SAMPLE_COLLECTED",
  "SAMPLE_IN_TRANSIT", "SAMPLE_DELIVERED", "SAMPLE_PROCESSED", "REPORT_DELIVERED",
] as const;
export type LabStatus = (typeof LAB_STATUSES)[number] | "RESCHEDULED" | "CANCELED" | "PARTIAL_DELIVERED" | "PHLEBO_NO_SHOW" | "PATIENT_MISSED" | "SAMPLE_REJECTED";

export type LabSlots = { lsLabId: number; labName: string; labLogo: string | null; service: LabService; times: string[]; distanceKm: number | null }[];

export type LabOrderInput = {
  profileId: string;
  tests: string[];
  orderType: LabService;
  lsLabId: number | null;
  /** Our lab_partners id, for the preview (live orders carry lsLabId). */
  partnerId: string | null;
  /** ISO 8601 with +05:30, from a time getSlots returned. */
  appointment: string;
  patient: Patient;
  address: AddressParts;
  notes: string;
  prescriptionDocumentId: string | null;
};

/**
 * The partner's payment link on an order. Valid for 16 minutes from placing;
 * an unpaid order is cancelled on their side after that.
 */
export type Payment = { required: boolean; link: string | null; dueAt: string | null; expired: boolean };
/** What placing an order hands back when payment is switched on. */
export type PaymentStart = { link: string; dueAt: string | null } | null;

export type LabOrder = {
  bookingId: string;
  lsOrderId: number | null;
  status: LabStatus;
  orderType: LabService;
  appointment: string;
  labName: string | null;
  /** The lab's logo (https) when the partner sends one. */
  labLogo: string | null;
  labAddress: string | null;
  phlebo: { name: string; phone: string | null; startedAt: string | null } | null;
  preparations: string | null;
  reports: { link: string; type: "FULL" | "PARTIAL" }[];
  resultDocumentId: string | null;
  cancelReason: string | null;
  payment?: Payment;
};

// -------------------------------------------------------------- pharmacy --

export type ShipmentSpeed = "STANDARD" | "EXPRESS" | "SAME_DAY" | "PAN_INDIA";
export type PharmaOrderType = "HOME_DELIVERY" | "PICKUP";

export type Drug = {
  drugMasterId: string;
  name: string;
  salt: string | null;
  pack: string;
  prescriptionRequired: boolean;
  notForSale: boolean;
  /** Lowest customer price across pharmacies, and the MRP beside it. */
  price: number | null;
  mrp: number | null;
  /** Pharmacies that list it (from search), so Delivery can show who has everything. Absent: unknown. */
  pharmacyIds?: number[];
};

export type CartLine = { drug: Drug; quantity: number };

export type Pharmacy = {
  lsPharmacyId: number;
  name: string;
  orderTypes: PharmaOrderType[];
  speeds: ShipmentSpeed[];
  distanceKm: number | null;
  pickup: { address: string; opens: string | null; closes: string | null } | null;
};

export type PriceLine = { drugMasterId: string; name: string; pack: string; quantity: number; mrp: number; unitPrice: number; linePrice: number; available: boolean; prescriptionRequired: boolean };

export type Estimate = {
  lsPharmacyId: number;
  pharmacyName: string;
  orderType: PharmaOrderType;
  speed: ShipmentSpeed | null;
  speeds: ShipmentSpeed[];
  allAvailable: boolean;
  prescriptionRequired: boolean;
  mrpTotal: number;
  subTotal: number;
  charges: number;
  total: number;
  items: PriceLine[];
};

export type PharmaStatus = "PENDING" | "CREATED" | "PLACED" | "CONFIRMED" | "SHIPPED" | "PARTIAL_DELIVERED" | "FULL_DELIVERED" | "COMPLETED" | "CANCELLED";

export type PharmaOrderInput = {
  profileId: string;
  orderType: PharmaOrderType;
  lsPharmacyId: number;
  speed: ShipmentSpeed | null;
  lines: { drugMasterId: string; quantity: number }[];
  patient: Patient;
  address: AddressParts;
  notes: string;
  /** Records to send as the prescription; the gateway fetches and base64s them. */
  prescriptionDocumentIds: string[];
};

export type PharmaOrder = {
  orderId: string;
  lsOrderId: number | null;
  status: PharmaStatus;
  orderType: PharmaOrderType;
  pharmacyName: string;
  speed: ShipmentSpeed | null;
  total: number;
  items: PriceLine[];
  trackingId: string | null;
  related: { lsOrderId: number; status: PharmaStatus }[];
  pickup: Pharmacy["pickup"];
  placedAt: string;
  cancelReason: string | null;
  profileId: string;
  payment?: Payment;
};

// ---------------------------------------------------------- consultations --

export type AppointmentType = "ONLINE" | "CENTER_VISIT" | "HOME_VISIT";

export type Speciality = { name: string; count: number };

export type Provider = {
  lsId: number;
  name: string;
  gender: Gender | null;
  specialities: string[];
  languages: string[];
  years: number | null;
  rating: number | null;
  ratings: number;
  types: AppointmentType[];
  photo: string | null;
  place: string | null;
  distanceKm: number | null;
  followUpUntil: string | null;
};

export type ProviderSlots = { lsId: number; name: string; times: { start: string; end: string }[] }[];

export type ConsultStatus = "PENDING" | "CREATED" | "CONFIRMED" | "RESCHEDULED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "PATIENT_NO_SHOW" | "PROVIDER_NO_SHOW";

export type ConsultInput = {
  profileId: string;
  lsProviderId: number;
  appointmentType: AppointmentType;
  appointment: string;
  meetingType: "VIDEO" | "AUDIO_ONLY";
  patient: Patient;
  address: AddressParts | null;
  notes: string;
  couponCode: string;
  suggestedTestIds: string[];
  shareDocumentIds: string[];
};

export type Consult = {
  appointmentId: string;
  lsAppointmentId: number | null;
  status: ConsultStatus;
  type: AppointmentType;
  meetingType: "VIDEO" | "AUDIO_ONLY";
  doctor: string;
  speciality: string | null;
  appointment: string;
  prescriptionDocumentId: string | null;
  profileId: string;
  payment?: Payment;
};

export type InstantStatus = { requestId: string; status: "BROADCASTING" | "CLAIMED" | "EXPIRED" | "CANCELED"; expiresAt: string | null; meetingLink: string | null; appointmentId: string | null };

export class PartnerError extends Error {
  constructor(message: string, readonly code: "invalid" | "unavailable" | "unauthorized" | "busy" | "failed" = "failed") {
    super(message);
  }
}
