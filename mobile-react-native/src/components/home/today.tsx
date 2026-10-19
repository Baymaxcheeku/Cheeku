import { useRouter } from "expo-router";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  ChevronRight,
  FileUp,
  Flame,
  FlaskConical,
  Footprints,
  House,
  Lock,
  MessageCircle,
  Moon,
  Salad,
  Sparkles,
  Stethoscope,
  Syringe,
  Undo2,
  Users,
} from "lucide-react-native";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LIVE } from "@/components/home/care";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Avatar } from "@/components/ui/avatar";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { BreathIcon, MindIcon, type AppIcon } from "@/components/ui/icons";
import { Meter, PopIn } from "@/components/ui/motion";
import { PILLARS, UNLOCK_COPY, unlockRows, viaLine, type Pillar, type UnlockRow } from "@/lib/home/content";
import type { HomeSignals, UnlockedVia } from "@/lib/home/rules";
import type { Plan, PlanTask } from "@/lib/home/plan";
import type { DueRow, Streak, WeekDay } from "@/lib/home/today";
import type { ActiveProfile } from "@/lib/profiles/context";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * HOME, IN ITS THREE STAGES.
 *
 * Starter and building: one hero card that asks for the latest record and
 * shows, as a checklist, what each kind of record opens up. The reader should
 * leave it knowing exactly one thing to do: find the last report they have,
 * however old, and add it.
 *
 * Today: the daily plan. One step, chosen from what Cheeku knows; what is
 * due across the family; and the long game made visible as a streak, a week
 * of dots and the five pillars a healthy week touches.
 *
 * THE GAME IS QUIET. No points, no leaderboards, no confetti on a blood test.
 * A streak, a week that fills up, and Cheeku pleased with you. Colour that
 * means health (green, amber, red) is used only where it states something
 * about health: an overdue test. The streak and pillars are violet and lime.
 */

const PILLAR_ICON: Record<Pillar, AppIcon> = { move: Footprints, eat: Salad, sleep: Moon, mind: MindIcon, check: Stethoscope };

// ------------------------------------------------------------- starter --

export function UnlockCard({ stage, signals }: { stage: "starter" | "building"; signals: HomeSignals }) {
  const router = useRouter();
  const rows = unlockRows(signals);
  const done = rows.filter((r) => r.done).length;
  const copy = UNLOCK_COPY[stage];

  return (
    <View className="overflow-hidden rounded-[32px]" style={glassShadow}>
      <Gradient from="#f1edff" to="#d8cffd" glow="#ffffff" />

      <View pointerEvents="box-none" style={{ position: "absolute", right: 4, top: 26 }}>
        <MascotFigure size={118} moment="present" hop />
      </View>

      <View className="p-4">
        <Glass className="flex-row items-center gap-1.5 self-start rounded-pill py-1.5 pl-2 pr-3">
          <View className="h-5 w-5 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
            <Lock size={11} color="#fff" strokeWidth={2.6} />
          </View>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: brand[700], textTransform: "uppercase" }}>{copy.eyebrow}</Text>
        </Glass>

        <View style={{ paddingRight: "36%", marginTop: 14 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 23, lineHeight: 28, letterSpacing: -0.6, color: ink[900] }}>
            {copy.title}
          </Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19.5, color: ink[700], marginTop: 8 }}>{copy.body}</Text>

        <Glass strong className="mt-4 rounded-[22px] px-3 py-1.5">
          {rows.map((r, i) => (
            <UnlockRowView key={r.key} row={r} index={i} last={i === rows.length - 1} onPress={() => router.push(r.route as never)} />
          ))}
        </Glass>

        <View className="mt-4 flex-row items-center justify-between">
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[700] }}>Your health memory</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[700] }}>
            {done} of {rows.length} set up
          </Text>
        </View>
        <View className="mt-2">
          <Meter value={done} total={rows.length} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add your latest report"
          onPress={() => router.push("/scan")}
          style={({ pressed }) => ({ marginTop: 18, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", transform: [{ scale: pressed ? 0.97 : 1 }] })}
        >
          <View className="z-10 h-[52px] w-[52px] items-center justify-center rounded-pill" style={{ backgroundColor: ink[900] }}>
            <FileUp size={21} color="#ffffff" strokeWidth={1.9} />
          </View>
          <Glass strong className="-ml-4 h-[46px] justify-center pl-7 pr-5" style={{ borderTopRightRadius: 999, borderBottomRightRadius: 999 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Add your latest report</Text>
          </Glass>
        </Pressable>
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 10 }}>
          Photo, PDF or a screenshot. Cheeku reads it in under a minute.
        </Text>
      </View>
    </View>
  );
}

function UnlockRowView({ row, index, last, onPress }: { row: UnlockRow; index: number; last: boolean; onPress: () => void }) {
  const key = index === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.unlocks}${row.done ? ". Done" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: surface.line,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {row.done ? (
        <PopIn index={index}>
          <View className="h-7 w-7 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
            <Check size={15} color="#fff" strokeWidth={3} />
          </View>
        </PopIn>
      ) : (
        <View className="h-7 w-7 items-center justify-center rounded-pill" style={{ borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[400], backgroundColor: brand[50] }}>
          <Text style={{ fontFamily: font.bold, fontSize: 12, color: brand[700] }}>{index + 1}</Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14, color: row.done ? ink[500] : ink[900], textDecorationLine: row.done ? "line-through" : "none" }}>
          {row.title}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
          {row.unlocks}
        </Text>
      </View>
      {key && !row.done ? (
        <View className="rounded-pill px-2 py-1" style={{ backgroundColor: LIVE.bg }}>
          <Text style={{ fontFamily: font.bold, fontSize: 10.5, color: LIVE.fg }}>Opens Today</Text>
        </View>
      ) : (
        <ChevronRight size={16} color={ink[300]} />
      )}
    </Pressable>
  );
}

