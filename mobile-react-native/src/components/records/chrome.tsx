import { useRouter } from "expo-router";
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileText,
  Flag,
  FlaskConical,
  Pill,
  Plus,
  ReceiptIndianRupee,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  ShieldPlus,
  Syringe,
  Tablets,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Glass } from "@/components/ui/glass";
import { PillButton } from "@/components/ui/screen";
import { formatEventDate } from "@/lib/records/grouping";
import {
  DOC_TYPE_ICON,
  fileKind,
  SEVERITY_LABEL,
  type DocType,
  type RecordStats,
  type RecordSummary,
  type Severity,
} from "@/lib/records/types";
import { brand, hue, ink, lilac, semantic, shadow, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

const DOC_ICON: Record<string, LucideIcon> = {
  flask: FlaskConical,
  pill: Pill,
  clipboard: ClipboardList,
  scan: ScanLine,
  receipt: ReceiptText,
  syringe: Syringe,
  file: FileText,
  shield: ShieldPlus,
  stethoscope: ReceiptIndianRupee,
  calendar: CalendarCheck,
  tablets: Tablets,
};

/*
 * The doc-type tints, as VALUES rather than the web build's class strings.
 *
 * `lucide-react-native` takes a `color` prop; there is no `currentColor` to
 * inherit from a `text-*` class, so the hue has to be a value the icon can be
 * handed directly. Same hues as `DOC_TYPE_TINT` on web, kept in step by hand
 * for the same reason the tokens are.
 */
const DOC_TINT: Record<DocType, { bg: string; fg: string }> = {
  lab_report: { bg: brand[50], fg: brand[600] },
  prescription: { bg: hue.orange.wash, fg: hue.orange.fg },
  discharge: { bg: hue.blue.wash, fg: hue.blue.fg },
  scan: { bg: lilac.base, fg: "#3a3a41" },
  bill: { bg: hue.slate.bg, fg: hue.slate.fg },
  vaccination: { bg: hue.rose.bg, fg: hue.rose.fg },
  consultation_invoice: { bg: hue.blue.wash, fg: hue.blue.fg },
  booking_invoice: { bg: lilac.base, fg: "#3a3a41" },
  insurance: { bg: hue.ocean.bg, fg: hue.ocean.fg },
  medication: { bg: hue.plum.bg, fg: hue.plum.fg },
  other: { bg: surface.canvas, fg: ink[500] },
};

/*
 * SEMANTIC COLOUR. These three carry health meaning and nothing else — never a
 * category, never OCR confidence, never decoration.
 */
const SEVERITY_TINT: Record<Severity, { bg: string; fg: string }> = {
  normal: { bg: semantic.safeBg, fg: semantic.safeText },
  borderline: { bg: semantic.cautionBg, fg: semantic.cautionText },
  high_risk: { bg: semantic.dangerBg, fg: semantic.dangerText },
};

/** The title block at the top of the records screen. */
export function RecordsHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="px-5" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-3">
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900] }}>
            {title}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 4 }}>{subtitle}</Text>
        </View>
        {/*
         * No add button here (owner, 2026-11-01): the centre + in the tab bar
         * already adds a record from every screen, and whatever is filed lands
         * in this list sorted and tagged. Two buttons for one action made the
         * header busier without making anything easier. Search and a bell are
         * left out for the same reason: the bell lives on Home.
         */}
      </View>
    </View>
  );
}

const STAT_CELLS = [
  { key: "total", label: "Total records", icon: FileText, fg: brand[600], bg: brand[50] },
  { key: "normal", label: SEVERITY_LABEL.normal, icon: ShieldCheck, fg: semantic.safe, bg: semantic.safeBg },
  {
    key: "borderline",
    label: SEVERITY_LABEL.borderline,
    icon: TriangleAlert,
    fg: semantic.caution,
    bg: semantic.cautionBg,
  },
  { key: "highRisk", label: SEVERITY_LABEL.high_risk, icon: Flag, fg: semantic.attention, bg: semantic.attentionBg },
] as const;

/*
 * The four-up count card, as four individual badge tiles rather than one
 * bordered strip. Each stat is a small, complete thing on its own — an
 * achievement count, almost — and giving each its own card and shadow instead
 * of a shared divider is what makes the row read as four facts rather than one
 * wide table.
 *
 * It counts the FILTERED set, not the whole account. A card that kept saying
 * "24 records" while the list below showed three would be reporting on
 * something the reader cannot see.
 */
