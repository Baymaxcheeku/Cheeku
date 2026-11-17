import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Droplet, Flame, Footprints, Leaf, Moon, Weight, type LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { Sheet } from "@/components/today/sheets";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D, type Icon3DName } from "@/components/ui/icon3d";
import { SpringSwitch } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { goalByKey, goalTitle, readGoalPrefs, reminderHour, type Goal, type GoalKey, type GoalView } from "@/lib/home/goals";
import { saveDailyPrefs, useDailyPrefs } from "@/lib/home/logs";
import { todayIso } from "@/lib/memory/clock";
import { clearGoalReminder, setGoalReminder } from "@/lib/notifications/push";
import { hue, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * GOAL CARDS ON TODAY (loop-goal-cards, UI batch 4).
 *
 * No goal yet: a row of five cards to swipe through. Tap one, answer two
 * questions, start. With a goal: one card at the top of Today with the day,
 * the streak and today's check-ins; tap it to change the answers, the
 * reminder, or stop. The plan itself does the rest (goals.ts, plan.ts).
 */

// Flat pastels from Today's palette, and Cheeku's 3D object for each goal.
export const LOOK: Record<GoalKey, { icon: LucideIcon; art: Icon3DName; fg: string; bg: string; glass: string }> = {
  sleep: { icon: Moon, art: "moon", fg: PILLAR_TONE.sleep.deep, bg: PILLAR_TONE.sleep.bg, glass: PILLAR_TONE.sleep.glass },
  weight: { icon: Weight, art: "scale", fg: PILLAR_TONE.eat.deep, bg: PILLAR_TONE.eat.bg, glass: PILLAR_TONE.eat.glass },
  sugar: { icon: Droplet, art: "glucose", fg: PILLAR_TONE.mind.deep, bg: PILLAR_TONE.mind.bg, glass: PILLAR_TONE.mind.glass },
  legs: { icon: Footprints, art: "shoe", fg: PILLAR_TONE.move.deep, bg: PILLAR_TONE.move.bg, glass: PILLAR_TONE.move.glass },
  calm: { icon: Leaf, art: "lotus", fg: PILLAR_TONE.check.deep, bg: PILLAR_TONE.check.bg, glass: PILLAR_TONE.check.glass },
};

const CARD_W = 160;

/** The swipeable row of goals, when none is running. */
export function GoalPicker({ goals, onPick }: { goals: readonly Goal[]; onPick: (key: GoalKey) => void }) {
  if (!goals.length) return null;
  return (
    <View className="mt-6">
      <View className="px-5">
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
          Or choose another goal
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>Cheeku turns it into a few small check-ins a day.</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, gap: 12 }}
      >
        {goals.map((g) => {
          const look = LOOK[g.key];
          const Icon = look.icon;
          return (
            <Tap
              key={g.key}
              accessibilityRole="button"
              accessibilityLabel={`${g.title}. ${g.line}`}
              onPress={() => {
                feel.tick();
                onPick(g.key);
              }}
              scale={0.98}
              style={[glassCard(look.glass), { width: CARD_W, height: 188, borderRadius: 24, padding: 14 }]}
            >
              <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: "#ffffff" }}>
                <Icon3D name={look.art} size={26} />
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900], marginTop: 12 }}>{g.title}</Text>
              <Text numberOfLines={3} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[700], marginTop: 3 }}>
                {g.line}
              </Text>
              <View style={{ flex: 1 }} />
              <View className="flex-row items-center gap-1">
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: look.fg }}>Start</Text>
                <ArrowRight size={14} color={look.fg} />
              </View>
            </Tap>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** The running goal, at the top of Today. */
