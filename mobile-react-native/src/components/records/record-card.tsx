import { useRouter } from "expo-router";
import {
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  FlaskConical,
  Pill,
  ReceiptIndianRupee,
  ReceiptText,
  ScanLine,
  Stethoscope,
  ShieldPlus,
  Syringe,
  Tablets,
  type LucideIcon,
} from "lucide-react-native";
import { Text, View } from "react-native";

import { Tap } from "@/components/ui/tap";
import { Avatar } from "@/components/ui/avatar";
import { Gradient } from "@/components/ui/glass";
import { font } from "@/theme/type";
import { generatedAvatar } from "@/lib/profiles/avatar";
import { formatEventDate } from "@/lib/records/grouping";
import { SEVERITY_LABEL, type DocType, type RecordSummary, type Severity } from "@/lib/records/types";
import { brand, hue, ink, lilac, semantic, shadow, surface } from "@/theme/tokens";

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
  lab_report: { icon: FlaskConical, tint: brand[600], wash: lilac.base, label: "Lab report" },
  prescription: { icon: Pill, tint: hue.teal.fg, wash: hue.teal.bg, label: "Prescription" },
  scan: { icon: ScanLine, tint: hue.indigo.fg, wash: surface.line, label: "Scan" },
  vaccination: { icon: Syringe, tint: hue.rose.fg, wash: hue.rose.bg, label: "Vaccination" },
  discharge: { icon: Stethoscope, tint: "#a9631a", wash: "#fdf0dc", label: "Discharge" },
  bill: { icon: ReceiptText, tint: hue.slate.fg, wash: hue.slate.bg, label: "Bill" },
  consultation_invoice: { icon: ReceiptIndianRupee, tint: hue.blue.fg, wash: hue.blue.wash, label: "Consultation invoice" },
  booking_invoice: { icon: CalendarCheck, tint: "#6b4fc4", wash: lilac.base, label: "Booking invoice" },
  insurance: { icon: ShieldPlus, tint: hue.ocean.fg, wash: hue.ocean.bg, label: "Insurance" },
  medication: { icon: Tablets, tint: hue.plum.fg, wash: hue.plum.bg, label: "Medication" },
  other: { icon: ReceiptText, tint: hue.slate.fg, wash: hue.slate.bg, label: "Document" },
};

const SEVERITY: Record<Severity, { label: string; fg: string; bg: string } | null> = {
  // A normal result gets NO pill. Labelling the unremarkable teaches the eye to
  // skip the pill entirely, and then the one that matters is skipped too.
  normal: null,
  borderline: { label: SEVERITY_LABEL.borderline, fg: semantic.cautionText, bg: semantic.cautionBg },
  high_risk: { label: SEVERITY_LABEL.high_risk, fg: semantic.attentionText, bg: semantic.attentionBg },
};

export function RecordCard({
  record,
  index = 0,
  showPerson = true,
}: {
  record: RecordSummary;
  /** False when every record in the list belongs to the same person. */
  showPerson?: boolean;
  /** Only picks the avatar palette, so faces in a list stay distinguishable. */
  index?: number;
}) {
  const router = useRouter();
  const style = TYPE_STYLE[record.docType] ?? TYPE_STYLE.other;
  const severity = SEVERITY[record.severity];
  // The chosen face when there is one, the derived face when there is not.
  // Same rule as the switcher, so nobody has two faces across two screens.
  const face = generatedAvatar(record.profileAvatarSeed ?? record.profileId, index);

  /*
   * REDESIGNED 2026-09-29 as a pastel list card, the same shape as the Book
   * care cards on Home: the type's wash as a soft gradient, a white tile with
   * the type mark and the person's face, and a round glass chevron.
   */
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${style.label}. ${record.title}. ${record.profileName}. ${
        severity ? severity.label : SEVERITY_LABEL.normal
      }`}
      onPress={() => router.push(`/records/${record.id}`)}
      scale={0.98}
    >
      <View className="flex-row items-center gap-3.5 overflow-hidden rounded-xl p-2.5 pr-3" style={shadow.e1}>
        <Gradient from={style.wash} to="#ffffff" />
        <View
          className="h-[68px] w-[68px] items-center justify-center rounded-xl"
          style={{ backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" }}
        >
          <style.icon size={26} color={style.tint} strokeWidth={1.7} />
          <View style={{ position: "absolute", right: -4, bottom: -4, borderRadius: 999, borderWidth: 2, borderColor: "#fff" }}>
            <Avatar svg={face.svg} image={face.image} background={face.background} size={24} />
          </View>
        </View>

        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: style.tint }}>{style.label}</Text>
            {severity ? (
              <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: severity.bg }}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, color: severity.fg }}>{severity.label}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: ink[900] }}>
            {record.title}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <CalendarDays size={12} color={ink[300]} />
            <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
              {formatEventDate(record.eventDate)}
              {showPerson ? ` · ${record.profileName}` : ""}
              {record.facility && !record.summary ? ` · ${record.facility}` : ""}
            </Text>
          </View>
          {record.summary ? (
            <Text numberOfLines={1} style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
              {record.summary}
            </Text>
          ) : null}
        </View>

        <View
          className="h-9 w-9 items-center justify-center rounded-pill"
          style={{ backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" }}
        >
          <ChevronRight size={17} color={ink[700]} />
        </View>
      </View>
    </Tap>
  );
}

/** Kept so other lists can borrow the type colours. */
export { TYPE_STYLE };
