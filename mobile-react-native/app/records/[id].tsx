import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRightLeft, BadgeCheck, FileType2, Lightbulb, MessageCircle, MoreHorizontal, Stethoscope, Trash2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FileChip } from "@/components/records/chrome";
import { OriginalToggle } from "@/components/records/original-toggle";
import { TYPE_STYLE } from "@/components/records/record-card";
import { DischargeBody, MedicationBody, PrescriptionBody } from "@/components/records/detail/care";
import { LabBody } from "@/components/records/detail/lab";
import { BillBody, BookingInvoiceBody, ConsultationInvoiceBody } from "@/components/records/detail/money";
import { Card, FactList, Section } from "@/components/records/detail/parts";
import { InsuranceBody, ScanBody, VaccinationBody } from "@/components/records/detail/protection";
import { OptionsSheet } from "@/components/records/detail/sheets";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Glass, GlassCircle, Gradient, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { selectableProfiles } from "@/lib/profiles/context";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { readDetails, shortDate, type RecordDetails } from "@/lib/records/details";
import { formatEventDate } from "@/lib/records/grouping";
import { buildInsight } from "@/lib/records/insight";
import { confirmRecord, getRecord, signedDocumentUrl } from "@/lib/records/queries";
import { deleteRecord, moveRecord, refreshRecords, setRecordType } from "@/lib/records/record-actions";
import { DOC_TYPE_LABEL, DOC_TYPES, type DocType, type RecordDetail as Detail } from "@/lib/records/types";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * One record, in the layout its kind deserves.
 *
 * Every record shares a frame: a hero in the type's own colour naming whose
 * file it is in, the "did I read this right?" check while it waits for one,
 * the original page, and a way to ask about it. Between those, each type
 * gets its own body (components/records/detail): a lab report is values
 * against ranges, a prescription is a day of medicines, a policy is an
 * e-card and the cover left on it.
 *
 * The original is always reachable. A screen that only shows the machine's
 * reading of a medical document, with no way back to the page itself, is
 * asking to be trusted more than it has earned.
 */

/** What to call it in a sentence: "Ask Cheeku about this prescription". */
const NOUN: Record<DocType, string> = {
  lab_report: "report",
  prescription: "prescription",
  discharge: "summary",
  scan: "scan",
  bill: "bill",
  consultation_invoice: "invoice",
  booking_invoice: "invoice",
  vaccination: "vaccination",
  insurance: "policy",
  medication: "medicine list",
  other: "document",
};

/** Records the app wrote itself, which have no scanned page behind them. */
function appMade(record: Detail): "lab_partner" | "cheeku" | null {
  const source = (record.extraction as { source?: string } | null)?.source;
  return source === "lab_partner" || source === "cheeku" ? source : null;
}

type Sheet = "menu" | "move" | "type" | "delete" | null;

