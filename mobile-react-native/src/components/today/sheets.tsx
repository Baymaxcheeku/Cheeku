import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ImagePlus, Watch, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Glass, Gradient } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import type { Area } from "@/lib/home/content";
import { addDailyLog, pickDailyPhoto, saveReading } from "@/lib/home/logs";
import { PLATE_TAGS, readPlate, type MealRead, type PlateTag } from "@/lib/home/meals";
import type { PlanTask, StepsTarget } from "@/lib/home/plan";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * THE LOGGING SHEETS. Each one does a single thing and saves it itself:
 * steps with a screenshot as proof, a meal photo with what is on the plate,
 * a reading, and two minutes of guided breathing.
 */

export function Sheet({ open, title, line, onClose, children }: { open: boolean; title: string; line?: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }} />
        <View className="rounded-t-sheet bg-canvas" style={{ maxHeight: "88%", paddingBottom: insets.bottom + 14 }}>
          <View className="flex-row items-start gap-3 px-5 pb-2 pt-5">
            <View className="min-w-0 flex-1">
              <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
                {title}
              </Text>
              {line ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 3 }}>{line}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: surface.tint }}>
              <X size={17} color={ink[700]} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>{text}</Text>;
}

/** Camera or library, with the picked photo shown. */
function PhotoPicker({ uri, onPick, label, hint }: { uri: string | null; onPick: (uri: string | null) => void; label: string; hint: string }) {
  async function pick(source: "camera" | "library") {
    const picked = await pickDailyPhoto(source);
    if (picked) onPick(picked);
  }
  if (uri) {
    return (
      <View className="overflow-hidden rounded-[20px]" style={{ height: 180, backgroundColor: surface.tint }}>
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" alt="The photo you picked" accessibilityLabel="The photo you picked" />
        <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onPick(null)} className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-pill" style={{ backgroundColor: "rgba(15,16,48,0.6)" }}>
          <X size={15} color="#fff" />
        </Pressable>
      </View>
    );
  }
  return (
    <View className="rounded-[20px] p-4" style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[200], backgroundColor: brand[50] }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{label}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500], marginTop: 2 }}>{hint}</Text>
      <View className="mt-3 flex-row gap-2">
        <Pressable accessibilityRole="button" onPress={() => void pick("camera")} className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill" style={{ backgroundColor: ink[900] }}>
          <Camera size={16} color="#fff" />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>Take photo</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void pick("library")} className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-pill bg-white" style={{ borderWidth: 1, borderColor: surface.line }}>
          <ImagePlus size={16} color={ink[900]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>From gallery</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ steps --

export function StepsSheet({ open, profileId, task, target, onClose }: { open: boolean; profileId: string; task: PlanTask; target: StepsTarget | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [count, setCount] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setCount("");
      setPhoto(null);
      setError(null);
    }
  }, [open]);

  const value = Number(count.replace(/[^0-9]/g, ""));
  const goal = target?.target ?? 0;

  async function save() {
    if (!value || value > 100000) return setError("Enter today's step count.");
    setBusy(true);
    const r = await addDailyLog(qc, { profileId, task, value, unit: "steps", photoUri: photo, complete: goal > 0 && value >= goal });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onClose();
  }

  return (
    <Sheet open={open} title="Log your steps" line={target?.line} onClose={onClose}>
      <Glass strong style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 }}>
        <Watch size={20} color={brand[600]} />
        <TextInput
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          placeholder={goal ? goal.toLocaleString("en-IN") : "8,000"}
          placeholderTextColor={ink[300]}
          accessibilityLabel="Steps today"
          style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 26, color: ink[900], paddingVertical: 4 }}
        />
        <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>steps</Text>
      </Glass>
      {task.progress && task.progress.value > 0 ? (
        <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 8 }}>So far today: {task.progress.value.toLocaleString("en-IN")}. Log the latest count; the highest one counts.</Text>
      ) : null}
      <View className="mt-4">
        <PhotoPicker uri={photo} onPick={setPhoto} label="Add a screenshot as proof" hint="From your watch, fitness band or phone's health app. Until Cheeku connects to them directly, this is how the count is checked." />
      </View>
      <ErrorLine text={error} />
      <PillButton style={{ marginTop: 16 }} loading={busy} onPress={() => void save()}>
        {value >= goal && goal > 0 ? "Save, goal reached" : "Save steps"}
      </PillButton>
    </Sheet>
  );
}

