import { UserPlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChipSelect, Field } from "@/components/ui/field";
import { addFamilyMember } from "@/lib/settings/actions";
import { brand, ink, shadow } from "@/theme/tokens";

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

type Sex = (typeof SEXES)[number][0];

/**
 * Adds a family member.
 *
 * ONLY IDENTITY IS COLLECTED HERE — a name, how they are related, and the two
 * fields that change how a lab's reference range is read. No conditions, no
 * medications, nothing clinical. Those belong on that member's own Health
 * profile, entered deliberately, rather than being typed about somebody by
 * somebody else in a sheet called "add a member".
 *
 * The seat limit is enforced by `profiles_seat_limit_trigger` in migration
 * 0013. The copy below still explains the limit, because a refusal that only
 * says "no" leaves the reader guessing whether it was them or the app.
 */
export function AddMemberSheet({
  open,
  onClose,
  onAdded,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  /** Called instead of erroring when the plan has no room. */
  onUpgrade: () => void;
}) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setName("");
    setRelationship("");
    setDob("");
    setSex("");
    setErrors({});
    setMessage(null);
    setPending(false);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    setPending(true);
    setErrors({});
    setMessage(null);
    try {
      const result = await addFamilyMember({ name, relationship, dob, sex });
      if (!result.ok) {
        /*
         * A plan refusal is not an error, it is a different destination. Showing
         * "Adding family members is part of the Family plan" in red beside a
         * disabled button tells the reader what they cannot do and not what
         * they can, so this hands straight to the paywall instead.
         */
        if (result.needsUpgrade) {
          close();
          onUpgrade();
          return;
        }
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      reset();
      onAdded();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable
        accessibilityLabel="Close"
        onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }}
      />
      <View
        className="rounded-t-sheet bg-canvas"
        style={{ maxHeight: "88%", paddingTop: 16, paddingBottom: insets.bottom + 12 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-start gap-3 px-5">
            <View className="h-11 w-11 items-center justify-center rounded-tile bg-brand-50">
              <UserPlus size={20} color={brand[600]} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[20px] font-bold leading-[24px] tracking-tight text-ink-900">
                Add a family member
              </Text>
              <Text className="mt-1 text-[12.5px] leading-[18px] text-ink-500">
                Their records stay separate from yours, and only you can see them.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
              style={shadow.e1}
            >
              <X size={17} color={ink[500]} />
            </Pressable>
          </View>

          <View className="mx-5 mt-5 gap-4">
            <Field
              label="Their name"
              required
              value={name}
              onChangeText={setName}
              error={errors.name}
              autoCapitalize="words"
              placeholder="e.g. Ananya"
            />

            <Field
              label="Relationship to you"
              required
              value={relationship}
              onChangeText={setRelationship}
              error={errors.relationship}
              placeholder="e.g. Mother, Son, Spouse"
            />

            <Field
              label="Date of birth"
              placeholder="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
              error={errors.dob}
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
              hint="Optional. Used to read reference ranges, nothing else."
            />

            <ChipSelect label="Sex" options={SEXES} value={sex} onChange={setSex} />
          </View>

          {message ? (
            <Text
              accessibilityRole="alert"
              className="mx-5 mt-3 text-[13px] font-medium text-danger-text"
            >
              {message}
            </Text>
          ) : null}

          <View className="mx-5 mt-5">
            <Pressable
              accessibilityRole="button"
              disabled={pending}
              onPress={() => void submit()}
              className="h-13 items-center justify-center rounded-pill"
              style={{ height: 52, backgroundColor: brand[600], opacity: pending ? 0.6 : 1 }}
            >
              {pending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[16px] font-bold text-white">Add member</Text>
              )}
            </Pressable>
            <Text className="mt-2.5 text-center text-[11.5px] leading-[16px] text-ink-300">
              You can add their reports, conditions and medicines once they are here.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
