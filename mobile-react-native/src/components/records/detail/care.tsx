import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  BedDouble,
  CalendarCheck,
  CalendarClock,
  Check,
  ClipboardList,
  FlaskConical,
  Hospital,
  ListPlus,
  Phone,
  Pill,
  ShieldAlert,
  Stethoscope,
  Store,
  UserRound,
} from "lucide-react-native";
import { useState } from "react";
import { Linking, Text, View } from "react-native";

import { PillButton } from "@/components/ui/screen";
import { useLabCart } from "@/lib/labs/queries";
import {
  dosesPerDay,
  lengthOfStay,
  shortDate,
  supplyLeft,
  daysUntil,
  type DischargeDetails,
  type Medicine,
  type MedicationDetails,
  type PrescriptionDetails,
} from "@/lib/records/details";
import { addMedicinesToMember, medicinesAlreadyListed } from "@/lib/records/record-actions";
import type { RecordDetail } from "@/lib/records/types";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { Bullets, Card, ChipRow, Eyebrow, FactGrid, MedicineList, ReminderButton, reminderAt, Section } from "./parts";
import { ScorecardEntry } from "./scorecard-entry";
import { Tap } from "@/components/ui/tap";

/*
 * Prescriptions, discharge summaries and medicine lists: three documents that
 * are, underneath, about what to take and when. They share the medicine card
 * (three slots of the day, food timing, days left) and one action that syncs
 * with the member's profile: "Add to Amma's medicines", which writes into
 * Amma's own list and nobody else's.
 */

function firstName(record: RecordDetail) {
  return record.profileName.split(" ")[0] ?? record.profileName;
}

// ----------------------------------------------------------- prescription --

export function PrescriptionBody({ record, details, isPrimary }: { record: RecordDetail; details: PrescriptionDetails; isPrimary: boolean }) {
  const router = useRouter();
  const setPrescription = useLabCart((s) => s.setPrescription);
  const d = details.doctor;

  return (
    <View>
      {/* Every medicine checked on ten standards against this person's records. */}
      <ScorecardEntry documentId={record.id} />

      {/* The doctor, as a card you could hand to a receptionist. */}
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: hue.teal.bg, alignItems: "center", justifyContent: "center" }}>
            <Stethoscope size={22} color={hue.teal.fg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text selectable style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{d.name}</Text>
            {d.qualification ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{d.qualification}</Text> : null}
          </View>
          {d.phone ? (
            <Tap scale={0.95} accessibilityRole="button" accessibilityLabel={`Call ${d.name}`} onPress={() => void Linking.openURL(`tel:${d.phone?.replace(/\s/g, "")}`)} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
              <Phone size={17} color={brand[700]} />
            </Tap>
          ) : null}
        </View>
        {d.clinic || d.regNo ? (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: surface.line, gap: 4 }}>
            {d.clinic ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>{d.clinic}</Text> : null}
            {d.regNo ? <Text selectable style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Reg. no. {d.regNo}</Text> : null}
          </View>
        ) : null}
      </Card>

      {details.complaints.length || details.diagnosis.length || details.vitals.length ? (
        <Section title="The visit">
          <Card style={{ gap: 14 }}>
            {details.complaints.length ? (
              <View style={{ gap: 8 }}>
                <Eyebrow>Came in with</Eyebrow>
                <ChipRow items={details.complaints} />
              </View>
            ) : null}
            {details.diagnosis.length ? (
              <View style={{ gap: 8 }}>
                <Eyebrow>Doctor&apos;s note</Eyebrow>
                <ChipRow items={details.diagnosis} bg={brand[50]} fg={brand[700]} />
              </View>
            ) : null}
            {details.vitals.length ? (
              <View style={{ gap: 8 }}>
                <Eyebrow>Checked</Eyebrow>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {details.vitals.slice(0, 4).map((v) => (
                    <View key={v.label} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 16, backgroundColor: "rgba(15,16,48,0.035)" }}>
                      <Text style={{ fontFamily: font.regular, fontSize: 11, color: ink[500] }}>{v.label}</Text>
                      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900], marginTop: 1 }}>{v.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {details.medicines.length ? (
        <Section title="Medicines" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{details.medicines.length} prescribed</Text>}>
          <MedicineList medicines={details.medicines} startIso={record.eventDate} />
          <View style={{ marginTop: 10 }}>
            <AddToMedicines record={record} medicines={details.medicines} isPrimary={isPrimary} />
          </View>
        </Section>
      ) : null}

      {details.tests.length ? (
        <Section title="Tests advised">
          <Card style={{ gap: 12 }}>
            <Bullets items={details.tests} color={hue.teal.fg} />
            <PillButton
              tone="light"
              icon={<FlaskConical size={17} color={brand[600]} />}
              onPress={() => {
                setPrescription(record.id);
                router.push("/labs");
              }}
            >
              Book these tests at home
            </PillButton>
          </Card>
        </Section>
      ) : null}

      {details.advice.length ? (
        <Section title="Advice">
          <Card>
            <Bullets items={details.advice} />
          </Card>
        </Section>
      ) : null}

      {details.followUp ? <FollowUp record={record} date={details.followUp} with={d.name} isPrimary={isPrimary} /> : null}
    </View>
  );
}