/** What the first record opens, shown locked under the unlock card. */
export function LockedPreview() {
  const tiles = [
    { icon: Footprints, title: "Today's step", sub: "One small thing, picked for you" },
    { icon: CalendarClock, title: "What's due", sub: "Tests and follow-ups, for everyone" },
    { icon: BellRing, title: "Family alerts", sub: "When a parent's test slips" },
  ];
  return (
    <View>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>What your first record opens</Text>
      <View className="mt-3 flex-row gap-2.5">
        {tiles.map((t) => (
          <View key={t.title} className="flex-1 rounded-[20px] bg-white p-3" style={[glassShadow, { borderWidth: 1, borderColor: surface.line, minHeight: 128 }]}>
            <View className="flex-row items-center justify-between">
              <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: brand[50] }}>
                <t.icon size={18} color={brand[600]} strokeWidth={1.9} />
              </View>
              <Lock size={13} color={ink[300]} strokeWidth={2.2} />
            </View>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900], marginTop: 10 }}>{t.title}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 11.5, lineHeight: 15, color: ink[500], marginTop: 3 }}>{t.sub}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// --------------------------------------------------------------- today --

export function TodayHeadline({ name, isSelf }: { name: string; isSelf: boolean }) {
  const [lead, accent] = isSelf ? [`Hi ${name},`, "here's today."] : [`${name}'s day,`, "one step at a time."];
  return (
    <Text accessibilityRole="header" style={{ fontFamily: font.medium, fontSize: 34, lineHeight: 40, letterSpacing: -1.1, color: ink[900] }}>
      {lead}
      {"\n"}
      <Text style={{ fontFamily: font.italic, color: brand[600] }}>{accent}</Text>
    </Text>
  );
}

