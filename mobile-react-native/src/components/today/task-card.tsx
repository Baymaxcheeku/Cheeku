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
  Plus,
  Salad,
  Sparkles,
  Stethoscope,
  Timer,
  Undo2,
  Utensils,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Image, Text, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import { MealReadCard } from "@/components/today/sheets";
import { glassShadow } from "@/components/ui/glass";
import { BreathIcon, MindIcon, type AppIcon } from "@/components/ui/icons";
import { WINDOW_LABEL } from "@/lib/home/catalog";
import type { Area, Pillar } from "@/lib/home/content";
import { addDailyLog, usePhotoUrl } from "@/lib/home/logs";
import { readPlate, type PlateTag } from "@/lib/home/meals";
import type { DailyLog, PlanTask } from "@/lib/home/plan";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

export const PILLAR_ICON: Record<Pillar, AppIcon> = { move: Footprints, eat: Salad, sleep: Moon, mind: MindIcon, check: Stethoscope };

const KIND_ICON: Partial<Record<PlanTask["kind"], AppIcon>> = { steps: Footprints, meal: Utensils, reading: Activity, rating: Moon, timer: BreathIcon };

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

function SmallButton({ label, onPress, dark, icon: Icon }: { label: string; onPress: () => void; dark?: boolean; icon?: LucideIcon }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: dark ? brand[600] : "#fff",
        borderWidth: dark ? 0 : 1,
        borderColor: surface.line,
      }}
    >
      {Icon ? <Icon size={15} color={dark ? "#fff" : ink[900]} strokeWidth={2.4} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: dark ? "#fff" : ink[900] }}>{label}</Text>
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
  const Icon = task.due ? CalendarClock : (KIND_ICON[task.kind] ?? PILLAR_ICON[task.pillar]);
  const proof = task.logs.some((l) => l.photoPath);
  const lastMeal = task.kind === "meal" ? task.logs[task.logs.length - 1] : undefined;
  const rating = task.kind === "rating" ? task.logs[task.logs.length - 1]?.value : undefined;
  const reading = task.kind === "reading" ? task.logs[task.logs.length - 1] : undefined;

  return (
    <View className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: done ? brand[100] : surface.line }]}>
      <View className="flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: done ? brand[600] : task.due ? (task.dueLabel === "Overdue" ? semantic.dangerBg : semantic.cautionBg) : brand[50] }}>
          {done ? <Check size={20} color="#fff" strokeWidth={3} /> : <Icon size={20} color={task.due ? (task.dueLabel === "Overdue" ? semantic.dangerText : semantic.cautionText) : brand[600]} strokeWidth={1.9} />}
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: done ? ink[500] : ink[900] }}>{task.title}</Text>
          <View className="mt-1 flex-row items-center gap-1.5">
            <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: task.due ? (task.dueLabel === "Overdue" ? semantic.dangerBg : semantic.cautionBg) : task.personal ? brand[600] : surface.tint }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: task.due ? (task.dueLabel === "Overdue" ? semantic.dangerText : semantic.cautionText) : task.personal ? "#fff" : ink[700] }}>
                {task.due ? task.dueLabel : task.personal ? "For you" : "Healthy living"}
              </Text>
            </View>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.medium, fontSize: 12, color: ink[500] }}>
              {task.chip}
              {task.minutes ? ` · ${task.minutes} min` : ""}
              {task.window !== "anytime" ? ` · ${WINDOW_LABEL[task.window]}` : ""}
            </Text>
          </View>
        </View>
      </View>

      {task.reason ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          <Sparkles size={13} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: brand[700] }}>{task.reason}</Text>
        </View>
      ) : null}
      {!done || task.kind === "meal" ? (
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18.5, color: ink[700], marginTop: task.reason ? 4 : 8 }}>
          {task.why}
          {task.more ? (
            <Text accessibilityRole="button" onPress={() => setShowMore((v) => !v)} style={{ fontFamily: font.semibold, color: brand[600] }}>
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
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
              {task.progress.value.toLocaleString("en-IN")}
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}> of {task.progress.target.toLocaleString("en-IN")}</Text>
            </Text>
            {proof ? (
              <View className="flex-row items-center gap-1">
                <BadgeCheck size={13} color={brand[600]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }}>Screenshot added</Text>
              </View>
            ) : null}
          </View>
          <View style={{ height: 8, borderRadius: 999, backgroundColor: brand[50], marginTop: 6, overflow: "hidden" }}>
            <View style={{ height: 8, borderRadius: 999, width: `${Math.min(100, (task.progress.value / Math.max(1, task.progress.target)) * 100)}%`, backgroundColor: done ? brand[600] : brand[400] }} />
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
                style={{ backgroundColor: on ? brand[600] : brand[50] }}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: on ? "#fff" : brand[700] }}>{label}</Text>
              </Tap>
            );
          })}
        </View>
      ) : null}

      {/* the actions */}
      <View className="mt-3 flex-row flex-wrap items-center gap-2" style={{ alignItems: "flex-start" }}>
        {task.due && task.cta && !done ? <SmallButton dark label={task.cta.label} onPress={() => router.push(task.cta?.route as never)} /> : null}
        {task.kind === "steps" ? <SmallButton dark={!done} label={task.progress?.value ? "Update steps" : "Log steps"} icon={Plus} onPress={() => onOpen("steps")} /> : null}
        {task.kind === "meal" ? <SmallButton dark={!done} label={task.logs.length ? "Add more" : "Add photo"} icon={Plus} onPress={() => onOpen("meal")} /> : null}
        {task.kind === "reading" && !done ? <SmallButton dark label="Log reading" icon={Plus} onPress={() => onOpen("reading")} /> : null}
        {task.kind === "timer" && !done ? <SmallButton dark label="Start" icon={Timer} onPress={() => onOpen("timer")} /> : null}
        {task.kind === "habit" && !done && !task.due ? <SmallButton dark label="Done" icon={Check} onPress={onDone} /> : null}
        {task.kind === "habit" && task.due && !done ? <SmallButton label="Mark done" icon={Check} onPress={onDone} /> : null}
        {!done && task.kind !== "rating" && task.status !== "later" ? <SmallButton label="Later" onPress={onLater} /> : null}
        {task.status === "later" ? <SmallButton label="Bring it back" icon={Undo2} onPress={onUndo} /> : null}
        {done && task.kind === "habit" ? <SmallButton label="Undo" icon={Undo2} onPress={onUndo} /> : null}
      </View>
    </View>
  );
}
