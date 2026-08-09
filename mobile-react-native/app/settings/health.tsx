import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Info } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { SaveButton, SettingsScreen } from "@/components/settings/chrome";
import { ChipSelect, Field } from "@/components/ui/field";
import { Meter } from "@/components/ui/motion";
import { activeProfile } from "@/lib/profiles/context";
import { updateHealthProfile } from "@/lib/settings/actions";
import { profileDetail, type ProfileDetail } from "@/lib/settings/queries";
import { brand, ink } from "@/theme/tokens";

const BLOOD_GROUPS = [
  ["A+", "A+"],
  ["A-", "A-"],
  ["B+", "B+"],
  ["B-", "B-"],
  ["AB+", "AB+"],
  ["AB-", "AB-"],
  ["O+", "O+"],
  ["O-", "O-"],
] as const;

type BloodGroup = (typeof BLOOD_GROUPS)[number][0];

/** "Folic acid | 5 mg | once daily" — one line each, matched to `parseMedications`. */
function medicationsToLines(meds: ProfileDetail["medications"]): string {
  return meds.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" | ")).join("\n");
}

export default function HealthProfile() {
  const queryClient = useQueryClient();

  const context = useQuery({
    queryKey: ["settings-health"],
    queryFn: async () => {
      const active = await activeProfile();
      return active ? await profileDetail(active.id) : null;
    },
  });

  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [conditions, setConditions] = useState("");
  const [medications, setMedications] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const profile = context.data ?? null;

  useEffect(() => {
    if (!profile) return;
    setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
    setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
    setBloodGroup((profile.bloodGroup as BloodGroup | null) ?? "");
    setConditions(profile.conditions.join(", "));
    setMedications(medicationsToLines(profile.medications));
  }, [profile?.id, profile]);

  async function save() {
    if (!profile) return;
    setPending(true);
    setSaved(false);
    setErrors({});
    setMessage(null);
    try {
      const result = await updateHealthProfile({
        profileId: profile.id,
        heightCm: heightCm as unknown as number,
        weightKg: weightKg as unknown as number,
        bloodGroup,
        conditions,
        medications,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setSaved(true);
      // Conditions feed Ask Baymax's personalised paragraph, so the chat's
      // cached context has to go too, not only this screen's.
      await queryClient.invalidateQueries();
    } finally {
      setPending(false);
    }
  }

  if (context.isPending) {
    return (
      <SettingsScreen title="Health profile" eyebrow="Conditions, allergies and medicines" icon={HeartPulse}>
        <View className="mt-16 items-center">
          <ActivityIndicator color={brand[600]} />
        </View>
      </SettingsScreen>
    );
  }

  if (!profile) {
    return (
      <SettingsScreen title="Health profile" eyebrow="Conditions, allergies and medicines" icon={HeartPulse}>
        <Text className="mt-16 px-10 text-center text-[15px] text-ink-500">
          Set up a profile first.
        </Text>
      </SettingsScreen>
    );
  }

  /*
   * Completeness, counted from what is actually STORED.
   *
   * Not a vanity score. Every one of these five changes what Ask Baymax is able
   * to say: a reader who has recorded a pregnancy or a peanut allergy gets a
   * different, safer answer than one who has not. Showing the gap is the most
   * useful thing this screen does. Counted from the saved record rather than
   * live input, so it moves on save instead of on keystroke.
   */
  const filled = [
    profile.heightCm,
    profile.weightKg,
    profile.bloodGroup,
    profile.conditions.length > 0 ? "y" : null,
    profile.medications.length > 0 ? "y" : null,
  ].filter(Boolean).length;

  return (
    <SettingsScreen
      title="Health profile"
      eyebrow="Conditions, allergies and medicines"
      icon={HeartPulse}
      footer={<SaveButton onPress={() => void save()} pending={pending} saved={saved} />}
    >
      <View className="mx-5 mt-4 gap-1.5">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-[12.5px] font-semibold text-ink-700">Health profile</Text>
          <Text className="text-[11.5px] text-ink-300">{filled} of 5</Text>
        </View>
        <Meter value={filled} total={5} />
        <Text className="text-[11.5px] leading-[16px] text-ink-300">
          {filled === 5
            ? "All set. Ask Baymax can factor every one of these into an answer."
            : "The more of this Baymax knows, the more careful its answers can be."}
        </Text>
      </View>

      {/*
       * Said plainly and kept near the top. This screen is the one place the
       * app stores clinical facts ABOUT the reader, and the distinction between
       * "you told us" and "we worked it out" is the difference between a
       * summary and a diagnosis.
       */}
      <View className="mx-5 mt-4 flex-row items-start gap-2 rounded-card bg-brand-50 px-4 py-3">
        <Info size={15} color={brand[500]} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] leading-[17px] text-ink-700">
          This is your own summary, not a diagnosis. Baymax never edits it and never infers it from
          your reports.
        </Text>
      </View>

      <View className="mx-5 mt-5 gap-4">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Field
              label="Height (cm)"
              value={heightCm}
              onChangeText={setHeightCm}
              error={errors.heightCm}
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Field
              label="Weight (kg)"
              value={weightKg}
              onChangeText={setWeightKg}
              error={errors.weightKg}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <ChipSelect
          label="Blood group"
          options={BLOOD_GROUPS}
          value={bloodGroup}
          onChange={setBloodGroup}
        />

        <Field
          label="Known conditions"
          placeholder="Comma-separated, e.g. Type 2 diabetes, Hypertension"
          value={conditions}
          onChangeText={setConditions}
          error={errors.conditions}
          multiline
          style={{ minHeight: 72, textAlignVertical: "top" }}
        />

        <Field
          label="Current medications"
          placeholder={"One per line: Name | Dose | Frequency\ne.g. Metformin | 500 mg | twice daily"}
          value={medications}
          onChangeText={setMedications}
          error={errors.medications}
          multiline
          style={{ minHeight: 108, textAlignVertical: "top" }}
          hint="Baymax reads these to spot interactions worth asking about. It never suggests a dose."
        />
      </View>

      {message ? (
        <Text
          accessibilityRole="alert"
          className="mx-5 mt-3 text-[13px] font-medium text-danger-text"
        >
          {message}
        </Text>
      ) : null}
    </SettingsScreen>
  );
}
