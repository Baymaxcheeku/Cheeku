import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ArrowRight, Camera, Check, FileText, HeartPulse, Lock, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import Animated, { FadeIn, FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPicker } from "@/components/family/avatar-picker";
import { HealthEditor } from "@/components/family/health-editor";
import { ReportQueue } from "@/components/family/report-queue";
import { Avatar } from "@/components/ui/avatar";
import { Field } from "@/components/ui/field";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Enter, useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { uploadQueue, type QueueItem } from "@/lib/records/bulk-upload";
import { generatedAvatar } from "@/lib/profiles/avatar";
import { familyMode, refreshRoster, showPhotoNow, useFamily, useSwitchMember } from "@/lib/profiles/family";
import { facePool, isChild } from "@/lib/profiles/face-pool";
import { ageFrom, EMPTY_HEALTH, hasHealth, saveMemberHealth, type MemberHealth } from "@/lib/profiles/health";
import { pickPhoto, setProfilePhoto } from "@/lib/profiles/photo";
import { addFamilyMember } from "@/lib/settings/actions";
import { brand, ink, lilac, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * Add a family member: five short steps, then everything is saved at once.
 *
 *   1  Who are you adding?      one tap on a relationship
 *   2  Name and look            a photo, or a face from their life stage
 *   3  About them               birthday (their age shows as you type) and sex
 *   4  Health basics            conditions for their age, allergies, medicines,
 *                               blood group, height, weight
 *   5  Past reports             snap, pick photos, or pick PDFs, up to ten
 *   ✓  Saving, then hello       each piece reported as it lands
 *
 * Steps 3 to 5 are skippable, and say so. Nothing is written until the last
 * tap, so backing out half way leaves no half-made person behind. Then the
 * profile is created FIRST, and everything else is filed against its new id:
 * photo, health, reports. If the photo or a report fails, the member still
 * exists and the hello screen says exactly what didn't make it.
 *
 * The live card at the top is the card the tray will show.
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

const STEPS = 5;
type Step = 0 | 1 | 2 | 3 | 4 | "saving" | "done";

type Outcome = { health: "saved" | "skipped" | "failed"; photo: "saved" | "none" | "failed"; filed: number; failed: number };

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
  const [seed, setSeed] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState("");
  const [health, setHealth] = useState<MemberHealth>(EMPTY_HEALTH);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [phase, setPhase] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  async function retryPhoto() {
    if (!addedId || !photo || !outcome) return;
    setRetrying(true);
    const p = await setProfilePhoto(addedId, photo);
    setRetrying(false);
    if (p.ok) {
      showPhotoNow(qc, addedId, photo, p.path);
      setOutcome({ ...outcome, photo: "saved" });
      setPhotoError(null);
      refreshRoster(qc);
    } else {
      setPhotoError(p.message);
    }
  }

  const face = seed ? generatedAvatar(seed, 0) : null;
  const relationship = relation === "Someone else" ? custom.trim() : relation;
  const hint = RELATIONS.find(([r]) => r === relation)?.[1] ?? "Their name";
  const age = ageFrom(dob);

  // The app's own pick stays in their age band: no toddler face for a
  // grandmother, no grey beard for a six-year-old (face-pool.ts).
  const roll = (not?: string) => {
    const pool = facePool(age, relationship).filter((id) => id !== not);
    return pool[Math.floor(Math.random() * pool.length)] ?? "f25";
  };
  const first = firstName(name) || "them";

  const ctx = family.data;
  const mode = ctx ? familyMode(ctx.entitlement.tier) : null;
  const seatsLeft = ctx ? Math.max(0, 4 - ctx.access.selectable.length) : 0;

  async function save() {
    setStep("saving");
    setErrors({});
    setMessage(null);
    setPhase(`Setting up ${first}'s file`);

    // A face is stored even when a photo is chosen: the photo wins while it
    // is there, and the face stands in if the upload fails or it's removed.
    const chosen = seed || roll();
    setSeed(chosen);
    let result: Awaited<ReturnType<typeof addFamilyMember>>;
    try {
      result = await addFamilyMember({ name, relationship, dob, sex: sex as never, avatarSeed: chosen });
    } catch {
      result = { ok: false, message: "That didn't save. Check your connection and try again." };
    }
    if (!result.ok) {
      if (result.needsUpgrade) {
        router.replace("/settings/subscription");
        return;
      }
      const fe = result.fieldErrors ?? {};
      setErrors(fe);
      setMessage(result.message);
      setStep(fe.relationship ? 0 : fe.name || fe.avatarSeed ? 1 : 2);
      return;
    }
    const id = result.id;
    setAddedId(id);

    const out: Outcome = { health: "skipped", photo: "none", filed: 0, failed: 0 };

    if (photo) {
      setPhase("Adding their photo");
      const p = await setProfilePhoto(id, photo); // never throws, never hangs
      out.photo = p.ok ? "saved" : "failed";
      if (p.ok) showPhotoNow(qc, id, photo, p.path);
      else setPhotoError(p.message);
    }
    if (hasHealth(health)) {
      setPhase("Saving health basics");
      const h = await saveMemberHealth(id, health).catch(() => ({ ok: false as const }));
      out.health = h.ok ? "saved" : "failed";
    }
    if (queue.length) {
      setPhase(`Filing ${queue.length === 1 ? "their report" : `${queue.length} reports`}`);
      const r = await uploadQueue(id, queue, (key, patch) =>
        setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...patch } : x))),
      ).catch(() => ({ done: 0, failed: queue.length }));
      out.filed = r.done;
      out.failed = r.failed;
    }

    setOutcome(out);
    refreshRoster(qc);
    setStep("done");
  }

  // ----- plan gate -----------------------------------------------------
  if (mode && mode !== "family") {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Add a family member" />
        <View className="px-5 pt-6">
          <Glass strong className="items-center rounded-2xl px-6 py-8">
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Lock size={24} color={brand[600]} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 20, color: ink[900], marginTop: 12, textAlign: "center" }}>Family members come with Family</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 6, textAlign: "center" }}>
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

  // ----- saving / done --------------------------------------------------
  if (step === "saving" || step === "done") {
    const done = step === "done";
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop height={520} />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }}>
          <View style={{ alignItems: "center" }}>
            <Enter kind="soft" style={[glassShadow, { borderRadius: 999, borderWidth: 5, borderColor: "#fff" }]}>
              {photo ? (
                <Image alt="" source={{ uri: photo }} style={{ width: 120, height: 120, borderRadius: 999 }} />
              ) : face ? (
                <Avatar svg={face.svg} image={face.image} background={face.background} size={120} />
              ) : (
                <View style={{ width: 120, height: 120, borderRadius: 999, backgroundColor: brand[100] }} />
              )}
            </Enter>
            {done ? (
              <Enter kind="pop" delay={200} style={{ position: "absolute", top: 86, marginLeft: 92 }}>
                <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: brand[600], borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Check size={18} color="#fff" strokeWidth={3} />
                </View>
              </Enter>
            ) : null}
            <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900], marginTop: 20, textAlign: "center" }}>
              {done ? `${first}'s in!` : "One moment..."}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ink[500], marginTop: 6, textAlign: "center" }}>
              {done ? `${first} has a health file of their own now. Everything below is filed under ${first}, never mixed with yours.` : phase}
            </Text>
          </View>

          {done && outcome ? (
            <Glass strong className="mt-6 gap-3 rounded-xl p-4">
              <Line ok icon={<Check size={15} color={brand[600]} />} text={`${first}'s profile is set up`} />
              {outcome.photo === "saved" ? <Line ok icon={<Camera size={15} color={brand[600]} />} text="Photo added" /> : null}
              {outcome.photo === "failed" ? (
                <View style={{ gap: 10 }}>
                  <Line ok={false} icon={<Camera size={15} color={semantic.dangerText} />} text={`${photoError ?? "The photo didn't upload."} ${first} has a drawn face for now.`} />
                  <Tap
                    accessibilityRole="button"
                    disabled={retrying}
                    onPress={() => void retryPhoto()}
                    style={{ alignSelf: "flex-start", marginLeft: 40, flexDirection: "row", alignItems: "center", gap: 8, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: brand[50], opacity: retrying ? 0.6 : 1 }}
                  >
                    {retrying ? <ActivityIndicator size="small" color={brand[600]} /> : <Camera size={14} color={brand[700]} />}
                    <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{retrying ? "Uploading..." : "Try the photo again"}</Text>
                  </Tap>
                </View>
              ) : null}
              {outcome.health !== "skipped" ? (
                <Line ok={outcome.health === "saved"} icon={<HeartPulse size={15} color={outcome.health === "saved" ? brand[600] : semantic.dangerText} />} text={outcome.health === "saved" ? "Health basics saved" : "Health basics didn't save. Add them from their page."} />
              ) : null}
              {outcome.filed > 0 ? <Line ok icon={<FileText size={15} color={brand[600]} />} text={`${outcome.filed === 1 ? "1 report" : `${outcome.filed} reports`} filed. I'm reading them now.`} /> : null}
              {outcome.failed > 0 ? <Line ok={false} icon={<TriangleAlert size={15} color={semantic.dangerText} />} text={`${outcome.failed === 1 ? "1 report" : `${outcome.failed} reports`} didn't upload. Try them again from ${first}'s file.`} /> : null}
            </Glass>
          ) : null}

          {!done && queue.length ? (
            <View style={{ marginTop: 22 }}>
              <ReportQueue items={queue} onChange={setQueue} locked />
            </View>
          ) : null}
          {!done ? <ActivityIndicator color={brand[600]} style={{ marginTop: 20 }} /> : null}

          {done ? (
            <View style={{ marginTop: 24, gap: 10 }}>
              <PillButton
                tone="brand"
                onPress={() => {
                  if (addedId) void switchMember(addedId);
                  router.replace(outcome && outcome.filed > 0 ? "/records" : "/home");
                }}
              >
                {outcome && outcome.filed > 0 ? `See ${first}'s reports` : `Switch to ${first}`}
              </PillButton>
              <Tap accessibilityRole="button" onPress={() => router.replace("/home")} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Done for now</Text>
              </Tap>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ----- the steps -------------------------------------------------------
  const canNext = step === 0 ? relationship.length > 0 : step === 1 ? name.trim().length > 0 : true;
  const skippable = step === 2 ? !dob && !sex : step === 3 ? !hasHealth(health) : step === 4 ? queue.length === 0 : false;

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop height={520} />
      <ScreenHeader
        title="Add a family member"
        subtitle={`Step ${step + 1} of ${STEPS}`}
        fallback="/home"
        onBack={step > 0 ? () => setStep((step - 1) as Step) : undefined}
      />

      <View style={{ flexDirection: "row", gap: 5, paddingHorizontal: 20, marginTop: 2 }}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? brand[600] : "rgba(15,16,48,0.08)" }} />
        ))}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* The live card: what the tray will show. */}
        <View style={[glassShadow, { height: 104, borderRadius: 24, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16 }]}>
          <Gradient from={face?.background ?? lilac.base} to="#ffffff" angle="diagonal" glow="#ffffff" />
          <Enter key={photo ?? (seed || "none")} kind="quick" style={{ borderRadius: 999, borderWidth: 3, borderColor: "#fff" }}>
            {photo ? (
              <Image alt="" source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: 999 }} />
            ) : face ? (
              <Avatar svg={face.svg} image={face.image} background={face.background} size={64} />
            ) : (
              <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: brand[100], alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 24, color: brand[700] }}>{name.trim() ? name.trim()[0]?.toUpperCase() : "?"}</Text>
              </View>
            )}
          </Enter>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: name.trim() ? ink[900] : "rgba(15,16,48,0.3)" }}>
              {name.trim() ? firstName(name) : "Their name"}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: relationship ? brand[700] : ink[300], marginTop: 2 }}>
              {[relationship || "How they're related to you", age !== null ? `${age} ${age === 1 ? "yr" : "yrs"}` : null].filter(Boolean).join(" · ")}
            </Text>
            {step >= 3 && (health.conditions.length || queue.length) ? (
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 2 }}>
                {[health.conditions.length ? `${health.conditions.length} condition${health.conditions.length === 1 ? "" : "s"}` : null, queue.length ? `${queue.length} report${queue.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </View>
        </View>

        <Animated.View key={String(step)} entering={still ? undefined : FadeInRight.duration(240)} exiting={still ? undefined : FadeOutLeft.duration(160)}>
          {step === 0 ? (
            <View style={{ marginTop: 24 }}>
              <Title text="Who are you adding?" line={seatsLeft === 1 ? "You have 1 seat left on Family." : `You have ${seatsLeft} seats left on Family.`} />
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
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: on ? ink[900] : pressed ? "#fff" : glass.fillStrong,
                            borderWidth: on ? 0 : 1,
                            borderColor: glass.rim,
                            transform: [{ scale: pressed ? 0.96 : 1 }],
                          }]}
                        >
                          <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: on ? "#fff" : ink[900] }}>{label}</Text>
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
              <Title text="Name and look" line="Whatever you'd call them at home. It's only for you." />
              <View style={{ marginTop: 16 }}>
                <Field label="Name" required value={name} onChangeText={setName} placeholder={hint} autoCapitalize="words" error={errors.name} returnKeyType="done" />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 22 }}>Photo or face</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2, marginBottom: 14 }}>
                How you&apos;ll spot them on Home. Skip it and I&apos;ll pick a face; change it any time.
              </Text>
              <AvatarPicker
                value={seed}
                onChange={setSeed}
                onShuffle={() => setSeed(roll(seed))}
                photo={photo}
                onPickPhoto={(source) => void pickPhoto(source).then((uri) => uri && setPhoto(uri))}
                onClearPhoto={() => setPhoto(null)}
                kidsFirst={isChild(age, relationship)}
              />
            </View>
          ) : step === 2 ? (
            <View style={{ marginTop: 24 }}>
              <Title text={`About ${first}`} line={`Labs print different normal ranges by age and sex. These help me read ${first}'s reports right.`} />
              <View style={{ marginTop: 16 }}>
                <Field
                  label="Date of birth"
                  value={dob}
                  onChangeText={setDob}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  error={errors.dob}
                  hint={age !== null ? `${first} is ${age === 0 ? "under a year old" : `${age} ${age === 1 ? "year" : "years"} old`}.` : "For a baby, their birth date. A rough year is fine for elders."}
                />
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
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: on ? brand[50] : pressed ? "#fff" : glass.fillStrong,
                        borderWidth: 1.5,
                        borderColor: on ? brand[500] : "rgba(15,16,48,0.08)",
                      })}
                    >
                      <Text numberOfLines={1} style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13, color: on ? brand[700] : ink[700] }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : step === 3 ? (
            <View style={{ marginTop: 24 }}>
              <Title text="Health basics" line={`What a doctor would ask first. All optional, and it stays in ${first}'s file.`} />
              <View style={{ marginTop: 18 }}>
                <HealthEditor value={health} onChange={setHealth} age={age} name={name} />
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 24 }}>
              <Title text="Got old reports?" line={`Add ${first}'s past reports and prescriptions now. I'll read them and file everything under ${first}.`} />
              <View style={{ marginTop: 16 }}>
                <ReportQueue items={queue} onChange={setQueue} />
              </View>
            </View>
          )}
        </Animated.View>

        {message ? (
          <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 14 }}>{message}</Text>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12, flexDirection: "row", gap: 10 }}>
        {step === 4 ? (
          <PillButton tone="brand" onPress={() => void save()} icon={<Check size={18} color="#fff" />} style={{ flex: 1 }}>
            {queue.length ? `Add ${first} and ${queue.length === 1 ? "1 report" : `${queue.length} reports`}` : `Add ${first}`}
          </PillButton>
        ) : (
          <>
            {step >= 2 && skippable ? (
              <PillButton tone="light" onPress={() => setStep((step + 1) as Step)} style={{ flex: 1 }}>
                Skip
              </PillButton>
            ) : null}
            <PillButton disabled={!canNext} onPress={() => setStep(((step as number) + 1) as Step)} icon={<ArrowRight size={18} color="#fff" />} style={{ flex: 1.6 }}>
              Continue
            </PillButton>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Title({ text, line }: { text: string; line: string }) {
  return (
    <>
      <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>{text}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 4 }}>{line}</Text>
    </>
  );
}

function Line({ ok, icon, text }: { ok: boolean; icon: React.ReactNode; text: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: ok ? brand[50] : semantic.dangerBg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: ink[900], marginTop: 3 }}>{text}</Text>
    </View>
  );
}
