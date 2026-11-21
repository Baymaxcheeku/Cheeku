import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ImagePlus, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet as BaseSheet, useSheetMax } from "@/components/ui/sheet";
import { MascotFigure } from "@/components/illustrations/sprout";
import { PILLAR_TONE, glassCard, type Tone } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { useReducedMotion } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import type { Area } from "@/lib/home/content";
import { addDailyLog, pickDailyPhoto, saveReading } from "@/lib/home/logs";
import { PLATE_TAGS, readPlate, type MealRead, type PlateTag } from "@/lib/home/meals";
import type { PlanTask, StepsTarget } from "@/lib/home/plan";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * THE LOGGING SHEETS. Each one does a single thing and saves it itself:
 * steps with a screenshot as proof, a meal photo with what is on the plate,
 * a reading, and two minutes of guided breathing.
 */

export function Sheet({ open, title, line, onClose, children, art, tone }: { open: boolean; title: string; line?: string; onClose: () => void; children: React.ReactNode; /** The 3D object in the header. */ art?: Icon3DName; /** The pillar's colours, for the object's plate. */ tone?: Tone }) {
  const insets = useSafeAreaInsets();
  const sheetMax88 = useSheetMax(0.88);
  return (
    <BaseSheet open={open} onClose={onClose} label="Close">
        <View className="rounded-t-sheet bg-canvas" style={{ maxHeight: sheetMax88, paddingBottom: insets.bottom + 14 }}>
          <View className="flex-row items-center gap-3 px-5 pb-3 pt-5">
            {art ? (
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: tone?.bg ?? surface.tint, alignItems: "center", justifyContent: "center" }}>
                <Icon3D name={art} size={36} />
              </View>
            ) : null}
            <View className="min-w-0 flex-1">
              <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: ink[900] }}>
                {title}
              </Text>
              {line ? <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: ink[500], marginTop: 3 }}>{line}</Text> : null}
            </View>
            <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={8} className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: surface.tint }}>
              <X size={17} color={ink[700]} />
            </Tap>
          </View>
          <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      
    </BaseSheet>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>{text}</Text>;
}

/** Camera or library, with the picked photo shown. Two big buttons in the pillar's colour, no dashed box. */
function PhotoPicker({ uri, onPick, label, hint, tone = PILLAR_TONE.sleep, art = "folder" }: { uri: string | null; onPick: (uri: string | null) => void; label: string; hint: string; tone?: Tone; art?: Icon3DName }) {
  async function pick(source: "camera" | "library") {
    const picked = await pickDailyPhoto(source);
    if (picked) onPick(picked);
  }
  if (uri) {
    return (
      <View style={{ height: 200, borderRadius: 24, overflow: "hidden", backgroundColor: surface.tint }}>
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" alt="The photo you picked" accessibilityLabel="The photo you picked" />
        <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onPick(null)} style={{ position: "absolute", right: 10, top: 10, height: 34, paddingHorizontal: 12, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.92)" }}>
          <X size={14} color={ink[900]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>Remove</Text>
        </Tap>
      </View>
    );
  }
  return (
    <View style={[glassCard(tone.glass, tone.accent), { borderRadius: 24, padding: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon3D name={art} size={32} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>{label}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>{hint}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Tap accessibilityRole="button" onPress={() => void pick("camera")} scale={0.97} style={{ flex: 1, height: 48, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: tone.deep }}>
          <Camera size={17} color="#fff" />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Take photo</Text>
        </Tap>
        <Tap accessibilityRole="button" onPress={() => void pick("library")} scale={0.97} style={{ flex: 1, height: 48, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#fff" }}>
          <ImagePlus size={17} color={tone.deep} />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: tone.deep }}>Gallery</Text>
        </Tap>
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
    <Sheet open={open} title="Log your steps" line={target?.line} onClose={onClose} art="shoe" tone={PILLAR_TONE.move}>
      {/* The count, big, and how far it is to the goal. */}
      <View style={[glassCard("#ffffff", "#0f1030"), { borderRadius: 24, padding: 18, shadowOpacity: 0.05 }]}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <TextInput
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder={goal ? goal.toLocaleString("en-IN") : "8,000"}
            placeholderTextColor={ink[300]}
            accessibilityLabel="Steps today"
            style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 44, letterSpacing: -1.5, color: ink[900], paddingVertical: 2 }}
          />
          <Text style={{ fontFamily: font.medium, fontSize: 16, color: ink[500] }}>steps</Text>
        </View>
        {goal ? (
          <>
            <View style={{ height: 10, borderRadius: 999, backgroundColor: PILLAR_TONE.move.track, marginTop: 12, overflow: "hidden" }}>
              <View style={{ height: 10, borderRadius: 999, width: `${Math.max(3, Math.min(100, ((value || task.progress?.value || 0) / goal) * 100))}%`, backgroundColor: PILLAR_TONE.move.accent }} />
            </View>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: PILLAR_TONE.move.deep, marginTop: 8 }}>
              {value >= goal ? "Goal reached" : `Goal ${goal.toLocaleString("en-IN")}`}
              {task.progress && task.progress.value > 0 ? ` · so far ${task.progress.value.toLocaleString("en-IN")}` : ""}
            </Text>
          </>
        ) : null}
      </View>
      {task.progress && task.progress.value > 0 ? (
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 8 }}>Log the latest count; the highest one counts.</Text>
      ) : null}
      <View className="mt-4">
        <PhotoPicker uri={photo} onPick={setPhoto} label="Add a screenshot as proof" hint="From your watch, band or phone's health app." tone={PILLAR_TONE.move} art="watch" />
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

