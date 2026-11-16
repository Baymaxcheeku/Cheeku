import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { Doctor, Mode, Slot, SpecialtyId } from "@/lib/booking/catalog";
import { asDoctor, lsIdOf, partnerSpeciality } from "@/lib/booking/partner-doctors";
import { useNearbyPlace } from "@/lib/location/live";
import { hydratePartnerDoctors, saveDoctors } from "@/lib/booking/partner-doctors-store";

import { labstack, LIVE } from "./labstack";

/*
 * The doctor list and open times from the partner network, in the shapes the
 * booking screens already draw (Doctor, Slot). Only used when LIVE; preview
 * keeps the sample catalogue.
 */

const typeOf = (m: Mode): "ONLINE" | "CENTER_VISIT" => (m === "online" ? "ONLINE" : "CENTER_VISIT");

export function useLiveDoctors(specialty: SpecialtyId, mode: Mode) {
  const near = useNearbyPlace();
  const place = near.place;
  useEffect(() => void hydratePartnerDoctors(), []);

  const specialities = useQuery({ queryKey: ["ls-specialities"], queryFn: () => labstack().consult.specialities(), enabled: LIVE, staleTime: 6 * 3600_000 });
  const name = specialities.data ? partnerSpeciality(specialty, specialities.data) : undefined;

  const doctors = useQuery({
    queryKey: ["ls-doctors", specialty, mode, mode === "clinic" ? place?.pincode ?? null : null],
    enabled: LIVE && name !== undefined && (mode === "online" || Boolean(place)),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Doctor[]> => {
      if (name === null) return [];
      const list = await labstack().consult.providers({
        type: typeOf(mode),
        speciality: name ?? null,
        ...(mode === "clinic" && place ? { pincode: place.pincode ?? undefined, latitude: place.lat, longitude: place.lng } : {}),
      });
      const out = list.map(asDoctor);
      saveDoctors(out);
      return out;
    },
  });

  return {
    doctors: doctors.data ?? [],
    loading: specialities.isPending || doctors.isPending,
    error: specialities.error ?? doctors.error,
    /** The partner has nobody in this department at all. */
    noDepartment: name === null,
    needsPlace: mode === "clinic" && !place,
    retry: () => void (specialities.error ? specialities.refetch() : doctors.refetch()),
  };
}

/** Open times for one partner doctor on one day, as Slots whose id is the ISO start. */
export function useLiveSlots(doctor: Doctor | undefined, mode: Mode, day: Date) {
  const near = useNearbyPlace();
  const lsId = lsIdOf(doctor?.id);
  const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  return useQuery({
    queryKey: ["ls-slots", lsId, mode, date],
    enabled: LIVE && Boolean(lsId),
    staleTime: 60_000,
    queryFn: async (): Promise<Slot[]> => {
      const res = await labstack().consult.slots({
        type: typeOf(mode),
        date,
        lsProviderId: lsId!,
        ...(mode === "clinic" && near.place ? { pincode: near.place.pincode ?? undefined, latitude: near.place.lat, longitude: near.place.lng } : {}),
      });
      return (res[0]?.times ?? []).map((t) => {
        const start = new Date(t.start);
        const h = Number(start.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }));
        const label = start.toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).toLowerCase().replace(/\s+/g, " ");
        return { id: t.start, label, part: h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening", taken: false } satisfies Slot;
      });
    },
  });
}
