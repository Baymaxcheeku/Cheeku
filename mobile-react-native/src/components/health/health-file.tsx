import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  FileText,
  Minus,
  Pill,
  ScanLine,
  Syringe,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { HealthOverview } from "@/lib/records/overview";
import type { DocType } from "@/lib/records/types";
import { brand } from "@/theme/tokens";

/*
 * The health file, as a stack of cards.
 *
 * WHY A STACK AND NOT TILES. The old summary was three equal white tiles
 * counting documents, in-range values and things to review, with a list under
 * it repeating the same two records. Three problems in one section: every tile
 * had identical weight so nothing led, the counts said nothing a reader could
 * act on, and the list below duplicated the section above it.
 *
 * A stack fixes the hierarchy by construction. One card is in front and carries
 * the thing that matters; the others peek behind it as evidence of depth,
 * showing what else is in the file without giving each category its own
 * equal-sized box. It reads as one object — a file with things in it — rather
 * than a dashboard of unrelated numbers. This is the Monzo account stack
 * borrowed for a medical record, and it works for the same reason: the money,
 * or the finding, is on top, and the accounts behind it prove there is more.
 *
 * SEMANTIC COLOUR IS USED HERE AND ONLY HERE. The front card turns amber or red
 * when the lab flagged something, because that is a genuine statement about the
 * reader's results — the one thing the palette is reserved for.
 */

const TYPE_META: Record<DocType, { label: string; icon: LucideIcon }> = {
  lab_report: { label: "Lab reports", icon: FileText },
  prescription: { label: "Prescriptions", icon: Pill },
  scan: { label: "Scans", icon: ScanLine },
  vaccination: { label: "Vaccinations", icon: Syringe },
  discharge: { label: "Discharge notes", icon: FileText },
  bill: { label: "Bills", icon: FileText },
  other: { label: "Other documents", icon: FileText },
};

