import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CalendarHeart, ChevronRight, Dna, HeartPulse, IdCard, Mail, ShieldCheck, UserCog } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { SaveButton, SettingsScreen } from "@/components/settings/chrome";
import { Eyebrow, PersonHero, Reason, Title } from "@/components/settings/editorial";
import { ChipSelect, Field } from "@/components/ui/field";
import { glassShadow } from "@/components/ui/glass";
import { Meter } from "@/components/ui/motion";
import { Reveal } from "@/components/ui/reveal";
import { optimisticQueries } from "@/lib/optimistic";
import { activeProfile } from "@/lib/profiles/context";
import { updatePersonalInfo } from "@/lib/settings/actions";
import { accountEmail, profileDetail } from "@/lib/settings/queries";
import { personalInfoSchema } from "@/lib/settings/schemas";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { FormSkeleton } from "@/components/ui/skeleton";

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

type Sex = (typeof SEXES)[number][0];

/**
 * Personal information — the identity fields on the ACTIVE profile.
 *
 * Editing whoever is currently selected, not always the account owner, because
 * that is whose records the rest of the app is showing. A settings screen that
 * silently edited a different person from the one on Home would be the worst
 * kind of quiet bug in an app that holds several people's medical histories.
 */
export default function PersonalInfo() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const context = useQuery({
    queryKey: ["settings-personal"],
    queryFn: async () => {
      const active = await activeProfile();
      if (!active) return null;
      const [detail, email] = await Promise.all([profileDetail(active.id), accountEmail()]);
      return detail ? { detail, email, avatar: active.avatar, photo: active.photo, image: active.avatarImage, background: active.avatarBackground } : null;
    },
  });

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [relationship, setRelationship] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const detail = context.data?.detail;

  // Seeded once the row arrives. Keyed on the id so switching profile reseeds
  // rather than leaving the previous member's name in the box.
  const seeded = useRef<string | null>(null);
  useEffect(() => {
    // Once per person: a rolled-back save must not wipe what was typed.
    if (!detail || seeded.current === detail.id) return;
    seeded.current = detail.id;
    setName(detail.name);
    setDob(detail.dob ?? "");
    setSex((detail.sex as Sex | null) ?? "");
    setRelationship(detail.relationship ?? "");
  }, [detail?.id, detail]);

  /*
   * INSTANT SAVE. The fields are checked here first, so a typo still shows
   * against its field before anything is "saved". Then the screen says Saved
   * at once and the write runs behind it; if it fails, the saved copy goes
   * back to how it was, the typed values stay in the boxes, and the save bar
   * offers Retry (lib/optimistic.ts).
   */
  function save() {
    if (!detail) return;
    setErrors({});
    setMessage(null);
    const input = { profileId: detail.id, name, dob, sex, relationship };
    const checked = personalInfoSchema.safeParse(input);
    if (!checked.success) {
      const fields: Record<string, string> = {};
      for (const issue of checked.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !fields[key]) fields[key] = issue.message;
      }
      setErrors(fields);
      setMessage("Check the fields below.");
      return;
    }
    setSaved(true);
    void optimisticQueries(
      queryClient,
      [
        {
          key: ["settings-personal"],
          update: (old) => {
            const o = old as NonNullable<typeof context.data>;
            return { ...o, detail: { ...o.detail, name: name.trim(), dob: dob || null, sex: sex || null, relationship: relationship || null } };
          },
        },
      ],
      {
        write: () => updatePersonalInfo(input),
        message: "Couldn't save your details. Check your connection.",
        // The name shows in the greeting, the switcher and the record headers.
        onSaved: () => void queryClient.invalidateQueries(),
      },
    ).then((ok) => {
      if (!ok) setSaved(false);
    });
  }

  if (context.isPending) {
    return (
      <SettingsScreen title="Personal information" eyebrow="Name, date of birth and contact" icon={UserCog}>
        <View className="px-5">
          <FormSkeleton fields={5} />
        </View>
      </SettingsScreen>
    );
  }

  if (!detail) {
    return (
      <SettingsScreen title="Personal information" eyebrow="Name, date of birth and contact" icon={UserCog}>
        <Text className="mt-16 px-10 text-center text-base text-ink-500">
          Set up a profile first.
        </Text>
      </SettingsScreen>
    );
  }

  /*
   * Counted from the SAVED record, not from what is currently typed, so the
   * meter moves on save. A bar that fills as you type is measuring keystrokes
   * and rewards you for work you have not committed.
   */
  const filled = [detail.name, detail.dob, detail.sex].filter(Boolean).length;

  const first = detail.name.split(" ")[0] ?? detail.name;

  return (
    <SettingsScreen
      title="Personal information"
      eyebrow="Name, date of birth and contact"
      icon={UserCog}
      bare
      footer={<SaveButton onPress={save} pending={false} saved={saved} />}
    >
      <Reveal>
        <PersonHero
          eyebrow={detail.isPrimary ? "Your details" : `${first}'s details`}
          name={detail.name}
          sub={detail.isPrimary ? "Your own profile" : (detail.relationship ?? "Family member")}
          avatar={{ svg: context.data?.avatar ?? "", photo: context.data?.photo, image: context.data?.image, background: context.data?.background }}
        >
          <View style={{ marginTop: 16, padding: 14, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.85)" }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{filled === 3 ? "All the basics are in" : "The basics"}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{filled} of 3</Text>
            </View>
            <View style={{ marginTop: 8 }}>
              <Meter value={filled} total={3} />
            </View>
          </View>
        </PersonHero>
      </Reveal>

      {/* The sign-in email belongs to the account holder, so it only shows on
          their own profile. On a family member's it would read as theirs. */}
      {!detail.isPrimary ? (
        <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/family/[id]", params: { id: detail.id } })}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: pressed ? brand[100] : brand[50] })}
          >
            <HeartPulse size={17} color={brand[600]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>
              {first}&apos;s photo, health basics and past reports live on their page.
            </Text>
            <ChevronRight size={17} color={brand[600]} />
          </Pressable>
        </Reveal>
      ) : context.data?.email ? (
        <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: surface.line }}>
            <Mail size={17} color={brand[600]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{context.data.email}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>Sign-in email. Only you see this.</Text>
            </View>
          </View>
        </Reveal>
      ) : null}

      <Reveal style={{ marginHorizontal: 20, marginTop: 16 }}>
        <View style={[glassShadow, { borderRadius: 32, backgroundColor: "#fff", padding: 18, gap: 16 }]}>
          <Field label="Full name" required value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />

          <Field
            label="Date of birth"
            placeholder="YYYY-MM-DD"
            value={dob}
            onChangeText={setDob}
            error={errors.dob}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            hint="Used to read normal ranges. Nothing else."
          />

          <ChipSelect label="Sex" options={SEXES} value={sex} onChange={setSex} />

          {!detail.isPrimary ? (
            <Field
              label="Relationship to you"
              placeholder="e.g. Mother, Son, Spouse"
              value={relationship}
              onChangeText={setRelationship}
              error={errors.relationship}
            />
          ) : null}
        </View>
      </Reveal>

      {message ? (
        <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 12, fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>
          {message}
        </Text>
      ) : null}

      <Reveal style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <Eyebrow>Why we ask</Eyebrow>
        <Title>Three details, better answers</Title>
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 14 }}>
        <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 18, gap: 16 }]}>
          <Reason icon={CalendarHeart} lead="Date of birth" text="Normal changes with age. A 3-week-old and a 40-year-old read the same lab value very differently." />
          <Reason icon={Dna} lead="Sex" text="Labs set different ranges for haemoglobin, iron and hormones. Cheeku uses the same ones your lab does." />
          <Reason icon={IdCard} lead="Name" text="So every answer and every doctor note says clearly who it's about." />
        </View>
      </Reveal>

      <Reveal style={{ marginHorizontal: 20, marginTop: 18, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
          These stay inside your account. They&apos;re never sold, never shown to anyone else, and you can change them any time.
        </Text>
      </Reveal>
    </SettingsScreen>
  );
}