/** The long game, at a glance: streak, this week, and the pillars it touched. */
export function ProgressStrip({ streak, week, pillars, onPillar }: { streak: Streak; week: WeekDay[]; pillars: Set<Pillar>; onPillar?: (p: Pillar) => void }) {
  const balanced = pillars.size === PILLARS.length;
  const sub = streak.todayDone ? "Today's done. See you tomorrow." : streak.count > 0 ? "Keep it going today" : "Do today's step to start one";
  return (
    <Glass strong className="rounded-[26px] p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-pill" style={{ backgroundColor: streak.count > 0 ? brand[600] : brand[50] }}>
          <Flame size={21} color={streak.count > 0 ? "#fff" : brand[500]} strokeWidth={2} fill={streak.count > 0 ? "rgba(255,255,255,0.25)" : "none"} />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 16, letterSpacing: -0.2, color: ink[900] }}>
            {streak.count > 0 ? `${streak.count}-day streak` : "No streak yet"}
          </Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>
            {sub}
          </Text>
        </View>
        {streak.best > streak.count ? (
          <View className="rounded-pill px-2.5 py-1" style={{ backgroundColor: brand[50] }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: brand[700] }}>Best {streak.best}</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-4 flex-row justify-between">
        {week.map((d) => (
          <View key={d.iso} className="items-center" style={{ width: 34 }}>
            <Text style={{ fontFamily: d.today ? font.bold : font.medium, fontSize: 11, color: d.today ? brand[700] : ink[500] }}>{d.letter}</Text>
            <View
              className="mt-1.5 h-[30px] w-[30px] items-center justify-center rounded-pill"
              style={{
                backgroundColor: d.done ? brand[600] : d.future ? surface.tint : "#fff",
                borderWidth: d.done ? 0 : d.today ? 1.5 : 1,
                borderStyle: d.today && !d.done ? "dashed" : "solid",
                borderColor: d.today ? brand[500] : surface.line,
              }}
            >
              {d.done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
            </View>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[700] }}>This week</Text>
        {balanced ? (
          <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: LIVE.bg }}>
            <Text style={{ fontFamily: font.bold, fontSize: 10.5, color: LIVE.fg }}>Balanced week</Text>
          </View>
        ) : (
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500] }}>{pillars.size} of 5 pillars</Text>
        )}
      </View>
      <View className="mt-2 flex-row gap-1.5">
        {PILLARS.map((p) => {
          const on = pillars.has(p.key);
          const Icon = PILLAR_ICON[p.key];
          return (
            <Pressable
              key={p.key}
              accessibilityRole="button"
              accessibilityLabel={`${p.label}: today's actions${on ? ", trained this week" : ""}`}
              onPress={onPillar ? () => onPillar(p.key) : undefined}
              hitSlop={{ top: 6, bottom: 6 }}
              style={({ pressed }) => ({
                flex: 1,
                height: 36,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                borderRadius: 999,
                backgroundColor: on ? brand[600] : pressed ? brand[50] : "transparent",
                borderWidth: on ? 0 : 1,
                borderColor: brand[100],
                transform: [{ scale: pressed ? 0.95 : 1 }],
              })}
            >
              <Icon size={12} color={on ? "#fff" : brand[400]} strokeWidth={2.2} />
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: on ? "#fff" : brand[700] }}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {onPillar ? (
        <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500], marginTop: 8, textAlign: "center" }}>Tap a pillar to see its steps</Text>
      ) : null}
    </Glass>
  );
}

