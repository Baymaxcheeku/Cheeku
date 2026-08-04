import { useRouter } from "expo-router";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  ScanLine,
  Syringe,
  type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { formatEventDate } from "@/lib/records/grouping";
import {
  DOC_TYPE_ICON,
  fileKind,
  SEVERITY_LABEL,
  type DocType,
  type RecordSummary,
  type Severity,
} from "@/lib/records/types";
import { ink, semantic, shadow, surface } from "@/theme/tokens";

const DOC_ICON: Record<string, LucideIcon> = {
  flask: FlaskConical,
  pill: Pill,
  clipboard: ClipboardList,
  scan: ScanLine,
  receipt: Receipt,
  syringe: Syringe,
  file: FileText,
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
  bill: { bg: "#eaf6ec", fg: "#1f8a45" },
  vaccination: { bg: "#fdeaf0", fg: "#c22a6b" },
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
    <View
      className="mx-5 mt-6 items-center rounded-card px-6 py-10"
      style={{ borderWidth: 1, borderStyle: "dashed", borderColor: surface.line }}
    >
      <View className="h-12 w-12 items-center justify-center rounded-pill bg-brand-50">
        <FileText size={22} color="#5b4ef0" />
      </View>
      <Text className="mt-3 text-[16px] font-semibold text-ink-900">
        {filtered ? "Nothing matches those filters" : "No records yet"}
      </Text>
      <Text className="mt-1 max-w-[260px] text-center text-[13px] leading-[18px] text-ink-500">
        {filtered
          ? "Try clearing a filter to see more of your documents."
          : "Add your first document and Baymax will organise it for you."}
      </Text>
      {!filtered ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/scan")}
          className="mt-4 h-11 items-center justify-center rounded-pill bg-brand-600 px-5"
        >
          <Text className="text-[14px] font-semibold text-white">Add a document</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
