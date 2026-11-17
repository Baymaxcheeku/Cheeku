import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, CalendarClock, FlaskConical, Hash, Stethoscope, TestTube, TrendingDown, TrendingUp } from "lucide-react-native";
import { Text, View } from "react-native";

import { formatValue } from "@/lib/records/insight";
import { parseRange, rangePosition, shortDate, trend, type LabDetails } from "@/lib/records/details";
import { previousValues } from "@/lib/records/record-actions";
import { FLAG_LABEL, SEVERITY_LABEL, type EntityFlag, type RecordDetail, type RecordEntity, type Severity } from "@/lib/records/types";
import { PILLAR_TONE } from "@/components/today/palette";
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
      {/* How it reads: the count that matters, big, and one bar with a segment per value. No gauge. */}
      <Card style={{ marginTop: 12, borderRadius: 28, padding: 18 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: tint.dot }} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[700] }}>{SEVERITY_LABEL[record.severity]}</Text>
        </View>
        {measured.length ? (
          <>
            <Text style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 52, lineHeight: 58, letterSpacing: -2, color: flagged ? NEEDS.deep : ink[900] }}>{flagged}</Text>
              <Text style={{ fontFamily: font.medium, fontSize: 17, color: ink[500] }}>{` of ${measured.length} outside the printed range`}</Text>
            </Text>
            <View style={{ flexDirection: "row", gap: 3, marginTop: 14 }} accessibilityLabel={`${flagged} of ${measured.length} values outside range`}>
              {measured.map((e) => {
                const out = e.flag === "high" || e.flag === "low";
                return <View key={e.id} style={{ flex: 1, height: 10, borderRadius: 999, backgroundColor: out ? NEEDS.accent : GOOD.accent }} />;
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
              <Legend color={NEEDS.accent} text={`${flagged} outside`} />
              <Legend color={GOOD.accent} text={`${measured.length - flagged} in range`} />
            </View>
          </>
        ) : null}
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 12 }}>{SEVERITY_BLURB[record.severity]}</Text>
      </Card>

      {groups.map((g) => (
        <Section key={g.name} title={g.name} right={g === groups[0] && flagged ? <Text style={{ fontFamily: font.semibold, fontSize: 14, color: NEEDS.deep }}>{flagged} flagged</Text> : undefined}>
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
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700] }}>
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

const NEEDS = PILLAR_TONE.eat; // coral
const GOOD = PILLAR_TONE.move; // mint

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: color }} />
      <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{text}</Text>
    </View>
  );
}

function Tally({ n, label, tone = ink[900] }: { n: number; label: string; tone?: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "rgba(15,16,48,0.035)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 17, color: tone }}>{n}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{label}</Text>
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
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: tint.fg }}>{FLAG_LABEL[flag]}</Text>
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
              borderRadius: 999,
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
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], marginTop: 4 }}>Range {entity.refRange}</Text>
      ) : null}

      {change && previous ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
          {change.direction === "up" ? <TrendingUp size={14} color={ink[500]} /> : change.direction === "down" ? <TrendingDown size={14} color={ink[500]} /> : <FlaskConical size={14} color={ink[500]} />}
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
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
