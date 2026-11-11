import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, LayoutGrid, SlidersHorizontal } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CardListSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { firstName } from "@/components/home/ask-hero";
import { BreathingSheet, MealSheet, ReadingSheet, Sheet, StepsSheet } from "@/components/today/sheets";
import { GoalBanner, GoalPicker, GoalSheet } from "@/components/today/goals";
import { RemindersPrompt } from "@/components/today/reminders-prompt";
import { PILLAR_ICON, TaskCard, TaskRow, type TaskAction } from "@/components/today/task-card";
import { GlassCircle, Gradient, glassShadow } from "@/components/ui/glass";
import { Enter, Fold, StaggerItem } from "@/components/ui/motion";
import { ProgressRing } from "@/components/ui/ring";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { WINDOW_LABEL, type Window } from "@/lib/home/catalog";
import { AREA_LABEL, PILLARS, type Pillar } from "@/lib/home/content";
import { saveDailyPrefs, useDailyPrefs } from "@/lib/home/logs";
import { dayPlate } from "@/lib/home/meals";
import type { GoalKey } from "@/lib/home/goals";
import { mealsToday, nowTasks, type PlanTask } from "@/lib/home/plan";
import { logStep, logSteps, unlogStep, useHomeStage } from "@/lib/home/stage";
import { usePlan } from "@/lib/home/use-plan";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { joinAnd, softLower } from "@/lib/content/words";
import { feel } from "@/lib/feel";

/*
 * TODAY'S ACTION PLAN.
 *
 * The whole day for the member in view, under the five pillars, each one a
 * tap away. Every task is either "for you" (there because of their own
 * readings, conditions, medicines or something due, with the reason in a
 * line) or "healthy living" (the general habits a long, healthy life is made
 * of). Sorted for the hour it is, so the morning shows breakfast and sleep,
 * the evening shows dinner and winding down.
 *
 * Opened from Home's pillars (?pillar=move) or straight into a task's sheet
 * (?task=steps).
 *
 * CALMER, SINCE UI BATCH 4. "All" used to be fifteen equal cards. Now it shows
 * the three that matter right now (nowTasks: what is due, then the goal's
 * check-ins, then this part of the day), and folds the rest under "Later
 * today" and "Done today" as one-line rows that open in place. A card that is
 * done or put off folds away first, with one haptic, then the next one rises.
 * A pillar on its own is short enough to show whole.
 */

const INTRO: Record<Pillar | "all", string> = {
  all: "Three for right now. The rest can wait.",
  move: "Steps, strength, balance. Your 70-year-old self is built now.",
  eat: "Snap every plate. Cheeku reads it against your numbers.",
  sleep: "Sleep is repair time. Rhythm beats long lie-ins.",
  mind: "Calm is a health number too.",
  check: "Readings, medicines, what's due. Nothing slips.",
};

const isPillar = (v: unknown): v is Pillar => typeof v === "string" && PILLARS.some((p) => p.key === v);

type Group = { key: string; title: string; tasks: PlanTask[] };

function groupsFor(tasks: readonly PlanTask[], now: Exclude<Window, "anytime">): Group[] {
  const order: Exclude<Window, "anytime">[] = ["morning", "midday", "evening"];
  const rank = (w: Window) => (w === now ? 0 : w === "anytime" ? 1 : order.indexOf(w) > order.indexOf(now) ? 2 : 3);
  const open = tasks.filter((t) => t.status !== "done");
  const due = open.filter((t) => t.due);
  const rest = open.filter((t) => !t.due);
  const groups: Group[] = [
    { key: "due", title: "Due", tasks: due },
    { key: "now", title: `Now · ${WINDOW_LABEL[now]}`, tasks: rest.filter((t) => rank(t.window) === 0) },
    { key: "any", title: "Any time today", tasks: rest.filter((t) => rank(t.window) === 1) },
    { key: "later", title: "Later today", tasks: rest.filter((t) => rank(t.window) === 2) },
    { key: "earlier", title: "Earlier today", tasks: rest.filter((t) => rank(t.window) === 3) },
    { key: "done", title: "Done today", tasks: tasks.filter((t) => t.status === "done") },
  ];
  return groups.filter((g) => g.tasks.length);
}

