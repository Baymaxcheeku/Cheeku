import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  Check,
  Footprints,
  Image as ImageIcon,
  Moon,
  Pill,
  Plus,
  Salad,
  Stethoscope,
  Timer,
  Undo2,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import { createContext, useContext, useState } from "react";
import { Image, Text, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import { MealReadCard } from "@/components/today/sheets";
import { Icon3D } from "@/components/ui/icon3d";
import { PILLAR_TONE, taskIcon3d, type Tone } from "@/components/today/palette";
import { BreathIcon, MindIcon, type AppIcon } from "@/components/ui/icons";
import { WINDOW_LABEL } from "@/lib/home/catalog";
import type { Area, Pillar } from "@/lib/home/content";
import { feel } from "@/lib/feel";
import { addDailyLog, usePhotoUrl } from "@/lib/home/logs";
import { TIMING_SHORT, type DoseView } from "@/lib/home/meds";
import { readPlate, type PlateTag } from "@/lib/home/meals";
import type { DailyLog, PlanTask } from "@/lib/home/plan";
import { logStep, unlogStep } from "@/lib/home/stage";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

export const PILLAR_ICON: Record<Pillar, AppIcon> = { move: Footprints, eat: Salad, sleep: Moon, mind: MindIcon, check: Stethoscope };

export const KIND_ICON: Partial<Record<PlanTask["kind"], AppIcon>> = { steps: Footprints, meal: Utensils, reading: Activity, rating: Moon, timer: BreathIcon, dose: Pill };

export const SLEEP_LABELS = ["Badly", "Restless", "Okay", "Well", "Great"] as const;

export type TaskAction = "steps" | "meal" | "reading" | "timer";

function Thumb({ log }: { log: DailyLog }) {
  const url = usePhotoUrl(log.photoPath);
  return (
    <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-lg" style={{ backgroundColor: surface.tint }}>
      {url.data ? <Image source={{ uri: url.data }} style={{ width: 56, height: 56 }} alt="Your logged photo" accessibilityLabel="Your logged photo" /> : <ImageIcon size={18} color={ink[300]} />}
    </View>
  );
}

/** The card's colours, so its buttons and widgets match without passing them down. */
const ToneCtx = createContext<Tone>(PILLAR_TONE.sleep);

function SmallButton({ label, onPress, dark, icon: Icon }: { label: string; onPress: () => void; dark?: boolean; icon?: LucideIcon }) {
  const tone = useContext(ToneCtx);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 42,
        paddingHorizontal: 16,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: dark ? tone.deep : "#fff",
      }}
    >
      {Icon ? <Icon size={15} color={dark ? "#fff" : tone.deep} strokeWidth={2.4} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 14, color: dark ? "#fff" : tone.deep }}>{label}</Text>
    </Tap>
  );
}

/**
 * One task in the plan. What it asks for depends on its kind, and every
 * personal task says, in a line, which of the person's own numbers put it
 * there.
 */
