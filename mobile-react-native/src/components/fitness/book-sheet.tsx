import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { CalendarDays, Clock, Gauge, Info, MapPin, ShieldCheck, Stethoscope } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { PillButton } from "@/components/ui/screen";
import { Sheet, useSheetMax } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { activityById, priceFor, rupees } from "@/lib/fitness/catalog";
import { allows, NEED_PHRASE, NEED_RULES, reasonFor } from "@/lib/fitness/match";
import { distanceKm, distanceLabel, type Place, type Session, type Studio } from "@/lib/fitness/provider";
import { bookFitness, FITNESS_BOOKINGS_KEY } from "@/lib/fitness/queries";
import { useFitnessFit } from "@/lib/fitness/use-fitness";
import { recordBooking, threadKey } from "@/lib/memory/store";
import { useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { ActivityArt, dayLabel, Meta, ReasonPill, timeLabel } from "./parts";

/*
 * BOOKING A CLASS, IN ONE SHEET.
 *
 * Who it's for (the person being viewed, changeable), what and when, why it
 * suits them, the one price, and a single button. Matching is redone for
 * whoever is picked, so booking Papa into Zumba says plainly that a gentler
 * class may suit him better, rather than quietly allowing it.
 *
 * Preview: the network is sample studios and no payment is taken. The price
 * shown is the same rule the server applies when it records the booking.
 */


export function BookSheet({
  open,
  onClose,
  session,
  studio,
  place,
}: {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  studio: Studio | null;
  place: Place | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const max = useSheetMax(0.9);
  const family = useFamily();
  const members = family.data?.access.selectable ?? [];
  const [who, setWho] = useState<string | undefined>(family.data?.profile?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setWho(family.data?.profile?.id);
      setError(null);
    }
  }, [open, family.data?.profile?.id]);

  const member = members.find((m) => m.id === who) ?? family.data?.profile ?? null;
  const first = member?.name.split(" ")[0] ?? "you";
  const { fit } = useFitnessFit(member?.id);

  if (!session || !studio) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const a = activityById(session.activity);
  const ok = allows(fit, session);
  const reason = ok ? reasonFor(fit, session.activity) : null;
  const strictest = fit.needs.find((n) => NEED_RULES[n].avoid?.includes(session.activity) || NEED_RULES[n].noImpact || NEED_RULES[n].cap);
  const lead = strictest ?? fit.needs[0];
  const phrase = lead ? NEED_PHRASE[lead] : "plan";
  const { price } = priceFor(session.basePrice);
  const km = place ? distanceKm(place, studio) : null;

  async function confirm() {
    if (!member || !session || !studio) return;
    setBusy(true);
    setError(null);
    const res = await bookFitness({ profileId: member.id, forName: first, session, studio, reason });
    setBusy(false);
    if (!res.ok) {
      feel.warn();
      setError(res.message);
      return;
    }
    const when = `${dayLabel(session.startsAt)} · ${timeLabel(session.startsAt)}`;
    void recordBooking(
      member.id,
      { kind: "fitness", title: session.title, when, where: studio.name, route: `/fitness/booking/${res.id}` },
      `Booked ${session.title.toLowerCase()} for ${first}: ${when} at ${studio.name}. Show code at the desk; it's on the booking. I'll remind ${member.isPrimary ? "you" : first} an hour before.`,
    ).then(() => qc.invalidateQueries({ queryKey: threadKey(member.id) }));
    void qc.invalidateQueries({ queryKey: FITNESS_BOOKINGS_KEY });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
    onClose();
    router.push({ pathname: "/fitness/booking/[id]", params: { id: res.id, fresh: "1" } });
  }

  return (
    <Sheet open={open} onClose={onClose} dismissible={!busy} label="Close booking">
      <ScrollView style={{ maxHeight: max, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 20, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <ActivityArt id={session.activity} size={56} radius={18} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>Book a class</Text>
            <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{session.title}</Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{studio.name}</Text>
          </View>
        </View>

        <View style={{ borderRadius: 24, backgroundColor: surface.tint, padding: 14, gap: 10 }}>
          <Meta icon={CalendarDays} text={`${dayLabel(session.startsAt)}, ${timeLabel(session.startsAt)}`} />
          <Meta icon={Clock} text={`${session.durationMin} minutes · ${session.level === "beginner" ? "beginner friendly" : session.level === "all" ? "all levels" : "some experience"}`} />
          <Meta icon={Gauge} text={`${session.intensity === "gentle" ? "Gentle" : session.intensity === "moderate" ? "Moderate" : "High"} pace${a?.impact ? ", some jumping" : ", low impact"}`} />
          {km !== null ? <Meta icon={MapPin} text={`${distanceLabel(km)} away`} /> : null}
        </View>

        {members.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>Who&apos;s going?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {members.map((m) => {
                const on = m.id === member?.id;
                return (
                  <Tap
                    key={m.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={m.name}
                    onPress={() => {
                      feel.tick();
                      setWho(m.id);
                    }}
                    style={{ height: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, borderRadius: 999, borderWidth: 1.5, borderColor: on ? brand[600] : surface.line, backgroundColor: on ? brand[50] : "#fff" }}
                    scale={0.96}
                  >
                    <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={34} />
                    <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? brand[700] : ink[700] }}>{m.isPrimary ? "Me" : m.name.split(" ")[0]}</Text>
                  </Tap>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {reason ? (
          <View style={{ gap: 6 }}>
            <ReasonPill text={reason} />
          </View>
        ) : null}
        {!ok && fit.needs.length ? (
          <View style={{ flexDirection: "row", gap: 10, borderRadius: 16, padding: 12, backgroundColor: hue.orange.wash }}>
            <Info size={16} color={hue.orange.fg} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              This one may be hard going with {phrase} in mind. A gentler class may suit {member?.isPrimary ? "you" : first} better.
            </Text>
          </View>
        ) : null}
        {fit.doctorNote ? (
          <View style={{ flexDirection: "row", gap: 10, borderRadius: 16, padding: 12, backgroundColor: lilac.mist }}>
            <Stethoscope size={16} color={brand[600]} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              New to exercise? Check with {member?.isPrimary ? "your" : `${first}'s`} doctor first, and tell the trainer before class.
            </Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingTop: 4, borderTopWidth: 1, borderTopColor: surface.line }}>
          <View>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 12 }}>One class</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>{rupees(price)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingBottom: 6 }}>
            <ShieldCheck size={14} color={semantic.safe} />
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>Free to cancel up to 1 hour before</Text>
          </View>
        </View>

        {error ? <Text style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: semantic.dangerText }}>{error}</Text> : null}

        <PillButton loading={busy} onPress={() => void confirm()}>{`Book for ${member?.isPrimary ? "me" : first}`}</PillButton>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center" }}>Preview · sample studio, no payment taken.</Text>
      </ScrollView>
    </Sheet>
  );
}
