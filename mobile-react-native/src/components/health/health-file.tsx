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
import { useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { FlaggedValue, HealthOverview } from "@/lib/records/overview";
import type { DocType } from "@/lib/records/types";
import { brand, semantic } from "@/theme/tokens";

/*
 * The health file, as a stack of cards.
 *
 * WHY A STACK AND NOT TILES. The old summary was three equal white tiles
 * counting documents, in-range values and things to review, with a list under
 * it repeating the same records. Identical weight so nothing led, counts nobody
 * can act on, and a duplicate list beneath.
 *
 * ┌─ ON COLOUR ──────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │ The first version turned the whole card deep red when a lab flagged      │
 * │ something. That was wrong twice over. A full field of maroon in a health │
 * │ app reads as alarm rather than information — the reader has an out-of-   │
 * │ range haemoglobin, not an emergency — and a dark block does not belong   │
 * │ on a page built from pale lavender and white.                            │
 * │                                                                          │
 * │ The surface is the BRAND now, always. Severity is carried by a small     │
 * │ pill on the value it belongs to, in the semantic hue and with the word   │
 * │ written out. That keeps green/amber/red meaning exactly what they mean   │
 * │ everywhere else, spends them on the one element that earns it, and lets  │
 * │ the card sit in the page instead of shouting over it.                    │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const TYPE_META: Record<DocType, { label: string; icon: LucideIcon }> = {
  lab_report: { label: "Lab reports", icon: FileText },
  prescription: { label: "Prescriptions", icon: Pill },
  scan: { label: "Scans", icon: ScanLine },
  vaccination: { label: "Vaccinations", icon: Syringe },
  discharge: { label: "Discharge notes", icon: FileText },
  bill: { label: "Bills", icon: FileText },
  consultation_invoice: { label: "Consultation invoices", icon: FileText },
  booking_invoice: { label: "Booking invoices", icon: FileText },
  insurance: { label: "Insurance", icon: FileText },
  medication: { label: "Medication lists", icon: Pill },
  other: { label: "Other documents", icon: FileText },
};

export function HealthFile({ overview }: { overview: HealthOverview }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const cardWidth = Math.min(width, 393) - 40;
  const flagged = overview.flagged;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (next !== page) setPage(next);
  }

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

      <View className="mx-5 mt-2.5">
        {/*
         * The peeking bands. Each is now its OWN button through to that
         * category — a band that says "Lab reports 2" and cannot be opened is
         * a label pretending to be a control.
         */}
        {overview.byType.slice(0, 2).map((entry, i, arr) => {
          const meta = TYPE_META[entry.type] ?? TYPE_META.other;
          const inset = 14 * (arr.length - i);
          return (
            <Pressable
              key={entry.type}
              accessibilityRole="button"
              accessibilityLabel={`${entry.count} ${meta.label}. Opens documents`}
              onPress={() => router.push("/records")}
              style={{
                marginHorizontal: inset,
                backgroundColor: i === 0 ? brand[100] : "#eae8fc",
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
            </Pressable>
          );
        })}

        <View
          style={{
            backgroundColor: brand[600],
            borderRadius: 22,
            overflow: "hidden",
            shadowColor: brand[900],
            shadowOpacity: 0.22,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 6,
          }}
        >
          {flagged.length > 0 ? (
            <>
              {/*
               * ONE PAGE PER FLAGGED RESULT. The card said "2 results worth a
               * look" and showed one, with no way to reach the second — the
               * count was a promise the card did not keep. Swiping now moves
               * between them, and the counter says where you are.
               */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
              >
                {flagged.map((value) => (
                  <FlaggedPage key={value.id} value={value} width={cardWidth} />
                ))}
              </ScrollView>

              {flagged.length > 1 ? (
                <View className="flex-row items-center gap-1.5 px-[18px] pb-1">
                  {flagged.map((value, i) => (
                    <View
                      key={value.id}
                      style={{
                        height: 4,
                        width: i === page ? 16 : 4,
                        borderRadius: 999,
                        backgroundColor: "#ffffff",
                        opacity: i === page ? 0.95 : 0.4,
                      }}
                    />
                  ))}
                  <Text className="ml-1 text-[10.5px] text-white" style={{ opacity: 0.7 }}>
                    {page + 1} of {flagged.length}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View className="px-[18px] pt-[18px]">
              <Text className="text-[11.5px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                {overview.totalDocuments === 0 ? "Nothing filed yet" : "Nothing flagged"}
              </Text>
              <Text className="mt-2 text-[22px] font-semibold leading-[27px] text-white">
                {overview.totalDocuments === 0
                  ? "Add your first report"
                  : "Everything the labs measured is in range"}
              </Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open your full health file"
            onPress={() => router.push("/health-file")}
            className="mx-[18px] mb-[18px] mt-3 flex-row items-center pt-3.5"
            style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}
          >
            <Stat value={overview.dataPoints} label="data points" />
            <Divider />
            <Stat value={overview.medications.length} label="medicines" />
            <Divider />
            <Stat value={overview.totalDocuments} label="documents" />
            <View
              className="ml-auto h-8 w-8 items-center justify-center rounded-pill"
              style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
            >
              <ArrowRight size={15} color="#ffffff" />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** One flagged measurement, sized to the card so paging lands square. */
function FlaggedPage({ value, width }: { value: FlaggedValue; width: number }) {
  /*
   * The severity pill is the ONLY semantic colour on this card, and it names
   * itself. "Low" beside an amber chip survives colour blindness, a greyscale
   * screenshot and a reader who has never learned this app's palette.
   */
  const tone =
    value.flag === "caution"
      ? { bg: semantic.cautionBg, ink: semantic.cautionText }
      : { bg: semantic.dangerBg, ink: semantic.dangerText };

  return (
    <View style={{ width, paddingHorizontal: 18, paddingTop: 18 }}>
      <View className="flex-row items-center gap-2">
        <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: tone.bg }}>
          <Text className="text-[10.5px] font-bold capitalize" style={{ color: tone.ink }}>
            {value.flag}
          </Text>
        </View>
        {value.eventDate ? (
          <Text className="text-[11px]" style={{ color: "rgba(255,255,255,0.7)" }}>
            {new Date(value.eventDate).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
            })}
          </Text>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-baseline gap-1.5">
        <Text className="text-[34px] font-semibold leading-[38px] text-white">{value.value}</Text>
        {value.unit ? (
          <Text className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>
            {value.unit}
          </Text>
        ) : null}
        <Direction direction={value.direction} />
      </View>

      <Text className="mt-0.5 text-[13.5px] font-medium text-white">{value.name}</Text>
      {value.refRange ? (
        <Text className="mt-0.5 text-[11.5px]" style={{ color: "rgba(255,255,255,0.7)" }}>
          Lab range {value.refRange}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text className="text-[16px] font-semibold text-white">{value}</Text>
      <Text className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.72)" }}>
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
function Direction({ direction }: { direction: "up" | "down" | "same" | null }) {
  if (!direction) return null;
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  return (
    <View className="ml-1 flex-row items-center gap-0.5">
      <Icon size={15} color="rgba(255,255,255,0.75)" />
      <Text className="text-[11px]" style={{ color: "rgba(255,255,255,0.75)" }}>
        vs last
      </Text>
    </View>
  );
}

/** The dashboard reuses these labels and icons. */
export { TYPE_META };
