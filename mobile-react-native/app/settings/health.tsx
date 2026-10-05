import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Info, Pill, ShieldAlert, ShieldCheck, Stethoscope, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { HealthEditor } from "@/components/family/health-editor";
import { SaveButton, SettingsScreen } from "@/components/settings/chrome";
import { Eyebrow, PersonHero, Reason, Title } from "@/components/settings/editorial";
import { brandify } from "@/components/ui/brand";
import { glassShadow } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { optimisticQueries } from "@/lib/optimistic";
import { activeProfile } from "@/lib/profiles/context";
import { ageFrom, checkMemberHealth, EMPTY_HEALTH, loadMemberHealth, saveMemberHealth, type MemberHealth } from "@/lib/profiles/health";
import { brand, ink, semantic } from "@/theme/tokens";
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filled in once per person, so a rolled-back save never wipes what was typed.
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    if (!context.data || seeded.current === context.data.active.id) return;
    seeded.current = context.data.active.id;
    setValue(context.data.health);
  }, [context.data]);

  /*
   * INSTANT SAVE. Checked here first (height and weight ranges), then Saved
   * shows at once and the write runs behind it. A failed write puts the saved
   * copy back, keeps the typed values, and the save bar offers Retry.
   */
  function save() {
    if (!context.data) return;
    const id = context.data.active.id;
    setError(null);
    const invalid = checkMemberHealth(value);
    if (invalid) {
      setError(invalid.message);
      return;
    }
    const next = value;
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    void optimisticQueries(qc, [{ key: ["settings-health"], update: (old) => ({ ...(old as NonNullable<typeof context.data>), health: next }) }], {
      write: () => saveMemberHealth(id, next),
      message: "Couldn't save the health profile. Check your connection.",
      onSaved: () => {
        void qc.invalidateQueries({ queryKey: ["settings-health"] });
        void qc.invalidateQueries({ queryKey: ["member-health", id] });
        void qc.invalidateQueries({ queryKey: ["ask-context"] });
      },
    }).then((ok) => {
      if (!ok) setSaved(false);
    });
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
  const age = ageFrom(active.dob);
  const stats: { icon: LucideIcon; n: number; one: string; many: string }[] = [
    { icon: Stethoscope, n: value.conditions.length, one: "condition", many: "conditions" },
    { icon: ShieldAlert, n: value.allergies.length, one: "allergy", many: "allergies" },
    { icon: Pill, n: value.medications.length, one: "medicine", many: "medicines" },
  ];

  return (
    <SettingsScreen
      title="Health profile"
      eyebrow={active.isPrimary ? "Your conditions, allergies and medicines" : `${first}'s conditions, allergies and medicines`}
      icon={HeartPulse}
      bare
      footer={<SaveButton onPress={save} pending={false} saved={saved} />}
    >
      <Reveal>
        <PersonHero
          eyebrow={active.isPrimary ? "Your health profile" : `${first}'s health profile`}
          name={active.name}
          sub={[age !== null ? (age === 0 ? "Under a year old" : `${age} years old`) : null, value.bloodGroup ? `Blood group ${value.bloodGroup}` : null].filter(Boolean).join("  ·  ") || "The basics Cheeku reads against"}
          avatar={{ svg: active.avatar, photo: active.photo, image: active.avatarImage, background: active.avatarBackground }}
        >
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {stats.map((st) => (
              <View key={st.one} style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.85)" }}>
                <st.icon size={16} color={brand[600]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900], marginTop: 6 }}>{st.n}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{st.n === 1 ? st.one : st.many}</Text>
              </View>
            ))}
          </View>
        </PersonHero>
      </Reveal>

      <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 20, backgroundColor: brand[50] }}>
          <Info size={16} color={brand[600]} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>
            {brandify(`In ${active.isPrimary ? "your" : `${first}'s`} own words. Cheeku reads every report and every symptom against this, and never guesses at a diagnosis.`)}
          </Text>
        </View>
      </Reveal>

      {/* Full width, not in a card: the editor's medicine and height rows are
          laid out for the screen's own margins and overflow inside padding. */}
      <Reveal style={{ marginHorizontal: 20, marginTop: 22 }}>
        <HealthEditor value={value} onChange={setValue} age={age} name={active.isPrimary ? undefined : active.name} />
      </Reveal>

      {error ? (
        <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 14, fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>
          {error}
        </Text>
      ) : null}

      <Reveal style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <Eyebrow>How it&apos;s used</Eyebrow>
        <Title>A few lines that change every answer</Title>
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 14 }}>
        <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 18, gap: 16 }]}>
          <Reason icon={Stethoscope} lead="Conditions" text="A sugar reading means something different for someone with diabetes. Cheeku reads results with that in mind." />
          <Reason icon={ShieldAlert} lead="Allergies" text="Kept in mind on every answer and written into every doctor note, so nobody has to remember them under pressure." />
          <Reason icon={Pill} lead="Medicines" text="Checked against each other for overlaps, like two products with the same ingredient. Cheeku never changes a dose." />
        </View>
      </Reveal>

      <Reveal style={{ marginHorizontal: 20, marginTop: 18, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500] }}>
          Kept in {active.isPrimary ? "your" : `${first}'s`} file only, never mixed with anyone else&apos;s and never shared outside your account.
        </Text>
      </Reveal>
    </SettingsScreen>
  );
}
