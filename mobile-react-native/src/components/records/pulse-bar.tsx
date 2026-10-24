import { Text, View } from "react-native";

import { SEVERITY_LABEL, type RecordStats, type Severity } from "@/lib/records/types";
import { ink, semantic, surface } from "@/theme/tokens";
import { Tap } from "@/components/ui/tap";

/*
 * The composition of the filtered set, as one bar plus three filters.
 *
 * ┌─ WHY THE FOUR STAT TILES HAD TO GO ──────────────────────────────────────┐
 * │                                                                          │
 * │ They were four equal white boxes reading 2 / 0 / 0 / 2, occupying a       │
 * │ quarter of the screen to say something the two rows underneath already    │
 * │ said. Nothing led, nothing could be tapped, and "Total records 2" above   │
 * │ a list of two records is the app narrating itself.                       │
 * │                                                                          │
 * │ A count is only worth its space if it does something. Here the counts     │
 * │ ARE the filter: tapping High priority scopes the list to it, and the bar  │
 * │ above shows the mix at a glance in the width of one line. Same            │
 * │ information, a fifth of the height, and it now answers "show me only      │
 * │ those" instead of just stating a number.                                  │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

type Cell = { key: Severity; label: string; fg: string; bar: string; bg: string };

/*
 * `bar` is a softened version of `fg`, and that is deliberate.
 *
 * At full saturation a file where everything is flagged paints a solid band of
 * danger red the width of the screen — which is the same "dark block shouting"
 * problem the health card had. The bar states proportion; the dot and the
 * number state severity. Softening the largest surface and keeping the small
 * marks saturated puts the intensity where the meaning is.
 */
const CELLS: readonly Cell[] = [
  { key: "normal", label: SEVERITY_LABEL.normal, fg: semantic.safe, bar: "#7fd0a4", bg: semantic.safeBg },
  {
    key: "borderline",
    label: SEVERITY_LABEL.borderline,
    fg: semantic.cautionText,
    bar: "#f0c073",
    bg: semantic.cautionBg,
  },
  { key: "high_risk", label: SEVERITY_LABEL.high_risk, fg: semantic.attentionText, bar: "#f5a97f", bg: semantic.attentionBg },
];

const COUNT_KEY: Record<Severity, keyof RecordStats> = {
  normal: "normal",
  borderline: "borderline",
  high_risk: "highRisk",
};

export function PulseBar({
  stats,
  active,
  onToggle,
}: {
  stats: RecordStats;
  /** Null means no severity filter — every record is listed. */
  active: Severity | null;
  onToggle: (next: Severity | null) => void;
}) {
  const total = Math.max(1, stats.total);

  return (
    <View className="mx-5 mt-4">
      {/*
       * One bar, segmented by proportion. It reads in a glance the way four
       * numbers never do: mostly green is a good file, a wide red band is not,
       * and neither needs a label to land.
       */}
      <View
        className="h-1.5 flex-row gap-1 overflow-hidden rounded-pill"
        style={{ backgroundColor: "transparent" }}
      >
        {CELLS.map((cell) => {
          const count = stats[COUNT_KEY[cell.key]] as number;
          if (count === 0) return null;
          return (
            <View
              key={cell.key}
              style={{
                flex: count / total,
                backgroundColor: cell.bar,
                borderRadius: 999,
                opacity: active && active !== cell.key ? 0.3 : 1,
              }}
            />
          );
        })}
      </View>

      <View className="mt-2.5 flex-row gap-1.5">
        {CELLS.map((cell) => {
          const count = stats[COUNT_KEY[cell.key]] as number;
          const on = active === cell.key;
          const dim = count === 0;

          return (
            <Tap scale={0.98}
              key={cell.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${count} ${cell.label}${on ? ", filtering by this" : ""}`}
              // A zero chip stays visible but inert: hiding it makes the row
              // reflow every time a filter changes, and "0 high priority" is a
              // genuinely reassuring thing to be able to read.
              onPress={dim ? undefined : () => onToggle(on ? null : cell.key)}
              className="flex-1 flex-row items-center gap-2 rounded-tile px-2.5 py-2"
              style={{
                backgroundColor: on ? cell.bg : surface.base,
                borderWidth: 1,
                borderColor: on ? cell.fg : surface.line,
                opacity: dim ? 0.55 : 1,
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor: dim ? ink[300] : cell.fg,
                }}
              />
              <View className="min-w-0 flex-1">
                <Text
                  className="text-base font-semibold leading-none"
                  style={{ color: on ? cell.fg : ink[900] }}
                >
                  {count}
                </Text>
                <Text className="mt-0.5 text-3xs leading-tight text-ink-500" numberOfLines={1}>
                  {cell.label}
                </Text>
              </View>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
