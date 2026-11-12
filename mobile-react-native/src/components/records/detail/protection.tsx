import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  Activity,
  Bone,
  Building2,
  CalendarClock,
  ChevronRight,
  Hash,
  HeartPulse,
  Hospital,
  MapPin,
  Phone,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react-native";
import { Linking, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { PillButton } from "@/components/ui/screen";
import { useFamily } from "@/lib/profiles/family";
import {
  coverStatus,
  coverUsed,
  daysUntil,
  doseStatus,
  MODALITY_LABEL,
  rupees,
  rupeesShort,
  shortDate,
  type InsuranceDetails,
  type ScanDetails,
  type VaccinationDetails,
} from "@/lib/records/details";
import { vaccineHistory } from "@/lib/records/record-actions";
import type { RecordDetail } from "@/lib/records/types";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { Bullets, Card, Chip, Eyebrow, FactGrid, FactList, Meter, ReminderButton, reminderAt, Section, Stat } from "./parts";
import { Tap } from "@/components/ui/tap";

// ------------------------------------------------------------------- scan --

/*
 * A radiology report is read from the bottom: the impression is the
 * radiologist's conclusion, and the findings are how they got there. So the
 * page puts the conclusion first, in its own card, and the findings after.
 */
export function ScanBody({ details }: { record: RecordDetail; details: ScanDetails }) {
  const Icon = details.modality === "xray" ? Bone : details.modality === "ecg" || details.modality === "echo" ? HeartPulse : ScanLine;
  return (
    <View>
      <View style={[glassShadow, { marginTop: 12, borderRadius: 24, overflow: "hidden", padding: 16 }]}>
        <Gradient from={surface.line} to="#ffffff" glow="#ffffff" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
            <Icon size={24} color={hue.indigo.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow color={hue.indigo.fg}>{MODALITY_LABEL[details.modality]}</Eyebrow>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 2 }}>{details.bodyPart}</Text>
          </View>
          <Chip text={details.contrast ? "With contrast" : "Plain"} bg="#fff" fg={hue.indigo.fg} />
        </View>
        {details.technique ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 12 }}>{details.technique}</Text> : null}
      </View>

      {details.impression.length ? (
        <Section title="Conclusion">
          <View style={{ padding: 16, borderRadius: 24, backgroundColor: brand[50], gap: 10 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: brand[700] }}>The radiologist&apos;s impression, word for word</Text>
            <Bullets items={details.impression} numbered />
          </View>
        </Section>
      ) : null}

      {details.clinicalNote ? (
        <Section title="Why it was done">
          <Card>
            <Text selectable style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20.5, color: ink[700] }}>{details.clinicalNote}</Text>
          </Card>
        </Section>
      ) : null}

      {details.findings.length ? (
        <Section title="Findings" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{details.findings.length} noted</Text>}>
          <Card>
            <Bullets items={details.findings} color={hue.indigo.fg} />
          </Card>
        </Section>
      ) : null}

      <Section title="Who was involved">
        <FactGrid
          tint={hue.indigo.fg}
          facts={[
            { label: "Reported by", value: details.radiologist, icon: UserRound },
            { label: "Referred by", value: details.referredBy, icon: Stethoscope },
          ]}
        />
      </Section>
    </View>
  );
}

// ------------------------------------------------------------ vaccination --

