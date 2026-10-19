import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BellRing,
  CalendarCheck2,
  Check,
  ChevronRight,
  Dumbbell,
  FlaskConical,
  Hourglass,
  Stethoscope,
} from "lucide-react-native";
import type { AppIcon } from "@/components/ui/icons";
import { Pressable, Text, View } from "react-native";

import { SERVICE_ICON } from "@/components/services/parts";
import { glass, glassShadow } from "@/components/ui/glass";
import { SPECIALTIES, type SpecialtyId } from "@/lib/booking/catalog";
import { fromPrice } from "@/lib/labs/logic";
import { useCatalog } from "@/lib/labs/queries";
import type { BookingIntent } from "@/lib/memory/intent";
import type { BookedEvent } from "@/lib/memory/thread";
import { fetchWaitlist } from "@/lib/notifications/queries";
import { useJoinWaitlist } from "@/lib/notifications/waitlist";
import { serviceById } from "@/lib/services/catalog";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * BOOKING, INSIDE THE CONVERSATION.
 *
 * When someone asks Cheeku to book something, the answer carries this card:
 * what it would book, for whom, why now (from their own memory), what to do
 * before, and the three steps to a confirmed slot. One tap starts the same
 * flow the marketplace uses, already filled in, and the booking comes back
 * into this person's thread as a "Booked" card when it's done.
 *
 * Services that aren't open yet say so and offer the waitlist, rather than a
 * dead end.
 */

type Booking = BookingIntent & { forName: string };

const WAITLIST_ID: Record<string, string> = { fitness: "fitness" };

export function BookingCard({ booking, onStart }: { booking: Booking; onStart?: (b: Booking) => void }) {
  if (booking.service === "lab") return <LabCard booking={booking} onStart={onStart} />;
  if (booking.service === "doctor") return <DoctorCard booking={booking} onStart={onStart} />;
  if (booking.service === "medicine" || booking.service === "care") return <ServiceLinkCard booking={booking} onStart={onStart} />;
  return <SoonCard booking={booking} />;
}

/** Medicines and specialised care: straight to that service, with what's inside it. */
function ServiceLinkCard({ booking, onStart }: { booking: Booking; onStart?: (b: Booking) => void }) {
  const svc = serviceById(booking.service === "medicine" ? "medicines" : booking.careId);
  if (!svc) return null;
  const Icon = SERVICE_ICON[svc.icon] ?? Stethoscope;
  const offerings = svc.offerings.filter((o) => !o.call).slice(0, 3);
  return (
    <Shell icon={Icon} eyebrow="Book a service" title={svc.title} sub={`For ${booking.forName} · ${svc.line.toLowerCase()}`}>
      {svc.urgent?.length ? (
        <Text style={{ fontFamily: font.semibold, fontSize: 13, lineHeight: 18, color: "#c00a1c" }}>{svc.urgent[0]?.title} {svc.urgent[0]?.label}.</Text>
      ) : null}
      <View style={{ gap: 6 }}>
        {offerings.map((o) => (
          <View key={o.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: brand[400] }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, color: ink[700] }}>{o.title}</Text>
          </View>
        ))}
      </View>
      <Steps items={svc.steps.length ? svc.steps : ["Pick what you need", "When and where", `Filed in ${booking.forName}'s memory`]} />
      <Cta label={`Open ${svc.title.toLowerCase()}`} onPress={onStart ? () => onStart(booking) : undefined} />
    </Shell>
  );
}

function Shell({ icon: Icon, eyebrow, title, sub, children }: { icon: AppIcon; eyebrow: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: brand[50] }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon size={20} color={brand[600]} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>{eyebrow}</Text>
          <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900], marginTop: 1 }}>{title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>{sub}</Text>
        </View>
      </View>
      <View style={{ padding: 14, gap: 12 }}>{children}</View>
    </View>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {items.map((s, i) => (
        <View key={s} style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 10, color: "#fff" }}>{i + 1}</Text>
            </View>
            {i < items.length - 1 ? <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: brand[100] }} /> : null}
          </View>
          <Text style={{ fontFamily: font.medium, fontSize: 11.5, lineHeight: 15, color: ink[700] }}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

