import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Calendar,
  Droplet,
  HeartPulse,
  Phone,
  Ruler,
  User,
  UserCircle,
  Weight,
} from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { CtaLabel, Headline, StepLabel, Lede, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Boop, FillBar } from "@/components/onboarding/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect, Field } from "@/components/ui/field";
import { profileSchema } from "@/lib/auth/schemas";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * The profile meter's voice. Keyed on how many of the eight fields on THIS
 * FORM have something in them — it says "x of 8" and nothing more, so it never
 * claims to know the reader better than the form does.
 */
function powerLine(filled: number, total: number): string {
  if (filled === 0) return "Start with your name";
  if (filled === 1) return "Nice start!";
  if (filled < total / 2) return "Getting to know you";
  if (filled < total) return "Almost there";
  return "Now we're talking!";
}

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

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

type Sex = (typeof SEXES)[number][0];
type BloodGroup = (typeof BLOOD_GROUPS)[number][0];

/**
 * A5 — profile intake. Every field except the name is genuinely optional: this
 * is health data, and collecting it because a form has room is the opposite of
 * data minimisation.
 *
 * PORT NOTE. The web build posted to the `saveProfile` server action. There is
 * no server action here, so the two inserts run against Supabase directly under
 * the same RLS the action relied on — the policies, not the action, were always
 * what made this safe. Validation is re-run with the SAME schema either way,
 * because the client is not the thing that gets to decide a date is a date.
 */