// Flat pastels from Today's palette: mint, lavender, coral. No yellow.
const TONE = {
  great: { bg: PILLAR_TONE.move.bg, fg: PILLAR_TONE.move.deep, label: "Balanced plate" },
  good: { bg: PILLAR_TONE.sleep.bg, fg: PILLAR_TONE.sleep.deep, label: "Good plate" },
  watch: { bg: PILLAR_TONE.eat.bg, fg: PILLAR_TONE.eat.deep, label: "Worth a rethink" },
} as const;

export function MealReadCard({ read }: { read: MealRead }) {
  const t = TONE[read.tone];
  return (
    <View style={{ borderRadius: 22, padding: 16, backgroundColor: t.bg }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.fg }}>{t.label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 23, color: ink[900], marginTop: 4 }}>{read.line}</Text>
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
      <Sheet open={open} title={`${task.title}, logged`} onClose={onClose} art="food" tone={PILLAR_TONE.eat}>
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
    <Sheet open={open} title={task.title} line="Snap the plate, tap what's on it." onClose={onClose} art="food" tone={PILLAR_TONE.eat}>
      <PhotoPicker uri={photo} onPick={setPhoto} label="Photo of the plate" hint="Everything on it, drinks too. One photo is enough." tone={PILLAR_TONE.eat} art="food" />
      {GROUPS.map((g) => (
        <View key={g.key} style={{ marginTop: 20 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginBottom: 10 }}>{g.label}</Text>
          <View className="flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
            {PLATE_TAGS.filter((t) => t.group === g.key && !(veg && (t.key === "egg" || t.key === "chicken_fish"))).map((t) => {
              const on = tags.includes(t.key);
              return (
                <Tap
                  key={t.key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(t.key)}
                  scale={0.96}
                  style={{ height: 42, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? PILLAR_TONE.eat.bg : "#fff", borderWidth: 1.5, borderColor: on ? PILLAR_TONE.eat.accent : "transparent" }}
                >
                  {on ? <Check size={14} color={PILLAR_TONE.eat.deep} strokeWidth={3} /> : null}
                  <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? PILLAR_TONE.eat.deep : ink[900] }}>{t.label}</Text>
                </Tap>
              );
            })}
          </View>
        </View>
      ))}
      <ErrorLine text={error} />
      <PillButton style={{ marginTop: 22 }} loading={busy} onPress={() => void save()}>
        {tags.length ? `Save meal · ${tags.length} item${tags.length === 1 ? "" : "s"}` : "Save meal"}
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
    <Sheet open={open} title={task.title} line={task.why} onClose={onClose} art={/sugar|glucose/i.test(task.title) ? "glucose" : /weight/i.test(task.title) ? "scale" : "heart"} tone={PILLAR_TONE.check}>
      <View className="flex-row gap-3">
        {(task.fields ?? []).map((f) => (
          <View key={f.key} style={[glassCard("#ffffff", "#0f1030"), { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 14, shadowOpacity: 0.05 }]}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{f.label}</Text>
            <View className="flex-row items-baseline gap-1.5">
              <TextInput
                value={values[f.key] ?? ""}
                onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                keyboardType="decimal-pad"
                placeholder={f.placeholder}
                placeholderTextColor={ink[300]}
                accessibilityLabel={`${f.label} in ${f.unit}`}
                style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 36, letterSpacing: -1, color: ink[900], paddingVertical: 4 }}
              />
              <Text style={{ fontFamily: font.medium, fontSize: 14, color: ink[500] }}>{f.unit}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 10 }}>
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
    <Sheet open={open} title={task.title} line="In through the nose for four, out slowly for six. Shoulders down." onClose={onClose} art="lotus" tone={PILLAR_TONE.mind}>
      <View className="items-center py-4">
        <View style={{ width: 230, height: 230, alignItems: "center", justifyContent: "center" }}>
          {/* Flat circles: a pale track, and the breath growing inside it. */}
          <View style={{ position: "absolute", width: 230, height: 230, borderRadius: 999, backgroundColor: PILLAR_TONE.mind.bg }} />
          <Animated.View style={[{ position: "absolute", width: 230, height: 230, borderRadius: 999, backgroundColor: PILLAR_TONE.mind.track }, circle]} />
          <View className="items-center">
            {finished ? (
              <MascotFigure size={120} moment="joy" />
            ) : (
              <>
                <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.5, color: PILLAR_TONE.mind.deep }}>{running ? (phase === "in" ? "Breathe in" : "Breathe out") : "Ready"}</Text>
                <Text style={{ fontFamily: font.medium, fontSize: 17, color: ink[700], marginTop: 4, fontVariant: ["tabular-nums"] }}>
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
