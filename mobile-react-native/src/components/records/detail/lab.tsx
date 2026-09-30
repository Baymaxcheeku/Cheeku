import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarClock, FlaskConical, Hash, Stethoscope, TestTube, TrendingDown, TrendingUp } from "lucide-react-native";
import { Text, View } from "react-native";

import { GaugeLegend, HealthGauge } from "@/components/records/health-gauge";
import { formatValue } from "@/lib/records/insight";
import { parseRange, rangePosition, shortDate, trend, type LabDetails } from "@/lib/records/details";
import { previousValues } from "@/lib/records/record-actions";
import { FLAG_LABEL, SEVERITY_LABEL, type EntityFlag, type RecordDetail, type RecordEntity, type Severity } from "@/lib/records/types";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { Bullets, Card, FactGrid, Section } from "./parts";

/*
 * A lab report is a table of numbers against printed ranges, so that is what
 * the page is built around. Each value gets a bar with the normal band in the
 * middle third and a marker where this reading sits, which answers "how far
 * out?" at a glance where a bare "Low" pill could not. Under it, what the
 * same test read last time for this same person, when there is a last time.
 *
 * Never an interpretation: the bar shows position against the lab's own
 * range, and the words say "outside the range printed on this report".
 */

const SEVERITY_BLURB: Record<Severity, string> = {
  normal: "Every value is inside the range printed on this report.",
  borderline: "A value is at the edge of the printed range.",
  high_risk: "Some values are outside the range printed on this report.",
};

const FLAG_TINT: Record<EntityFlag, { bg: string; fg: string; dot: string }> = {
  normal: { bg: semantic.safeBg, fg: semantic.safeText, dot: semantic.safe },
  high: { bg: semantic.dangerBg, fg: semantic.dangerText, dot: semantic.danger },
  low: { bg: semantic.dangerBg, fg: semantic.dangerText, dot: semantic.danger },
  caution: { bg: semantic.cautionBg, fg: semantic.cautionText, dot: semantic.caution },
};

export function LabBody({ record, details }: { record: RecordDetail; details: LabDetails | null }) {
  const measured = record.entities.filter((e) => e.kind === "lab_value" || e.kind === "vital");
  const keys = measured.map((e) => e.canonicalName).filter((k): k is string => Boolean(k));
  const history = useQuery({
    queryKey: ["lab-history", record.id, record.profileId],
    queryFn: () => previousValues(record.profileId, record.id, keys, record.eventDate),
    enabled: keys.length > 0,
    staleTime: 60_000,
  });
  const flagged = measured.filter((e) => e.flag === "high" || e.flag === "low").length;
  const tint = record.severity === "normal" ? FLAG_TINT.normal : record.severity === "borderline" ? FLAG_TINT.caution : FLAG_TINT.high;

  // The lab's own grouping where it gave one; anything left over after it.
  const groups: { name: string; items: RecordEntity[] }[] = [];
  const used = new Set<string>();
  for (const s of details?.sections ?? []) {
    const items = s.keys.map((k) => measured.find((e) => e.canonicalName === k)).filter((e): e is RecordEntity => Boolean(e));
    items.forEach((e) => used.add(e.id));
    if (items.length) groups.push({ name: s.name, items });
  }
  const rest = measured.filter((e) => !used.has(e.id));
  if (rest.length) groups.push({ name: groups.length ? "Other values" : "Values", items: rest });

  return (
    <View>
      {/* How it reads, with the gauge. */}
      <Card style={{ marginTop: 12 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>How this report reads</Text>
        <View style={{ flexDirection: "row", alignItems: "stretch", gap: 12, marginTop: 8 }}>
          <View style={{ flex: 1, alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: tint.bg, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint.dot }} />
              </View>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: ink[900] }}>{SEVERITY_LABEL[record.severity]}</Text>
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500], marginTop: 6 }}>{SEVERITY_BLURB[record.severity]}</Text>
          </View>
          <View style={{ width: 132, alignItems: "center", justifyContent: "center", paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: surface.line }}>
            <HealthGauge severity={record.severity} />
            <GaugeLegend severity={record.severity} />
          </View>
        </View>
        {measured.length ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Tally n={measured.length} label="measured" />
            <Tally n={flagged} label="outside range" tone={flagged ? semantic.dangerText : ink[900]} />
            <Tally n={measured.length - flagged} label="in range" />
          </View>
        ) : null}
      </Card>

      {groups.map((g) => (
        <Section key={g.name} title={g.name} right={g === groups[0] && flagged ? <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: semantic.dangerText }}>{flagged} flagged</Text> : undefined}>
          <Card padded={false}>
            {g.items.map((e, i) => (
              <View key={e.id} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <ValueRow entity={e} previous={e.canonicalName ? history.data?.get(e.canonicalName) : undefined} />
              </View>
            ))}
          </Card>
        </Section>
      ))}

      {measured.length === 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700] }}>
            No values were read from this report yet. The original page below has everything the lab printed.
          </Text>
        </Card>
      ) : null}

      {details ? (
        <Section title="About the sample">
          <FactGrid
            facts={[
              { label: "Collected", value: details.collectedAt ? stamp(details.collectedAt) : null, icon: CalendarClock },
              { label: "Reported", value: details.reportedAt ? stamp(details.reportedAt) : null, icon: CalendarClock },
              { label: "Sample", value: details.sampleType, icon: TestTube },
              { label: "Referred by", value: details.referredBy, icon: Stethoscope },
              { label: "Lab ID", value: details.labId, icon: Hash },
              { label: "Lab", value: details.accreditation ?? null, icon: BadgeCheck },
            ]}
          />
        </Section>
      ) : null}

      {details?.notes.length ? (
        <Section title="The lab's notes">
          <Card>
            <Bullets items={details.notes} />
          </Card>
        </Section>
      ) : null}
    </View>
  );
}