function Chip({ children, icon: Icon }: { children: string; icon?: AppIcon }) {
  return (
    <Glass className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5">
      {Icon ? <Icon size={13} color={brand[700]} strokeWidth={2.2} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>{children}</Text>
    </Glass>
  );
}

/**
 * Today's step. One thing, why it matters for this person, and two answers:
 * done, or later. After Done, Cheeku is pleased and the streak moves; "one
 * more" offers the next step for anyone keen.
 */
export function StepCard({
  step,
  doneStep,
  streak,
  milestone,
  forName,
  onDone,
  onLater,
  onUndo,
  onMore,
}: {
  step: PlanTask | null;
  /** The step just done, while the card celebrates it. */
  doneStep: PlanTask | null;
  streak: Streak;
  milestone: string | null;
  /** Whose step it is, when it is not your own. */
  forName: string | null;
  onDone: (s: PlanTask) => void;
  onLater: (s: PlanTask) => void;
  onUndo: (s: PlanTask) => void;
  onMore: (() => void) | null;
}) {
  const router = useRouter();

  if (doneStep || !step) {
    const allDone = !doneStep;
    return (
      <View className="overflow-hidden rounded-[32px]" style={[glassShadow, { minHeight: 250 }]}>
        <Gradient from="#f1edff" to="#d8cffd" glow="#ffffff" />
        <View pointerEvents="box-none" style={{ position: "absolute", right: -10, bottom: -12 }}>
          <MascotFigure size={168} moment={allDone ? "joy" : "celebrate"} hop />
        </View>
        <View className="flex-1 p-4">
          <View className="flex-row gap-2">
            <Glass className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5">
              <View className="h-4 w-4 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
                <Check size={10} color="#fff" strokeWidth={3.4} />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[900] }}>{allDone ? "All done" : "Done"}</Text>
            </Glass>
            {streak.count > 0 ? <Chip icon={Flame}>{`Day ${streak.count}`}</Chip> : null}
          </View>
          <View style={{ paddingRight: "40%", marginTop: 20 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: ink[900] }}>
              {milestone ?? (allDone ? "All done for today." : streak.count > 1 ? `${streak.count} days in a row.` : "First one done.")}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700], marginTop: 8 }}>
              {doneStep ? doneStep.title : "See you tomorrow."}
            </Text>
          </View>
          <View className="mt-auto flex-row items-center gap-2 pt-5">
            {onMore ? (
              <Pressable accessibilityRole="button" onPress={onMore} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
                <View className="h-[44px] flex-row items-center gap-1.5 rounded-pill px-4" style={{ backgroundColor: ink[900] }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>One more?</Text>
                  <ArrowRight size={15} color="#fff" />
                </View>
              </Pressable>
            ) : null}
            {doneStep ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Undo done" onPress={() => onUndo(doneStep)}>
                <Glass className="h-[44px] flex-row items-center gap-1.5 rounded-pill px-4">
                  <Undo2 size={14} color={ink[700]} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>Undo</Text>
                </Glass>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  const PillarIcon = PILLAR_ICON[step.pillar];
  const due = Boolean(step.due);
  // A task that needs more than a tap (steps, a meal, a reading) opens its sheet in the plan.
  const action = step.cta ?? (step.kind !== "habit" ? { label: ACTION_LABEL[step.kind], route: `/today?task=${encodeURIComponent(step.key)}` } : null);
  return (
    <View className="overflow-hidden rounded-[32px]" style={[glassShadow, { minHeight: 300 }]}>
      <Gradient from="#f1edff" to="#d8cffd" glow="#ffffff" />
      <View pointerEvents="box-none" style={{ position: "absolute", right: -4, bottom: -12 }}>
        <MascotFigure size={due ? 128 : 160} moment={due ? "think" : "present"} hop />
      </View>
      <View className="flex-1 p-4">
        <View className="flex-row gap-2">
          {due ? (
            <View className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5" style={{ backgroundColor: step.dueLabel === "Overdue" ? semantic.dangerBg : semantic.cautionBg }}>
              <CalendarClock size={13} color={step.dueLabel === "Overdue" ? semantic.dangerText : semantic.cautionText} strokeWidth={2.2} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: step.dueLabel === "Overdue" ? semantic.dangerText : semantic.cautionText }}>{step.dueLabel}</Text>
            </View>
          ) : (
            <Chip icon={PillarIcon}>{step.chip}</Chip>
          )}
          {forName ? <Chip>{`For ${forName}`}</Chip> : step.minutes ? <Chip>{`${step.minutes} min`}</Chip> : null}
        </View>

        {/* Title, then at most two short lines: their reason and the payoff. */}
        <View style={{ paddingRight: "36%", marginTop: 20 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 25, lineHeight: 30, letterSpacing: -0.6, color: ink[900] }}>{step.title}</Text>
          {step.reason ? (
            <View className="flex-row items-center gap-1.5" style={{ marginTop: 10 }}>
              <Sparkles size={13} color={brand[600]} />
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{step.reason}</Text>
            </View>
          ) : null}
          <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700], marginTop: step.reason ? 4 : 10 }}>{step.why}</Text>
        </View>

        <View className="mt-auto flex-row items-center gap-2 pt-5">
          {action ? (
            <Pressable accessibilityRole="button" onPress={() => router.push(action.route as never)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View className="h-[46px] flex-row items-center gap-1.5 rounded-pill px-4" style={{ backgroundColor: ink[900] }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{action.label}</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={`Done: ${step.title}`} onPress={() => onDone(step)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] })}>
              <View className="h-[46px] flex-row items-center gap-2 rounded-pill pl-1.5 pr-5" style={{ backgroundColor: ink[900] }}>
                <View className="h-[34px] w-[34px] items-center justify-center rounded-pill" style={{ backgroundColor: brand[500] }}>
                  <Check size={17} color="#fff" strokeWidth={3} />
                </View>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Done</Text>
              </View>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={`Later: ${step.title}`} onPress={() => onLater(step)}>
            <Glass strong className="h-[46px] items-center justify-center rounded-pill px-4">
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[700] }}>Later</Text>
            </Glass>
          </Pressable>
        </View>
        {due ? (
          // Booked somewhere else, or already done: it still counts.
          <Pressable accessibilityRole="button" accessibilityLabel={`Mark done: ${step.title}`} onPress={() => onDone(step)} hitSlop={8} style={{ alignSelf: "flex-start", marginTop: 10 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>Already done? Mark it</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const ACTION_LABEL: Record<PlanTask["kind"], string> = { habit: "Done", steps: "Log steps", meal: "Add a photo", reading: "Log reading", rating: "Rate last night", timer: "Start" };

const DUE_ICON: Record<string, typeof FlaskConical> = {
  test_ordered: FlaskConical,
  lab_visit: House,
  followup_due: Stethoscope,
  vaccine_due: Syringe,
  reminder: BellRing,
};

/** Someone else's test that has slipped, raised on your Today. */
export function FamilyAlertCard({ row, member, onPress }: { row: DueRow; member: ActiveProfile | null; onPress: () => void }) {
  const lab = row.type === "test_ordered" || row.source === "lab";
  const owner = row.who === "You" ? "Your" : `${row.who}'s`;
  // What, then when and what to do, on its own short line.
  const sentence = `${owner} ${row.title.toLowerCase()} is ${row.overdue ? "overdue" : "due"}`;
  const late = Math.abs(row.daysToDue);
  const when = row.overdue ? `${late} day${late === 1 ? "" : "s"} late` : row.daysToDue === 0 ? "Today" : row.daysToDue === 1 ? "Tomorrow" : `In ${row.daysToDue} days`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={sentence} onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <View className="flex-row items-center gap-3 rounded-[24px] bg-white p-3.5" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
        <View>
          {member ? <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={46} /> : <Users size={22} color={brand[600]} />}
          <View className="absolute -bottom-0.5 -right-0.5 h-5 w-5 items-center justify-center rounded-pill border-2 border-white" style={{ backgroundColor: row.overdue ? semantic.danger : semantic.caution }}>
            <BellRing size={10} color="#fff" strokeWidth={2.6} />
          </View>
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1, color: row.overdue ? semantic.dangerText : semantic.cautionText }}>FAMILY ALERT</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, lineHeight: 19, color: ink[900], marginTop: 2 }}>{sentence}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[600], marginTop: 4 }}>{`${when} · ${lab ? "Book collection" : "Plan it"}`}</Text>
        </View>
        <ChevronRight size={18} color={ink[300]} />
      </View>
    </Pressable>
  );
}