export function VaccinationBody({ record, details, isPrimary }: { record: RecordDetail; details: VaccinationDetails; isPrimary: boolean }) {
  const router = useRouter();
  const status = doseStatus(details);
  const canonical = (details.protectsAgainst ?? details.vaccine).toLowerCase();
  const history = useQuery({
    queryKey: ["vaccine-history", record.profileId, canonical],
    queryFn: () => vaccineHistory(record.profileId, canonical),
    staleTime: 60_000,
  });
  const whose = isPrimary ? "Your" : `${record.profileName.split(" ")[0]}'s`;
  const others = (history.data ?? []).filter((h) => h.documentId !== record.id);

  const next =
    status.status === "overdue"
      ? { title: `Overdue by ${-(status.days ?? 0)} day${status.days === -1 ? "" : "s"}`, bg: semantic.cautionBg, fg: semantic.cautionText }
      : status.status === "due_soon" || status.status === "upcoming"
        ? { title: status.days === 0 ? "Due today" : `Due in ${status.days} day${status.days === 1 ? "" : "s"}`, bg: brand[50], fg: brand[700] }
        : null;

  return (
    <View>
      {/* The course, as dose segments. */}
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: hue.rose.bg, alignItems: "center", justifyContent: "center" }}>
            <Syringe size={22} color={hue.rose.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{details.doses > 1 ? `Dose ${details.dose} of ${details.doses}` : "Single dose"}</Text>
            {details.protectsAgainst ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Protects against {details.protectsAgainst}</Text> : null}
          </View>
        </View>
        {details.doses > 1 ? (
          <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
            {Array.from({ length: details.doses }, (_, i) => (
              <View key={i} style={{ flex: 1 }}>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: i < details.dose ? hue.rose.fg : "rgba(15,16,48,0.07)" }} />
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: i < details.dose ? ink[700] : ink[300], marginTop: 5 }}>Dose {i + 1}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {status.status === "complete" ? (
          <View style={{ marginTop: 12 }}>
            <Chip text="Course complete" icon={ShieldCheck} bg={brand[50]} fg={brand[700]} />
          </View>
        ) : null}
      </Card>

      {details.nextDue && next ? (
        <Section title="Next dose">
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{shortDate(details.nextDue)}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                  Dose {Math.min(details.dose + 1, details.doses)} of {details.doses}
                </Text>
              </View>
              <Chip text={next.title} bg={next.bg} fg={next.fg} />
            </View>
            {status.status !== "overdue" ? (
              <ReminderButton
                label="Remind me a week before"
                reminder={{ id: `rec-${record.id}-nextdose`, at: reminderAt(details.nextDue, 7), title: "A vaccine dose is due next week", body: `${whose} next dose is due on ${shortDate(details.nextDue)}.`, url: `/records/${record.id}` }}
              />
            ) : (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700] }}>Ask the doctor or the centre that gave the last dose when to have this one.</Text>
            )}
          </Card>
        </Section>
      ) : null}

      <Section title="This dose">
        <FactGrid
          tint={hue.rose.fg}
          facts={[
            { label: "Given on", value: details.givenOn ? shortDate(details.givenOn) : null, icon: CalendarClock },
            { label: "Where", value: details.centre, icon: MapPin },
            { label: "Given by", value: details.givenBy, icon: UserRound },
            { label: "Site", value: details.site, icon: Activity },
            { label: "Batch", value: details.batch, icon: Hash },
            { label: "Certificate", value: details.certificateId, icon: ShieldCheck },
          ]}
        />
      </Section>

      {others.length ? (
        <Section title={`Other ${details.protectsAgainst ?? details.vaccine} doses`}>
          <Card padded={false}>
            {others.map((h, i) => (
              <Tap scale={0.98}
                key={`${h.documentId}-${i}`}
                accessibilityRole="button"
                disabled={!h.documentId}
                onPress={() => h.documentId && router.push(`/records/${h.documentId}`)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}
              >
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: ink[900] }}>Dose {h.dose}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{h.eventDate ? shortDate(h.eventDate) : ""}</Text>
                <ChevronRight size={16} color={ink[300]} />
              </Tap>
            ))}
          </Card>
        </Section>
      ) : null}
    </View>
  );
}

// -------------------------------------------------------------- insurance --

const POLICY_TYPE: Record<InsuranceDetails["policyType"], string> = {
  family_floater: "Family floater",
  individual: "Individual",
  group: "Group (employer)",
  top_up: "Top-up",
};

