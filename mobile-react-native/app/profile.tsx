import { useRouter } from "expo-router";
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

      const { data: family, error: familyError } = await supabase
        .from("families")
        .insert({ owner_id: user.id })
        .select("id")
        .single();
      if (familyError || !family) {
        setMessage("We couldn't save that. Try again.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        family_id: family.id,
        user_id: user.id,
        name: parsed.data.fullName,
        dob: parsed.data.dob || null,
        sex: parsed.data.sex || null,
        relationship: "self",
        is_primary: true,
        conditions: parsed.data.conditions
          ? parsed.data.conditions.split(",").map((c) => c.trim())
          : [],
      });
      if (profileError) {
        setMessage("We couldn't save that. Try again.");
        return;
      }

      router.push("/first-upload");
    } catch {
      setMessage("Could not reach Baymax. Check your connection and try again.");
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
        <OnboardingHeader back="/who" action={{ label: "Skip", href: "/first-upload" }} />

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
              This helps Baymax personalize insights and keep your information more accurate.
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
              Helps Baymax provide more relevant insights.
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