export function HealthFile({ overview }: { overview: HealthOverview }) {
  const router = useRouter();

  const worst = overview.flagged[0];
  const alerting = Boolean(worst);

  /*
   * The front card's colour states what the FILE says, not how full it is.
   * Nothing filed is brand — an empty file is not a health finding. Something
   * flagged is the semantic hue the lab itself used.
   */
  const tone = !alerting
    ? { field: brand[600], soft: "rgba(255,255,255,0.72)", chip: "rgba(255,255,255,0.18)" }
    : worst?.flag === "caution"
      ? { field: "#a9631a", soft: "rgba(255,255,255,0.78)", chip: "rgba(255,255,255,0.2)" }
      : { field: "#b3324b", soft: "rgba(255,255,255,0.78)", chip: "rgba(255,255,255,0.2)" };

  // The two categories that sit behind, biggest first, never the front one's own.
  const behind = overview.byType.slice(0, 2);

  return (
    <View className="mt-7">
      <View className="flex-row items-baseline justify-between px-5">
        <Text className="text-[12px] font-bold uppercase tracking-wide text-ink-300">
          Your health file
        </Text>
        {overview.lastEvent ? (
          <Text className="text-[11.5px] text-ink-300">
            Latest{" "}
            {new Date(overview.lastEvent).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            })}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          alerting
            ? `Health file. ${overview.flagged.length} results worth a look. Opens your full file`
            : `Health file. ${overview.totalDocuments} documents. Opens your full file`
        }
        onPress={() => router.push("/health-file")}
        className="mx-5 mt-2.5"
      >
        {/*
         * The peeking bands, drawn first and pulled up under the front card by
         * negative margin. Each is only tall enough to show its own label — the
         * whole point is that they are evidence, not content.
         */}
        {behind.map((entry, i) => {
          const meta = TYPE_META[entry.type] ?? TYPE_META.other;
          const inset = 14 * (behind.length - i);
          return (
            <View
              key={entry.type}
              style={{
                marginHorizontal: inset,
                backgroundColor: i === 0 ? "#e6e3fb" : "#efedfd",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingHorizontal: 16,
                paddingTop: 9,
                paddingBottom: 18,
                marginBottom: -12,
              }}
            >
              <View className="flex-row items-center gap-2">
                <meta.icon size={13} color={brand[700]} />
                <Text className="text-[11.5px] font-semibold" style={{ color: brand[700] }}>
                  {meta.label}
                </Text>
                <Text className="ml-auto text-[11.5px] font-semibold" style={{ color: brand[700] }}>
                  {entry.count}
                </Text>
              </View>
            </View>
          );
        })}

        <View
          style={{
            backgroundColor: tone.field,
            borderRadius: 22,
            padding: 18,
            shadowColor: tone.field,
            shadowOpacity: 0.28,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          {alerting && worst ? (
            <>
              <Text className="text-[11.5px] font-semibold" style={{ color: tone.soft }}>
                {overview.flagged.length === 1
                  ? "One result worth a look"
                  : `${overview.flagged.length} results worth a look`}
              </Text>

              {/*
               * The actual measurement, at the size of a headline. This is the
               * number the reader came to find, and the old tiles never showed
               * it once — they showed how many of them there were.
               */}
              <View className="mt-2 flex-row items-baseline gap-1.5">
                <Text className="text-[34px] font-semibold leading-[38px] text-white">
                  {worst.value}
                </Text>
                {worst.unit ? (
                  <Text className="text-[15px] font-medium" style={{ color: tone.soft }}>
                    {worst.unit}
                  </Text>
                ) : null}
                <Direction direction={worst.direction} colour={tone.soft} />
              </View>
              <Text className="mt-0.5 text-[13.5px] font-medium text-white">{worst.name}</Text>
              {worst.refRange ? (
                <Text className="mt-0.5 text-[11.5px]" style={{ color: tone.soft }}>
                  Lab range {worst.refRange}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text className="text-[11.5px] font-semibold" style={{ color: tone.soft }}>
                {overview.totalDocuments === 0 ? "Nothing filed yet" : "Nothing flagged"}
              </Text>
              <Text className="mt-2 text-[24px] font-semibold leading-[29px] text-white">
                {overview.totalDocuments === 0
                  ? "Add your first report"
                  : "Everything the labs measured is in range"}
              </Text>
            </>
          )}

          {/* One row of real counts, inline with dividers rather than boxed. */}
          <View
            className="mt-4 flex-row items-center pt-3.5"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}
          >
            <Stat value={overview.dataPoints} label="data points" colour={tone.soft} />
            <Divider />
            <Stat value={overview.medications.length} label="medicines" colour={tone.soft} />
            <Divider />
            <Stat value={overview.totalDocuments} label="documents" colour={tone.soft} />

            <View
              className="ml-auto h-8 w-8 items-center justify-center rounded-pill"
              style={{ backgroundColor: tone.chip }}
            >
              <ArrowRight size={15} color="#ffffff" />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function Stat({ value, label, colour }: { value: number; label: string; colour: string }) {
  return (
    <View>
      <Text className="text-[16px] font-semibold text-white">{value}</Text>
      <Text className="text-[10.5px]" style={{ color: colour }}>
        {label}
      </Text>
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        width: 1,
        height: 22,
        marginHorizontal: 14,
        backgroundColor: "rgba(255,255,255,0.22)",
      }}
    />
  );
}

/**
 * Which way the number moved since the previous reading of the same thing.
 *
 * DIRECTION ONLY, never "better" or "worse". Whether a falling value is good
 * news depends on what is being measured and on the person, and deciding that
 * is a clinical judgement. An arrow states a fact; a green arrow would state an
 * opinion.
 */
function Direction({ direction, colour }: { direction: "up" | "down" | "same" | null; colour: string }) {
  if (!direction) return null;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <View className="ml-1 flex-row items-center gap-0.5">
      <Icon size={15} color={colour} />
      <Text className="text-[11px]" style={{ color: colour }}>
        vs last
      </Text>
    </View>
  );
}

/** The dashboard reuses these labels and icons. */
export { TYPE_META };
