import type { Doctor } from "@/lib/booking/catalog";
import { rememberDoctors } from "@/lib/booking/partner-doctors";
import { kv } from "@/lib/storage";

/*
 * The last 30 partner doctors seen, kept on the phone (name, department,
 * clinic; nothing about anyone's health), so an appointment opened after a
 * restart still shows who it is with. Loaded with the appointments list.
 */
const KEY = "cheeku.partnerDoctors";
let hydrated = false;

export function saveDoctors(list: readonly Doctor[]): void {
  const keep = rememberDoctors(list);
  void kv.set(KEY, JSON.stringify(keep.map((d) => ({ ...d, languages: d.languages.slice(0, 4) }))));
}

export async function hydratePartnerDoctors(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await kv.get(KEY);
    rememberDoctors(raw ? (JSON.parse(raw) as Doctor[]) : []);
  } catch {
    // Nothing saved: the list fills again from the partner.
  }
}
