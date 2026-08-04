import { useRouter } from "expo-router";
import { CalendarRange, LayoutList, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import type { LayoutChangeEvent} from "react-native";
import { Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { EmptyRecords, FileChip, RecordRow, SeverityPill } from "@/components/records/chrome";
import { useReducedMotion } from "@/components/ui/motion";
import { groupByMonth, groupByRecency, railDate } from "@/lib/records/grouping";
import { type RecordSummary, type Severity } from "@/lib/records/types";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

type View_ = "list" | "timeline";

/** The rail ring. Fill weight, so the sampled hues are right. */
const SEVERITY_DOT: Record<Severity, string> = {
  normal: semantic.safe,
  borderline: semantic.caution,
  high_risk: semantic.danger,
};

/*
 * D1 and D3 as one screen with a segmented toggle, not two routes.
 *
 * Both were always the same records in a different arrangement — fetched the
 * same way, filtered the same way, empty in the same case. Splitting them
 * across a link meant a full navigation (and a fresh loading state) to answer
 * "what happened when" after already looking at "what do I have". Toggling in
 * place, with both arrangements built from the one array already in memory, is
 * instant and never shows a blank screen mid-switch.
 */
export function RecordsView({
  records,
  filtered,
}: {
  records: readonly RecordSummary[];
  filtered: boolean;
}) {
  const [view, setView] = useState<View_>("list");

  const listGroups = groupByRecency(records);
  const monthGroups = groupByMonth(records);

  if (records.length === 0) {
    return (
      <>
        <ViewToggle view={view} onChange={setView} />
        <EmptyRecords filtered={filtered} />
      </>
    );
  }

  return (
    <>
      <ViewToggle view={view} onChange={setView} />

      {/*
       * Cross-faded rather than swapped. The two arrangements share most of
       * their content, so an instant switch reads as a flicker; a short fade
       * makes it read as the same records rearranging.
       */}
      {view === "list" ? (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {listGroups.map((group) => (
            <View key={group.key} className="mt-5 px-5">
              <Text className="text-[15px] font-semibold text-ink-900">{group.label}</Text>
              <View className="mt-2 gap-2">
                {group.records.map((record) => (
                  <RecordRow key={record.id} record={record} />
                ))}
              </View>
            </View>
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
          {monthGroups.map((month) => (
            <View key={month.key} className="mt-6">
              <View className="flex-row items-center justify-between px-5">
                <Text className="text-[16px] font-bold text-ink-900">{month.label}</Text>
                <View className="rounded-pill bg-brand-50 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-brand-700">
                    {month.records.length} record{month.records.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                {month.records.map((record, i) => (
                  <TimelineRow
                    key={record.id}
                    record={record}
                    isLast={i === month.records.length - 1}
                  />
                ))}
              </View>
            </View>
          ))}
        </Animated.View>
      )}
    </>
  );
}

/*
 * The segmented control, with the filled pill sliding between the two options.
 *
 * The web build got this from Framer Motion's `layoutId`, which has no
 * equivalent here — so the pill is one absolutely positioned view whose x is a
 * spring, and the track measures itself rather than assuming half of a known
 * width. Assuming would break the moment the labels change length or the
 * device runs a larger text size.
 */
function ViewToggle({ view, onChange }: { view: View_; onChange: (next: View_) => void }) {
  const still = useReducedMotion();
  const [half, setHalf] = useState(0);
  const x = useSharedValue(0);

  function measure(event: LayoutChangeEvent) {
    // 4pt of padding on each side of the track.
    setHalf((event.nativeEvent.layout.width - 8) / 2);
  }

  function select(next: View_) {
    onChange(next);
    const target = next === "list" ? 0 : half;
    x.value = still ? target : withSpring(target, { stiffness: 420, damping: 34 });
  }

  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: half,
  }));

  return (
    <View
      onLayout={measure}
      className="mx-5 mt-3 flex-row rounded-pill p-1"
      style={[{ backgroundColor: surface.tint }, shadow.e1]}
    >
      {half > 0 ? (
        /* Styled by value, not by class. NativeWind does not reliably apply a
           className to a Reanimated component, and the failure mode here was
           silent and bad: the pill rendered as a pale rectangle, so the white
           label of the selected tab sat on near-white and vanished. */
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 4,
              bottom: 4,
              left: 4,
              borderRadius: 999,
              backgroundColor: brand[600],
            },
            pill,
          ]}
        />
      ) : null}
      <ViewTab
        active={view === "list"}
        onPress={() => select("list")}
        icon={LayoutList}
        label="List"
      />
      <ViewTab
        active={view === "timeline"}
        onPress={() => select("timeline")}
        icon={CalendarRange}
        label="Timeline"
      />
    </View>
  );
}

