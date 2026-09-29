import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowRight,
  Calendar,
  Droplet,
  Mail,
  Phone,
  Ruler,
  Stethoscope,
  User,
  UserCircle,
  Weight,
} from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipSelect, Field } from "@/components/ui/field";
import { profileSchema } from "@/lib/auth/schemas";
import { supabase } from "@/lib/supabase/client";
import { brand, surface } from "@/theme/tokens";

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
  const [email, setEmail] = useState("");
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas">
        <OnboardingHeader back="/who" action={{ label: "Skip", href: "/journey" }} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The mascot is absolutely positioned, so the text needs its own
              gutter or the second headline line runs underneath it. */}
          <View className="relative pr-[38%]">
            <Headline lead="Let's set up your" accent="health profile" />
            <Text className="mt-2 text-[13px] leading-[19px] text-ink-500">
              This helps Cheeku personalize insights and keep your information more accurate.
            </Text>
            <View className="absolute -right-2 top-0" pointerEvents="none">
              <MascotBust size={132} />
            </View>
          </View>

          <Card className="mt-5 p-4">
            <View className="flex-row items-center gap-2">
              <UserCircle size={18} color={brand[500]} />
              <Text className="text-[15px] font-semibold text-ink-900">Basic information</Text>
            </View>
            <Text className="mt-0.5 text-[12px] text-ink-500">
              All fields are optional. You can edit later.
            </Text>

            <View className="mt-3 gap-3">
              <Field
                label="Full name"
                icon={User}
                required
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                autoComplete="name"
                textContentType="name"
                error={errors.fullName}
              />
              {/*
               * A typed date rather than a picker. `dob` accepts any parseable
               * string and the schema is what enforces it, so a plain field
               * with an explicit format keeps the port honest — a native date
               * wheel here would also default to today, which is the one value
               * a date of birth can never be.
               */}
              <Field
                label="Date of birth"
                icon={Calendar}
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                hint="For example 1994-03-21"
                autoCapitalize="none"
                error={errors.dob}
              />
              <ChipSelect
                label="Gender"
                options={SEXES}
                value={sex}
                onChange={setSex}
              />
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
              <Field
                label="Email address"
                icon={Mail}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </Card>

          <Card className="mt-4 p-4">
            <View className="flex-row items-center gap-2">
              <Stethoscope size={18} color={brand[500]} />
              <Text className="text-[15px] font-semibold text-ink-900">Health snapshot</Text>
            </View>
            <Text className="mt-0.5 text-[12px] text-ink-500">
              Helps Cheeku provide more relevant insights.
            </Text>

            <View className="mt-3 gap-3">
              <Field
                label="Height (cm)"
                icon={Ruler}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                keyboardType="number-pad"
                error={errors.heightCm}
              />
              <Field
                label="Weight (kg)"
                icon={Weight}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="72"
                keyboardType="decimal-pad"
                error={errors.weightKg}
              />
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
                placeholder="Diabetes, hypertension…"
                hint="Separate with commas. Leave blank if none."
                error={errors.conditions}
              />
            </View>
          </Card>

          {message ? (
            <Text accessibilityRole="alert" className="mt-4 text-[13px] font-medium text-danger-text">
              {message}
            </Text>
          ) : null}

          <View className="mt-4">
            <ReassuranceStrip>
              Your data is encrypted and stored securely. Only you and your family can access it.
            </ReassuranceStrip>
          </View>
        </ScrollView>

        {/*
         * Pinned below the scroller rather than sitting at the end of it. Ten
         * fields cannot fit one fold at any spacing, and every one of them is
         * optional — so the most common action here is to submit early, and
         * that is exactly the action a button parked below the fold hides.
         */}
        <View
          className="border-t bg-canvas px-5 pt-3"
          style={{ borderTopColor: surface.line, paddingBottom: insets.bottom + 12 }}
        >
          <Button onPress={submit} disabled={pending}>
            <Text className="text-[16px] font-bold text-white">
              {pending ? "Saving…" : "Continue"}
            </Text>
            {pending ? null : <ArrowRight size={18} color="#ffffff" />}
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
