import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  BadgeCheck,
  Stethoscope,
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
import { TYPE_STYLE } from "@/components/records/record-card";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { font } from "@/theme/type";
import { GaugeLegend, HealthGauge } from "@/components/records/health-gauge";
import { OriginalToggle } from "@/components/records/original-toggle";
import { selectableProfiles } from "@/lib/profiles/context";
import { formatEventDate } from "@/lib/records/grouping";
import { buildInsight, flaggedEntities, formatValue } from "@/lib/records/insight";
import { confirmRecord, getRecord, signedDocumentUrl } from "@/lib/records/queries";
import {
  FLAG_LABEL,
  SEVERITY_LABEL,
  type EntityFlag,
  type RecordEntity,
  type Severity,
} from "@/lib/records/types";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";

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
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(false);

  async function confirm() {
    setConfirming(true);
    setConfirmError(false);
    const ok = await confirmRecord(id);
    setConfirming(false);
    if (!ok) {
      setConfirmError(true);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["record", id] });
    void qc.invalidateQueries({ queryKey: ["records"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  }

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

  /*
   * THE CONTEXT FOLLOWS THE RECORD. Opening Amma's report (from a
   * notification, her member page, search or a link) makes Amma the person
   * being viewed, so "Ask Cheeku about this" and every screen behind this one
   * are about her, not whoever was selected before (PLAN.md rule 4).
   */
  const family = useFamily();
  const switchMember = useSwitchMember();
  const owner = record?.profileId;
  const viewingId = family.data?.profile?.id;
  useEffect(() => {
    if (owner && viewingId && owner !== viewingId) void switchMember(owner);
  }, [owner, viewingId, switchMember]);

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

  const type = TYPE_STYLE[record.docType] ?? TYPE_STYLE.other;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title={type.label} subtitle="Read and filed by Cheeku" fallback="/records" />
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* -------------------------------------------------------- the file */}
      {/*
       * The document as a pastel hero in its own type colour, the same colour
       * its card has in the list, so the reader lands on something they
       * recognise.
       *
       * PROCESSING STATUS IS NOT HEALTH STATUS. "Processed" used to be green
       * and "Needs review" amber, the colours this app reserves for how a
       * result reads. They are violet and neutral now.
       */}
      <View className="overflow-hidden rounded-[30px] p-4" style={glassShadow}>
        <Gradient from={type.wash} to="#ffffff" glow="#ffffff" />
        <View className="flex-row items-center gap-3">
          <FileChip mimeType={record.mimeType} docType={record.docType} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: ink[900] }}>
              {record.title}
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 3 }}>
              {formatEventDate(record.eventDate)}
              {record.facility ? ` · ${record.facility}` : ""}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row">
          <Glass className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5">
            <View className="h-1.5 w-1.5 rounded-pill" style={{ backgroundColor: record.status === "filed" ? brand[600] : ink[300] }} />
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: record.status === "filed" ? brand[700] : ink[700] }}>
              {record.status === "filed" ? "Filed" : "Waiting for your review"}
            </Text>
          </Glass>
          <Glass className="ml-2 flex-row items-center gap-1.5 rounded-pill px-3 py-1.5">
            <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 12, color: ink[700] }}>
              {`In ${record.profileName.split(" ")[0]}'s file`}
            </Text>
          </Glass>
        </View>
      </View>

      {/*
       * The other half of the "Quick check" notification. Without this, the
       * notification asked for a check nobody could complete.
       */}
      {record.status === "needs_review" ? (
        <Glass strong className="mt-3 rounded-[26px] p-4">
          <View className="flex-row items-start gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-[13px]" style={{ backgroundColor: brand[50] }}>
              <BadgeCheck size={19} color={brand[600]} />
            </View>
            <View className="flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>Did I read this right?</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700], marginTop: 3 }}>
                Match the values below with the original page. If they line up, file it and I&apos;ll remember it.
              </Text>
            </View>
          </View>
          {confirmError ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>
              That didn&apos;t save. Check your connection and try again.
            </Text>
          ) : null}
          <PillButton
            tone="brand"
            loading={confirming}
            onPress={() => void confirm()}
            icon={<BadgeCheck size={17} color="#fff" />}
            style={{ marginTop: 14, height: 48 }}
          >
            Looks right, file it
          </PillButton>
        </Glass>
      ) : null}

      {/* ---------------------------------------------------------- status */}
      <Glass strong className="mt-3 rounded-[26px] p-4">
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>How this report reads</Text>
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
      </Glass>

      {/* ------------------------------------------------------ highlights */}
      {measured.length > 0 ? (
        <View className="mt-4">
          <View className="flex-row items-baseline justify-between">
            <Text style={{ fontFamily: font.semibold, fontSize: 18, letterSpacing: -0.3, color: ink[900] }}>What was measured</Text>
            {flaggedCount > 0 ? (
              <Text className="text-[12px] font-semibold text-danger-text">
                {flaggedCount} flagged
              </Text>
            ) : null}
          </View>

          <Glass strong className="mt-2.5 overflow-hidden rounded-[26px]">
            {measured.map((entity, i) => (
              <View
                key={entity.id}
                style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
              >
                <EntityRow entity={entity} />
              </View>
            ))}
          </Glass>
        </View>
      ) : null}

      {/* --------------------------------------------------------- insight */}
      <View className="mt-4 overflow-hidden rounded-[26px] p-4" style={glassShadow}>
        <Gradient from="#efeaff" to="#f8f6ff" />
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-white">
            <Sparkles size={17} color={brand[600]} />
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>{insight.headline}</Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: ink[700], marginTop: 8 }}>{insight.body}</Text>
      </View>

      {/* -------------------------------------------------------- original */}
      <OriginalToggle
        url={query.data?.url ?? null}
        rawText={record.rawText}
        fileLabel={record.title}
        confidence={record.confidence}
      />

      {/* --------------------------------------------------------- actions */}
      {/*
       * Two real next steps, full width: ask about it, or take it to a doctor.
       * The booking flow sends the report along when the reader agrees to
       * share recent reports. Trends and sharing are not built, so they are
       * named as coming rather than drawn as buttons that do nothing.
       */}
      <PillButton
        tone="dark"
        onPress={() => router.push(`/ask?record=${record.id}`)}
        icon={<MessageCircle size={18} color="#fff" />}
        style={{ marginTop: 20 }}
      >
        Ask Cheeku about this report
      </PillButton>
      <PillButton
        tone="light"
        onPress={() => router.push("/book/consult")}
        icon={<Stethoscope size={18} color={brand[600]} />}
        style={{ marginTop: 10 }}
      >
        Book a doctor about it
      </PillButton>
      <View className="mt-4 flex-row flex-wrap justify-center gap-2">
        <SoonChip icon={TrendingUp} label="Track changes" />
        <SoonChip icon={Share2} label="Share report" />
      </View>
    </ScrollView>
    </View>
  );
}

function SoonChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}. Coming soon`}
      className="flex-row items-center gap-1.5 rounded-pill px-3 py-2"
      style={{ backgroundColor: "rgba(15,16,48,0.04)" }}
    >
      <Icon size={14} color={ink[300]} />
      <Text style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[500] }}>{label} · soon</Text>
    </View>
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