export default function TodayPlan() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ pillar?: string; task?: string }>();
  const family = useFamily();
  const profile = family.data?.profile ?? null;
  const home = useHomeStage();
  const { plan, loading } = usePlan(profile?.id, home.state?.due ?? []);
  const prefs = useDailyPrefs(profile?.id);

  const [pillar, setPillar] = useState<Pillar | "all">(isPillar(params.pillar) ? params.pillar : "all");
  const [sheet, setSheet] = useState<{ action: TaskAction; key: string } | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [goalSheet, setGoalSheet] = useState<GoalKey | null>(null);
  // Cards folding away, and what to write once they have.
  const [leaving, setLeaving] = useState<Map<string, "done" | "later">>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openFold, setOpenFold] = useState<{ later: boolean; done: boolean }>({ later: false, done: false });

  // ?task=steps opens that task's sheet once the plan is in.
  useEffect(() => {
    if (opened || !plan || !params.task) return;
    const t = plan.tasks.find((x) => x.key === params.task);
    // Personal tasks appear once memory is in; wait for it before giving up.
    if (!t && loading) return;
    if (t && (t.kind === "steps" || t.kind === "meal" || t.kind === "reading" || t.kind === "timer")) {
      setPillar(t.pillar);
      setSheet({ action: t.kind === "steps" ? "steps" : t.kind === "meal" ? "meal" : t.kind === "reading" ? "reading" : "timer", key: t.key });
    }
    setOpened(true);
  }, [plan, params.task, opened, loading]);

  const visible = useMemo(() => (plan ? (pillar === "all" ? plan.tasks : plan.byPillar[pillar]) : []), [plan, pillar]);
  const groups = plan && pillar !== "all" ? groupsFor(visible, plan.now) : [];
  // "All": three now, everything else folded.
  const top = useMemo(() => (plan ? nowTasks(plan) : []), [plan]);
  const later = plan ? plan.tasks.filter((t) => t.status !== "done" && !top.includes(t)) : [];
  const doneList = plan ? plan.tasks.filter((t) => t.status === "done") : [];
  const sheetTask = sheet && plan ? (plan.tasks.find((t) => t.key === sheet.key) ?? null) : null;
  const plate = plan && pillar === "eat" ? dayPlate(mealsToday(plan)) : null;

  if (!profile || !plan) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Today's plan" />
        <View className="flex-1 items-center justify-center">{loading || family.isPending ? <View style={{ alignSelf: "stretch", paddingHorizontal: 20 }}><CardListSkeleton count={3} /></View> : <Text style={{ color: ink[500] }}>Nothing to plan yet.</Text>}</View>
      </View>
    );
  }

  // A dose card is done when every dose on it is, so "done" ticks each one.
  const write = (t: PlanTask, status: "done" | "later") => {
    if (t.kind === "dose" && status === "done" && t.dose) void logSteps(qc, profile.id, t.dose.doses.filter((d) => !d.taken).map((d) => d.stepKey));
    else void logStep(qc, { profileId: profile.id, stepKey: t.key, status });
  };
  const mark = (t: PlanTask, status: "done" | "later") => {
    if (status === "done") {
      // The last step of the day is the one worth celebrating.
      if (plan.done + 1 >= plan.total) feel.success();
      else feel.tap();
    }
    write(t, status);
  };
  const fold = (t: PlanTask, status: "done" | "later") => {
    if (status === "done") {
      if (plan.done + 1 >= plan.total) feel.success();
      else feel.tap();
    }
    setLeaving((m) => new Map(m).set(t.key, status));
  };
  const landed = (key: string) => {
    const status = leaving.get(key);
    setLeaving((m) => {
      const n = new Map(m);
      n.delete(key);
      return n;
    });
    const t = plan.tasks.find((x) => x.key === key);
    if (status && t) write(t, status);
  };
  const card = (t: PlanTask, onDone: () => void, onLater: () => void) => (
    <TaskCard
      task={t}
      profileId={profile.id}
      areas={plan.areas}
      onOpen={(action) => setSheet({ action, key: t.key })}
      onDone={onDone}
      onLater={onLater}
      onUndo={() => void unlogStep(qc, { profileId: profile.id, stepKey: t.key })}
    />
  );

  // "Built around your sugar plan and what's due." Areas read as "your ...";
  // the due list does not, so it is added on its own.
  const builtFrom = [
    ...(plan.goal ? [`your ${plan.goal.noun} goal`] : []),
    ...plan.areas.slice(0, plan.goal ? 1 : 2).map((a) => `your ${softLower(AREA_LABEL[a])}`),
    ...(plan.tasks.some((t) => t.due) ? ["what's due"] : []),
  ];
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title="Today's plan"
        subtitle={profile.isPrimary ? date : `${firstName(profile.name)} · ${date}`}
        right={
          <GlassCircle label="Plan settings" onPress={() => setPrefsOpen(true)}>
            <SlidersHorizontal size={18} color={ink[900]} />
          </GlassCircle>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* The day at a glance */}
        <StaggerItem index={0}>
          <View className="mx-5 mt-3 overflow-hidden rounded-2xl bg-surface">
            <View className="p-4">
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{profile.isPrimary ? "Your day" : `${firstName(profile.name)}'s day`}</Text>
              <View className="mt-2 flex-row items-center gap-3">
                <ProgressRing done={plan.done} total={plan.total} />
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.4, color: ink[900] }}>
                    {plan.done === plan.total && plan.total > 0 ? "All done today" : plan.done === 0 ? "A fresh start" : "Keep going"}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700], marginTop: 1 }}>{`${plan.total - plan.done} left today`}</Text>
                </View>
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[700], marginTop: 10 }}>
                {builtFrom.length ? `Built around ${joinAnd(builtFrom)}.` : "Everyday longevity habits. Add a report to make it yours."}
              </Text>
            </View>
          </View>
        </StaggerItem>

        {/*
         * The switches: all six on screen at once, so the one you are on is
         * never scrolled out of sight, and each says how much of it is done.
         */}
        <View className="mt-4 flex-row gap-1.5 px-5">
          {(["all", ...PILLARS.map((p) => p.key)] as const).map((k) => {
            const on = pillar === k;
            const Icon = k === "all" ? LayoutGrid : PILLAR_ICON[k];
            const label = k === "all" ? "All" : (PILLARS.find((p) => p.key === k)?.label ?? "");
            const prog = k === "all" ? { done: plan.done, total: plan.total } : plan.pillarProgress[k];
            const complete = prog.total > 0 && prog.done === prog.total;
            return (
              <Tap
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${label}, ${prog.done} of ${prog.total} done`}
                onPress={() => {
                  if (k !== pillar) feel.tick();
                  setPillar(k);
                }}
                style={[
                  on ? null : glassShadow,
                  {
                    flex: 1,
                    height: 78,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    backgroundColor: on ? ink[900] : "#fff",
                    borderWidth: on ? 0 : 1,
                    borderColor: surface.line,
                  },
                ]}
                scale={0.95}
              >
                <Icon size={18} color={on ? "#fff" : brand[600]} strokeWidth={2} />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: on ? "#fff" : ink[900] }}>{label}</Text>
                {complete ? (
                  <View className="h-4 w-4 items-center justify-center rounded-pill" style={{ backgroundColor: brand[500] }}>
                    <Check size={10} color="#fff" strokeWidth={3.2} />
                  </View>
                ) : (
                  <Text style={{ fontFamily: font.medium, fontSize: 11, color: on ? "rgba(255,255,255,0.75)" : ink[500] }}>{`${prog.done}/${prog.total}`}</Text>
                )}
              </Tap>
            );
          })}
        </View>

        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], marginTop: 12, marginHorizontal: 20 }}>{INTRO[pillar]}</Text>
        {plate ? (
          <View className="mx-5 mt-3 rounded-lg p-3.5" style={{ backgroundColor: brand[50] }}>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: brand[700] }}>TODAY&apos;S PLATE</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: ink[900], marginTop: 3 }}>{plate.line}</Text>
          </View>
        ) : null}

        {pillar === "all" ? (
          <>
            <RemindersPrompt meds={Boolean(plan.meds?.slots.length)} />
            {plan.goal ? <GoalBanner goal={plan.goal} onPress={() => setGoalSheet(plan.goal?.key ?? null)} /> : <GoalPicker goals={plan.goals} onPick={setGoalSheet} />}

            <View className="mt-6 px-5">
              <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 0.2, color: ink[500], marginBottom: 10 }}>{top.length ? `Now · ${WINDOW_LABEL[plan.now]}` : "Now"}</Text>
              <View className="gap-3">
                {top.map((t) => (
                  <Fold key={t.key} gone={leaving.has(t.key)} onGone={() => landed(t.key)}>
                    <Enter kind="soft">{card(t, () => fold(t, "done"), () => fold(t, "later"))}</Enter>
                  </Fold>
                ))}
                {!top.length ? (
                  <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700] }}>
                    {plan.total > 0 && plan.done === plan.total ? "Everything for today is done. See you tomorrow." : "Nothing for right now. The rest is below."}
                  </Text>
                ) : null}
              </View>
            </View>

            <FoldSection
              title="Later today"
              count={later.length}
              open={openFold.later}
              onToggle={() => setOpenFold((f) => ({ ...f, later: !f.later }))}
            >
              {later.map((t) =>
                expanded === t.key ? (
                  <View key={t.key} className="my-1.5">
                    {card(t, () => mark(t, "done"), () => mark(t, "later"))}
                  </View>
                ) : (
                  <TaskRow key={t.key} task={t} onExpand={() => setExpanded(t.key)} onDone={() => mark(t, "done")} />
                ),
              )}
            </FoldSection>
            <FoldSection
              title="Done today"
              count={doneList.length}
              open={openFold.done}
              onToggle={() => setOpenFold((f) => ({ ...f, done: !f.done }))}
            >
              {doneList.map((t) =>
                expanded === t.key ? (
                  <View key={t.key} className="my-1.5">
                    {card(t, () => mark(t, "done"), () => mark(t, "later"))}
                  </View>
                ) : (
                  <TaskRow key={t.key} task={t} onExpand={() => setExpanded(t.key)} onDone={() => mark(t, "done")} />
                ),
              )}
            </FoldSection>
          </>
        ) : null}

        {groups.map((g, gi) => (
          <View key={g.key} className="mt-6 px-5">
            <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 0.2, color: ink[500], marginBottom: 10 }}>{g.title}</Text>
            <View className="gap-3">
              {g.tasks.map((t, i) => (
                <StaggerItem key={t.key} index={Math.min(8, gi * 2 + i)}>
                  <TaskCard
                    task={t}
                    profileId={profile.id}
                    areas={plan.areas}
                    onOpen={(action) => setSheet({ action, key: t.key })}
                    onDone={() => mark(t, "done")}
                    onLater={() => void logStep(qc, { profileId: profile.id, stepKey: t.key, status: "later" })}
                    onUndo={() => void unlogStep(qc, { profileId: profile.id, stepKey: t.key })}
                  />
                </StaggerItem>
              ))}
            </View>
          </View>
        ))}
        {pillar !== "all" && !groups.length ? <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], margin: 20 }}>Nothing here for today.</Text> : null}
      </ScrollView>

      {sheetTask && sheet?.action === "steps" ? <StepsSheet open profileId={profile.id} task={sheetTask} target={plan.steps} onClose={() => setSheet(null)} /> : null}
      {sheetTask && sheet?.action === "meal" ? <MealSheet open profileId={profile.id} task={sheetTask} areas={plan.areas} veg={Boolean(prefs.data?.veg)} onClose={() => setSheet(null)} /> : null}
      {sheetTask && sheet?.action === "reading" ? <ReadingSheet open profileId={profile.id} task={sheetTask} onClose={() => setSheet(null)} /> : null}
      {sheetTask && sheet?.action === "timer" ? <BreathingSheet open profileId={profile.id} task={sheetTask} onClose={() => setSheet(null)} /> : null}

      <PrefsSheet open={prefsOpen} profileId={profile.id} onClose={() => setPrefsOpen(false)} />
      <GoalSheet goalKey={goalSheet} profileId={profile.id} onClose={() => setGoalSheet(null)} />
    </View>
  );
}

/** A folded list under the three: a header that says how many, rows when open. */
function FoldSection({ title, count, open, onToggle, children }: { title: string; count: number; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <View className="mx-5 mt-5 rounded-xl bg-white px-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
      <Tap
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${count}`}
        onPress={() => {
          feel.tick();
          onToggle();
        }}
        scale={0.98}
        className="h-14 flex-row items-center justify-between"
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
          {title}
          <Text style={{ fontFamily: font.medium, color: ink[500] }}>{`  ${count}`}</Text>
        </Text>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={18} color={ink[500]} />
        </View>
      </Tap>
      {open ? <View className="pb-2" style={{ borderTopWidth: 1, borderTopColor: surface.line }}>{children}</View> : null}
    </View>
  );
}

const GOALS = [5000, 7000, 8000, 10000, 12000];

/** The few things a person can tune: their step goal, and vegetarian meals. */
function PrefsSheet({ open, profileId, onClose }: { open: boolean; profileId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const prefs = useDailyPrefs(profileId);
  const current = prefs.data ?? {};
  const set = (next: typeof current) => void saveDailyPrefs(qc, profileId, next);
  return (
    <Sheet open={open} title="Tune your plan" line="Cheeku picks the tasks. These are yours to set." onClose={onClose}>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Daily step goal</Text>
      <View className="mt-2 flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
        {[undefined, ...GOALS].map((g) => {
          const on = current.steps_goal === g;
          return (
            <Tap key={g ?? "auto"} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => set({ ...current, steps_goal: g })} className="h-10 items-center justify-center rounded-pill px-4" style={{ backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{g ? g.toLocaleString("en-IN") : "Pick for me"}</Text>
            </Tap>
          );
        })}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 8 }}>
        &quot;Pick for me&quot; sets it by age and builds up from what you actually walked this week.
      </Text>

      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 20 }}>Food</Text>
      <View className="mt-2 flex-row gap-2">
        {[
          { v: false, label: "I eat everything" },
          { v: true, label: "Vegetarian" },
        ].map((o) => {
          const on = Boolean(current.veg) === o.v;
          return (
            <Tap key={o.label} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => set({ ...current, veg: o.v })} className="h-10 flex-1 items-center justify-center rounded-pill" style={{ backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{o.label}</Text>
            </Tap>
          );
        })}
      </View>
      <PillButton style={{ marginTop: 22 }} onPress={onClose}>
        Done
      </PillButton>
    </Sheet>
  );
}
