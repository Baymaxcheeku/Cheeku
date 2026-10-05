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
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { Glass, GlassCircle } from "@/components/ui/glass";
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
import { ink, semantic, shadow, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

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
  lab_report: { bg: "#f1f0fe", fg: "#4a2ade" },
  prescription: { bg: "#fdeee0", fg: "#c2650b" },
  discharge: { bg: "#e6f1fd", fg: "#1a6fc2" },
  scan: { bg: "#f1eafd", fg: "#7b3fd4" },
  bill: { bg: "#efeff5", fg: "#5b5580" },
  vaccination: { bg: "#fdeaf0", fg: "#c22a6b" },
  consultation_invoice: { bg: "#e5eefb", fg: "#2563a8" },
  booking_invoice: { bg: "#efeafd", fg: "#6b4fc4" },
  insurance: { bg: "#e0f2f6", fg: "#155e75" },
  medication: { bg: "#fbe9f5", fg: "#b0428a" },
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
  const router = useRouter();

  return (
    <View className="px-5" style={{ paddingTop: insets.top + 12 }}>
      <View className="flex-row items-center gap-3">
        <Text
          accessibilityRole="header"
          style={{ flex: 1, fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900] }}
        >
          {title}
        </Text>
        <GlassCircle label="Add a health record" onPress={() => router.push("/scan")}>
          <Plus size={21} color={ink[900]} />
        </GlassCircle>
        {/*
         * The frames put a search control and a notification bell here. Search
         * over records is a Phase 2 tail item and the bell already exists on
         * Home wired to real data — a second, unwired copy would be a control
         * that looks identical to a working one and does nothing.
         */}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4 }}>{subtitle}</Text>
    </View>
  );
}

const STAT_CELLS = [
  { key: "total", label: "Total records", icon: FileText, fg: "#4a2ade", bg: "#f1f0fe" },
  { key: "normal", label: "Normal", icon: ShieldCheck, fg: semantic.safe, bg: semantic.safeBg },
  {
    key: "borderline",
    label: "Needs attention",
    icon: TriangleAlert,
    fg: semantic.caution,
    bg: semantic.cautionBg,
  },
  { key: "highRisk", label: "High priority", icon: Flag, fg: semantic.danger, bg: semantic.dangerBg },
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
          <Text className="text-[18px] font-bold leading-none text-ink-900">{stats[key]}</Text>
          <Text className="text-center text-[9.5px] leading-tight text-ink-500">{label}</Text>
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
      <Text className="text-[11px] font-semibold" style={{ color: tint.fg }}>
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
        className="absolute -bottom-1 -right-1 rounded-[5px] bg-surface px-[3px]"
        style={[{ borderWidth: 1, borderColor: surface.base }, shadow.e1]}
      >
        <Text
          className="font-bold"
          style={{ fontSize: compact ? 6.5 : 7, lineHeight: 10, color: ink[500] }}
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
    <Pressable
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
        <Text className="text-[15px] font-semibold text-ink-900" numberOfLines={1}>
          {record.title}
        </Text>
        <Text className="mt-0.5 text-[12px] text-ink-500" numberOfLines={1}>
          {record.profileName} · {formatEventDate(record.eventDate)}
        </Text>
        {record.facility ? (
          <Text className="mt-0.5 text-[12px] text-ink-300" numberOfLines={1}>
            {record.facility}
          </Text>
        ) : null}
      </View>

      <SeverityPill severity={record.severity} />
      <ChevronRight size={18} color={ink[300]} />
    </Pressable>
  );
}

/** Shown when filters or an empty account leave nothing to list. */
export function EmptyRecords({ filtered }: { filtered: boolean }) {
  const router = useRouter();

  return (
    <Glass strong className="mx-5 mt-6 items-center rounded-[28px] px-6 py-8">
      {filtered ? (
        <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-50">
          <FileText size={22} color="#5b4ef0" />
        </View>
      ) : (
        <MascotBust size={88} mood="curious" pose="phone" />
      )}
      <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginTop: 10, textAlign: "center" }}>
        {filtered ? "Nothing matches those filters" : "Your health file is empty"}
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4, textAlign: "center", maxWidth: 280 }}>
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