export function TaskCard({
  task,
  profileId,
  areas,
  onOpen,
  onDone,
  onLater,
  onUndo,
}: {
  task: PlanTask;
  profileId: string;
  areas: readonly Area[];
  onOpen: (action: TaskAction) => void;
  onDone: () => void;
  onLater: () => void;
  onUndo: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [showMore, setShowMore] = useState(false);
  const done = task.status === "done";
  const tone = PILLAR_TONE[task.pillar];
  const overdue = task.dueLabel === "Overdue";
  const proof = task.logs.some((l) => l.photoPath);
  const lastMeal = task.kind === "meal" ? task.logs[task.logs.length - 1] : undefined;
  const rating = task.kind === "rating" ? task.logs[task.logs.length - 1]?.value : undefined;
  const reading = task.kind === "reading" ? task.logs[task.logs.length - 1] : undefined;

  return (
    <ToneCtx.Provider value={tone}>
    <View style={{ borderRadius: 26, padding: 18, backgroundColor: done ? "#fff" : tone.bg }}>
      <View className="flex-row items-center gap-3">
        <View style={{ width: 54, height: 54, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          {done ? (
            <View style={{ width: 54, height: 54, borderRadius: 999, backgroundColor: tone.accent, alignItems: "center", justifyContent: "center" }}>
              <Check size={24} color="#fff" strokeWidth={3} />
            </View>
          ) : (
            <Icon3D name={taskIcon3d(task)} size={34} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3, color: done ? ink[500] : ink[900] }}>{task.title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: done ? ink[500] : tone.deep, marginTop: 2 }}>
            {[task.chip, task.minutes ? `${task.minutes} min` : null, task.window !== "anytime" ? WINDOW_LABEL[task.window] : null].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {/* A tag only when it says something: due, a goal, or for you. */}
        {!done && (task.due || task.personal) ? (
          <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: task.due ? (overdue ? semantic.dangerBg : "#fff") : "#fff" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: task.due ? (overdue ? semantic.dangerText : semantic.cautionText) : tone.deep }}>
              {task.due ? task.dueLabel : task.goal ? "Your goal" : "For you"}
            </Text>
          </View>
        ) : null}
      </View>

      {task.reason ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 14, lineHeight: 19, color: tone.deep, marginTop: 14 }}>{task.reason}</Text>
      ) : null}
      {!done || task.kind === "meal" ? (
        <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700], marginTop: task.reason ? 4 : 12 }}>
          {task.why}
          {task.more ? (
            <Text accessibilityRole="button" onPress={() => setShowMore((v) => !v)} style={{ fontFamily: font.semibold, color: tone.deep }}>
              {showMore ? "  Less" : "  Why this?"}
            </Text>
          ) : null}
        </Text>
      ) : null}
      {showMore && task.more ? (
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 6 }}>{task.more}</Text>
      ) : null}

      {/* steps: progress against today's target, and the proof */}
      {task.kind === "steps" && task.progress ? (
        <View className="mt-3">
          <View className="flex-row items-baseline justify-between">
            <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>
              {task.progress.value.toLocaleString("en-IN")}
              <Text style={{ fontFamily: font.regular, fontSize: 14, letterSpacing: 0, color: ink[500] }}> of {task.progress.target.toLocaleString("en-IN")} steps</Text>
            </Text>
            {proof ? (
              <View className="flex-row items-center gap-1">
                <BadgeCheck size={13} color={ink[900]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: tone.deep }}>Screenshot added</Text>
              </View>
            ) : null}
          </View>
          <View style={{ height: 10, borderRadius: 999, backgroundColor: "#fff", marginTop: 8, overflow: "hidden" }}>
            <View style={{ height: 10, borderRadius: 999, width: `${Math.max(3, Math.min(100, (task.progress.value / Math.max(1, task.progress.target)) * 100))}%`, backgroundColor: tone.accent }} />
          </View>
        </View>
      ) : null}

      {/* meals: what was logged and what it means */}
      {task.kind === "meal" && task.logs.length ? (
        <View className="mt-3 gap-3">
          <View className="flex-row gap-2">
            {task.logs.slice(-4).map((l) => (
              <Thumb key={l.id} log={l} />
            ))}
          </View>
          {lastMeal && lastMeal.tags.length ? <MealReadCard read={readPlate(lastMeal.tags as PlateTag[], areas)} /> : null}
        </View>
      ) : null}

      {reading ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 8 }}>
          Logged {reading.valueText} {reading.unit}
        </Text>
      ) : null}

      {/* doses: each medicine ticked on its own */}
      {task.kind === "dose" && task.dose ? <DoseList profileId={profileId} doses={task.dose.doses} /> : null}

      {/* sleep: one tap */}
      {task.kind === "rating" ? (
        <View className="mt-3 flex-row gap-1.5">
          {SLEEP_LABELS.map((label, i) => {
            const on = rating === i + 1;
            return (
              <Tap
                key={label}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => void addDailyLog(qc, { profileId, task, value: i + 1, valueText: label, complete: true })}
                className="h-10 flex-1 items-center justify-center rounded-pill"
                style={{ backgroundColor: on ? tone.deep : "#fff" }}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: on ? "#fff" : tone.deep }}>{label}</Text>
              </Tap>
            );
          })}
        </View>
      ) : null}

      {/* the actions */}
      <View className="mt-4 flex-row flex-wrap items-center gap-2" style={{ alignItems: "flex-start" }}>
        {task.due && task.cta && !done ? <SmallButton dark label={task.cta.label} onPress={() => router.push(task.cta?.route as never)} /> : null}
        {task.kind === "steps" ? <SmallButton dark={!done} label={task.progress?.value ? "Update steps" : "Log steps"} icon={Plus} onPress={() => onOpen("steps")} /> : null}
        {task.kind === "meal" ? <SmallButton dark={!done} label={task.logs.length ? "Add more" : "Add photo"} icon={Plus} onPress={() => onOpen("meal")} /> : null}
        {task.kind === "reading" && !done ? <SmallButton dark label="Log reading" icon={Plus} onPress={() => onOpen("reading")} /> : null}
        {task.kind === "timer" && !done ? <SmallButton dark label="Start" icon={Timer} onPress={() => onOpen("timer")} /> : null}
        {task.kind === "dose" && !done ? <SmallButton dark label="Took them all" icon={Check} onPress={onDone} /> : null}
        {task.kind === "dose" ? <SmallButton label="Your medicines" onPress={() => router.push("/medicines" as never)} /> : null}
        {task.kind === "habit" && !done && !task.due ? <SmallButton dark label="Done" icon={Check} onPress={onDone} /> : null}
        {task.kind === "habit" && task.due && !done ? <SmallButton label="Mark done" icon={Check} onPress={onDone} /> : null}
        {!done && task.kind !== "rating" && task.kind !== "dose" && task.status !== "later" ? <SmallButton label="Later" onPress={onLater} /> : null}
        {task.status === "later" ? <SmallButton label="Bring it back" icon={Undo2} onPress={onUndo} /> : null}
        {done && task.kind === "habit" ? <SmallButton label="Undo" icon={Undo2} onPress={onUndo} /> : null}
      </View>
    </View>
    </ToneCtx.Provider>
  );
}