export function DueThisWeek({ rows, onPress }: { rows: DueRow[]; onPress: (r: DueRow) => void }) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Text style={{ fontFamily: font.semibold, fontSize: 19, letterSpacing: -0.4, color: ink[900] }}>Due soon</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>Next two weeks</Text>
      </View>
      {rows.length === 0 ? (
        <View className="mt-3 flex-row items-center gap-3 rounded-[22px] bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
          <View className="h-10 w-10 items-center justify-center rounded-[14px]" style={{ backgroundColor: brand[50] }}>
            <Check size={18} color={brand[600]} strokeWidth={2.6} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>
            Nothing due for the family in the next two weeks. Cheeku will put it here when something is.
          </Text>
        </View>
      ) : (
        <View className="mt-3 overflow-hidden rounded-[22px] bg-white" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
          {rows.slice(0, 6).map((r, i) => {
            const Icon = DUE_ICON[r.type] ?? CalendarClock;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                accessibilityLabel={`${r.title}, ${r.who}, ${r.when}`}
                onPress={() => onPress(r)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: surface.line, backgroundColor: pressed ? surface.tint : "#fff" })}
              >
                <View className="h-10 w-10 items-center justify-center rounded-[14px]" style={{ backgroundColor: brand[50] }}>
                  <Icon size={18} color={brand[600]} strokeWidth={1.9} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>
                    {r.title}
                  </Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 2 }}>
                    {r.who} ·{" "}
                    <Text style={{ fontFamily: font.medium, color: r.overdue ? semantic.dangerText : r.daysToDue <= 2 ? semantic.cautionText : ink[500] }}>{r.when}</Text>
                  </Text>
                </View>
                <ChevronRight size={16} color={ink[300]} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const KIND_ICON: Partial<Record<PlanTask["kind"], AppIcon>> = { steps: Footprints, meal: Salad, reading: Stethoscope, rating: Moon, timer: BreathIcon };

/**
 * Today's action plan, in brief: how much of the day is done, and the next
 * few things, each one tap from its place in the full plan.
 */
export function PlanPreview({ plan, skip, onOpen }: { plan: Plan; skip: string | null; onOpen: (href: string) => void }) {
  const nextUp = plan.tasks.filter((t) => t.status === "open" && t.key !== skip).slice(0, 3);
  return (
    <View className="rounded-[26px] bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
      <View className="flex-row items-center justify-between">
        <View>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900] }}>Today&apos;s action plan</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>
            {plan.done} of {plan.total} done{plan.areas.length ? " · made for your numbers" : ""}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="See the full plan" onPress={() => onOpen("/today")} hitSlop={8} className="flex-row items-center gap-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: brand[600] }}>See all</Text>
          <ChevronRight size={15} color={brand[600]} />
        </Pressable>
      </View>
      <View className="mt-3">
        <Meter value={plan.done} total={Math.max(1, plan.total)} />
      </View>
      <View className="mt-2">
        {nextUp.map((t, i) => {
          const Icon = t.due ? CalendarClock : (KIND_ICON[t.kind] ?? PILLAR_ICON[t.pillar]);
          return (
            <Pressable
              key={t.key}
              accessibilityRole="button"
              accessibilityLabel={t.title}
              onPress={() => onOpen(t.kind === "habit" ? `/today?pillar=${t.pillar}` : `/today?task=${encodeURIComponent(t.key)}`)}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: surface.line, opacity: pressed ? 0.7 : 1 })}
            >
              <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: brand[50] }}>
                <Icon size={17} color={brand[600]} strokeWidth={1.9} />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>
                  {t.title}
                </Text>
                <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: t.personal ? brand[700] : ink[500], marginTop: 1 }}>
                  {t.personal ? (t.reason ?? "For you") : `Healthy living · ${PILLARS.find((p) => p.key === t.pillar)?.label}`}
                </Text>
              </View>
              <ChevronRight size={16} color={ink[300]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A quiet "ask" row for Today, where the big ask bar would compete with the step. */
export function AskRow() {
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ask Cheeku" onPress={() => router.push("/ask")} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Glass strong className="flex-row items-center gap-3 rounded-[22px] p-3.5">
        <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: ink[900] }}>
          <MessageCircle size={18} color="#fff" strokeWidth={1.9} />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900] }}>Ask about food, a symptom or a reading</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>Answered against your own numbers</Text>
        </View>
        <ChevronRight size={16} color={ink[300]} />
      </Glass>
    </Pressable>
  );
}

