import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Baby, CalendarDays, Scale, ScanLine } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChipSelect, Field } from "@/components/ui/field";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { eddFromLmp, formatGa, gestationalAge, todayIso } from "@/lib/memory/clock";
import { promotePregnancy, refreshMemory, savePregnancy, useMemory } from "@/lib/memory/store";
import { readPregnancy } from "@/lib/memory/subjects";
import { runOptimistic } from "@/lib/optimistic";
import { refreshRoster, useFamily, useSwitchMember } from "@/lib/profiles/family";
import { shortDate } from "@/lib/records/details";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";
import { FormSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { goBack } from "@/lib/nav/go-back";

/*
 * A PREGNANCY, AND THE BIRTH.
 *
 * Two modes on one screen:
 *
 *   track   the first day of the last period, the due date, and any scan's
 *           dating. Scan dating wins over the period when they disagree, and
 *           the memory page says so.
 *   birth   the baby arrives. They become a family member of their own, and
 *           carry what the pregnancy knew: weeks at birth, how they were
 *           delivered, birth weight, the mother's blood group and medicines.
 *           That is what lets day-3 jaundice be read properly without anyone
 *           typing any of it twice.
 *
 * Dates are typed as YYYY-MM-DD, the same as everywhere else in the app.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const valid = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(s));

export default function PregnancyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const switchTo = useSwitchMember();
  const { id, birth } = useLocalSearchParams<{ id?: string; birth?: string }>();
  const member = useFamily().data?.profile ?? null;
  const memory = useMemory(member?.id);
  const existing = useMemo(() => {
    const row = memory.data?.pregnancies.find((p) => p.id === id);
    return row ? { pregnancy: readPregnancy(row), raw: row } : null;
  }, [memory.data, id]);
  const name = member?.name.split(/\s+/)[0] ?? "";

  const [lmp, setLmp] = useState("");
  const [edd, setEdd] = useState("");
  const [scanDate, setScanDate] = useState("");
  const [scanWeeks, setScanWeeks] = useState("");
  const [scanDays, setScanDays] = useState("");
  const [scanLabel, setScanLabel] = useState("");
  const [babyName, setBabyName] = useState("");

  const [dob, setDob] = useState(todayIso());
  const [sex, setSex] = useState<"female" | "male" | "other" | "">("");
  const [mode, setMode] = useState<"normal" | "c-section" | "assisted" | "">("");
  const [weight, setWeight] = useState("");
  const [weeksAtBirth, setWeeksAtBirth] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [born, setBorn] = useState<{ id: string; name: string } | null>(null);

  const isBirth = birth === "1" && existing;
  const predicted = existing && valid(dob) ? gestationalAge(existing.pregnancy, dob) : null;

  function saveTracking() {
    setError(null);
    for (const [label, v] of [["Last period", lmp], ["Due date", edd], ["Scan date", scanDate]] as const) {
      if (v && !valid(v)) return setError(`${label} should look like 2026-03-05.`);
    }
    const w = scanWeeks ? Number(scanWeeks) : null;
    if (scanDate && (w === null || !Number.isInteger(w) || w < 4 || w > 42)) return setError("Add the weeks the scan gave, between 4 and 42.");
    /*
     * INSTANT: back to Memory at once, saving behind it. If the save fails
     * the save bar says so and Retry sends the same dates again, so nothing
     * typed is lost. Memory refreshes itself when the save lands.
     */
    const profileId = member?.id ?? "";
    const input = {
      lmp: lmp || existing?.pregnancy.lmp || null,
      edd: edd || existing?.pregnancy.edd || (lmp ? eddFromLmp(lmp) : null),
      scanDate: scanDate || null,
      scanWeeks: w,
      scanDays: scanDays ? Math.min(6, Math.max(0, Number(scanDays))) : 0,
      scanLabel: scanLabel || null,
      babyName: babyName || existing?.pregnancy.babyName || null,
    };
    const pregnancyId = existing?.pregnancy.id ?? null;
    const datings = Array.isArray(existing?.raw.datings) ? (existing.raw.datings as unknown[]) : [];
    void runOptimistic({
      apply: () => goBack(router, "/memory"),
      revert: () => undefined,
      write: () => savePregnancy(profileId, input, pregnancyId, datings),
      message: "Couldn't save the pregnancy dates. Check your connection.",
      onSaved: () => refreshMemory(qc, profileId),
    });
  }

  async function saveBirth() {
    setError(null);
    if (!existing) return;
    if (!babyName.trim()) return setError("Add a name. A nickname is fine, you can change it later.");
    if (!valid(dob)) return setError("Birth date should look like 2026-09-01.");
    const kg = weight ? Number(weight) : null;
    if (kg !== null && (!Number.isFinite(kg) || kg < 0.3 || kg > 7)) return setError("Birth weight should be in kg, like 3.2.");
    const wk = weeksAtBirth ? Number(weeksAtBirth) : null;
    if (wk !== null && (!Number.isInteger(wk) || wk < 20 || wk > 44)) return setError("Weeks at birth should be a whole number, like 39.");
    setSaving(true);
    const res = await promotePregnancy(existing.pregnancy.id, {
      name: babyName.trim(),
      dob,
      sex: sex || null,
      deliveryMode: mode === "c-section" ? "c-section" : mode === "assisted" ? "assisted delivery" : mode === "normal" ? "normal delivery" : null,
      weightKg: kg,
      gaDays: wk !== null ? wk * 7 : null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    refreshRoster(qc);
    if (member) refreshMemory(qc, member.id);
    setBorn({ id: res.childId, name: babyName.trim() });
  }

  if (born) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader fallback="/memory" />
        <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 14 }}>
          <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
            <Baby size={30} color={brand[600]} />
          </View>
          <PageTitle title={`Welcome, ${born.name}`} line={`${born.name} is in the family now, and starts life with what the pregnancy knew: weeks at birth, delivery, weight, and ${name}'s blood group. Day-by-day newborn limits apply from today.`} />
          <PillButton
            tone="brand"
            onPress={async () => {
              await switchTo(born.id);
              router.replace("/ask");
            }}
          >
            {`Switch to ${born.name}`}
          </PillButton>
          <PillButton tone="light" onPress={() => router.replace("/memory")}>
            {`Back to ${name}`}
          </PillButton>
        </View>
      </View>
    );
  }

  // Editing a saved pregnancy: wait for it, rather than flash an empty form.
  if (id && memory.isPending) {
    return (
      <ScreenSkeleton>
        <FormSkeleton fields={4} />
      </ScreenSkeleton>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader fallback="/memory" />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 16 }} keyboardShouldPersistTaps="handled">
          {isBirth ? (
            <>
              <PageTitle
                title="The baby has arrived"
                line={`Congratulations. The baby joins the family as their own member, carrying the pregnancy's details from ${name}'s file.`}
              />
              <Field label="Baby's name" required value={babyName} onChangeText={setBabyName} placeholder={existing?.pregnancy.babyName ?? "A nickname is fine"} icon={Baby} />
              <Field label="Date of birth" required value={dob} onChangeText={setDob} placeholder="2026-09-01" icon={CalendarDays} autoCapitalize="none" />
              <ChipSelect label="Sex" options={[["female", "Girl"], ["male", "Boy"], ["other", "Not saying"]] as const} value={sex} onChange={setSex} />
              <ChipSelect label="Delivery" options={[["normal", "Normal"], ["c-section", "C-section"], ["assisted", "Assisted"]] as const} value={mode} onChange={setMode} />
              <Field label="Birth weight (kg)" value={weight} onChangeText={setWeight} placeholder="3.2" keyboardType="decimal-pad" icon={Scale} />
              <Field
                label="Weeks at birth"
                value={weeksAtBirth}
                onChangeText={setWeeksAtBirth}
                keyboardType="number-pad"
                placeholder={predicted ? String(predicted.weeks) : "39"}
                hint={predicted ? `From the dating on file: ${formatGa(predicted.totalDays)} on ${shortDate(dob)}. Leave it empty to use that.` : "Decides whether newborn limits use the term or preterm chart."}
              />
            </>
          ) : (
            <>
              <PageTitle
                title={existing ? "Update the pregnancy" : `Track ${name}'s pregnancy`}
                line="Any one of these is enough. Scan dating beats the period date when they disagree, which is the usual rule."
              />
              <Field label="First day of the last period" value={lmp} onChangeText={setLmp} placeholder={existing?.pregnancy.lmp ?? "2026-03-05"} icon={CalendarDays} autoCapitalize="none" />
              <Field label="Due date, if the doctor gave one" value={edd} onChangeText={setEdd} placeholder={existing?.pregnancy.edd ?? (lmp && valid(lmp) ? eddFromLmp(lmp) : "2026-12-10")} icon={CalendarDays} autoCapitalize="none" />
              <View style={{ gap: 10, borderRadius: 24, backgroundColor: brand[50], padding: 14 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>A scan&apos;s dating</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>The scan report prints the gestational age it measured, like &quot;12w 3d&quot;.</Text>
                <Field label="Scan date" value={scanDate} onChangeText={setScanDate} placeholder="2026-05-20" icon={ScanLine} autoCapitalize="none" />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Weeks" value={scanWeeks} onChangeText={setScanWeeks} keyboardType="number-pad" placeholder="12" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Days" value={scanDays} onChangeText={setScanDays} keyboardType="number-pad" placeholder="3" />
                  </View>
                </View>
                <Field label="Which scan" value={scanLabel} onChangeText={setScanLabel} placeholder="NT scan, anomaly scan, growth scan" />
              </View>
              <Field label="Baby's name or nickname (optional)" value={babyName} onChangeText={setBabyName} placeholder={existing?.pregnancy.babyName ?? "Peanut"} icon={Baby} />
            </>
          )}

          {error ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>
              {error}
            </Text>
          ) : null}

          <PillButton tone="brand" loading={saving} onPress={() => void (isBirth ? saveBirth() : saveTracking())}>
            {isBirth ? "Add the baby to the family" : "Save"}
          </PillButton>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
