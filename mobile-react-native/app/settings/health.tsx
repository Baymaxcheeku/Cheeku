import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Info } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { HealthEditor } from "@/components/family/health-editor";
import { SaveButton, SettingsScreen } from "@/components/settings/chrome";
import { activeProfile } from "@/lib/profiles/context";
import { ageFrom, EMPTY_HEALTH, loadMemberHealth, saveMemberHealth, type MemberHealth } from "@/lib/profiles/health";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Health profile, for whoever is being viewed.
 *
 * REWRITTEN 2026-09-30 onto the same editor the add-member flow and the member
 * page use, so the three can never drift: conditions as taps suggested for
 * the person's age, allergies (their own column since migration 0026), one
 * row per medicine, blood group, height and weight. The old screen took
 * conditions as a comma list and medicines as "Name | dose | when" lines.
 *
 * The heading names the person, because this screen follows the member
 * switch, and editing Amma's allergies while believing they are yours is the
 * mistake this app exists to prevent.
 */
export default function HealthProfile() {
  const qc = useQueryClient();
  const context = useQuery({
    queryKey: ["settings-health"],
    queryFn: async () => {
      const active = await activeProfile();
      if (!active) return null;
      const health = await loadMemberHealth(active.id);
      return { active, health };
    },
  });

  const [value, setValue] = useState<MemberHealth>(EMPTY_HEALTH);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (context.data) setValue(context.data.health);
  }, [context.data]);

  async function save() {
    if (!context.data) return;
    setPending(true);
    setError(null);
    const result = await saveMemberHealth(context.data.active.id, value);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    void qc.invalidateQueries({ queryKey: ["settings-health"] });
    void qc.invalidateQueries({ queryKey: ["member-health", context.data.active.id] });
    void qc.invalidateQueries({ queryKey: ["ask-context"] });
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

  const active = context.data?.active;
  if (!active) {
    return (
      <SettingsScreen title="Health profile" eyebrow="Conditions, allergies and medicines" icon={HeartPulse}>
        <Text style={{ marginTop: 60, paddingHorizontal: 40, textAlign: "center", fontFamily: font.regular, fontSize: 15, color: ink[500] }}>
          We couldn&apos;t load this profile. Check your connection and try again.
        </Text>
      </SettingsScreen>
    );
  }

  const first = active.name.split(" ")[0] ?? active.name;

  return (
    <SettingsScreen
      title="Health profile"
      eyebrow={active.isPrimary ? "Your conditions, allergies and medicines" : `${first}'s conditions, allergies and medicines`}
      icon={HeartPulse}
      footer={<SaveButton onPress={() => void save()} pending={pending} saved={saved} />}
    >
      <View className="mx-5 mt-4 flex-row items-start gap-2.5 rounded-[18px] px-4 py-3" style={{ backgroundColor: brand[50] }}>
        <Info size={16} color={brand[600]} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
          {active.isPrimary ? "Yours" : `${first}'s`}, in your own words. Cheeku uses this when reading reports and answering questions, and never
          guesses at a diagnosis.
        </Text>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 22 }}>
        <HealthEditor value={value} onChange={setValue} age={ageFrom(active.dob)} name={active.isPrimary ? undefined : active.name} />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 14, fontFamily: font.medium, fontSize: 13, color: "#c00a1c" }}>
          {error}
        </Text>
      ) : null}
    </SettingsScreen>
  );
}
