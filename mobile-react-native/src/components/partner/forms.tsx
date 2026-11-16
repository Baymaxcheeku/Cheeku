import { useQuery } from "@tanstack/react-query";
import { LocateFixed, PencilLine } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { Tap } from "@/components/ui/tap";
import { useNearbyPlace } from "@/lib/location/live";
import { patientFor, patientReady, type PatientField, type ProfileLike } from "@/lib/partner/patient";
import { checkAddress, type AddressErrors, type AddressParts, type Gender } from "@/lib/partner/validate";
import { useFamily } from "@/lib/profiles/family";
import { kv } from "@/lib/storage";
import { sessionUser } from "@/lib/supabase/session";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * WHO IT'S FOR, AND WHERE.
 *
 * Every LabStack booking (lab, pharmacy, doctor) carries a patient and,
 * for anything at home, an address in parts. These two blocks fill both
 * from what Cheeku already knows, ask only for what's missing, and check
 * each field the way LabStack will (lib/partner/validate.ts) as it's typed.
 * Email and mobile default to the account holder's (owner, 16 Nov 2026).
 */

// ------------------------------------------------------------- patient --

export function usePatient(profileId: string | undefined) {
  const family = useFamily();
  const all = family.data?.access.all ?? [];
  const member = all.find((m) => m.id === profileId) ?? family.data?.profile ?? null;
  const holder = all.find((m) => m.isPrimary) ?? null;
  const account = useQuery({
    queryKey: ["partner-account"],
    queryFn: async () => {
      const u = await sessionUser();
      const { data } = await supabase.from("profiles").select("id, phone").eq("is_primary", true).limit(1).maybeSingle();
      return { email: u?.email ?? null, phone: (data?.phone as string | null) ?? null };
    },
    staleTime: 5 * 60_000,
  });
  const phones = useQuery({
    queryKey: ["partner-phones", member?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("phone").eq("id", member!.id).maybeSingle();
      return (data?.phone as string | null) ?? null;
    },
    enabled: Boolean(member?.id),
    staleTime: 5 * 60_000,
  });
  const [edits, setEdits] = useState<Partial<Record<PatientField, string>>>({});
  useEffect(() => setEdits({}), [member?.id]);

  const result = useMemo(() => {
    if (!member) return null;
    const m: ProfileLike = { id: member.id, name: member.name, dob: member.dob, sex: member.sex, relationship: member.relationship, isPrimary: member.isPrimary, phone: phones.data ?? null };
    const h: ProfileLike | null = holder ? { id: holder.id, name: holder.name, dob: holder.dob, sex: holder.sex, relationship: null, isPrimary: true, phone: account.data?.phone ?? null } : null;
    return patientFor(m, h, { email: account.data?.email ?? null, phone: account.data?.phone ?? null }, edits);
  }, [member, holder, phones.data, account.data, edits]);

  return {
    member,
    result,
    ready: result ? patientReady(result) : false,
    loading: account.isPending,
    set: (f: PatientField, v: string) => setEdits((e) => ({ ...e, [f]: v })),
    edits,
  };
}

const GENDERS: [Gender, string][] = [
  ["FEMALE", "Female"],
  ["MALE", "Male"],
  ["OTHERS", "Other"],
];

/** "Who it's for": what we'll send, with the gaps asked inline. */
export function PatientCard({ p, showErrors }: { p: ReturnType<typeof usePatient>; showErrors: boolean }) {
  const [editing, setEditing] = useState(false);
  const r = p.result;
  if (!r || !p.member) return null;
  const need = (f: PatientField) => editing || r.missing.includes(f) || Boolean(r.errors[f]);
  const err = (f: PatientField) => (showErrors || p.edits[f] !== undefined ? (r.errors[f] ?? (r.missing.includes(f) && showErrors ? "Needed for the booking." : undefined)) : undefined);
  const g = r.patient.gender;

  return (
    <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Who it&apos;s for</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>
            {[r.patient.name, g === "FEMALE" ? "Female" : g === "MALE" ? "Male" : g === "OTHERS" ? "Other" : null, r.patient.age !== null ? `${r.patient.age} years` : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Tap accessibilityRole="button" accessibilityLabel={editing ? "Done editing" : "Edit details"} onPress={() => setEditing((e) => !e)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <PencilLine size={14} color={brand[600]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>{editing ? "Done" : "Edit"}</Text>
        </Tap>
      </View>

      {editing ? <Field label="Name" value={p.edits.name ?? p.member.name} onChangeText={(v) => p.set("name", v)} error={err("name")} autoCapitalize="words" /> : null}

      {need("gender") ? (
        <View style={{ gap: 6 }}>
          <Label text="Gender" hint="The lab and the doctor need it" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {GENDERS.map(([v, label]) => {
              const on = g === v;
              return (
                <Tap key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => p.set("gender", v)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? "#fff" : ink[900] }}>{label}</Text>
                </Tap>
              );
            })}
          </View>
          {err("gender") ? <ErrorText text={err("gender")!} /> : null}
        </View>
      ) : null}

      {need("dateOfBirth") ? <Field label="Date of birth" hint="YYYY-MM-DD" value={p.edits.dateOfBirth ?? p.member.dob ?? ""} onChangeText={(v) => p.set("dateOfBirth", v)} error={err("dateOfBirth")} keyboardType="numbers-and-punctuation" placeholder="1990-04-23" maxLength={10} /> : null}

      <Row label="Mobile" value={r.patient.mobile} editing={need("mobile")}>
        <Field label="Mobile" hint="10 digits. The collector or doctor calls this number." value={p.edits.mobile ?? r.patient.mobile} onChangeText={(v) => p.set("mobile", v)} error={err("mobile")} keyboardType="phone-pad" placeholder="98xxxxxxxx" maxLength={14} />
      </Row>
      <Row label="Email" value={r.patient.email} editing={need("email")}>
        <Field label="Email" hint="Receipts and reports go here." value={p.edits.email ?? r.patient.email} onChangeText={(v) => p.set("email", v)} error={err("email")} keyboardType="email-address" autoCapitalize="none" placeholder="you@example.com" />
      </Row>
    </View>
  );
}

function Row({ label, value, editing, children }: { label: string; value: string; editing: boolean; children: React.ReactNode }) {
  if (editing) return <>{children}</>;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500] }}>{label}</Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 14, color: ink[900] }}>
        {value}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------- address --