export default function Profile() {
  /*
   * The face chosen on /who, handed over in the navigation rather than parked
   * in storage. Absent when they skipped the picker or arrived here directly,
   * in which case the avatar is derived from the profile id as before.
   */
  const { avatar } = useLocalSearchParams<{ avatar?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [phone, setPhone] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroup | "">("");
  const [conditions, setConditions] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setMessage(null);

    const parsed = profileSchema.safeParse({
      fullName,
      dob,
      sex,
      phone,
      heightCm,
      weightKg,
      bloodGroup,
      conditions,
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setMessage("Check the fields below.");
      return;
    }

    setErrors({});
    setPending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Your session expired. Please sign in again.");
        return;
      }

      /*
       * REUSE the family when this account already has one.
       *
       * This used to insert unconditionally, so running onboarding a second
       * time — a reinstall, a back-navigation, a resumed signup — created a
       * SECOND family for the same owner, and nothing said which was the
       * account's. `getEntitlement` resolves the family with `.maybeSingle()`,
       * which errors on two rows and falls through to the free entitlement, so
       * a paying account displayed "Free Plan" with a 5-chat allowance.
       *
       * Migration 0014 merged the duplicates and added a unique index. This is
       * the other half: the index makes a second family impossible, and this
       * makes the app stop trying.
       */
      const { data: existing } = await supabase
        .from("families")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      let familyId = existing?.id as string | undefined;
      if (!familyId) {
        const { data: created, error: familyError } = await supabase
          .from("families")
          .insert({ owner_id: user.id })
          .select("id")
          .single();
        if (familyError || !created) {
          setMessage("We couldn't save that. Try again.");
          return;
        }
        familyId = created.id as string;
      }

      /*
       * The health snapshot, which used to be collected and thrown away.
       *
       * Height, weight and blood group were validated by the schema and then
       * left out of the insert entirely, so somebody could type 169, 97 and A+
       * and watch all three vanish. The columns existed the whole time. The
       * phone number had it worse: there was no column at all until 0020.
       *
       * Blanks stay NULL rather than becoming zero. A missing weight and a
       * weight of nothing are different facts, and only one of them is true.
       */
      const fields = {
        name: parsed.data.fullName,
        dob: parsed.data.dob || null,
        sex: parsed.data.sex || null,
        phone: parsed.data.phone || null,
        height_cm: parsed.data.heightCm === "" ? null : parsed.data.heightCm,
        weight_kg: parsed.data.weightKg === "" ? null : parsed.data.weightKg,
        blood_group: parsed.data.bloodGroup || null,
        conditions: parsed.data.conditions
          ? parsed.data.conditions
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
      };

      /*
       * ┌─ WHY THIS IS NOT A PLAIN INSERT ────────────────────────────────────┐
       * │                                                                     │
       * │ It was, and reaching this screen a second time failed outright with │
       * │ "We couldn't save that". Migration 0013 enforces one primary        │
       * │ profile per family with a unique index, so the second insert raised │
       * │ 23505 — and the screen reported it as though the DATA were bad,     │
       * │ which sends people back to edit fields that were perfectly fine.    │
       * │                                                                     │
       * │ Arriving here again is not an error: a reinstall, a back            │
       * │ navigation, a resumed signup, or a second tap on Continue all land  │
       * │ here with a primary profile already in place. The right behaviour   │
       * │ is to update it. Same reasoning as the family lookup above, which   │
       * │ had already been fixed for exactly this reason — the other half of  │
       * │ that bug was left standing.                                         │
       * │                                                                     │
       * └─────────────────────────────────────────────────────────────────────┘
       *
       * `avatar_seed` is written only when a face was actually picked, so
       * coming back through onboarding without touching the tray cannot erase
       * a face chosen earlier.
       */
      const seed = typeof avatar === "string" && avatar ? avatar : null;

      const { data: mine } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      const { error: profileError } = mine?.id
        ? await supabase
            .from("profiles")
            .update(seed ? { ...fields, avatar_seed: seed } : fields)
            .eq("id", mine.id as string)
        : await supabase.from("profiles").insert({
            ...fields,
            family_id: familyId,
            user_id: user.id,
            relationship: "self",
            is_primary: true,
            avatar_seed: seed,
          });

      if (profileError) {
        /*
         * The CODE, never the message. Postgres error text quotes the row it
         * rejected, and these rows hold health data — a constraint violation
         * on `conditions` would put somebody's diagnosis into a log. A code is
         * enough to tell 23505 from 42703, which is precisely what was missing
         * while this bug was live.
         */
        console.warn("profile save failed", profileError.code);
        setMessage("We couldn't save that. Try again.");
        return;
      }

      router.push("/journey");
    } catch {
      setMessage("Could not reach Cheeku AI. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const answers = [fullName, dob, sex, phone, heightCm, weightKg, bloodGroup, conditions];
  const filled = answers.filter((a) => a.trim() !== "").length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas">
        <OnboardingHeader back="/who" action={{ label: "Skip", href: "/journey" }} step={2} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The mascot is absolutely positioned, so the text keeps a gutter. */}
          <View className="relative pr-[30%]">
            <StepLabel step={2} />
            <Headline lead="A few basics" accent="about you" />
            <Lede>
              Only your name is needed. The rest helps me read your lab ranges the way your lab
              intends.
            </Lede>
            <View className="absolute -right-3 -top-1" pointerEvents="none">
              <MascotBust size={112} moment="idle" move="float" />
            </View>
          </View>

          <Section icon={UserCircle} title="About you" note="Only the name is required">
            <Field
              label="Full name"
              icon={User}
              required
              value={fullName}
              onChangeText={setFullName}
              placeholder="What should I call you?"
              autoComplete="name"
              textContentType="name"
              error={errors.fullName}
            />
            {/*
             * A typed date rather than a picker. `dob` accepts any parseable
             * string and the schema enforces it; a native wheel would also
             * default to today, the one value a birth date can never be.
             */}
            <Field
              label="Date of birth"
              icon={Calendar}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              hint="Year first, like 1994-03-21"
              autoCapitalize="none"
              error={errors.dob}
            />
            <ChipSelect label="Sex" options={SEXES} value={sex} onChange={setSex} />
            <Field
              label="Phone number"
              icon={Phone}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              error={errors.phone}
            />
          </Section>

          <Section icon={HeartPulse} title="Health snapshot" note="All optional, all editable later">
            {/* Side by side: two short numbers do not each need a full row. */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Height (cm)"
                  icon={Ruler}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="165"
                  keyboardType="number-pad"
                  error={errors.heightCm}
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Weight (kg)"
                  icon={Weight}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="62"
                  keyboardType="decimal-pad"
                  error={errors.weightKg}
                />
              </View>
            </View>
            <ChipSelect
              label="Blood group"
              icon={Droplet}
              options={BLOOD_GROUPS}
              value={bloodGroup}
              onChange={setBloodGroup}
            />
            <Field
              label="Known conditions"
              value={conditions}
              onChangeText={setConditions}
              placeholder="Thyroid, BP, diabetes…"
              hint="Separate with commas. Leave blank if none."
              error={errors.conditions}
            />
          </Section>

          <View className="mt-5">
            <ReassuranceStrip />
          </View>
        </ScrollView>

        {/*
         * Pinned below the scroller. Every field is optional, so the most
         * common action is to submit early, and a button below the fold hides
         * exactly that. The meter rides with it so progress is always in view.
         */}
        <View
          className="gap-3 border-t bg-canvas px-6 pt-3"
          style={{ borderTopColor: surface.line, paddingBottom: insets.bottom + 12 }}
        >
          <View
            className="flex-row items-center gap-3"
            accessible
            accessibilityLabel={`${filled} of ${answers.length} fields filled. ${powerLine(filled, answers.length)}`}
          >
            <Boop trigger={filled}>
              <View className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#fff" }}>{filled}</Text>
              </View>
            </Boop>
            <View className="flex-1 gap-1.5">
              <View className="flex-row items-baseline justify-between">
                <Text style={type.label}>{powerLine(filled, answers.length)}</Text>
                <Text style={[type.caption, { color: ink[300] }]}>
                  {filled} of {answers.length}
                </Text>
              </View>
              <FillBar value={filled / answers.length} color={brand[600]} track={brand[100]} height={6} />
            </View>
          </View>

          {message ? (
            <Text
              accessibilityRole="alert"
              style={{ fontFamily: font.medium, fontSize: 13.5, color: semantic.dangerText }}
            >
              {message}
            </Text>
          ) : null}

          <Button onPress={submit} disabled={pending}>
            {pending ? <Text style={type.button}>Saving…</Text> : <CtaLabel>Save and continue</CtaLabel>}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** A soft card holding one group of fields. */
function Section({
  icon: Icon,
  title,
  note,
  children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-5 p-5">
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: brand[50] }}>
          <Icon size={18} color={brand[600]} />
        </View>
        <View>
          <Text style={[type.heading, { fontSize: 18, lineHeight: 22 }]}>{title}</Text>
          <Text style={[type.caption, { color: ink[500] }]}>{note}</Text>
        </View>
      </View>
      <View className="mt-4 gap-4">{children}</View>
    </Card>
  );
}