export function InsuranceBody({ record, details }: { record: RecordDetail; details: InsuranceDetails }) {
  const family = useFamily();
  const cover = coverStatus(details);
  const used = coverUsed(details);
  const roster = family.data?.access.all ?? [];

  const statusChip =
    cover.status === "expired"
      ? { text: "Expired", bg: "rgba(255,255,255,0.18)" }
      : cover.status === "renew_soon"
        ? { text: `Renews in ${cover.daysLeft} day${cover.daysLeft === 1 ? "" : "s"}`, bg: "rgba(255,255,255,0.24)" }
        : cover.status === "not_started"
          ? { text: "Starts soon", bg: "rgba(255,255,255,0.18)" }
          : { text: "Active", bg: "rgba(255,255,255,0.2)" };

  return (
    <View>
      {/* The policy, as the e-card people keep in their wallet. */}
      <View style={[glassShadow, { marginTop: 12, borderRadius: 24, overflow: "hidden", padding: 18 }]}>
        <Gradient from={hue.ocean.fg} to="#2c2c33" angle="diagonal" />
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{POLICY_TYPE[details.policyType]}</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, lineHeight: 23, color: "#fff", marginTop: 4 }}>{details.insurer}</Text>
            {details.plan ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 1 }}>{details.plan}</Text> : null}
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: statusChip.bg }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>{statusChip.text}</Text>
          </View>
        </View>
        <Text style={{ fontFamily: font.bold, fontSize: 28, letterSpacing: -0.8, color: "#fff", marginTop: 18 }}>{rupeesShort(details.sumInsured)}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: "rgba(255,255,255,0.75)" }}>Sum insured</Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 18 }}>
          <View style={{ flex: 1.4 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Policy number</Text>
            <Text selectable numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff", marginTop: 2 }}>{details.policyNo}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Valid till</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff", marginTop: 2 }}>{details.end ? shortDate(details.end) : "Not stated"}</Text>
          </View>
        </View>
      </View>

      <Section title="Cover left this year">
        <Card style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Stat value={rupeesShort(used.remaining)} label="Available" tint={hue.ocean.fg} />
            <Stat value={rupeesShort(details.claimed)} label="Claimed" />
          </View>
          <Meter share={used.share} color={hue.ocean.fg} />
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
            {details.claimed > 0 ? `${Math.round(used.share * 100)}% of the cover used across ${details.claims.length} claim${details.claims.length === 1 ? "" : "s"}.` : "No claims made on this policy yet."}
          </Text>
        </Card>
      </Section>

      {details.members.length ? (
        <Section title="Who's covered" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{details.members.length} people</Text>}>
          <Card padded={false}>
            {details.members.map((m, i) => {
              const match = roster.find((p) => p.name.split(" ")[0]?.toLowerCase() === m.name.split(" ")[0]?.toLowerCase());
              return (
                <View key={`${m.name}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  {match ? (
                    <Avatar svg={match.avatar} photo={match.photo} image={match.avatarImage} background={match.avatarBackground} size={36} />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: hue.ocean.bg, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: hue.ocean.fg }}>{m.name[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{m.name}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>
                      {[m.relation, match ? "In your Cheeku family" : null].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </Section>
      ) : null}

      <Section title="Key terms">
        <FactList
          rows={[
            { label: "Type", value: POLICY_TYPE[details.policyType] },
            { label: "Cashless", value: details.cashless ? "Yes, at network hospitals" : "Reimbursement only" },
            { label: "Co-pay", value: details.coPay },
            { label: "Room rent", value: details.roomRent },
            { label: "Premium", value: details.premium ? `${rupees(details.premium.amount)} ${details.premium.frequency === "yearly" ? "a year" : details.premium.frequency === "monthly" ? "a month" : "a quarter"}` : null },
            { label: "Started", value: details.start ? shortDate(details.start) : null },
          ]}
        />
      </Section>

      {details.waitingPeriods.length ? (
        <Section title="Waiting periods">
          <Card padded={false}>
            {details.waitingPeriods.map((w, i) => {
              const left = daysUntil(w.until);
              const over = left !== null && left < 0;
              return (
                <View key={w.label} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                  <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[900] }}>{w.label}</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: over ? brand[700] : ink[500] }}>
                    {over ? "Covered now" : w.until ? `Till ${shortDate(w.until)}` : "Ongoing"}
                  </Text>
                </View>
              );
            })}
          </Card>
        </Section>
      ) : null}

      {details.claims.length ? (
        <Section title="Claims">
          <Card padded={false}>
            {details.claims.map((c, i) => (
              <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
                <View style={{ flex: 1 }}>
                  <Text selectable style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{c.id}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{c.date ? shortDate(c.date) : ""}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{rupees(c.amount)}</Text>
                  <Chip text={c.status === "settled" ? "Settled" : c.status === "pending" ? "In progress" : "Not approved"} bg={c.status === "settled" ? brand[50] : "rgba(15,16,48,0.05)"} fg={c.status === "settled" ? brand[700] : ink[700]} />
                </View>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      <View style={{ marginTop: 18, gap: 10 }}>
        {details.tpa?.phone ? (
          <PillButton icon={<Phone size={17} color="#fff" />} onPress={() => void Linking.openURL(`tel:${details.tpa?.phone?.replace(/\s/g, "")}`)}>
            {`Call claims · ${details.tpa.phone}`}
          </PillButton>
        ) : null}
        {details.end && (cover.daysLeft ?? 0) > 30 ? (
          <ReminderButton
            label="Remind me a month before renewal"
            reminder={{ id: `rec-${record.id}-renewal`, at: reminderAt(details.end, 30), title: "A policy renews next month", body: `${details.insurer} renews on ${shortDate(details.end)}. Tap to see the policy.`, url: `/records/${record.id}` }}
          />
        ) : null}
      </View>
      {details.tpa ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" }}>
          {details.cashless ? <Hospital size={14} color={ink[500]} /> : <Building2 size={14} color={ink[500]} />}
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Claims handled by {details.tpa.name}</Text>
        </View>
      ) : null}
    </View>
  );
}