function Cta({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => ({ height: 48, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: brand[600], opacity: disabled || !onPress ? 0.45 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>{label}</Text>
      <ArrowRight size={16} color="#fff" />
    </Pressable>
  );
}

function LabCard({ booking, onStart }: { booking: Booking; onStart?: (b: Booking) => void }) {
  const catalog = useCatalog();
  const tests = booking.tests;
  const known = tests.map((t) => ({ pick: t, test: catalog.data?.tests.find((x) => x.id === t.id) ?? null }));
  const fasting = Math.max(0, ...known.map((k) => k.test?.fastingHours ?? 0));
  const samples = [...new Set(known.map((k) => k.test?.sample).filter((x): x is string => Boolean(x)))];
  const title = tests.length ? `${booking.again ? "Book again: " : ""}${tests.map((t) => t.label).join(" + ")}` : "Pick a test to book";

  return (
    <Shell icon={FlaskConical} eyebrow={booking.again ? "Repeat test" : "Lab test at home"} title={title} sub={`For ${booking.forName} · home collection`}>
      {tests.length ? (
        <View style={{ gap: 8 }}>
          {known.map(({ pick, test }) => {
            const price = catalog.data ? fromPrice(catalog.data.offers, pick.id) : null;
            return (
              <View key={pick.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: brand[50], alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <Check size={11} color={brand[600]} strokeWidth={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{test?.name ?? pick.label}</Text>
                  {pick.because ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[500], marginTop: 1 }}>{pick.because}</Text> : null}
                </View>
                {price !== null ? <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: ink[700] }}>from ₹{price}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>
          Pick from the catalogue, or tell me the test name and I&apos;ll fill this in.
        </Text>
      )}

      {tests.length ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 14, backgroundColor: surface.tint }}>
          <Hourglass size={14} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[700] }}>
            {fasting >= 8 ? `Fast ${fasting} hours before: water is fine. Morning slots only.` : "No fasting needed."}
            {samples.length ? ` ${samples.join(" and ")} sample.` : ""}
          </Text>
        </View>
      ) : null}

      <Steps items={["Pick a lab", "Pick a home slot", `Result filed in ${booking.forName}'s memory`]} />
      <Cta label={tests.length ? "Choose a lab" : "Browse tests"} onPress={onStart ? () => onStart(booking) : undefined} />
    </Shell>
  );
}

function DoctorCard({ booking, onStart }: { booking: Booking; onStart?: (b: Booking) => void }) {
  const sp = booking.specialty && booking.specialty in SPECIALTIES ? SPECIALTIES[booking.specialty as SpecialtyId] : null;
  const how = booking.mode === "online" ? "video call" : booking.mode === "clinic" ? "at a clinic nearby" : "online or at a clinic";
  return (
    <Shell icon={Stethoscope} eyebrow="Pre-consultation" title={sp ? `See a ${sp.label.toLowerCase()}` : "See a doctor"} sub={`For ${booking.forName} · ${how}`}>
      <Text style={{ fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: ink[700] }}>
        A few quick questions, then a note the doctor reads before you meet, with {booking.forName}&apos;s readings and medicines attached.
      </Text>
      <Steps items={["A few questions", "Note for the doctor", "Pick a doctor and slot"]} />
      <Cta label="Start pre-consultation" onPress={onStart ? () => onStart(booking) : undefined} />
    </Shell>
  );
}

function SoonCard({ booking }: { booking: Booking }) {
  const id = WAITLIST_ID[booking.service] ?? booking.service;
  const list = useQuery({ queryKey: ["waitlist"], queryFn: fetchWaitlist });
  const on = Boolean(list.data?.includes(id));
  const label = "Fitness classes";

  const joinWaitlist = useJoinWaitlist();
  function join() {
    void joinWaitlist(id);
  }

  return (
    <Shell icon={Dumbbell} eyebrow="Coming soon" title={label} sub={`For ${booking.forName}`}>
      <Pressable
        accessibilityRole="button"
        disabled={on}
        onPress={join}
        style={({ pressed }) => ({ height: 46, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? brand[50] : ink[900], transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        {on ? <Check size={16} color={brand[700]} /> : <BellRing size={16} color="#fff" />}
        <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: on ? brand[700] : "#fff" }}>{on ? "You're on the list" : "Tell me when it's live"}</Text>
      </Pressable>
    </Shell>
  );
}

/** A booking made somewhere in the app, filed in this person's thread. */
export function BookedCard({ event, onOpen }: { event: BookedEvent; onOpen?: (route: string) => void }) {
  const Icon = event.kind === "lab" ? FlaskConical : event.kind === "service" ? CalendarCheck2 : Stethoscope;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!onOpen}
      onPress={() => onOpen?.(event.route)}
      style={({ pressed }) => [glassShadow, { borderRadius: 22, backgroundColor: pressed ? brand[50] : "#fff", borderWidth: 1, borderColor: glass.rim, padding: 14, gap: 10 }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <CalendarCheck2 size={12} color={brand[600]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>Booked</Text>
          </View>
          <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 1 }}>{event.title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], marginTop: 1 }}>{event.when} · {event.where}</Text>
        </View>
        {onOpen ? <ChevronRight size={18} color={ink[300]} /> : null}
      </View>
      {event.note?.length ? (
        <View style={{ borderRadius: 14, backgroundColor: surface.tint, padding: 10, gap: 4 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>Note sent to the doctor</Text>
          {event.note.map((l) => (
            <Text key={l} style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: ink[700] }}>{l}</Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}
