import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  FlaskConical,
  MapPin,
  Pill,
  ReceiptText,
  ScanLine,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";

import { Avatar } from "@/components/ui/avatar";
import { generatedAvatar } from "@/lib/profiles/avatar";
import { formatEventDate } from "@/lib/records/grouping";
import type { DocType, RecordSummary, Severity } from "@/lib/records/types";
import { ink, semantic, shadow } from "@/theme/tokens";

/*
 * A record, as a card worth looking at.
 *
 * WHAT WAS WRONG WITH THE OLD ROW. A white rectangle, a small grey icon chip, a
 * title, two lines of grey metadata and a chevron — repeated. Every document
 * type looked identical, so a prescription and an MRI were the same object at a
 * glance, and the only colour on the row was the severity pill, which meant the
 * eye went to severity before it went to what the document even was.
 *
 * WHAT THIS DOES INSTEAD. Each type gets its own hue and its own mark, carried
 * on a coloured plate down the left, so the list is scannable by category
 * before a single word is read. The person's face sits on the plate, because
 * "whose is this" is the second question in a family account and a name in grey
 * text is not an answer anyone sees. Severity keeps the semantic palette and
 * nothing else on the card borrows it.
 */

type TypeStyle = { icon: LucideIcon; tint: string; wash: string; label: string };

/*
 * DELIBERATELY NOT THE SEMANTIC HUES. Green, amber and red state how a result
 * reads clinically; a lab report is not "good" because it is a lab report.
 * These five are identity only.
 */
const TYPE_STYLE: Record<DocType, TypeStyle> = {
  lab_report: { icon: FlaskConical, tint: "#4a2ade", wash: "#eeecff", label: "Lab report" },
  prescription: { icon: Pill, tint: "#0e8478", wash: "#e4f5f2", label: "Prescription" },
  scan: { icon: ScanLine, tint: "#3835a0", wash: "#e9eaf7", label: "Scan" },
  vaccination: { icon: Syringe, tint: "#c4396c", wash: "#fdeaf0", label: "Vaccination" },
  discharge: { icon: Stethoscope, tint: "#a9631a", wash: "#fdf0dc", label: "Discharge" },
  bill: { icon: ReceiptText, tint: "#5b5580", wash: "#efeff5", label: "Bill" },
  other: { icon: ReceiptText, tint: "#5b5580", wash: "#efeff5", label: "Document" },
};

const SEVERITY: Record<Severity, { label: string; fg: string; bg: string } | null> = {
  // A normal result gets NO pill. Labelling the unremarkable teaches the eye to
  // skip the pill entirely, and then the one that matters is skipped too.
  normal: null,
  borderline: { label: "Worth a look", fg: semantic.cautionText, bg: semantic.cautionBg },
  high_risk: { label: "High priority", fg: semantic.danger, bg: semantic.dangerBg },
};

export function RecordCard({
  record,
  index = 0,
}: {
  record: RecordSummary;
  /** Only picks the avatar palette, so faces in a list stay distinguishable. */
  index?: number;
}) {
  const router = useRouter();
  const style = TYPE_STYLE[record.docType] ?? TYPE_STYLE.other;
  const severity = SEVERITY[record.severity];
  // The chosen face when there is one, the derived face when there is not.
  // Same rule as the switcher, so nobody has two faces across two screens.
  const face = generatedAvatar(record.profileAvatarSeed ?? record.profileId, index);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${style.label}. ${record.title}. ${record.profileName}. ${
        severity ? severity.label : "In range"
      }`}
      onPress={() => router.push(`/records/${record.id}`)}
      className="flex-row overflow-hidden rounded-card bg-surface"
      style={shadow.e1}
    >
      {/*
       * The plate. A block of the type's own colour, wide enough to read as a
       * deliberate part of the card rather than a stripe someone forgot to
       * remove, and carrying both the type mark and the face.
       */}
      <View style={{ width: 76, backgroundColor: style.wash }}>
        <PlateArt tint={style.tint} />
        <View className="flex-1 items-center justify-center gap-2 py-3.5">
          <View
            className="h-9 w-9 items-center justify-center rounded-tile"
            style={{ backgroundColor: "rgba(255,255,255,0.75)" }}
          >
            <style.icon size={18} color={style.tint} />
          </View>
          <Avatar svg={face.svg} background={face.background} size={22} />
        </View>
      </View>

      <View className="min-w-0 flex-1 gap-1 px-3.5 py-3">
        <View className="flex-row items-center gap-2">
          <Text
            className="text-[10px] font-bold uppercase tracking-wide"
            style={{ color: style.tint }}
          >
            {style.label}
          </Text>
          {severity ? (
            <View
              className="ml-auto rounded-pill px-2 py-0.5"
              style={{ backgroundColor: severity.bg }}
            >
              <Text className="text-[10px] font-bold" style={{ color: severity.fg }}>
                {severity.label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="text-[15.5px] font-semibold leading-[20px] text-ink-900" numberOfLines={2}>
          {record.title}
        </Text>

        <View className="mt-0.5 flex-row items-center gap-1.5">
          <CalendarDays size={12} color={ink[300]} />
          <Text className="text-[11.5px] text-ink-500">{formatEventDate(record.eventDate)}</Text>
          <Text className="text-[11.5px] text-ink-300">·</Text>
          <Text className="min-w-0 flex-1 text-[11.5px] text-ink-500" numberOfLines={1}>
            {record.profileName}
          </Text>
        </View>

        {record.facility ? (
          <View className="flex-row items-center gap-1.5">
            <MapPin size={12} color={ink[300]} />
            <Text className="min-w-0 flex-1 text-[11.5px] text-ink-300" numberOfLines={1}>
              {record.facility}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="justify-center pr-2.5">
        <ChevronRight size={18} color={ink[300]} />
      </View>
    </Pressable>
  );
}

/**
 * A bloom and an arc on the plate.
 *
 * Flat colour behind an icon reads as a placeholder at this size. This costs
 * nothing, needs no asset per document type, and gives every card a little
 * depth without a photograph the app would then have to ship and licence.
 */
function PlateArt({ tint }: { tint: string }) {
  const id = tint.slice(1);
  return (
    <Svg width={76} height={120} style={{ position: "absolute" }}>
      <Defs>
        <RadialGradient id={`plate-${id}`} cx="0.2" cy="0.1" r="1">
          <Stop offset="0" stopColor={tint} stopOpacity="0.22" />
          <Stop offset="1" stopColor={tint} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={6} cy={4} r={62} fill={`url(#plate-${id})`} />
      <Path
        d="M-8 108 A 60 60 0 0 1 78 34"
        stroke={tint}
        strokeOpacity="0.16"
        strokeWidth="1.2"
        fill="none"
      />
    </Svg>
  );
}

/** Kept so other lists can borrow the type colours. */
export { TYPE_STYLE };
