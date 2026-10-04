import { useEffect } from "react";
import { create } from "zustand";

import { kv } from "@/lib/storage";

import type { VisitMode } from "./catalog";
import type { RequestStatus } from "./provider";

/*
 * Service requests made on this phone (dental, eye, physio, home care,
 * transport, mental health counselling, medicines). Kept like appointments:
 * a short list on the device, newest first, and every one also filed in the
 * person's chat thread so the memory knows. When the partner API is live the
 * provider's own record becomes the source of truth and this is its cache.
 */

export type ServiceRequest = {
  id: string;
  serviceId: string;
  offeringId: string;
  title: string;
  mode: VisitMode;
  /** ISO date, local midnight. */
  date: string;
  window: string;
  address: string | null;
  note: string;
  forName: string;
  profileId: string | null;
  reference: string;
  provider: string;
  status: RequestStatus;
  createdAt: string;
};

const KEY = "cheeku.serviceRequests";
const CAP = 20;

type Store = {
  items: ServiceRequest[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (r: Omit<ServiceRequest, "id" | "createdAt">) => ServiceRequest;
  cancel: (id: string) => void;
};

function persist(items: ServiceRequest[]) {
  void kv.set(KEY, JSON.stringify(items.slice(0, CAP)));
}

export const useServiceRequests = create<Store>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await kv.get(KEY);
      set({ items: raw ? (JSON.parse(raw) as ServiceRequest[]) : [], loaded: true });
    } catch {
      set({ items: [], loaded: true });
    }
  },
  add: (r) => {
    const req: ServiceRequest = { ...r, id: `s${Date.now().toString(36)}`, createdAt: new Date().toISOString() };
    const items = [req, ...get().items].slice(0, CAP);
    set({ items });
    persist(items);
    return req;
  },
  cancel: (id) => {
    const items = get().items.map((x) => (x.id === id ? { ...x, status: "cancelled" as const } : x));
    set({ items });
    persist(items);
  },
}));

/** Loads once per app session, on first use. */
export function useServiceRequestList() {
  const store = useServiceRequests();
  useEffect(() => {
    void store.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return store;
}

/** "Tue, 8 Oct · 10-12 pm" */
export function whenText(r: Pick<ServiceRequest, "date" | "window">): string {
  const d = new Date(r.date);
  return `${d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${r.window}`;
}
