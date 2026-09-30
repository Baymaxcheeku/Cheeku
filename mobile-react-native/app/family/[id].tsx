import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeftRight, Check, ChevronRight, Lock, Trash2, UserCog } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/family/avatar-picker";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Field } from "@/components/ui/field";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { generatedAvatar } from "@/lib/profiles/avatar";
import {
  listMembers,
  refreshRoster,
  removeMember,
  updateAvatar,
  updateMember,
  useFamily,
  useSwitchMember,
} from "@/lib/profiles/family";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One family member: switch to them, change their face or details, or remove
 * them.
 *
 * THE ACCOUNT HOLDER is different on purpose. Their name, birthday and sex
 * live on Personal information, which also feeds sign-in and receipts, so
 * here they only get the face picker and a link across. They cannot be
 * removed; the database refuses it too (migration 0025). Removing yourself
 * is "Delete account", which is a different, louder decision.
 *
 * REMOVING is permanent, and the sheet says exactly what goes, with the
 * report count, before anything happens. Files are deleted before rows, so a
 * half-finished removal can never leave a scan in storage with nothing
 * pointing at it (lib/profiles/family.ts).
 */

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Rather not"],
] as const;

function firstName(name: string) {
  return name.trim().split(" ")[0] ?? name;
}

export default function Member() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const members = useQuery({ queryKey: ["family-members"], queryFn: listMembers });

  const index = members.data?.members.findIndex((m) => m.id === id) ?? -1;
  const member = index >= 0 ? members.data?.members[index] : undefined;

  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [seed, setSeed] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setRelationship(member.relationship ?? "");
    setDob(member.dob ?? "");
    setSex(member.sex ?? "");
    setSeed(member.avatarSeed ?? "");
  }, [member]);

  if (!member) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Family member" fallback="/family" />
        {members.isSuccess ? (
          <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>
            This person isn&apos;t in your family any more.
          </Text>
        ) : null}
      </View>
    );
  }

  const derived = generatedAvatar(member.id, index);
  const face = seed ? generatedAvatar(seed, 0) : derived;
  const viewing = family.data?.profile?.id === member.id;
  const dirty = member.isPrimary
    ? seed !== (member.avatarSeed ?? "")
    : name !== member.name ||
      relationship !== (member.relationship ?? "") ||
      dob !== (member.dob ?? "") ||
      sex !== (member.sex ?? "") ||
      seed !== (member.avatarSeed ?? "");

  async function save() {
    if (!member) return;
    setSaving(true);
    setErrors({});
    setMessage(null);
    const result = member.isPrimary
      ? await updateAvatar(member.id, seed || null)
      : await updateMember(member.id, { name, relationship, dob, sex, avatarSeed: seed });
    setSaving(false);
    if (!result.ok) {
      setErrors(("fieldErrors" in result && result.fieldErrors) || {});
      setMessage(result.message);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    refreshRoster(qc);
  }

  async function remove() {
    if (!member) return;
    const result = await removeMember(member.id);
    if (!result.ok) {
      setConfirm(false);
      setMessage(result.message);
      return;
    }
    setConfirm(false);
    refreshRoster(qc);
    router.back();
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop height={460} />
      <ScreenHeader title={member.isPrimary ? "You" : firstName(member.name)} fallback="/family" />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Hero. */}
        <View style={[glassShadow, { borderRadius: 30, overflow: "hidden", paddingVertical: 22, alignItems: "center" }]}>
          <Gradient from={face.background} to="#ffffff" angle="vertical" glow="#ffffff" />
          <Animated.View key={seed || "derived"} entering={still ? undefined : ZoomIn.springify().damping(14)} style={{ borderRadius: 999, borderWidth: 4, borderColor: "#fff", opacity: member.locked ? 0.5 : 1 }}>
            <Avatar svg={face.svg} background={face.background} size={96} />
          </Animated.View>
          <Text style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: ink[900], marginTop: 12 }}>{member.name}</Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: ink[500], marginTop: 2 }}>
            {member.isPrimary ? "Account holder" : (member.relationship ?? "Family")} · {member.reports === 1 ? "1 report" : `${member.reports} reports`}
          </Text>
          {viewing ? (
            <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 30, borderRadius: 999, backgroundColor: brand[600] }}>
              <Check size={13} color="#fff" strokeWidth={3} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: "#fff" }}>Viewing now</Text>
            </View>
          ) : !member.locked ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void switchMember(member.id);
                router.replace("/home");
              }}
              style={({ pressed }) => [glassShadow, { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 999, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
            >
              <ArrowLeftRight size={14} color={ink[900]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>Switch to {firstName(member.name)}</Text>
            </Pressable>
          ) : null}
        </View>

        {member.locked ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings/subscription")}
            style={({ pressed }) => ({ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 20, backgroundColor: pressed ? "#ece8ff" : brand[50] })}
          >
            <Lock size={17} color={brand[700]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>
              {firstName(member.name)} is paused on your current plan. Their records are safe.{" "}
              <Text style={{ fontFamily: font.semibold, color: brand[700] }}>Family opens them again.</Text>
            </Text>
          </Pressable>
        ) : null}

        {/* Face. */}
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 12 }}>Face</Text>
        <Glass strong className="rounded-[26px] p-4">
          <AvatarPicker value={seed} onChange={setSeed} derived={derived} size={50} />
        </Glass>

        {/* Details. */}
        {member.isPrimary ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/settings/personal")}
            style={({ pressed }) => [glassShadow, { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
          >
            <UserCog size={19} color={ink[700]} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Your name and details</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>Edited in Personal information</Text>
            </View>
            <ChevronRight size={18} color={ink[300]} />
          </Pressable>
        ) : (
          <>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 12 }}>Details</Text>
            <View style={{ gap: 14 }}>
              <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" error={errors.name} />
              <Field label="Relationship to you" value={relationship} onChangeText={setRelationship} error={errors.relationship} />
              <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" error={errors.dob} hint="Helps read their reports against the right ranges." />
            </View>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700], marginTop: 16, marginBottom: 8 }}>Sex</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {SEXES.map(([value, label]) => {
                const on = sex === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setSex(on ? "" : value)}
                    style={{ flex: 1, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[50] : glass.fillStrong, borderWidth: 1.5, borderColor: on ? brand[500] : "rgba(15,16,48,0.08)" }}
                  >
                    <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 12.5, color: on ? brand[700] : ink[700] }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {message ? (
          <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 14 }}>{message}</Text>
        ) : null}

        {/* Remove. */}
        {!member.isPrimary ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirm(true)}
            style={({ pressed }) => ({ marginTop: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 999, backgroundColor: pressed ? "#fde4e7" : semantic.dangerBg })}
          >
            <Trash2 size={17} color={semantic.dangerText} />
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Remove {firstName(member.name)} from family</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {dirty || saved ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
          <PillButton tone={saved ? "light" : "dark"} loading={saving} disabled={saved} onPress={() => void save()} icon={saved ? <Check size={17} color={ink[900]} /> : undefined}>
            {saved ? "Saved" : "Save changes"}
          </PillButton>
        </View>
      ) : null}

      <ConfirmSheet
        open={confirm}
        title={`Remove ${firstName(member.name)} for good?`}
        body={`This deletes ${firstName(member.name)}'s ${member.reports === 1 ? "report" : `${member.reports} reports`}, their chats with Cheeku and their health profile. It can't be undone, so download anything you want to keep first.`}
        confirmLabel={`Remove ${firstName(member.name)}`}
        cancelLabel="Keep them"
        destructive
        onConfirm={remove}
        onClose={() => setConfirm(false)}
      />
    </KeyboardAvoidingView>
  );
}
