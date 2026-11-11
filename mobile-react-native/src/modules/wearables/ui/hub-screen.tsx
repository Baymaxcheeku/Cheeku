import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight, Lock, Plus, RefreshCw, Watch } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassCircle } from "@/components/ui/glass";
import { PageTitle, PillButton, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { useDailyPrefs } from "@/lib/home/logs";
import { useFamily } from "@/lib/profiles/family";
import { ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { DEFAULT_STEPS_GOAL } from "../config";
import { addDays, dayKey, shortDate } from "../days";
import { latest, METRIC_ORDER, METRICS, series, trend, trendLine, trendTone } from "../insights";
import { refreshNow, useWearables, useWearableSync } from "../queries";
import { sourceInfo } from "../registry";
import { demoOnly } from "../store";
import type { DaySummary, MetricKey } from "../types";
import { ago, Bars, Ring, SampleTag, toneColor } from "./parts";

/*
 * The body, on one page: today at the top, each measure as a tile with its
 * week, the week's workouts, and what is connected. Every tile opens its own
 * page. Pull down to refresh.
 */

export function WearablesHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const family = useFamily();
  const me = family.data?.access.all.find((m) => m.isPrimary);
  const state = useWearables();
  const prefs = useDailyPrefs(me?.id);
  const [refreshing, setRefreshing] = useState(false);
  const connected = Boolean(state.data?.connections.length);
  useWearableSync(connected);

  const today = dayKey(new Date());
  const days = state.data?.days ?? [];
  const goal = prefs.data?.steps_goal && prefs.data.steps_goal >= 1000 ? prefs.data.steps_goal : DEFAULT_STEPS_GOAL;

  async function pull() {
    setRefreshing(true);
    await refreshNow(qc);
    setRefreshing(false);
  }

  return (
    <View className="flex-1 bg-canvas">
      <ScreenHeader
        fallback="/home"
        right={
          connected ? (
            <GlassCircle label="Refresh" onPress={() => void pull()}>
              <RefreshCw size={19} color={ink[900]} />
            </GlassCircle>
          ) : undefined
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={connected ? <RefreshControl refreshing={refreshing} onRefresh={() => void pull()} tintColor={ink[500]} /> : undefined}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
          <PageTitle title="Your body" line="From your watch and phone, in one place." style={{ flex: 1 }} />
          {state.data && demoOnly(state.data) ? (
            <View style={{ marginBottom: 4 }}>
              <SampleTag />
            </View>
          ) : null}
        </View>

        {!state.data ? null : !connected ? (
          <Empty onConnect={() => router.push("/wearables/connect" as never)} />
        ) : (
          <>
            <TodayCard days={days} today={today} goal={goal} />

            <View style={{ marginTop: 26 }}>
              <SectionTitle>This week</SectionTitle>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
              {METRIC_ORDER.filter((k) => latest(days, k, today, 14)).map((k) => (
                <MetricTile key={k} k={k} days={days} today={today} onPress={() => router.push(`/wearables/${k}` as never)} />
              ))}
            </View>

            <Workouts days={days} today={today} />

            <View style={{ marginTop: 26 }}>
              <SectionTitle>Connected</SectionTitle>
            </View>
            <View style={{ marginTop: 12, borderRadius: 24, backgroundColor: "#fff", paddingHorizontal: 16 }}>
              {(state.data.connections ?? []).map((c, i) => {
                const info = sourceInfo(c.source);
                if (!info) return null;
                return (
                  <View key={c.source} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                      <info.icon size={19} color={ink[900]} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{info.name}</Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>Updated {ago(c.lastSyncAt)}</Text>
                    </View>
                  </View>
                );
              })}
              <Tap accessibilityRole="button" onPress={() => router.push("/wearables/connect" as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: surface.line }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                  <Plus size={19} color={ink[900]} />
                </View>
                <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Manage devices</Text>
                <ChevronRight size={18} color={ink[300]} />
              </Tap>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 16, paddingHorizontal: 4 }}>
              <Lock size={13} color={ink[300]} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
                Cheeku keeps one summary a day, never a minute-by-minute record. Watch readings are a guide, not a medical test.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Empty({ onConnect }: { onConnect: () => void }) {
  return (
    <View style={{ marginTop: 20, borderRadius: 24, backgroundColor: "#fff", padding: 24, alignItems: "center" }}>
      <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
        <Watch size={28} color={ink[900]} strokeWidth={1.7} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900], marginTop: 16, textAlign: "center" }}>Nothing connected yet</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 6, textAlign: "center" }}>
        Connect your phone's health app or your watch. Steps, sleep and heart rate fill in on their own, and Cheeku answers with them in mind.
      </Text>
      <PillButton onPress={onConnect} style={{ alignSelf: "stretch", marginTop: 20 }}>
        Connect a device
      </PillButton>
    </View>
  );
}