function ViewTab({
  active,
  onPress,
  icon: Icon,
  label,
}: {
  active: boolean;
  onPress: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-pill py-2.5"
    >
      <Icon size={15} color={active ? "#ffffff" : ink[500]} />
      <Text
        className="text-[13px] font-semibold"
        style={{ color: active ? "#ffffff" : ink[500] }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * The timeline rail: a continuous line runs behind every dot in a month rather
 * than a fresh border on each row, so a month with five records reads as one
 * thread through time instead of five unrelated cards that happen to be
 * stacked. The date gets its own soft chip rather than bare numerals, which is
 * what makes the rail feel designed rather than typeset.
 */
function TimelineRow({ record, isLast }: { record: RecordSummary; isLast: boolean }) {
  const router = useRouter();
  const { day, month } = railDate(record.eventDate ?? "");

  return (
    <View className="flex-row gap-3 px-5">
      <View className="w-9 items-center pt-1">
        <View className="items-center rounded-tile bg-surface px-1.5 py-1" style={shadow.e1}>
          <Text className="text-[14px] font-bold leading-none text-ink-900">{day}</Text>
          <Text className="mt-0.5 text-[8.5px] font-bold leading-none tracking-wide text-ink-300">
            {month}
          </Text>
        </View>
      </View>

      <View className="items-center">
        <View
          className="mt-1.5 h-3.5 w-3.5 rounded-pill bg-surface"
          style={[{ borderWidth: 3, borderColor: SEVERITY_DOT[record.severity] }, shadow.e1]}
        />
        {!isLast ? (
          <View style={{ width: 1, flex: 1, minHeight: 20, backgroundColor: surface.line }} />
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={record.title}
        onPress={() => router.push(`/records/${record.id}`)}
        className="mb-4 min-w-0 flex-1 flex-row items-center gap-2.5 rounded-card bg-surface p-2.5"
        style={shadow.e1}
      >
        <FileChip mimeType={record.mimeType} docType={record.docType} compact />
      {/*
       * The title gets the full width of the card and the severity pill drops
       * to the line below it.
       *
       * Beside the title, as in the list, the pill left about 150pt for a
       * document name and produced "Antenatal prescr…" — which is not a title,
       * it is a hint that one exists. The rail and date chip already spend
       * ~60pt of the row before this card begins, so the width has to come from
       * somewhere, and a wrapped second line is cheaper than an unreadable
       * first one.
       *
       * There is also no chevron here, unlike the list: the whole row is the
       * target, so it was buying nothing at 16pt plus a gap.
       */}
      <View className="min-w-0 flex-1">
        <Text className="text-[14px] font-semibold text-ink-900" numberOfLines={1}>
          {record.title}
        </Text>
        <View className="mt-1 flex-row items-center gap-2">
          <SeverityPill severity={record.severity} />
          <Text className="flex-1 text-[11px] text-ink-500" numberOfLines={1}>
            {record.profileName}
            {record.facility ? ` · ${record.facility}` : ""}
          </Text>
        </View>
      </View>
      </Pressable>
    </View>
  );
}