function FollowUp({ record, date, with: withWhom, isPrimary }: { record: RecordDetail; date: string; with: string | null; isPrimary: boolean }) {
  const left = daysUntil(date);
  const whose = isPrimary ? "Your" : `${firstName(record)}'s`;
  return (
    <Section title="Follow-up">
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
            <CalendarCheck size={20} color={brand[600]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{shortDate(date)}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
              {left === null ? "" : left < 0 ? `Was due ${-left} day${left === -1 ? "" : "s"} ago` : left === 0 ? "Today" : `In ${left} day${left === 1 ? "" : "s"}`}
              {withWhom ? ` · ${withWhom}` : ""}
            </Text>
          </View>
        </View>
        {left !== null && left > 0 ? (
          <ReminderButton
            label="Remind me the day before"
            reminder={{ id: `rec-${record.id}-followup`, at: reminderAt(date, 1), title: "Follow-up visit tomorrow", body: `${whose} follow-up is due tomorrow. Tap to see the details.`, url: `/records/${record.id}` }}
          />
        ) : null}
      </Card>
    </Section>
  );
}

/**
 * Adds these medicines to the record's own member's list. Says how many
 * were new and how many were already there, and remembers it for the visit.
 */
function AddToMedicines({ record, medicines, isPrimary }: { record: RecordDetail; medicines: Medicine[]; isPrimary: boolean }) {
  const qc = useQueryClient();
  const who = isPrimary ? "your" : `${firstName(record)}'s`;
  const listed = useQuery({
    queryKey: ["meds-listed", record.profileId, record.id],
    queryFn: () => medicinesAlreadyListed(record.profileId, medicines),
    staleTime: 30_000,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const all = listed.data !== undefined && listed.data >= medicines.length;

  async function add() {
    setBusy(true);
    setMessage(null);
    const res = await addMedicinesToMember(record.profileId, medicines);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setMessage(res.added === 0 ? `They're all in ${who} list already.` : `Added ${res.added} to ${who} medicines${res.already ? `, ${res.already} ${res.already === 1 ? "was" : "were"} there already` : ""}.`);
    void qc.invalidateQueries({ queryKey: ["meds-listed", record.profileId] });
    void qc.invalidateQueries({ queryKey: ["member-health", record.profileId] });
    void qc.invalidateQueries({ queryKey: ["settings-health"] });
    void qc.invalidateQueries({ queryKey: ["ask-context"] });
  }

  return (
    <View>
      {all ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 46, borderRadius: 999, backgroundColor: brand[50] }}>
          <Check size={16} color={brand[700]} strokeWidth={2.6} />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>In {who} medicines</Text>
        </View>
      ) : (
        <PillButton loading={busy} icon={<ListPlus size={17} color="#fff" />} onPress={() => void add()}>
          {`Add to ${who} medicines`}
        </PillButton>
      )}
      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], textAlign: "center", marginTop: 6 }}>
        {message ?? `So Cheeku knows what ${isPrimary ? "you're" : `${firstName(record)} is`} taking when you ask.`}
      </Text>
    </View>
  );
}

// -------------------------------------------------------------- discharge --