export function StatsCard({ stats }: { stats: RecordStats }) {
  return (
    <View className="mx-5 mt-4 flex-row gap-1.5">
      {STAT_CELLS.map(({ key, label, icon: Icon, fg, bg }) => (
        <View
          key={key}
          className="flex-1 items-center gap-1.5 rounded-tile bg-surface px-1.5 py-2.5"
          style={shadow.e1}
        >
          <View
            className="h-8 w-8 items-center justify-center rounded-pill"
            style={{ backgroundColor: bg }}
          >
            <Icon size={15} color={fg} />
          </View>
          <Text className="text-lg font-bold leading-none text-ink-900">{stats[key]}</Text>
          <Text className="text-center text-3xs leading-tight text-ink-500">{label}</Text>
        </View>
      ))}
    </View>
  );
}

/** The severity pill. Health meaning only. */
export function SeverityPill({ severity }: { severity: Severity }) {
  const tint = SEVERITY_TINT[severity];
  return (
    <View className="rounded-pill px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
      <Text className="text-2xs font-semibold" style={{ color: tint.fg }}>
        {SEVERITY_LABEL[severity]}
      </Text>
    </View>
  );
}

/**
 * The doc-type icon badge on every record row — a lab flask, a pill bottle, a
 * syringe — colour-coded per type, so the list reads by category at a glance
 * instead of every row showing the same grey rectangle. The file format
 * survives as a tiny corner badge, since it is still worth knowing but is no
 * longer the headline of the chip.
 */
export function FileChip({
  mimeType,
  docType = "other",
  compact = false,
}: {
  mimeType: string;
  docType?: DocType;
  compact?: boolean;
}) {
  const Icon = DOC_ICON[DOC_TYPE_ICON[docType]] ?? FileText;
  const tint = DOC_TINT[docType];
  const size = compact ? 36 : 44;

  return (
    <View
      className="items-center justify-center rounded-tile"
      style={{ width: size, height: size, backgroundColor: tint.bg }}
    >
      <Icon size={compact ? 16 : 19} strokeWidth={2.1} color={tint.fg} />
      <View
        className="absolute -bottom-1 -right-1 bg-surface px-[3px]"
        style={[{ borderRadius: 5, borderWidth: 1, borderColor: surface.base }, shadow.e1]}
      >
        <Text
          className="font-bold"
          style={{ fontSize: 10, lineHeight: 12, color: ink[500] }}
        >
          {fileKind(mimeType)}
        </Text>
      </View>
    </View>
  );
}

/**
 * One row in the records list.
 *
 * The whole row is the target, not just the chevron: a 44pt-tall row that only
 * responds at its right edge is the most common way a list like this fails on a
 * phone.
 */
export function RecordRow({
  record,
  variant = "card",
}: {
  record: RecordSummary;
  /**
   * "flush" drops the row's own card, shadow and rounding for use inside a
   * shared grouped container (see Home's Recent list) — one shadow around a
   * stack of rows reads as one component, three shadows around three rows
   * reads as three components glued together.
   */
  variant?: "card" | "flush";
}) {
  const router = useRouter();
  const card = variant === "card";

  return (
    <Tap scale={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${record.title}, ${record.profileName}, ${SEVERITY_LABEL[record.severity]}`}
      onPress={() => router.push(`/records/${record.id}`)}
      className={
        card
          ? "flex-row items-center gap-3 rounded-card bg-surface p-3"
          : "flex-row items-center gap-3 px-3.5 py-3"
      }
      style={card ? shadow.e1 : undefined}
    >
      <FileChip mimeType={record.mimeType} docType={record.docType} />

      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-ink-900" numberOfLines={1}>
          {record.title}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-500" numberOfLines={1}>
          {record.profileName} · {formatEventDate(record.eventDate)}
        </Text>
        {record.facility ? (
          <Text className="mt-0.5 text-xs text-ink-300" numberOfLines={1}>
            {record.facility}
          </Text>
        ) : null}
      </View>

      <SeverityPill severity={record.severity} />
      <ChevronRight size={18} color={ink[300]} />
    </Tap>
  );
}

/** Shown when filters or an empty account leave nothing to list. */
export function EmptyRecords({ filtered }: { filtered: boolean }) {
  const router = useRouter();

  return (
    <Glass strong className="mx-5 mt-6 items-center rounded-2xl px-6 py-8">
      {filtered ? (
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-50">
          <FileText size={22} color={brand[500]} />
        </View>
      ) : (
        <MascotFigure size={96} moment="present" move="sway" hop />
      )}
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 10, textAlign: "center" }}>
        {filtered ? "Nothing matches those filters" : "Your health file is empty"}
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[500], marginTop: 4, textAlign: "center", maxWidth: 280 }}>
        {filtered
          ? "Try clearing a filter to see more of your documents."
          : "Snap a report or pick a PDF. I'll read it, file it and remember every value."}
      </Text>
      {!filtered ? (
        <PillButton onPress={() => router.push("/scan")} icon={<Plus size={18} color="#fff" />} style={{ marginTop: 18, alignSelf: "stretch" }}>
          Add your first record
        </PillButton>
      ) : null}
    </Glass>
  );
}