/**
 * The doses in one part of the day. A tap ticks one, a second tap takes it
 * back, so a wrong tick costs nothing. Names show here, in the app, and never
 * on the lock screen.
 */
export function DoseList({ profileId, doses }: { profileId: string; doses: readonly DoseView[] }) {
  const qc = useQueryClient();
  const tone = useContext(ToneCtx);
  return (
    <View className="mt-3 gap-2">
      {doses.map((d) => {
        const how = [d.dose, TIMING_SHORT[d.timing]].filter(Boolean).join(" · ");
        return (
          <Tap
            key={d.stepKey}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: d.taken }}
            accessibilityLabel={`${d.name}${how ? `, ${how}` : ""}`}
            onPress={() => {
              feel.tick();
              void (d.taken ? unlogStep(qc, { profileId, stepKey: d.stepKey }) : logStep(qc, { profileId, stepKey: d.stepKey, status: "done" }));
            }}
            scale={0.98}
            className="flex-row items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ backgroundColor: d.taken ? "rgba(255,255,255,0.6)" : "#fff" }}
          >
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: d.taken ? ink[500] : ink[900] }}>
                {d.name}
              </Text>
              {how ? <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{how}</Text> : null}
            </View>
            <View className="h-8 w-8 items-center justify-center rounded-pill" style={d.taken ? { backgroundColor: tone.accent } : { borderWidth: 1.5, borderColor: tone.track, backgroundColor: "#fff" }}>
              {d.taken ? <Check size={15} color="#fff" strokeWidth={3} /> : null}
            </View>
          </Tap>
        );
      })}
    </View>
  );
}

/**
 * One task folded into a line, for "Later today" (UI batch 4). Tap the line
 * to open the full card in place; a plain habit can be ticked from here.
 */
export function TaskRow({ task, onExpand, onDone }: { task: PlanTask; onExpand: () => void; onDone: () => void }) {
  const done = task.status === "done";
  const tone = PILLAR_TONE[task.pillar];
  const quick = (task.kind === "habit" || task.kind === "dose") && !task.due && !done;
  const meta = [task.status === "later" ? "Later" : null, task.goal ? "Your goal" : task.personal ? "For you" : null, task.chip, task.window !== "anytime" ? WINDOW_LABEL[task.window] : null].filter(Boolean).join(" · ");
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Tap accessibilityRole="button" accessibilityLabel={`${task.title}. Show details`} onPress={onExpand} scale={0.98} className="min-w-0 flex-1 flex-row items-center gap-3">
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: done ? tone.accent : tone.bg, alignItems: "center", justifyContent: "center" }}>
          {done ? <Check size={18} color="#fff" strokeWidth={3} /> : <Icon3D name={taskIcon3d(task)} size={28} />}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: done ? ink[500] : ink[900] }}>
            {task.title}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
            {meta}
          </Text>
        </View>
      </Tap>
      {quick ? (
        <Tap accessibilityRole="button" accessibilityLabel={`Done: ${task.title}`} onPress={onDone} scale={0.95} hitSlop={6} className="h-9 w-9 items-center justify-center rounded-pill" style={{ borderWidth: 1.5, borderColor: tone.accent }}>
          <Check size={16} color={tone.deep} strokeWidth={2.6} />
        </Tap>
      ) : null}
    </View>
  );
}