// ------------------------------------------------------ the unlock moment --

export function UnlockMoment({ open, via, onClose }: { open: boolean; via: UnlockedVia | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const backfill = via === "backfill";
  const items = [
    { icon: Footprints, title: "A plan for every day", sub: "Picked from your own numbers" },
    { icon: CalendarClock, title: "What's due", sub: "Tests and follow-ups, whole family" },
    { icon: Flame, title: "Your streak", sub: "Small steps, longer life" },
  ];
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: "rgba(15,16,48,0.45)", paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View className="w-full overflow-hidden rounded-[32px]" style={{ maxWidth: 420 }}>
          <Gradient from="#f1edff" to="#d8cffd" glow="#ffffff" />
          <View className="items-center px-5 pb-5 pt-4">
            <MascotFigure size={170} moment="celebrate" />
            <View className="-mt-2 rounded-pill px-3 py-1" style={{ backgroundColor: LIVE.bg }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: LIVE.fg }}>UNLOCKED</Text>
            </View>
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 27, lineHeight: 32, letterSpacing: -0.8, color: ink[900], marginTop: 10, textAlign: "center" }}>
              {backfill ? "Home is now Today." : "Today is here."}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700], marginTop: 8, textAlign: "center" }}>
              {backfill ? "Built from what your family has shared." : viaLine(via)}
            </Text>

            <Glass strong className="mt-5 w-full rounded-[22px] px-3.5 py-1">
              {items.map((it, i) => (
                <View key={it.title} className="flex-row items-center gap-3 py-3" style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: surface.line }}>
                  <View className="h-9 w-9 items-center justify-center rounded-[12px]" style={{ backgroundColor: brand[50] }}>
                    <it.icon size={17} color={brand[600]} strokeWidth={2} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{it.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{it.sub}</Text>
                  </View>
                </View>
              ))}
            </Glass>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({ marginTop: 18, alignSelf: "stretch", height: 52, borderRadius: 999, backgroundColor: ink[900], alignItems: "center", justifyContent: "center", transform: [{ scale: pressed ? 0.98 : 1 }] })}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: "#fff" }}>See today</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

