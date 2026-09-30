import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowRight, Camera, Check, Lock } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInRight, FadeOutLeft, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/family/avatar-picker";
import { Avatar } from "@/components/ui/avatar";
import { Field } from "@/components/ui/field";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { avatarPicks, generatedAvatar } from "@/lib/profiles/avatar";
import { familyMode, refreshRoster, useFamily, useSwitchMember } from "@/lib/profiles/family";
import { addFamilyMember } from "@/lib/settings/actions";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Add a family member, as three short steps and a hello.
 *
 * Was one sheet with four fields and a button. That asked for a name before
 * saying who the person was, typed "Mother" into a text box, and gave every
 * new member a face chosen by dice. Now:
 *
 *   1  Who are you adding?      one tap on a relationship
 *   2  What do you call them?   name + face, with a live card that fills in
 *   3  Two small details        date of birth and sex, both skippable
 *   ✓  Amma's in                switch to her, add her first report, or done
 *
 * The preview card at the top is the same card the tray shows, so the reader
 * sees exactly what they are making while they make it.
 *
 * STILL ONLY IDENTITY. No conditions, medicines or history here; those go on
 * the member's own health profile, entered on purpose, not typed about
 * someone in a quick form.
 */

const RELATIONS = [
  ["Mother", "e.g. Amma, Mummy, Maa"],
  ["Father", "e.g. Papa, Appa, Abbu"],
  ["Spouse", "e.g. Riya"],
  ["Son", "e.g. Aarav"],
  ["Daughter", "e.g. Kiara"],
  ["Sister", "e.g. Ananya"],
  ["Brother", "e.g. Kabir"],
  ["Grandparent", "e.g. Dadi, Nana, Thatha"],
  ["Someone else", "Their name"],
] as const;

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Rather not"],
] as const;

type Step = 0 | 1 | 2 | 3;

function firstName(name: string) {
  return name.trim().split(" ")[0] ?? name;
}