export function DischargeBody({ record, details, isPrimary }: { record: RecordDetail; details: DischargeDetails; isPrimary: boolean }) {
  const stay = lengthOfStay(details.admittedOn, details.dischargedOn);
  const [open, setOpen] = useState(false);

  return (
    <View>
      {/* The stay, as a short timeline: in, what was done, out. */}
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: "#fdf0dc", alignItems: "center", justifyContent: "center" }}>
            <BedDouble size={20} color="#a9631a" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{stay ? `${stay} day${stay === 1 ? "" : "s"} in hospital` : "Hospital stay"}</Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{details.ward ?? details.hospital}</Text>
          </View>
        </View>
        <View style={{ marginTop: 14, gap: 0 }}>
          <Step label="Admitted" date={details.admittedOn} detail={details.reason} first />
          {details.procedures.map((p) => (
            <Step key={p.name} label={p.name} date={p.date} />
          ))}
          <Step label="Discharged" date={details.dischargedOn} detail={details.consultant ? `Under ${details.consultant}` : null} last />
        </View>
      </Card>

      {details.diagnosis.length ? (
        <Section title="Diagnosis">
          <Card>
            <ChipRow items={details.diagnosis} bg={brand[50]} fg={brand[700]} />
          </Card>
        </Section>
      ) : null}

      {details.course ? (
        <Section title="What happened">
          <Card>
            <Text numberOfLines={open ? undefined : 4} style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700] }}>
              {details.course}
            </Text>
            {details.course.length > 180 ? (
              <Tap accessibilityRole="button" onPress={() => setOpen((o) => !o)} hitSlop={6} style={{ marginTop: 8 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{open ? "Show less" : "Read all"}</Text>
              </Tap>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {details.medicines.length ? (
        <Section title="Medicines to take home">
          <MedicineList medicines={details.medicines} startIso={details.dischargedOn ?? record.eventDate} />
          <View style={{ marginTop: 10 }}>
            <AddToMedicines record={record} medicines={details.medicines} isPrimary={isPrimary} />
          </View>
        </Section>
      ) : null}

      {details.instructions.length ? (
        <Section title="At home">
          <Card>
            <Bullets items={details.instructions} />
          </Card>
        </Section>
      ) : null}

      {details.warningSigns.length ? (
        <Section title="Go back to the hospital if">
          <View style={{ padding: 16, borderRadius: 24, backgroundColor: semantic.cautionBg, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={17} color={semantic.cautionText} />
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: semantic.cautionText }}>The hospital listed these. Don&apos;t wait for the follow-up.</Text>
            </View>
            <Bullets items={details.warningSigns} color={semantic.caution} />
          </View>
        </Section>
      ) : null}

      {details.followUp?.date ? <FollowUp record={record} date={details.followUp.date} with={details.followUp.with} isPrimary={isPrimary} /> : null}

      <Section title="Details">
        <FactGrid
          facts={[
            { label: "Hospital", value: details.hospital, icon: Hospital },
            { label: "Consultant", value: details.consultant, icon: UserRound },
            { label: "Admitted", value: details.admittedOn ? shortDate(details.admittedOn) : null, icon: CalendarClock },
            { label: "Discharged", value: details.dischargedOn ? shortDate(details.dischargedOn) : null, icon: CalendarClock },
          ]}
        />
      </Section>
    </View>
  );
}

function Step({ label, date, detail, first, last }: { label: string; date: string | null; detail?: string | null; first?: boolean; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ alignItems: "center", width: 16 }}>
        <View style={{ width: 2, height: 6, backgroundColor: first ? "transparent" : brand[100] }} />
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: first || last ? brand[600] : "#fff", borderWidth: 2, borderColor: brand[600] }} />
        <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: last ? "transparent" : brand[100] }} />
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 12 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{label}</Text>
          {date ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{shortDate(date)}</Text> : null}
        </View>
        {detail ? <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{detail}</Text> : null}
      </View>
    </View>
  );
}

// -------------------------------------------------------------- medication --

const SLOT_NAMES = ["Morning", "Afternoon", "Night"] as const;

