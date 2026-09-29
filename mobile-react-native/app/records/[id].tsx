import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  ChevronLeft,
  Droplet,
  FileText,
  MessageCircle,
  Share2,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FileChip } from "@/components/records/chrome";
import { GaugeLegend, HealthGauge } from "@/components/records/health-gauge";
import { OriginalToggle } from "@/components/records/original-toggle";
import { selectableProfiles } from "@/lib/profiles/context";
import { formatEventDate } from "@/lib/records/grouping";
import { buildInsight, flaggedEntities, formatValue } from "@/lib/records/insight";
import { getRecord, signedDocumentUrl } from "@/lib/records/queries";
import {
  FLAG_LABEL,
  SEVERITY_LABEL,
  type EntityFlag,
  type RecordEntity,
  type Severity,
} from "@/lib/records/types";
import { brand, semantic, shadow, surface } from "@/theme/tokens";

const SEVERITY_BLURB: Record<Severity, string> = {
  normal: "All values are within the range printed on this report.",
  borderline: "Some values are outside the normal range.",
  high_risk: "Some values are well outside the normal range.",
};

const SEVERITY_TINT: Record<Severity, { bg: string; fg: string }> = {
  normal: { bg: semantic.safeBg, fg: semantic.safe },
  borderline: { bg: semantic.cautionBg, fg: semantic.caution },
  high_risk: { bg: semantic.dangerBg, fg: semantic.danger },
};

const FLAG_TINT: Record<EntityFlag, { bg: string; fg: string }> = {
  normal: { bg: semantic.safeBg, fg: semantic.safeText },
  high: { bg: semantic.dangerBg, fg: semantic.dangerText },
  low: { bg: semantic.dangerBg, fg: semantic.dangerText },
  caution: { bg: semantic.cautionBg, fg: semantic.cautionText },
};

/**
 * D2 — one document, and what was read out of it.
 *
 * The original file is always reachable from here. Extraction can be wrong, and
 * a screen that only ever shows the machine's reading of a medical document,
 * with no way back to the page the lab actually printed, is asking to be
 * trusted more than it has earned.
 */