function TodayCard({ days, today, goal }: { days: readonly DaySummary[]; today: string; goal: number }) {
  const row = days.find((d) => d.day === today);
  const steps = row?.steps ?? null;
  const facts: [string, string][] = [
    ["Distance", row?.distanceKm !== null && row?.distanceKm !== undefined ? `${METRICS.distance.format(row.distanceKm)} km` : "–"],
    ["Active energy", row?.activeKcal !== null && row?.activeKcal !== undefined ? `${METRICS.activeKcal.format(row.activeKcal)} kcal` : "–"],
    ["Workouts", row?.workouts.length ? `${row.workouts.length} today` : "None yet"],
  ];
  return (
    <View style={{ marginTop: 18, borderRadius: 24, backgroundColor: "#fff", padding: 18, flexDirection: "row", alignItems: "center", gap: 18 }}>
      <Ring size={132} stroke={12} progress={steps !== null ? Math.min(1, steps / goal) : null}>
        <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.9, color: ink[900] }}>{steps !== null ? METRICS.steps.format(steps) : "–"}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: -1 }}>of {METRICS.steps.format(goal)} steps</Text>
      </Ring>
      <View style={{ flex: 1, gap: 12 }}>
        {facts.map(([label, value]) => (
          <View key={label}>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{label}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: ink[900], marginTop: 1 }}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MetricTile({ k, days, today, onPress }: { k: MetricKey; days: readonly DaySummary[]; today: string; onPress: () => void }) {
  const meta = METRICS[k];
  const t = trend(days, k, today);
  const l = latest(days, k, today, 14);
  // A total reads best as the week's daily average; a reading as the latest one.
  const shown = meta.kind === "total" ? t.now : (l?.value ?? null);
  const s = series(days, k, today, 7).map((p) => p.value);
  const real = s.filter((v): v is number => v !== null);
  const max = Math.max(1, ...real);
  const min = meta.kind === "reading" && real.length ? Math.min(...real) * 0.85 : 0;
  const bars = s.map((v) => (v === null ? null : Math.max(0.08, (v - min) / Math.max(1, max - min))));
  const pressure = k === "bp" ? [...days].reverse().find((d) => d.systolic !== null && d.diastolic !== null) : null;
  const value = k === "bp" && pressure ? `${pressure.systolic}/${pressure.diastolic}` : shown !== null ? meta.format(shown) : "–";
  const line = trendLine(k, t);

  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${meta.label}, ${value} ${meta.unit}`} onPress={onPress} style={{ width: "48.4%", borderRadius: 20, backgroundColor: "#fff", padding: 14 }} scale={0.98}>
      <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{meta.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 6 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900] }}>{value}</Text>
        {meta.unit && k !== "steps" ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginBottom: 4 }}>{meta.unit}</Text> : null}
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: toneColor(trendTone(k, t)), marginTop: 1 }}>
        {line ? line.charAt(0).toUpperCase() + line.slice(1) : meta.kind === "total" ? "A day, on average" : l ? shortDate(l.day) : ""}
      </Text>
      <View style={{ marginTop: 12 }}>
        <Bars values={bars} height={30} />
      </View>
    </Tap>
  );
}

function Workouts({ days, today }: { days: readonly DaySummary[]; today: string }) {
  const from = addDays(today, -6);
  const list = days
    .filter((d) => d.day >= from && d.day <= today)
    .flatMap((d) => d.workouts.map((w) => ({ ...w, day: d.day })))
    .reverse()
    .slice(0, 6);
  if (!list.length) return null;
  return (
    <>
      <View style={{ marginTop: 26 }}>
        <SectionTitle>Workouts</SectionTitle>
      </View>
      <View style={{ marginTop: 12, borderRadius: 24, backgroundColor: "#fff", paddingHorizontal: 16 }}>
        {list.map((w, i) => (
          <View key={`${w.startedAt}${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{w.type}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
                {[w.day === today ? "Today" : shortDate(w.day), w.app].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{w.minutes} min</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{[w.km !== null ? `${w.km} km` : null, w.kcal !== null ? `${w.kcal} kcal` : null].filter(Boolean).join(" · ")}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