export default function AddMember() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const qc = useQueryClient();
  const family = useFamily();
  const switchMember = useSwitchMember();

  const [step, setStep] = useState<Step>(0);
  const [relation, setRelation] = useState("");
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  // No face until one is picked: pre-choosing one at random handed a
  // "Mother" a bearded face. Skipping the pick rolls one at save time, and
  // the hello screen shows exactly what was saved.
  const picks = useMemo(() => avatarPicks().map((p) => p.id), []);
  const roll = (not?: string) => {
    const pool = picks.filter((id) => id !== not);
    return pool[Math.floor(Math.random() * pool.length)] ?? "p1";
  };
  const [seed, setSeed] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const face = seed ? generatedAvatar(seed, 0) : null;
  const relationship = relation === "Someone else" ? custom.trim() : relation;
  const hint = RELATIONS.find(([r]) => r === relation)?.[1] ?? "Their name";

  const ctx = family.data;
  const mode = ctx ? familyMode(ctx.entitlement.tier) : null;
  const seatsLeft = ctx ? Math.max(0, 4 - ctx.access.selectable.length) : 0;

  async function save() {
    setPending(true);
    setErrors({});
    setMessage(null);
    const chosen = seed || roll();
    setSeed(chosen);
    const result = await addFamilyMember({ name, relationship, dob, sex: sex as never, avatarSeed: chosen });
    setPending(false);
    if (!result.ok) {
      if (result.needsUpgrade) {
        router.replace("/settings/subscription");
        return;
      }
      const fe = result.fieldErrors ?? {};
      setErrors(fe);
      setMessage(result.message);
      // Send them back to the step that holds the problem.
      if (fe.name || fe.avatarSeed) setStep(1);
      else if (fe.relationship) setStep(0);
      return;
    }
    setAddedId(result.id);
    refreshRoster(qc);
    setStep(3);
  }

  // ----- plan gate -----------------------------------------------------
  if (mode && mode !== "family") {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Add a family member" />
        <View className="px-5 pt-6">
          <Glass strong className="items-center rounded-[28px] px-6 py-8">
            <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Lock size={24} color={brand[600]} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 19, color: ink[900], marginTop: 12, textAlign: "center" }}>Family members come with Family</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 6, textAlign: "center" }}>
              Up to 4 people, each with their own file, for ₹249 a month.
            </Text>
            <PillButton tone="brand" onPress={() => router.replace("/settings/subscription")} style={{ marginTop: 18, alignSelf: "stretch" }}>
              See the Family plan
            </PillButton>
          </Glass>
        </View>
      </View>
    );
  }

  const canNext =
    step === 0 ? relationship.length > 0 : step === 1 ? name.trim().length > 0 : true;

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop height={520} />
      <ScreenHeader
        title={step === 3 ? undefined : "Add a family member"}
        subtitle={step < 3 ? `Step ${step + 1} of 3` : undefined}
        back={step !== 3}
        fallback="/home"
        onBack={step > 0 && step < 3 ? () => setStep((step - 1) as Step) : undefined}
      />

      {step < 3 ? (
        <>
          {/* Progress. */}
          <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20, marginTop: 2 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? brand[600] : "rgba(15,16,48,0.08)" }} />
            ))}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            {/* The live card: what the tray will show. */}
            <View style={[glassShadow, { height: 118, borderRadius: 28, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 }]}>
              <Gradient from={face?.background ?? "#ebe6ff"} to="#ffffff" angle="diagonal" glow="#ffffff" />
              <Animated.View key={seed || "none"} entering={still ? undefined : ZoomIn.springify().damping(14)} style={{ borderRadius: 999, borderWidth: 3, borderColor: "#fff" }}>
                {face ? (
                  <Avatar svg={face.svg} background={face.background} size={72} />
                ) : (
                  <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: brand[100], alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 28, color: brand[700] }}>{name.trim() ? name.trim()[0]?.toUpperCase() : "?"}</Text>
                  </View>
                )}
              </Animated.View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 21, letterSpacing: -0.4, color: name.trim() ? ink[900] : "rgba(15,16,48,0.3)" }}>
                  {name.trim() ? firstName(name) : "Their name"}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13.5, color: relationship ? brand[700] : ink[300], marginTop: 2 }}>
                  {relationship || "How they're related to you"}
                </Text>
              </View>
            </View>

            <Animated.View key={step} entering={still ? undefined : FadeInRight.duration(240)} exiting={still ? undefined : FadeOutLeft.duration(160)}>
              {step === 0 ? (
                <View style={{ marginTop: 24 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>Who are you adding?</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4 }}>
                    {seatsLeft === 1 ? "You have 1 seat left on Family." : `You have ${seatsLeft} seats left on Family.`}
                  </Text>
                  <View style={{ marginTop: 16, gap: 10 }}>
                    {[RELATIONS.slice(0, 3), RELATIONS.slice(3, 6), RELATIONS.slice(6, 9)].map((row, r) => (
                      <View key={r} style={{ flexDirection: "row", gap: 10 }}>
                        {row.map(([label]) => {
                          const on = relation === label;
                          return (
                            <Pressable
                              key={label}
                              accessibilityRole="radio"
                              accessibilityState={{ selected: on }}
                              onPress={() => {
                                setRelation(label);
                                setErrors({});
                                if (label !== "Someone else") setTimeout(() => setStep(1), still ? 0 : 160);
                              }}
                              style={({ pressed }) => [on ? null : glassShadow, {
                                flex: 1,
                                height: 52,
                                borderRadius: 18,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: on ? ink[900] : pressed ? "#fff" : glass.fillStrong,
                                borderWidth: on ? 0 : 1,
                                borderColor: glass.rim,
                                transform: [{ scale: pressed ? 0.96 : 1 }],
                              }]}
                            >
                              <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#fff" : ink[900] }}>{label}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                  {relation === "Someone else" ? (
                    <Animated.View entering={still ? undefined : FadeIn.duration(200)} style={{ marginTop: 16 }}>
                      <Field label="How are they related to you?" value={custom} onChangeText={setCustom} placeholder="e.g. Aunt, Cousin, Friend" autoFocus error={errors.relationship} />
                    </Animated.View>
                  ) : null}
                </View>
              ) : step === 1 ? (
                <View style={{ marginTop: 24 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>What do you call them?</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4 }}>Whatever you&apos;d say at home. It&apos;s only for you.</Text>
                  <View style={{ marginTop: 16 }}>
                    <Field label="Name" required value={name} onChangeText={setName} placeholder={hint} autoCapitalize="words" autoFocus error={errors.name} returnKeyType="done" />
                  </View>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 22 }}>Pick a face</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2, marginBottom: 14 }}>
                    It&apos;s how you&apos;ll spot them on Home. Skip it and I&apos;ll pick one; change it any time.
                  </Text>
                  <AvatarPicker value={seed} onChange={setSeed} onShuffle={() => setSeed(roll(seed))} />
                  <View className="mt-4 flex-row items-center gap-2">
                    <Camera size={14} color={ink[300]} />
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300] }}>Photos are coming later. Faces stay on your phone.</Text>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 24 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>Two small details</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4 }}>
                    Labs print different normal ranges by age and sex. These help me read {firstName(name)}&apos;s reports right. Both optional.
                  </Text>
                  <View style={{ marginTop: 16 }}>
                    <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCapitalize="none" error={errors.dob} />
                  </View>
                  <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700], marginTop: 18, marginBottom: 8 }}>Sex</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {SEXES.map(([value, label]) => {
                      const on = sex === value;
                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          onPress={() => setSex(on ? "" : value)}
                          style={({ pressed }) => ({
                            flex: 1,
                            height: 44,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: on ? brand[50] : pressed ? "#fff" : glass.fillStrong,
                            borderWidth: 1.5,
                            borderColor: on ? brand[500] : "rgba(15,16,48,0.08)",
                          })}
                        >
                          <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 12.5, color: on ? brand[700] : ink[700] }}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </Animated.View>

            {message ? (
              <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: "#c00a1c", marginTop: 14 }}>{message}</Text>
            ) : null}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12, gap: 6 }}>
            {step < 2 ? (
              <PillButton disabled={!canNext} onPress={() => setStep((step + 1) as Step)} icon={<ArrowRight size={18} color="#fff" />}>
                Continue
              </PillButton>
            ) : (
              <>
                <PillButton tone="brand" loading={pending} onPress={() => void save()} icon={<Check size={18} color="#fff" />}>
                  {`Add ${firstName(name)}`}
                </PillButton>
                {!dob && !sex ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center" }}>You can skip these and add them later.</Text>
                ) : null}
              </>
            )}
          </View>
        </>
      ) : (
        // ----- done -------------------------------------------------------
        <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center", paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignItems: "center" }}>
            <Animated.View entering={still ? undefined : ZoomIn.springify().damping(10)} style={[glassShadow, { borderRadius: 999, borderWidth: 5, borderColor: "#fff" }]}>
              {face ? <Avatar svg={face.svg} background={face.background} size={120} /> : null}
            </Animated.View>
            <Animated.View entering={still ? undefined : ZoomIn.delay(260).springify()} style={{ position: "absolute", top: 86, marginLeft: 92 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: brand[600], borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Check size={18} color="#fff" strokeWidth={3} />
              </View>
            </Animated.View>
            <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900], marginTop: 20, textAlign: "center" }}>
              {firstName(name)}&apos;s in!
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[500], marginTop: 6, textAlign: "center" }}>
              {firstName(name)} has a health file of their own now. Add a first report and I&apos;ll start remembering for them.
            </Text>
          </View>
          <View style={{ marginTop: 28, gap: 10 }}>
            <PillButton
              tone="brand"
              onPress={() => {
                if (addedId) void switchMember(addedId);
                router.replace("/scan");
              }}
              icon={<Camera size={18} color="#fff" />}
            >
              {`Add ${firstName(name)}'s first report`}
            </PillButton>
            <PillButton
              tone="light"
              onPress={() => {
                if (addedId) void switchMember(addedId);
                router.replace("/home");
              }}
            >
              {`Switch to ${firstName(name)}`}
            </PillButton>
            <Pressable accessibilityRole="button" onPress={() => router.replace("/home")} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[500] }}>Done for now</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
