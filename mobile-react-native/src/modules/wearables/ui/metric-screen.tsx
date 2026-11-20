import { useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton, ScreenHeader } from "@/components/ui/screen";
import { ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { dayKey, shortDate, weekdayLetter } from "../days";
import { average, explain, isMetricKey, latest, METRICS, series, trend, trendLine, trendTone } from "../insights";
import { useWearables } from "../queries";
import { demoOnly } from "../store";
import { METRIC_LOOK, SampleTag, toneColor } from "./parts";
import { SkyWash } from "@/components/ui/sky-wash";
import { glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";

/*
 * One measure: the number, how it compares with last week, a fortnight of
 * bars, and what it is in a sentence. The chart is a row of plain bars with
 * the weekday under each; today's is ink and the rest are grey.
 */

const CHART_HEIGHT = 150;

export function WearablesMetricScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { metric } = useLocalSearchParams<{ metric: string }>();
  const state = useWearables();

  if (!isMetricKey(metric)) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader fallback="/wearables" />
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 60 }}>That page isn't available.</Text>
      </View>
    );
  }

  const meta = METRICS[metric];
  const days = state.data?.days ?? [];
  const today = dayKey(new Date());
  const points = series(days, metric, today, 14);
  const values = points.map((p) => p.value);
  const real = values.filter((v): v is number => v !== null);
  const t = trend(days, metric, today);
  const last = latest(days, metric, today, 14);
  const big = meta.kind === "total" && metric !== "steps" && metric !== "sleep" ? t.now : (last?.value ?? null);
  const pressure = metric === "bp" ? [...days].reverse().find((d) => d.systolic !== null && d.diastolic !== null) : null;
  const shown = metric === "bp" && pressure ? `${pressure.systolic}/${pressure.diastolic}` : big !== null ? meta.format(big) : "–";
  const line = trendLine(metric, t);
  const look = METRIC_LOOK[metric];

  const max = Math.max(1, ...real);
  const floor = meta.kind === "reading" && real.length ? Math.min(...real) * 0.9 : 0;
  const mean = average(values);
  const stats: [string, string][] = [
    ["Average", mean !== null ? meta.format(mean) : "–"],
    [meta.better === "down" ? "Lowest" : "Highest", real.length ? meta.format(meta.better === "down" ? Math.min(...real) : Math.max(...real)) : "–"],
    ["Days recorded", `${real.length} of 14`],
  ];

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />
      <ScreenHeader fallback="/wearables" right={state.data && demoOnly(state.data) ? <SampleTag /> : undefined} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9, color: ink[900] }}>{meta.label}</Text>
          <View style={{ width: 60, height: 60, borderRadius: 20, backgroundColor: look.tone.bg, alignItems: "center", justifyContent: "center" }}>
            <Icon3D name={look.art} size={42} />
          </View>
        </View>
        <View style={[glassCard(look.tone.glass), { marginTop: 16, borderRadius: 28, padding: 20 }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: look.tone.deep }}>
            {last ? (last.day === today ? (metric === "sleep" ? "Last night" : "Today") : shortDate(last.day)) : "No reading yet"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, marginTop: 4 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 44, lineHeight: 50, letterSpacing: -1.6, color: ink[900] }}>{shown}</Text>
            {meta.unit ? <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], marginBottom: 9 }}>{meta.unit}</Text> : null}
          </View>
          {line ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: toneColor(trendTone(metric, t)), marginTop: 2 }}>{line.charAt(0).toUpperCase() + line.slice(1)}</Text> : null}

          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height: CHART_HEIGHT, marginTop: 22 }}>
            {points.map((p, i) => {
              const isToday = i === points.length - 1;
              const h = p.value === null ? 4 : Math.max(6, Math.round(CHART_HEIGHT * Math.max(0.06, (p.value - floor) / Math.max(1, max - floor))));
              return (
                <View key={p.day} style={{ flex: 1, height: CHART_HEIGHT, justifyContent: "flex-end" }} accessibilityLabel={`${shortDate(p.day)}: ${p.value === null ? "nothing recorded" : meta.format(p.value)}`}>
                  <View style={{ height: h, borderRadius: 4, backgroundColor: p.value === null ? "rgba(255,255,255,0.7)" : isToday ? look.tone.accent : "rgba(255,255,255,0.95)" }} />
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: "row", gap: 5, marginTop: 6 }}>
            {points.map((p, i) => (
              <Text key={p.day} style={{ flex: 1, textAlign: "center", fontFamily: i === points.length - 1 ? font.semibold : font.regular, fontSize: 10, color: i === points.length - 1 ? look.tone.deep : ink[500] }}>
                {weekdayLetter(p.day)}
              </Text>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          {stats.map(([label, value]) => (
            <View key={label} style={[glassCard("#ffffff", "#0f1030"), { flex: 1, borderRadius: 20, padding: 14, shadowOpacity: 0.05 }]}>
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{label}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: ink[900], marginTop: 2 }}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 10, borderRadius: 24, padding: 16, shadowOpacity: 0.05 }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: ink[900] }}>What this is</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], marginTop: 4 }}>{explain(metric)}</Text>
          {metric === "spo2" || metric === "bp" || metric === "glucose" || metric === "restingHr" ? (
            <View style={{ marginTop: 12, borderRadius: 12, backgroundColor: semantic.cautionBg, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: semantic.cautionText }}>
                If a reading worries you, or you feel unwell, speak to a doctor. Don't change a medicine because of a watch.
              </Text>
            </View>
          ) : null}
        </View>

        <PillButton onPress={() => router.push("/ask")} icon={<MessageCircle size={17} color="#fff" />} style={{ marginTop: 16 }}>
          {`Ask Cheeku about your ${meta.label.toLowerCase()}`}
        </PillButton>
      </ScrollView>
    </View>
  );
}