export function GoalBanner({ goal, onPress }: { goal: GoalView; onPress: () => void }) {
  const look = LOOK[goal.key];
  const Icon = look.icon;
  const left = goal.totalToday - goal.doneToday;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`Your goal, ${goal.title}, day ${goal.day}. ${goal.doneToday} of ${goal.totalToday} check-ins done today. Change goal`}
      onPress={onPress}
      scale={0.98}
      style={[glassCard(look.glass), { marginHorizontal: 20, marginTop: 20, borderRadius: 24, padding: 14 }]}
    >
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-pill" style={{ backgroundColor: "#ffffff" }}>
          <Icon3D name={look.art} size={28} />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: look.fg }}>{`Your goal · day ${goal.day}`}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.3, color: ink[900], marginTop: 1 }}>
            {goal.title}
          </Text>
        </View>
        {goal.streak > 0 ? (
          <View className="flex-row items-center gap-1 rounded-pill px-2.5" style={{ height: 30, backgroundColor: "#ffffff" }}>
            <Flame size={14} color={hue.orange.fg} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{goal.streak}</Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 flex-row gap-1.5">
        {Array.from({ length: goal.totalToday }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < goal.doneToday ? look.fg : "rgba(255,255,255,0.85)" }} />
        ))}
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700], marginTop: 8 }}>
        {left === 0 ? "All of today's check-ins done." : `${goal.doneToday} of ${goal.totalToday} check-ins today`}
      </Text>
    </Tap>
  );
}

const hourLabel = (h: number) => new Date(2026, 0, 1, h).toLocaleTimeString("en-IN", { hour: "numeric" });

/** Answer the questions and start, or change the answers, the reminder, or stop. */
export function GoalSheet({ goalKey, profileId, onClose }: { goalKey: GoalKey | null; profileId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const prefs = useDailyPrefs(profileId);
  const running = readGoalPrefs(prefs.data?.goal);
  const goal = goalByKey(goalKey ?? undefined);
  const editing = Boolean(goal && running && running.key === goal.key);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);

  // Each time the sheet opens on a goal, start from what is saved for it.
  useEffect(() => {
    if (!goalKey) return;
    setAnswers(running && running.key === goalKey ? running.answers : {});
    setRemind(running && running.key === goalKey ? Boolean(running.remind) : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalKey]);

  if (!goal) return null;
  const look = LOOK[goal.key];

  async function save() {
    if (!goal) return;
    setBusy(true);
    const since = editing && running ? running.since : todayIso();
    const ok = await saveDailyPrefs(qc, profileId, { ...(prefs.data ?? {}), goal: { key: goal.key, since, answers, remind } });
    setBusy(false);
    if (!ok) return;
    feel.success();
    // The reminder itself is planned with the day's nudges (use-engagement.ts).
    if (remind) void setGoalReminder(profileId).then(() => qc.invalidateQueries({ queryKey: ["push-permission"] }));
    else void clearGoalReminder(profileId);
    onClose();
  }

  async function stop() {
    const next = { ...(prefs.data ?? {}) };
    delete next.goal;
    const ok = await saveDailyPrefs(qc, profileId, next);
    if (!ok) return;
    feel.tap();
    void clearGoalReminder(profileId);
    onClose();
  }

  return (
    <Sheet open={Boolean(goalKey)} title={goalTitle(goal, answers)} line={goal.line} onClose={onClose} art={look.art} tone={{ ...PILLAR_TONE.sleep, bg: look.bg }}>
      {goal.questions.map((q) => (
        <View key={q.key} style={{ marginBottom: 18 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>{q.ask}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
            {q.options.map((o) => {
              const on = answers[q.key] === o.value;
              return (
                <Tap
                  key={o.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    feel.tick();
                    setAnswers((a) => ({ ...a, [q.key]: o.value }));
                  }}
                  scale={0.96}
                  style={{ height: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? look.bg : "#fff", borderWidth: 1.5, borderColor: on ? look.fg : "transparent" }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? look.fg : ink[900] }}>{o.label}</Text>
                </Tap>
              );
            })}
          </View>
        </View>
      ))}

      <View style={[glassCard("#ffffff", "#0f1030"), { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 22, shadowOpacity: 0.05 }]}>
        <Icon3D name="bell" size={30} />
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Remind me each day</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700], marginTop: 1 }}>{`Around ${hourLabel(reminderHour(goal, answers))}, on this phone`}</Text>
        </View>
        <SpringSwitch checked={remind} onChange={() => setRemind((r) => !r)} label="Remind me each day" />
      </View>

      <PillButton loading={busy} onPress={() => void save()} style={{ marginTop: 20 }}>
        {editing ? "Save changes" : "Start this goal"}
      </PillButton>
      {editing ? (
        <Tap accessibilityRole="button" onPress={() => void stop()} style={{ alignSelf: "center", paddingVertical: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Stop this goal</Text>
        </Tap>
      ) : null}
    </Sheet>
  );
}
