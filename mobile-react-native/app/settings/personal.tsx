import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, UserCog } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Panel, SaveButton, SettingsScreen } from "@/components/settings/chrome";
import { ChipSelect, Field } from "@/components/ui/field";
import { Meter } from "@/components/ui/motion";
import { activeProfile } from "@/lib/profiles/context";
import { updatePersonalInfo } from "@/lib/settings/actions";
import { accountEmail, profileDetail } from "@/lib/settings/queries";
import { brand, ink } from "@/theme/tokens";

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

  const context = useQuery({
    queryKey: ["settings-personal"],
    queryFn: async () => {
      const active = await activeProfile();
      if (!active) return null;
      const [detail, email] = await Promise.all([profileDetail(active.id), accountEmail()]);
      return detail ? { detail, email, avatar: active.avatar } : null;
    },
  });

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [relationship, setRelationship] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  const detail = context.data?.detail;

  // Seeded once the row arrives. Keyed on the id so switching profile reseeds
  // rather than leaving the previous member's name in the box.
  useEffect(() => {
    if (!detail) return;
    setName(detail.name);
    setDob(detail.dob ?? "");
    setSex((detail.sex as Sex | null) ?? "");
    setRelationship(detail.relationship ?? "");
  }, [detail?.id, detail]);

  async function save() {
    if (!detail) return;
    setPending(true);
    setSaved(false);
    setErrors({});
    setMessage(null);
    try {
      const result = await updatePersonalInfo({
        profileId: detail.id,
        name,
        dob,
        sex,
        relationship,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setSaved(true);
      // The name shows in the greeting, the switcher and the record headers.
      await queryClient.invalidateQueries();
    } finally {
      setPending(false);
    }
  }

  if (context.isPending) {
    return (
      <SettingsScreen title="Personal information" eyebrow="Name, date of birth and contact" icon={UserCog}>
        <View className="mt-16 items-center">
          <ActivityIndicator color={brand[600]} />
        </View>
      </SettingsScreen>
    );
  }

  if (!detail) {
    return (
      <SettingsScreen title="Personal information" eyebrow="Name, date of birth and contact" icon={UserCog}>
        <Text className="mt-16 px-10 text-center text-[15px] text-ink-500">
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

  return (
    <SettingsScreen
      title="Personal information"
      eyebrow="Name, date of birth and contact"
      icon={UserCog}
      footer={<SaveButton onPress={() => void save()} pending={pending} saved={saved} />}
    >
      <View className="mt-4">
        <Panel>
          <View className="flex-row items-center gap-3">
            <Avatar svg={context.data?.avatar ?? ""} size={56} />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-semibold text-ink-900" numberOfLines={1}>
                {detail.name}
              </Text>
              <Text className="text-[12px] text-ink-500">
                {detail.isPrimary ? "Your own profile" : (detail.relationship ?? "Family member")}
              </Text>
            </View>
          </View>
        </Panel>
      </View>

      {context.data?.email ? (
        <View className="mx-5 mt-3 flex-row items-center gap-3 rounded-card bg-brand-50 px-4 py-3">
          <Mail size={16} color={brand[500]} />
          <Text className="min-w-0 flex-1 text-[13px] text-ink-700" numberOfLines={1}>
            {context.data.email}
          </Text>
          <Text className="text-[11px] text-ink-500">Sign-in email</Text>
        </View>
      ) : null}

      <View className="mx-5 mt-4 gap-1.5">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-[12.5px] font-semibold text-ink-700">Profile details</Text>
          <Text className="text-[11.5px] text-ink-300">{filled} of 3</Text>
        </View>
        <Meter value={filled} total={3} />
        <Text className="text-[11.5px] leading-[16px] text-ink-300">
          Age and sex let Baymax read a lab&apos;s reference range the way your lab intends it.
        </Text>
      </View>

      <View className="mx-5 mt-5 gap-4">
        <Field
          label="Full name"
          required
          value={name}
          onChangeText={setName}
          error={errors.name}
          autoCapitalize="words"
        />

        <Field
          label="Date of birth"
          placeholder="YYYY-MM-DD"
          value={dob}
          onChangeText={setDob}
          error={errors.dob}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          hint="Used to read reference ranges. Nothing else."
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
