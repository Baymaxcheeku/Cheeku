import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertTriangle, CalendarClock, Check, FastForward, FileText, LifeBuoy, MapPin, MessageCircle, PenLine, Phone } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { monogramOf, PartnerBadge, ReviewSheet, rupees, SampleNote } from "@/components/labs/parts";
import { CancelSheet, ProblemSheet, RescheduleSheet } from "@/components/partner/sheets";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { Enter } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { feel } from "@/lib/feel";
import { fastingFor } from "@/lib/labs/logic";
import { advanceLabDemo, BOOKINGS_KEY, postReview, useCatalog, useLabBookings } from "@/lib/labs/queries";
import { canChange, problemOf, stageAt, stagesFor } from "@/lib/partner/lab-stages";
import { clock, istIso, labstack, LIVE } from "@/lib/partner/labstack";
import { PartnerError } from "@/lib/partner/types";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { formatEventDate } from "@/lib/records/grouping";
import { brand, ink, semantic } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";

/*
 * One lab booking, from "booked" to "report ready".
 *
 * A vertical timeline, the way a delivery app tracks a parcel, because that
 * is what this is: someone is coming to the house, then something is being
 * done with a sample, then a report arrives. Each stage has a line of plain
 * English. When the report is ready the main button opens it, in the right
 * family member's file, and the lab can be rated.
 *
 * Statuses come from LabStack (labs.order: getOrderDetails, kept fresh by
 * the order webhook), told as five or six steps (lib/partner/lab-stages).
 * Until the sample is taken the time can move (getSlots + rescheduleOrder)
 * or the booking can be cancelled with a reason; any time, "Report a
 * problem" goes to LabStack's escalation desk. The collector's name and
 * number show once one is assigned.
 *
 * "Skip ahead" is a preview control only; it is hidden when live.
 */