export const EMPTY_ADDRESS: AddressParts = { unitFloorBuilding: "", address: "", locality: "", city: "", state: "", pincode: "", latitude: null, longitude: null };
const addressKey = (id: string) => `cheeku.address.${id}`;

/** The member's address: last one used, else the place Cheeku knows (locality, city, state, pincode, map point). */
export function useAddress(profileId: string | undefined) {
  const near = useNearbyPlace(profileId);
  const [value, setValue] = useState<AddressParts>(EMPTY_ADDRESS);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!profileId || touched) return;
    let alive = true;
    void (async () => {
      let saved: AddressParts | null = null;
      try {
        saved = JSON.parse((await kv.get(addressKey(profileId))) ?? "null") as AddressParts | null;
      } catch {
        saved = null;
      }
      const p = near.place as (Record<string, unknown> & { lat?: number; lng?: number }) | null;
      const fromPlace: AddressParts | null = p
        ? { ...EMPTY_ADDRESS, locality: String(p.locality ?? p.label ?? ""), city: String(p.city ?? ""), state: String(p.state ?? ""), pincode: String(p.pincode ?? ""), latitude: typeof p.lat === "number" ? p.lat : null, longitude: typeof p.lng === "number" ? p.lng : null }
        : null;
      if (alive) setValue(saved ?? fromPlace ?? EMPTY_ADDRESS);
    })();
    return () => {
      alive = false;
    };
  }, [profileId, near.place, touched]);
  return {
    value,
    set: (patch: Partial<AddressParts>) => {
      setTouched(true);
      setValue((v) => ({ ...v, ...patch }));
    },
    /** Keep it for next time (call after a successful booking). */
    remember: () => (profileId ? kv.set(addressKey(profileId), JSON.stringify(value)) : Promise.resolve()),
    locate: near.locate,
    locating: near.locating,
  };
}

/** The address, in the parts LabStack wants. */
export function AddressForm({ a, kind, showErrors, title = "Address" }: { a: ReturnType<typeof useAddress>; kind: "lab" | "pharmacy" | "visit"; showErrors: boolean; title?: string }) {
  const errors: AddressErrors = showErrors ? checkAddress(a.value, kind) : {};
  const v = a.value;
  return (
    <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>{title}</Text>
        <Tap accessibilityRole="button" onPress={() => void a.locate()} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <LocateFixed size={14} color={brand[600]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>{a.locating ? "Finding you" : "Use my location"}</Text>
        </Tap>
      </View>
      <Field label="Flat, floor, building" value={v.unitFloorBuilding} onChangeText={(t) => a.set({ unitFloorBuilding: t })} placeholder="Flat 302, Lake View Apartments" />
      <Field label="Street and area" value={v.address} onChangeText={(t) => a.set({ address: t })} error={errors.address} placeholder="12th Main Road, near the park" maxLength={200} />
      <Field label="Locality" value={v.locality} onChangeText={(t) => a.set({ locality: t })} placeholder="Indiranagar" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="City" value={v.city} onChangeText={(t) => a.set({ city: t })} error={errors.city} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Pincode" value={v.pincode} onChangeText={(t) => a.set({ pincode: t.replace(/\D/g, "").slice(0, 6), latitude: null, longitude: null })} error={errors.pincode} keyboardType="number-pad" maxLength={6} />
        </View>
      </View>
      <Field label="State" value={v.state} onChangeText={(t) => a.set({ state: t })} error={errors.state} />
      {errors.whole ? <ErrorText text={errors.whole} /> : null}
    </View>
  );
}

// -------------------------------------------------------------- pieces --

function Label({ text, hint }: { text: string; hint?: string }) {
  return (
    <View>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{text}</Text>
      {hint ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{hint}</Text> : null}
    </View>
  );
}

function ErrorText({ text }: { text: string }) {
  return (
    <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 12, color: semantic.dangerText }}>
      {text}
    </Text>
  );
}

/** `page`: sits on the page background rather than inside a white card, so it needs its own fill and edge. */
export function Field({ label, hint, error, page, ...props }: TextInputProps & { label: string; hint?: string; error?: string; page?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Label text={label} hint={hint} />
      <TextInput
        {...props}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          props.onBlur?.(e);
        }}
        placeholderTextColor={ink[300]}
        style={{ minHeight: props.multiline ? 96 : 46, textAlignVertical: props.multiline ? "top" : "center", paddingHorizontal: 14, paddingVertical: props.multiline ? 12 : 10, borderRadius: 14, backgroundColor: page ? "#fff" : surface.canvas, borderWidth: page ? 1 : 1.5, borderColor: error ? semantic.danger : focus ? brand[300] : page ? surface.line : "transparent", fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[900] }}
      />
      {error ? <ErrorText text={error} /> : null}
    </View>
  );
}