export function MedicationBody({ record, details, isPrimary }: { record: RecordDetail; details: MedicationDetails; isPrimary: boolean }) {
  const start = details.startedOn ?? record.eventDate;
  // The day at a glance: which medicines at which time.
  const slots = SLOT_NAMES.map((name, i) => ({ name, meds: details.medicines.filter((m) => !m.asNeeded && (m.schedule[i] ?? 0) > 0) }));
  const asNeeded = details.medicines.filter((m) => m.asNeeded);
  const soonest = details.medicines
    .map((m) => ({ m, s: supplyLeft(m, start) }))
    .filter((x): x is { m: (typeof details.medicines)[number]; s: NonNullable<ReturnType<typeof supplyLeft>> } => Boolean(x.s?.runsOutOn))
    .sort((a, b) => (a.s.runsOutOn ?? "").localeCompare(b.s.runsOutOn ?? ""))[0];

  return (
    <View>
      <Section title="Your day" style={{ marginTop: 14 }}>
        <Card padded={false}>
          {slots.map((slot, i) => (
            <View key={slot.name} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
              <Text style={{ width: 78, fontFamily: font.semibold, fontSize: 13, color: slot.meds.length ? ink[900] : ink[300] }}>{slot.name}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                {slot.meds.length ? (
                  slot.meds.map((m) => (
                    <Text key={m.name} style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>
                      {m.name}
                      {m.strength ? ` ${m.strength}` : ""}
                      {(m.schedule[SLOT_NAMES.indexOf(slot.name)] ?? 1) > 1 ? ` ×${m.schedule[SLOT_NAMES.indexOf(slot.name)]}` : ""}
                    </Text>
                  ))
                ) : (
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[300] }}>Nothing</Text>
                )}
              </View>
            </View>
          ))}
          {asNeeded.length ? (
            <View style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: surface.line }}>
              <Text style={{ width: 78, fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>If needed</Text>
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, color: ink[700] }}>{asNeeded.map((m) => m.name).join(", ")}</Text>
            </View>
          ) : null}
        </Card>
      </Section>

      <Section title="Medicines" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{details.medicines.reduce((n, m) => n + dosesPerDay(m), 0)} doses a day</Text>}>
        <MedicineList
          medicines={details.medicines}
          startIso={null}
          extra={(m, i) => {
            const full = details.medicines[i];
            if (!full) return null;
            const s = supplyLeft(full, start);
            const parts = [
              full.qty ? `${full.qty} bought` : null,
              s?.runsOutOn ? `lasts till ${shortDate(s.runsOutOn)}` : s ? `lasts ${s.days} days` : null,
              full.expiry ? `expires ${shortDate(full.expiry)}` : null,
            ].filter(Boolean);
            return parts.length ? parts.join(" · ") : null;
          }}
        />
        <View style={{ marginTop: 10 }}>
          <AddToMedicines record={record} medicines={details.medicines} isPrimary={isPrimary} />
        </View>
      </Section>

      {soonest?.s.runsOutOn && (soonest.s.daysLeft ?? 0) > 3 ? (
        <Section title="Refill">
          <Card style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: hue.plum.bg, alignItems: "center", justifyContent: "center" }}>
                <Pill size={20} color={hue.plum.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{soonest.m.name} runs out first</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Around {shortDate(soonest.s.runsOutOn)}, in {soonest.s.daysLeft} days</Text>
              </View>
            </View>
            <ReminderButton
              label="Remind me 3 days before"
              reminder={{ id: `rec-${record.id}-refill`, at: reminderAt(soonest.s.runsOutOn, 3), title: "Time to refill", body: "A medicine runs out in 3 days. Tap to see which.", url: `/records/${record.id}` }}
            />
          </Card>
        </Section>
      ) : null}

      <Section title="Details">
        <FactGrid
          facts={[
            { label: "Pharmacy", value: details.pharmacy, icon: Store },
            { label: "Prescribed by", value: details.prescribedBy, icon: Stethoscope },
            { label: "Started", value: details.startedOn ? shortDate(details.startedOn) : null, icon: CalendarClock },
            { label: "Source", value: details.source === "pharmacy" ? "Pharmacy bill" : details.source === "label" ? "Medicine label" : "Medicine list", icon: ClipboardList },
          ]}
        />
      </Section>
    </View>
  );
}