export default function RecordDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useQuery({
    queryKey: ["record", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const record = await getRecord(id);
      // RLS returns another account's row as null, so this covers both a bad id
      // and an id belonging to someone else. The caller cannot tell them apart.
      if (!record) return { record: null, allowed: true, url: null };

      /*
       * RLS SCOPES THIS TO THE ACCOUNT; THE PLAN SCOPES IT TO A PERSON.
       *
       * The family shares one user_id, so a locked member's document is a
       * perfectly valid row for this caller and the query above returns it
       * happily. Without this check a direct link — a bookmark kept after a
       * downgrade, or simply a guessed id — would render a member's full lab
       * report on a plan that no longer covers them.
       *
       * Reported as "not found" rather than as an upsell: which documents exist
       * for whom is itself the thing being gated, so an upsell naming a
       * document would leak exactly what it is protecting.
       */
      const allowed = await selectableProfiles();
      if (!allowed.some((p) => p.id === record.profileId)) {
        return { record: null, allowed: false, url: null };
      }

      const url = await signedDocumentUrl(record.storagePath);
      return { record, allowed: true, url };
    },
  });

  const record = query.data?.record ?? null;

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  if (!record) {
    return (
      <View
        className="flex-1 items-center justify-center bg-canvas px-10"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-[18px] font-bold text-ink-900">Record not found</Text>
        <Text className="mt-2 text-center text-[13px] leading-[19px] text-ink-500">
          It may have been removed, or it belongs to a family member this plan does not cover.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/records")}
          className="mt-5 h-11 items-center justify-center rounded-pill bg-brand-600 px-5"
        >
          <Text className="text-[14px] font-semibold text-white">Back to records</Text>
        </Pressable>
      </View>
    );
  }

  const insight = buildInsight(record);
  const measured = record.entities.filter((e) => e.kind === "lab_value" || e.kind === "vital");
  const flaggedCount = flaggedEntities(measured).length;
  const tint = SEVERITY_TINT[record.severity];

  return (
    <ScrollView
      className="flex-1 bg-canvas"
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to records"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/records"))}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-tile bg-surface"
          style={shadow.e1}
        >
          <ChevronLeft size={20} color={brand[600]} />
        </Pressable>
        <Text className="flex-1 text-center text-[17px] font-bold text-ink-900">
          Document analysis
        </Text>
        {/* Balances the back button so the title is optically centred. */}
        <View className="h-9 w-9" />
      </View>
      <Text className="mt-2 text-center text-[13px] text-ink-500">
        We&apos;ve analysed your report. Here&apos;s what we found.
      </Text>

      {/* ------------------------------------------------------------ file */}
      <View
        className="mt-4 flex-row items-center gap-3 rounded-card bg-surface p-3"
        style={shadow.e1}
      >
        <FileChip mimeType={record.mimeType} docType={record.docType} />
        <View className="min-w-0 flex-1">
          <Text className="text-[14px] font-semibold text-ink-900" numberOfLines={1}>
            {record.title}
          </Text>
          <Text className="mt-0.5 text-[12px] text-ink-500" numberOfLines={1}>
            {formatEventDate(record.eventDate)}
            {record.facility ? ` · ${record.facility}` : ""}
          </Text>
        </View>
        <View
          className="rounded-pill px-2.5 py-1"
          style={{
            backgroundColor: record.status === "filed" ? semantic.safeBg : semantic.cautionBg,
          }}
        >
          <Text
            className="text-[11px] font-semibold"
            style={{
              color: record.status === "filed" ? semantic.safeText : semantic.cautionText,
            }}
          >
            {record.status === "filed" ? "Processed" : "Needs review"}
          </Text>
        </View>
      </View>

      {/* ---------------------------------------------------------- status */}
      <View className="mt-3 rounded-card bg-surface p-4" style={shadow.e1}>
        <Text className="text-[15px] font-semibold text-ink-900">Overall health status</Text>
        {/*
         * A fixed gauge column rather than letting the gauge and its legend
         * size themselves. Sized by content, the legend's three labels claimed
         * most of the card and forced the status word — the one thing here that
         * must be read at a glance — to wrap onto two lines.
         */}
        <View className="mt-2 flex-row items-stretch gap-3">
          <View className="min-w-0 flex-1 self-center">
            <View className="flex-row items-center gap-2">
              <View
                className="h-6 w-6 items-center justify-center rounded-pill"
                style={{ backgroundColor: tint.bg }}
              >
                <View
                  className="h-2 w-2 rounded-pill"
                  style={{ backgroundColor: tint.fg }}
                />
              </View>
              <Text className="text-[18px] font-bold leading-tight text-ink-900">
                {SEVERITY_LABEL[record.severity]}
              </Text>
            </View>
            <Text className="mt-1.5 text-[12px] leading-[17px] text-ink-500">
              {SEVERITY_BLURB[record.severity]}
            </Text>
          </View>
          <View
            className="w-[132px] items-center justify-center pl-3"
            style={{ borderLeftWidth: 1, borderLeftColor: surface.line }}
          >
            <HealthGauge severity={record.severity} />
            <GaugeLegend severity={record.severity} />
          </View>
        </View>
      </View>

      {/* ------------------------------------------------------ highlights */}
      {measured.length > 0 ? (
        <View className="mt-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-[15px] font-semibold text-ink-900">Key highlights</Text>
            {flaggedCount > 0 ? (
              <Text className="text-[12px] font-semibold text-danger-text">
                {flaggedCount} flagged
              </Text>
            ) : null}
          </View>

          <View className="mt-2 overflow-hidden rounded-card bg-surface" style={shadow.e1}>
            {measured.map((entity, i) => (
              <View
                key={entity.id}
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <EntityRow entity={entity} />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* --------------------------------------------------------- insight */}
      <View className="mt-4 rounded-card bg-brand-50 p-4">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-tile bg-surface">
            <Sparkles size={16} color={brand[600]} />
          </View>
          <Text className="flex-1 text-[14px] font-semibold text-brand-700">
            {insight.headline}
          </Text>
        </View>
        <Text className="mt-2 text-[12px] leading-[18px] text-ink-700">{insight.body}</Text>
      </View>

      {/* -------------------------------------------------------- original */}
      <OriginalToggle
        url={query.data?.url ?? null}
        rawText={record.rawText}
        fileLabel={record.title}
        confidence={record.confidence}
      />

      {/* --------------------------------------------------------- actions */}
      <Text className="mt-5 text-[15px] font-semibold text-ink-900">
        What would you like to do?
      </Text>
      <View className="mt-2 flex-row gap-2">
        {/*
         * Ask Cheeku is Phase 3, trends and sharing are later still. The two
         * that do not exist are marked rather than linked to a dead route, and
         * each says which phase it belongs to — a tile that looks identical to
         * a working one and silently does nothing is worse than one that admits
         * it is not ready.
         */}
        <ActionTile
          icon={MessageCircle}
          title="Ask Cheeku"
          body="Get answers about this report"
          onPress={() => router.push(`/ask?record=${record.id}`)}
        />
        <ActionTile icon={TrendingUp} title="Track changes" body="Arrives with the companion phase" />
        <ActionTile icon={Share2} title="Share report" body="Arrives with the account phase" />
      </View>
    </ScrollView>
  );
}

/*
 * The icon per measurement is chosen from the canonical name where one is
 * known, and falls back to a neutral glyph. Guessing an icon from free text
 * would put a blood drop next to a blood pressure reading often enough to be
 * worse than no icon at all.
 */
function entityIcon(entity: RecordEntity): LucideIcon {
  const key = (entity.canonicalName ?? entity.name).toLowerCase();
  if (key.includes("hemoglobin") || key.includes("haemoglobin")) return Droplet;
  if (key.includes("pressure") || key.includes("pulse") || key.includes("heart")) return Activity;
  return FileText;
}

function EntityRow({ entity }: { entity: RecordEntity }) {
  const Icon = entityIcon(entity);
  const flag = entity.flag;
  const tint = flag ? FLAG_TINT[flag] : null;

  return (
    <View className="flex-row items-center gap-3 p-3">
      <View className="h-9 w-9 items-center justify-center rounded-pill bg-canvas">
        <Icon size={16} color={brand[500]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[13px] text-ink-500" numberOfLines={1}>
          {entity.name}
        </Text>
        <Text className="text-[15px] font-semibold text-ink-900" numberOfLines={1}>
          {formatValue(entity)}
        </Text>
        {entity.refRange ? (
          <Text className="text-[11px] text-ink-300" numberOfLines={1}>
            Range {entity.refRange}
          </Text>
        ) : null}
      </View>
      {flag && tint ? (
        <View className="rounded-pill px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
          <Text className="text-[11px] font-semibold" style={{ color: tint.fg }}>
            {FLAG_LABEL[flag]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function ActionTile({
  icon: Icon,
  title,
  body,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  onPress?: () => void;
}) {
  const ready = Boolean(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready }}
      accessibilityLabel={ready ? `${title}. ${body}` : `${title}. ${body}. Not available yet`}
      disabled={!ready}
      onPress={onPress}
      className="flex-1 rounded-card bg-surface p-3"
      style={{ borderWidth: 1, borderColor: surface.line, opacity: ready ? 1 : 0.55 }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
        <Icon size={17} color={brand[600]} />
      </View>
      <Text className="mt-2 text-[13px] font-semibold text-ink-900">{title}</Text>
      <Text className="mt-0.5 text-[11px] leading-tight text-ink-500">{body}</Text>
    </Pressable>
  );
}