export default function LabBooking() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const bookings = useLabBookings();
  const catalog = useCatalog();
  const family = useFamily();
  const switchMember = useSwitchMember();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const order = useQuery({ queryKey: ["lab-order", id], queryFn: () => labstack().labs.order(id), enabled: Boolean(id), refetchInterval: 60_000 });
  const [rating, setRating] = useState(false);
  const [stepping, setStepping] = useState(false);

  const b = bookings.data?.find((x) => x.id === id);
  const partner = catalog.data?.partners.find((p) => p.id === b?.partnerId);
  const member = family.data?.access.all.find((m) => m.id === b?.profileId);

  // Just booked: one success buzz, with the tick, the first time it shows.
  const celebrated = useRef(false);
  const ready = Boolean(b && partner);
  useEffect(() => {
    if (!fresh || !ready || celebrated.current) return;
    celebrated.current = true;
    feel.success();
  }, [fresh, ready]);

  if ((!b || !partner) && (bookings.isPending || catalog.isPending)) {
    return (
      <ScreenSkeleton title="Lab booking">
        <DetailSkeleton hero={200} />
      </ScreenSkeleton>
    );
  }
  if (!b || !partner) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Lab booking" fallback="/labs/bookings" />
        {bookings.isSuccess ? <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40 }}>This booking isn&apos;t here any more.</Text> : null}
      </View>
    );
  }

  const o = order.data;
  const type = o?.orderType ?? "HOME_SAMPLE";
  const status = o?.status ?? "ORDER_SCHEDULED";
  const stages = stagesFor(type);
  const idx = stageAt(type, status);
  const problem = problemOf(status);
  const cancelled = status === "CANCELED" || b.status === "cancelled";
  const reportReady = (status === "REPORT_DELIVERED" || status === "PARTIAL_DELIVERED") && Boolean(b.resultDocumentId ?? o?.resultDocumentId);
  const resultId = b.resultDocumentId ?? o?.resultDocumentId ?? null;
  const when = o ? `${formatEventDate(o.appointment.slice(0, 10))}, ${clock(o.appointment.slice(11, 16))}` : `${formatEventDate(b.slotDate)}, ${b.slotWindow}`;
  const fasting = catalog.data ? fastingFor(catalog.data.tests, b.tests) : 0;
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: BOOKINGS_KEY }), qc.invalidateQueries({ queryKey: ["lab-order", id] }), qc.invalidateQueries({ queryKey: ["notifications"] })]);
  const first = member?.isPrimary ? "you" : (member?.name.split(" ")[0] ?? "them");
  const testNames = b.tests.map((t) => catalog.data?.tests.find((x) => x.id === t)?.name ?? t);

  const bookingId = b.id;
  async function step() {
    setStepping(true);
    await advanceLabDemo(bookingId);
    await refresh();
    setStepping(false);
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop height={460} />
      <ScreenHeader title={fresh ? undefined : "Lab booking"} fallback="/labs/bookings" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }}
        refreshControl={<RefreshControl refreshing={bookings.isRefetching || order.isRefetching} onRefresh={() => void refresh()} tintColor={brand[600]} />}
        showsVerticalScrollIndicator={false}
      >
        {fresh && !cancelled ? (
          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 18 }}>
            <Enter kind="pop" style={[glassShadow, { width: 76, height: 76, borderRadius: 999, backgroundColor: ink[900], alignItems: "center", justifyContent: "center" }]}>
              <Check size={36} color="#fff" strokeWidth={3} />
            </Enter>
            <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900], marginTop: 14 }}>Collection booked!</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 4, textAlign: "center" }}>
              I&apos;ll file the report in {member?.isPrimary ? "your" : `${first}'s`} health file the moment it&apos;s ready.
            </Text>
          </View>
        ) : null}

        {/* Who and where. */}
        <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", padding: 16 }]}>
          <Gradient from={partner.color} to="#ffffff" glow="#ffffff" />
          <View className="flex-row items-center gap-3">
            <PartnerBadge partner={o?.labName ? { monogram: monogramOf(o.labName), color: partner.color } : partner} logo={o?.labLogo ?? b.labLogo} size={50} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{o?.labName ?? b.labName ?? partner.name}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700], marginTop: 1 }}>For {member?.isPrimary ? "you" : member?.name} · {rupees(b.total)}</Text>
            </View>
          </View>
          <View style={{ marginTop: 14, gap: 8 }}>
            <View className="flex-row items-center gap-2">
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{when}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>· {type === "CENTER_VISIT" ? "at the lab" : "home collection"}</Text>
            </View>
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color={ink[500]} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{type === "CENTER_VISIT" ? (o?.labAddress ?? "The lab's address comes with the confirmation.") : b.address}</Text>
            </View>
          </View>
        </View>

        {/* Timeline. */}
        {cancelled ? (
          <Glass strong className="mt-4 rounded-xl p-4">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Cancelled</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>Nothing was collected and nothing is charged.</Text>
          </Glass>
        ) : (
          <>
            {problem ? (
              <View style={{ marginTop: 16, flexDirection: "row", gap: 10, padding: 14, borderRadius: 20, backgroundColor: semantic.cautionBg }}>
                <AlertTriangle size={18} color={semantic.cautionText} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{problem.title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>{problem.line}</Text>
                </View>
              </View>
            ) : null}
            {o?.phlebo && !cancelled && idx < stages.findIndex((x) => x.key === "collected") ? (
              <View className="mt-4 flex-row items-center gap-3 rounded-xl bg-white p-4" style={[glassShadow]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Your collector</Text>
                  <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900], marginTop: 1 }}>{o.phlebo.name}</Text>
                </View>
                {o.phlebo.phone ? (
                  <Tap accessibilityRole="button" accessibilityLabel={`Call ${o.phlebo.name}`} onPress={() => void Linking.openURL(`tel:${o.phlebo!.phone}`)} style={{ height: 44, paddingHorizontal: 16, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: ink[900] }}>
                    <Phone size={15} color="#fff" />
                    <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>Call</Text>
                  </Tap>
                ) : null}
              </View>
            ) : null}
          <Glass strong className="mt-4 rounded-xl p-4">
            {stages.map((s, i) => {
              const done = i <= idx;
              const now = i === idx;
              return (
                <View key={s.key} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 26 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: done ? brand[600] : "rgba(15,16,48,0.07)", borderWidth: now ? 4 : 0, borderColor: brand[100] }}>
                      {done && !now ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    {i < stages.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: i < idx ? brand[600] : "rgba(15,16,48,0.08)" }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < stages.length - 1 ? 14 : 0 }}>
                    <Text style={{ fontFamily: now ? font.semibold : font.medium, fontSize: 15, color: done ? ink[900] : ink[300] }}>{s.label}</Text>
                    {now || (done && i === 0) ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{s.line}</Text> : null}
                  </View>
                </View>
              );
            })}
          </Glass>
          </>
        )}

        {/* Report / actions. */}
        {reportReady && resultId ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <PillButton
              tone="brand"
              icon={<FileText size={18} color="#fff" />}
              onPress={() => {
                void switchMember(b.profileId);
                router.push(`/records/${resultId}`);
              }}
            >
              {`Open ${member?.isPrimary ? "your" : `${first}'s`} report`}
            </PillButton>
            <PillButton
              tone="light"
              icon={<MessageCircle size={17} color={ink[900]} />}
              onPress={() => {
                void switchMember(b.profileId);
                router.push({ pathname: "/ask", params: { record: resultId, q: "What did my last blood report say?", t: String(Date.now()) } });
              }}
            >
              Ask Cheeku about the result
            </PillButton>
            <PillButton tone="light" icon={<PenLine size={17} color={ink[900]} />} onPress={() => setRating(true)}>
              {`Rate ${partner.name}`}
            </PillButton>
          </View>
        ) : null}

        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 24, marginBottom: 10 }}>Tests</Text>
        <Glass strong className="gap-2 rounded-xl p-4">
          {testNames.map((n) => (
            <View key={n} className="flex-row items-center gap-2">
              <Check size={14} color={ink[900]} strokeWidth={2.6} />
              <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[900] }}>{n}</Text>
            </View>
          ))}
          <View style={{ height: 1, backgroundColor: "rgba(15,16,48,0.08)", marginVertical: 4 }} />
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
            {rupees(b.subtotal)} tests + {b.collectionFee ? rupees(b.collectionFee) : "free"} visit = <Text style={{ fontFamily: font.semibold, color: ink[900] }}>{rupees(b.total)}</Text>, paid after collection.
          </Text>
        </Glass>

        {!cancelled && canChange(status) ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <PillButton tone={problem?.action === "reschedule" ? "brand" : "light"} icon={<CalendarClock size={17} color={problem?.action === "reschedule" ? "#fff" : ink[900]} />} onPress={() => setMoveOpen(true)}>
              Change the time
            </PillButton>
            <Tap accessibilityRole="button" onPress={() => setCancelOpen(true)} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>{type === "CENTER_VISIT" ? "Cancel this visit" : "Cancel this collection"}</Text>
            </Tap>
          </View>
        ) : null}

        <Tap accessibilityRole="button" onPress={() => setProblemOpen(true)} style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, height: 44, marginTop: 4 }}>
          <LifeBuoy size={15} color={ink[700]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[700] }}>Report a problem</Text>
        </Tap>

        {!LIVE && !cancelled && b.status !== "ready" ? (
          <Tap accessibilityRole="button" disabled={stepping} onPress={() => void step()} style={{ flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "rgba(15,16,48,0.05)", marginTop: 8, opacity: stepping ? 0.5 : 1 }}>
            <FastForward size={14} color={ink[500]} />
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>Preview: skip to the next step</Text>
          </Tap>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <SampleNote />
        </View>
      </ScrollView>

      <CancelSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={type === "CENTER_VISIT" ? "Cancel this visit?" : "Cancel this collection?"}
        line={`Nobody will come on ${when}, and nothing is charged. You can book again any time.`}
        reasons={["The time doesn't work", "Booked by mistake", "The doctor changed the tests", "Got it done elsewhere", "Something else"]}
        onCancel={async (reason) => {
          try {
            await labstack().labs.cancel(b.id, reason);
            await refresh();
            return null;
          } catch (e) {
            return e instanceof PartnerError ? e.message : "That didn't go through. Try again.";
          }
        }}
      />
      <RescheduleSheet
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title="Pick a new time"
        times={async (date) => {
          const s2 = await labstack().labs.slots({ date, service: type, pincode: b.address.match(/\b\d{6}\b/)?.[0], tests: b.tests, fastingHours: fasting });
          return (s2.find((x) => x.labName === partner.name) ?? s2[0])?.times ?? [];
        }}
        onPick={async (date, time) => {
          try {
            await labstack().labs.reschedule(b.id, istIso(date, time));
            await refresh();
            return null;
          } catch (e) {
            return e instanceof PartnerError ? e.message : "That didn't go through. Try again.";
          }
        }}
      />
      <ProblemSheet
        open={problemOpen}
        onClose={() => setProblemOpen(false)}
        issues={["Collector didn't come", "Came late", "Report is late", "Wrong test", "Payment", "Something else"]}
        onSend={async (issue, details) => {
          try {
            await labstack().labs.escalate(b.id, issue, details);
            return null;
          } catch (e) {
            return e instanceof PartnerError ? e.message : "That didn't go through. Try again.";
          }
        }}
      />

      <ReviewSheet
        open={rating}
        title={`How was ${partner.name}?`}
        onClose={() => setRating(false)}
        onSubmit={(r, body) => {
          const me = family.data?.access.all.find((m) => m.isPrimary)?.name.split(" ")[0] ?? "Cheeku user";
          return postReview(qc, { kind: "lab", id: partner.id, rating: r, body, author: me });
        }}
      />
    </View>
  );
}