function Tally({ n, label, tone = ink[900] }: { n: number; label: string; tone?: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(15,16,48,0.035)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 18, color: tone }}>{n}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500] }}>{label}</Text>
    </View>
  );
}

function ValueRow({ entity, previous }: { entity: RecordEntity; previous?: { value: number; eventDate: string | null } }) {
  const flag = entity.flag;
  const tint = flag ? FLAG_TINT[flag] : null;
  const range = parseRange(entity.refRange);
  const pos = entity.value !== null && range ? rangePosition(entity.value, range) : null;
  const change = entity.value !== null ? trend(entity.value, previous?.value ?? null) : null;

  return (
    <View style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{entity.name}</Text>
          <Text selectable style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 1 }}>
            {formatValue(entity)}
          </Text>
        </View>
        {flag && tint ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: tint.bg }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11.5, color: tint.fg }}>{FLAG_LABEL[flag]}</Text>
          </View>
        ) : null}
      </View>

      {pos !== null ? (
        <View style={{ marginTop: 12 }} accessibilityLabel={`Range ${entity.refRange}`}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: "rgba(15,16,48,0.06)", flexDirection: "row" }}>
            <View style={{ flex: 1 }} />
            <View style={{ flex: 1, backgroundColor: "rgba(35,175,95,0.22)" }} />
            <View style={{ flex: 1 }} />
          </View>
          <View
            style={{
              position: "absolute",
              top: -4,
              left: `${pos * 100}%`,
              marginLeft: -7,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: tint?.dot ?? brand[600],
              borderWidth: 2.5,
              borderColor: "#fff",
            }}
          />
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 11, color: ink[300] }}>Low</Text>
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 11, color: ink[500], textAlign: "center" }}>{entity.refRange}</Text>
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 11, color: ink[300], textAlign: "right" }}>High</Text>
          </View>
        </View>
      ) : entity.refRange ? (
        <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[300], marginTop: 4 }}>Range {entity.refRange}</Text>
      ) : null}

      {change && previous ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          {change.direction === "up" ? <TrendingUp size={14} color={ink[500]} /> : change.direction === "down" ? <TrendingDown size={14} color={ink[500]} /> : <FlaskConical size={14} color={ink[500]} />}
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500] }}>
            {change.direction === "same"
              ? `Same as ${previous.eventDate ? shortDate(previous.eventDate) : "last time"}`
              : `${change.direction === "up" ? "Up" : "Down"} ${Math.abs(change.delta)} from ${previous.value}${previous.eventDate ? ` on ${shortDate(previous.eventDate)}` : ""}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return shortDate(iso);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return `${shortDate(iso)}, ${time}`;
}
