import { create } from "zustand";

import type { CartLine, Drug, PharmaOrderType, ShipmentSpeed } from "./types";

/*
 * The medicine order being put together, across the four steps
 * (pharmacy/index, delivery, review, then the order). One order is for one
 * family member; switching member starts a fresh cart.
 *
 * LabStack's rules carried here: a drugMasterId is one brand and pack (never
 * swapped for another without the person choosing it), 1 to 100 of any one,
 * and nothing marked notForSale (Schedule X, habit-forming) can be added.
 */

type State = {
  profileId: string | null;
  lines: CartLine[];
  orderType: PharmaOrderType;
  lsPharmacyId: number | null;
  speed: ShipmentSpeed | null;
  prescriptionIds: string[];
  notes: string;
  forMember: (profileId: string) => void;
  add: (drug: Drug, quantity?: number) => string | null;
  setQty: (drugMasterId: string, quantity: number) => void;
  swap: (fromId: string, to: Drug) => void;
  remove: (drugMasterId: string) => void;
  setDelivery: (orderType: PharmaOrderType, lsPharmacyId: number | null, speed: ShipmentSpeed | null) => void;
  setPrescriptions: (ids: string[]) => void;
  setNotes: (notes: string) => void;
  clear: () => void;
};

const fresh = { lines: [] as CartLine[], orderType: "HOME_DELIVERY" as PharmaOrderType, lsPharmacyId: null, speed: null, prescriptionIds: [] as string[], notes: "" };

export const usePharmacyCart = create<State>((set, get) => ({
  profileId: null,
  ...fresh,
  forMember: (profileId) => {
    if (get().profileId !== profileId) set({ profileId, ...fresh });
  },
  add: (drug, quantity = 1) => {
    if (drug.notForSale) return "This one can't be ordered online. Buy it at a pharmacy with the prescription.";
    const have = get().lines.find((l) => l.drug.drugMasterId === drug.drugMasterId);
    if (have) {
      set({ lines: get().lines.map((l) => (l === have ? { ...l, quantity: Math.min(100, l.quantity + quantity) } : l)) });
      return null;
    }
    set({ lines: [...get().lines, { drug, quantity: Math.max(1, Math.min(100, quantity)) }] });
    return null;
  },
  setQty: (id, quantity) => set({ lines: get().lines.map((l) => (l.drug.drugMasterId === id ? { ...l, quantity: Math.max(1, Math.min(100, Math.round(quantity))) } : l)) }),
  swap: (fromId, to) => set({ lines: get().lines.map((l) => (l.drug.drugMasterId === fromId ? { drug: to, quantity: l.quantity } : l)) }),
  remove: (id) => set({ lines: get().lines.filter((l) => l.drug.drugMasterId !== id) }),
  setDelivery: (orderType, lsPharmacyId, speed) => set({ orderType, lsPharmacyId, speed }),
  setPrescriptions: (ids) => set({ prescriptionIds: ids }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ ...fresh }),
}));

export const needsPrescription = (lines: CartLine[]) => lines.some((l) => l.drug.prescriptionRequired);
export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const SPEED_LABEL: Record<ShipmentSpeed, string> = { STANDARD: "Standard", EXPRESS: "Express", SAME_DAY: "Same day", PAN_INDIA: "Anywhere in India" };