export default function RecordDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["record", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const record = await getRecord(id);
      // RLS returns another account's row as null, so this covers both a bad id
      // and an id belonging to someone else. The caller cannot tell them apart.
      if (!record) return { record: null, url: null };

      /*
       * RLS SCOPES THIS TO THE ACCOUNT; THE PLAN SCOPES IT TO A PERSON. The
       * family shares one user_id, so a locked member's document is a valid
       * row for this caller. Reported as "not found" rather than an upsell:
       * which documents exist for whom is itself what is being gated.
       */
      const allowed = await selectableProfiles();
      if (!allowed.some((p) => p.id === record.profileId)) return { record: null, url: null };

      const url = appMade(record) ? null : await signedDocumentUrl(record.storagePath);
      return { record, url };
    },
  });

  const record = query.data?.record ?? null;

  /*
   * THE CONTEXT FOLLOWS THE RECORD. Opening Amma's report makes Amma the
   * person being viewed, so "Ask Cheeku about this" and every screen behind
   * this one are about her (PLAN.md rule 4). Moving the record to someone
   * else moves the context with it.
   */
  const family = useFamily();
  const switchMember = useSwitchMember();
  const owner = record?.profileId;
  const viewingId = family.data?.profile?.id;
  useEffect(() => {
    if (owner && viewingId && owner !== viewingId) void switchMember(owner);
  }, [owner, viewingId, switchMember]);

  async function confirm() {
    setConfirming(true);
    setConfirmError(false);
    const ok = await confirmRecord(id);
    setConfirming(false);
    if (!ok) {
      setConfirmError(true);
      return;
    }
    refreshRecords(qc, id);
  }

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  if (!record) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10" style={{ paddingTop: insets.top }}>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: ink[900] }}>Record not found</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], textAlign: "center", marginTop: 8 }}>
          It may have been removed, or it belongs to a family member this plan does not cover.
        </Text>
        <PillButton tone="brand" onPress={() => router.replace("/records")} style={{ marginTop: 18, paddingHorizontal: 22 }}>
          Back to records
        </PillButton>
      </View>
    );
  }

  const rec = record;
  const type = TYPE_STYLE[rec.docType] ?? TYPE_STYLE.other;
  const details = readDetails(rec.docType, rec.extraction);
  const source = appMade(rec);
  const members = family.data?.access.selectable ?? [];
  const member = members.find((m) => m.id === rec.profileId) ?? family.data?.access.all.find((m) => m.id === rec.profileId);
  const isPrimary = Boolean(member?.isPrimary);
  const first = rec.profileName.split(" ")[0] ?? rec.profileName;
  const noun = NOUN[rec.docType];

  async function run(key: string, action: () => Promise<{ ok: boolean; message?: string }>, after: () => void) {
    setBusyKey(key);
    setSheetError(null);
    const res = await action();
    setBusyKey(null);
    if (!res.ok) {
      setSheetError(res.message ?? "That didn't work. Try again.");
      return;
    }
    setSheet(null);
    after();
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title={type.label}
        subtitle={source ? "Filed by Cheeku" : "Read and filed by Cheeku"}
        fallback="/records"
        right={
          <GlassCircle label="Record options" onPress={() => { setSheetError(null); setSheet("menu"); }}>
            <MoreHorizontal size={20} color={ink[900]} />
          </GlassCircle>
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 28 }} showsVerticalScrollIndicator={false}>
        {/* The record, as a pastel hero in its type's own colour. */}
        <View className="overflow-hidden rounded-[30px] p-4" style={glassShadow}>
          <Gradient from={type.wash} to="#ffffff" glow="#ffffff" />
          <View className="flex-row items-center gap-3">
            <FileChip mimeType={rec.mimeType} docType={rec.docType} />
            <View className="min-w-0 flex-1">
              <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3, color: ink[900] }}>
                {rec.title}
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 3 }}>
                {formatEventDate(rec.eventDate)}
                {rec.facility ? ` · ${rec.facility}` : ""}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Glass className="flex-row items-center gap-1.5 rounded-pill px-3 py-1.5">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rec.status === "filed" ? brand[600] : ink[300] }} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: rec.status === "filed" ? brand[700] : ink[700] }}>
                {rec.status === "filed" ? "Filed" : "Waiting for your check"}
              </Text>
            </Glass>
            <Pressable accessibilityRole="button" accessibilityLabel={`${isPrimary ? "In your file" : `In ${first}'s file`}. Move it to someone else`} onPress={() => { setSheetError(null); setSheet("move"); }}>
              <Glass className="flex-row items-center gap-1.5 rounded-pill py-1 pl-1 pr-3">
                {member ? <Avatar svg={member.avatar} photo={member.photo} image={member.avatarImage} background={member.avatarBackground} size={22} /> : null}
                <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 12, color: ink[700], marginLeft: member ? 0 : 8 }}>
                  {isPrimary ? "In your file" : `In ${first}'s file`}
                </Text>
              </Glass>
            </Pressable>
          </View>
        </View>

        {rec.status === "needs_review" ? (
          <Card style={{ marginTop: 12 }}>
            <View className="flex-row items-start gap-3">
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                <BadgeCheck size={19} color={brand[600]} />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>Did I read this right?</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700], marginTop: 3 }}>
                  Match what&apos;s below with the original page. If it lines up, file it. If I got the kind of record wrong, change it from the menu.
                </Text>
              </View>
            </View>
            {confirmError ? (
              <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>
                That didn&apos;t save. Check your connection and try again.
              </Text>
            ) : null}
            <PillButton tone="brand" loading={confirming} onPress={() => void confirm()} icon={<BadgeCheck size={17} color="#fff" />} style={{ marginTop: 14, height: 48 }}>
              Looks right, file it
            </PillButton>
          </Card>
        ) : null}

        <Body record={rec} details={details} isPrimary={isPrimary} />

        {rec.docType === "lab_report" ? <Insight record={rec} /> : null}

        {/* The original. */}
        {source ? (
          <Glass strong className="mt-5 flex-row items-center gap-3 rounded-[22px] p-4">
            <BadgeCheck size={18} color={brand[600]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>
              {source === "lab_partner"
                ? `Sent straight from ${(rec.extraction as { partner?: string }).partner ?? "the lab"}, so there is no scanned page. Every value is exactly as the lab reported it.`
                : "Cheeku filed this from your booking, so there's no paper copy. It updates by itself if the booking changes."}
            </Text>
          </Glass>
        ) : (
          <View style={{ marginTop: 8 }}>
            <OriginalToggle url={query.data?.url ?? null} rawText={rec.rawText} fileLabel={rec.title} confidence={rec.confidence} />
          </View>
        )}

        {/* What to do next. */}
        <PillButton tone="dark" onPress={() => router.push(`/ask?record=${rec.id}`)} icon={<MessageCircle size={18} color="#fff" />} style={{ marginTop: 20 }}>
          {`Ask Cheeku about this ${noun}`}
        </PillButton>
        {rec.docType === "lab_report" || rec.docType === "scan" || rec.docType === "discharge" ? (
          <PillButton tone="light" onPress={() => router.push("/book/consult")} icon={<Stethoscope size={18} color={brand[600]} />} style={{ marginTop: 10 }}>
            Book a doctor about it
          </PillButton>
        ) : null}
        {!source ? (
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], textAlign: "center", marginTop: 14 }}>
            Preview: Cheeku&apos;s reader is still in testing, so check anything important against the original.
          </Text>
        ) : null}
      </ScrollView>

      {/* ------------------------------------------------------------ sheets */}
      <OptionsSheet
        open={sheet === "menu"}
        title={rec.title}
        error={sheetError}
        onClose={() => setSheet(null)}
        options={[
          { key: "move", label: "Move to someone else", sub: isPrimary ? "It's in your file now" : `It's in ${first}'s file now`, icon: ArrowRightLeft, onPress: () => setSheet("move"), disabled: members.length < 2 },
          { key: "type", label: "Change the kind of record", sub: `Filed as ${DOC_TYPE_LABEL[rec.docType].toLowerCase()}`, icon: FileType2, onPress: () => setSheet("type") },
          { key: "delete", label: "Delete this record", sub: "From the app and its storage, for good", icon: Trash2, destructive: true, onPress: () => setSheet("delete") },
        ]}
      />

      <OptionsSheet
        open={sheet === "move"}
        title="Whose record is it?"
        body="It moves with everything read from it, and only the person you pick will see it in their file."
        error={sheetError}
        busyKey={busyKey}
        onClose={() => setSheet(null)}
        options={members.map((m) => ({
          key: m.id,
          label: m.isPrimary ? `${m.name.split(" ")[0]} (you)` : m.name,
          sub: m.relationship ?? undefined,
          selected: m.id === rec.profileId,
          leading: <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={40} />,
          onPress: () => {
            if (m.id === rec.profileId) return setSheet(null);
            void run(m.id, () => moveRecord(rec.id, m.id), () => {
              refreshRecords(qc, rec.id);
              void switchMember(m.id);
            });
          },
        }))}
      />

      <OptionsSheet
        open={sheet === "type"}
        title="What kind of record is it?"
        body="The page changes to suit it. Anything I couldn't read for the new kind stays on the original page."
        error={sheetError}
        busyKey={busyKey}
        onClose={() => setSheet(null)}
        options={DOC_TYPES.map((t) => ({
          key: t,
          label: DOC_TYPE_LABEL[t],
          icon: TYPE_STYLE[t].icon,
          tint: TYPE_STYLE[t].tint,
          selected: t === rec.docType,
          onPress: () => {
            if (t === rec.docType) return setSheet(null);
            void run(t, () => setRecordType(rec.id, t), () => refreshRecords(qc, rec.id));
          },
        }))}
      />

      <ConfirmSheet
        open={sheet === "delete"}
        title={`Delete this ${noun}?`}
        body={`It comes out of ${isPrimary ? "your" : `${first}'s`} file for good, with everything read from it${source ? "" : " and the original file"}. This can't be undone.`}
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        destructive
        onConfirm={async () => {
          const res = await deleteRecord(rec.id, rec.storagePath, !source);
          if (!res.ok) {
            setSheetError(res.message);
            setSheet("menu");
            return;
          }
          setSheet(null);
          refreshRecords(qc);
          qc.removeQueries({ queryKey: ["record", rec.id] });
          router.replace("/records");
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}

/** The type's own layout, or the plain one when its details couldn't be read. */
function Body({ record, details, isPrimary }: { record: Detail; details: RecordDetails | null; isPrimary: boolean }) {
  switch (details?.kind) {
    case "lab_report":
      return <LabBody record={record} details={details} />;
    case "prescription":
      return <PrescriptionBody record={record} details={details} isPrimary={isPrimary} />;
    case "discharge":
      return <DischargeBody record={record} details={details} isPrimary={isPrimary} />;
    case "medication":
      return <MedicationBody record={record} details={details} isPrimary={isPrimary} />;
    case "scan":
      return <ScanBody record={record} details={details} />;
    case "vaccination":
      return <VaccinationBody record={record} details={details} isPrimary={isPrimary} />;
    case "insurance":
      return <InsuranceBody record={record} details={details} />;
    case "bill":
      return <BillBody record={record} details={details} />;
    case "consultation_invoice":
      return <ConsultationInvoiceBody record={record} details={details} />;
    case "booking_invoice":
      return <BookingInvoiceBody record={record} details={details} />;
    default:
      // A lab report from before details existed still has its values.
      return record.docType === "lab_report" ? <LabBody record={record} details={null} /> : <Plain record={record} />;
  }
}

/**
 * The plain layout: whatever header fields were read, for "other" records and
 * for records whose details couldn't be read in their current type.
 */
function Plain({ record }: { record: Detail }) {
  const fields = ((record.extraction as { fields?: { label?: string; value?: string }[] } | null)?.fields ?? []).filter((f) => f.label && f.value && f.value !== "-");
  return (
    <Section title="What I read" style={{ marginTop: 16 }}>
      {fields.length ? (
        <FactList rows={fields.map((f) => ({ label: f.label as string, value: /^\d{4}-\d{2}-\d{2}$/.test(f.value as string) ? shortDate(f.value as string) : (f.value as string) }))} />
      ) : (
        <Card>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[700] }}>
            Nothing specific yet. The original page below has all of it, and if this is a prescription, a bill or another kind I know, change the kind from the menu.
          </Text>
        </Card>
      )}
    </Section>
  );
}

function Insight({ record }: { record: Detail }) {
  const insight = buildInsight(record);
  return (
    <View className="mt-5 overflow-hidden rounded-[26px] p-4" style={glassShadow}>
      <Gradient from="#efeaff" to="#f8f6ff" />
      <View className="flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-white">
          <Lightbulb size={17} color={brand[600]} />
        </View>
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>{insight.headline}</Text>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: ink[700], marginTop: 8 }}>{insight.body}</Text>
    </View>
  );
}