// ------------------------------------------------------------------ meals --

const GROUPS: { key: (typeof PLATE_TAGS)[number]["group"]; label: string }[] = [
  { key: "base", label: "Base" },
  { key: "protein", label: "Protein" },
  { key: "plants", label: "Vegetables and fruit" },
  { key: "extras", label: "Anything else" },
];

const TONE = {
  great: { bg: semantic.safeBg, fg: semantic.safeText, label: "Balanced plate" },
  good: { bg: brand[50], fg: brand[700], label: "Good plate" },
  watch: { bg: semantic.cautionBg, fg: semantic.cautionText, label: "Worth a rethink" },
} as const;

export function MealReadCard({ read }: { read: MealRead }) {
  const t = TONE[read.tone];
  return (
    <View className="rounded-[18px] p-3.5" style={{ backgroundColor: t.bg }}>
      <Text style={{ fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: t.fg }}>{t.label.toUpperCase()}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: ink[900], marginTop: 3 }}>{read.line}</Text>
      {read.tips.map((tip) => (
        <Text key={tip} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 6 }}>
          {tip}
        </Text>
      ))}
    </View>
  );
}

export function MealSheet({ open, profileId, task, areas, veg, onClose }: { open: boolean; profileId: string; task: PlanTask; areas: readonly Area[]; veg: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [photo, setPhoto] = useState<string | null>(null);
  const [tags, setTags] = useState<PlateTag[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState<MealRead | null>(null);
  useEffect(() => {
    if (open) {
      setPhoto(null);
      setTags([]);
      setError(null);
      setRead(null);
    }
  }, [open]);

  const toggle = (t: PlateTag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  async function save() {
    if (!photo && !tags.length) return setError("Add a photo or tap what's on the plate.");
    setBusy(true);
    const r = await addDailyLog(qc, { profileId, task, tags, photoUri: photo, complete: true });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setRead(readPlate(tags, areas));
  }

  if (read) {
    return (
      <Sheet open={open} title={`${task.title}, logged`} onClose={onClose}>
        <View className="items-center">
          <MascotFigure size={120} moment={read.tone === "watch" ? "think" : "joy"} />
        </View>
        <MealReadCard read={read} />
        <PillButton style={{ marginTop: 16 }} onPress={onClose}>
          Done
        </PillButton>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} title={task.title} line="Snap the plate, then tap what's on it. Cheeku reads it against your own numbers." onClose={onClose}>
      <PhotoPicker uri={photo} onPick={setPhoto} label="Photo of the plate" hint="Everything you're eating or drinking. One photo is enough." />
      {GROUPS.map((g) => (
        <View key={g.key} className="mt-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[500], marginBottom: 8 }}>{g.label}</Text>
          <View className="flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
            {PLATE_TAGS.filter((t) => t.group === g.key && !(veg && (t.key === "egg" || t.key === "chicken_fish"))).map((t) => {
              const on = tags.includes(t.key);
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(t.key)}
                  className="h-9 flex-row items-center gap-1.5 rounded-pill px-3.5"
                  style={{ backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}
                >
                  {on ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                  <Text style={{ fontFamily: font.medium, fontSize: 13.5, color: on ? "#fff" : ink[900] }}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <ErrorLine text={error} />
      <PillButton style={{ marginTop: 18 }} loading={busy} onPress={() => void save()}>
        Save meal
      </PillButton>
    </Sheet>
  );
}

// --------------------------------------------------------------- readings --

export function ReadingSheet({ open, profileId, task, onClose }: { open: boolean; profileId: string; task: PlanTask; onClose: () => void }) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setValues({});
      setError(null);
    }
  }, [open]);

  async function save() {
    const parsed = Object.fromEntries((task.fields ?? []).map((f) => [f.key, Number((values[f.key] ?? "").replace(",", "."))]));
    setBusy(true);
    const r = await saveReading(qc, { profileId, task, values: parsed });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onClose();
  }

  return (
    <Sheet open={open} title={task.title} line={task.why} onClose={onClose}>
      <View className="flex-row gap-3">
        {(task.fields ?? []).map((f) => (
          <Glass key={f.key} strong className="flex-1 rounded-[20px] px-4 py-3">
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{f.label}</Text>
            <View className="flex-row items-baseline gap-1.5">
              <TextInput
                value={values[f.key] ?? ""}
                onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                keyboardType="decimal-pad"
                placeholder={f.placeholder}
                placeholderTextColor={ink[300]}
                accessibilityLabel={`${f.label} in ${f.unit}`}
                style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 26, color: ink[900], paddingVertical: 4 }}
              />
              <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>{f.unit}</Text>
            </View>
          </Glass>
        ))}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500], marginTop: 10 }}>
        Saved to your chart and to Cheeku&apos;s memory, so the next answer already knows it.
      </Text>
      <ErrorLine text={error} />
      <PillButton style={{ marginTop: 16 }} loading={busy} onPress={() => void save()}>
        Save reading
      </PillButton>
    </Sheet>
  );
}

// -------------------------------------------------------------- breathing --

const CYCLE_IN = 4000;
const CYCLE_OUT = 6000;

export function BreathingSheet({ open, profileId, task, onClose }: { open: boolean; profileId: string; task: PlanTask; onClose: () => void }) {
  const qc = useQueryClient();
  const still = useReducedMotion();
  const total = (task.minutes ?? 2) * 60;
  const [left, setLeft] = useState(total);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [running, setRunning] = useState(false);
  const saved = useRef(false);
  const scale = useSharedValue(0.62);

  useEffect(() => {
    if (!open) {
      setRunning(false);
      setLeft(total);
      saved.current = false;
      cancelAnimation(scale);
      scale.value = 0.62;
    }
  }, [open, total, scale]);

  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const startLeft = left;
    const tick = setInterval(() => {
      const elapsed = (Date.now() - started) / 1000;
      const remaining = Math.max(0, Math.round(startLeft - elapsed));
      setLeft(remaining);
      setPhase((elapsed * 1000) % (CYCLE_IN + CYCLE_OUT) < CYCLE_IN ? "in" : "out");
      if (remaining <= 0) setRunning(false);
    }, 250);
    if (!still) {
      scale.value = withRepeat(withSequence(withTiming(1, { duration: CYCLE_IN, easing: Easing.inOut(Easing.quad) }), withTiming(0.62, { duration: CYCLE_OUT, easing: Easing.inOut(Easing.quad) })), -1);
    }
    return () => {
      clearInterval(tick);
      cancelAnimation(scale);
    };
    // Starting and stopping is all that restarts the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const finished = left <= 0;
  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      void addDailyLog(qc, { profileId, task, value: total, unit: "s", complete: true });
    }
  }, [finished, qc, profileId, task, total]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");

  return (
    <Sheet open={open} title={task.title} line="In through the nose for four, out slowly for six. Shoulders down." onClose={onClose}>
      <View className="items-center py-4">
        <View style={{ width: 230, height: 230, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ position: "absolute", width: 230, height: 230, borderRadius: 115, overflow: "hidden" }, circle]}>
            <Gradient from="#d8cffd" to={brand[400]} angle="vertical" />
          </Animated.View>
          <View className="items-center">
            {finished ? (
              <MascotFigure size={120} moment="joy" />
            ) : (
              <>
                <Text style={{ fontFamily: font.semibold, fontSize: 22, color: ink[900] }}>{running ? (phase === "in" ? "Breathe in" : "Breathe out") : "Ready"}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[700], marginTop: 4 }}>
                  {mm}:{ss}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
      {finished ? (
        <>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, textAlign: "center", color: ink[900] }}>Two calm minutes, done.</Text>
          <PillButton style={{ marginTop: 16 }} onPress={onClose}>
            Done
          </PillButton>
        </>
      ) : (
        <PillButton onPress={() => setRunning((r) => !r)}>{running ? "Pause" : left < total ? "Carry on" : "Start"}</PillButton>
      )}
    </Sheet>
  );
}
