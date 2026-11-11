import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight, Search, Stethoscope, Ticket, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookSheet } from "@/components/fitness/book-sheet";
import { LocationChip } from "@/components/location/location-chip";
import { PlaceSheet } from "@/components/location/place-sheet";
import { ActivityArt, ActivityChip, dayLabel, LocateCard, SessionRow, StudioCard, timeLabel } from "@/components/fitness/parts";
import { GlassCircle, Gradient, glassShadow } from "@/components/ui/glass";
import { StaggerItem } from "@/components/ui/motion";
import { Backdrop, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { activityById, activityIn, type ActivityId } from "@/lib/fitness/catalog";
import { NEED_PHRASE, rankStudios, type Match } from "@/lib/fitness/match";
import { useFitnessBookings, upcoming } from "@/lib/fitness/queries";
import { useFitnessFit, useMatches, useStudiosNear } from "@/lib/fitness/use-fitness";
import { useNearbyPlace } from "@/lib/location/live";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * FITNESS: FIND, MATCH, BOOK (loop-fitness).
 *
 *   header       back · your classes
 *   where        no place yet: our own explainer, then the system prompt,
 *                or pick a city. With one: a chip to change it.
 *   headline     "Classes for Athar", and what they're matched to
 *   search       an activity ("swim") or a studio name
 *   chips        "For you" first, then the activities that suit, best first
 *   doctor note  pregnancy, a heart condition, or 60 and over
 *   next class   the soonest booked one, if any
 *   picked       the best classes today and tomorrow for this person
 *   studios      nearby, ranked by fit then distance
 *
 * Matching runs on the phone from the person's own profile (match.ts); the
 * network only ever sees a place.
 */
export default function Fitness() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ activity?: string }>();
  const family = useFamily();
  const member = family.data?.profile;
  const first = member?.name.split(" ")[0] ?? "you";
  const { fit } = useFitnessFit(member?.id);
  const near = useNearbyPlace(member?.id);
  const where = near.place;
  const loaded = near.loaded;
  const studios = useStudiosNear(where);
  const bookings = useFitnessBookings();

  const [activity, setActivity] = useState<ActivityId | null>(activityById(params.activity)?.id ?? null);
  const [query, setQuery] = useState("");
  const [cityOpen, setCityOpen] = useState(false);
  const [picked, setPicked] = useState<Match | null>(null);

  const searched = query.trim() ? activityIn(query) : null;
  const active = searched ?? activity;
  const { matches, loading } = useMatches({ fit, place: where, studios: studios.data, activity: active, limit: 6 });

  const ranked = useMemo(() => {
    if (!where || !studios.data) return [];
    const all = rankStudios(fit, where, studios.data, active);
    const q = query.trim().toLowerCase();
    return q && !searched ? all.filter((r) => r.studio.name.toLowerCase().includes(q)) : all;
  }, [fit, where, studios.data, active, query, searched]);

  const next = upcoming((bookings.data ?? []).filter((b) => b.profileId === member?.id))[0];
  const lead = fit.needs[0];
  const chips = fit.ranked.slice(0, 8);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title="Fitness"
        fallback="/home"
        right={
          <GlassCircle label="Your classes" onPress={() => router.push("/fitness/bookings")}>
            <Ticket size={19} color={ink[900]} />
          </GlassCircle>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StaggerItem index={0}>
          <View className="mt-2 overflow-hidden rounded-2xl p-5" style={glassShadow}>
            <Gradient from={lilac.base} to={lilac.deep} glow="#ffffff" />
            <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>Gyms and studios, one class at a time</Text>
            <Text style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900], marginTop: 6 }}>Classes for {first}</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], marginTop: 4 }}>
              {lead ? `Picked from ${first === "you" ? "your" : `${first}'s`} health profile, with ${NEED_PHRASE[lead]} first. One class at a time, no membership.` : "Yoga, gym, swimming, dance and more. One class at a time, no membership."}
            </Text>
            {where ? (
              <View style={{ marginTop: 14 }}>
                <LocationChip profileId={member?.id} />
              </View>
            ) : null}
          </View>
        </StaggerItem>

        {loaded && !where ? (
          <StaggerItem index={1}>
            <LocateCard locating={near.locating} denied={near.permission === "denied"} onLocate={() => void near.locate()} onPickCity={() => setCityOpen(true)} />
          </StaggerItem>
        ) : null}

        {where ? (
          <>
            <StaggerItem index={1}>
              <View style={[glassShadow, { height: 50, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }]}>
                <Search size={18} color={ink[500]} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Yoga, swimming, a studio name"
                  placeholderTextColor={ink[300]}
                  accessibilityLabel="Search classes and studios"
                  returnKeyType="search"
                  style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }}
                />
                {query ? (
                  <Tap accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery("")} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                    <X size={16} color={ink[500]} />
                  </Tap>
                ) : null}
              </View>
            </StaggerItem>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              <ActivityChip id="all" label="For you" on={!active} onPress={() => {
                setActivity(null);
                setQuery("");
              }} />
              {chips.map((id) => (
                <ActivityChip key={id} id={id} label={activityById(id)?.label ?? id} on={active === id} onPress={() => {
                  setQuery("");
                  setActivity(active === id ? null : id);
                }} />
              ))}
            </ScrollView>

            {fit.doctorNote ? (
              <View style={{ flexDirection: "row", gap: 10, borderRadius: 16, padding: 14, backgroundColor: lilac.mist }}>
                <Stethoscope size={16} color={ink[900]} style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
                  {fit.needs[0] === "prenatal" ? "Only prenatal classes are shown. " : "Gentler classes are shown first. "}
                  Check with {first === "you" ? "your" : `${first}'s`} doctor before starting, and tell the trainer.
                </Text>
              </View>
            ) : null}

            {next ? (
              <Tap
                accessibilityRole="button"
                accessibilityLabel={`Next class: ${next.title}, ${dayLabel(next.startsAt)} ${timeLabel(next.startsAt)}`}
                onPress={() => router.push({ pathname: "/fitness/booking/[id]", params: { id: next.id } })}
                style={[glassShadow, { borderRadius: 24, backgroundColor: ink[900], padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }]}
                scale={0.98}
              >
                <ActivityArt id={next.activity} size={44} radius={14} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: brand[200] }}>Next class</Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>{next.title}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: brand[100] }}>{dayLabel(next.startsAt)}, {timeLabel(next.startsAt)} · {next.studioName}</Text>
                </View>
                <ChevronRight size={18} color="#fff" />
              </Tap>
            ) : null}

            <View style={{ gap: 10 }}>
              <SectionTitle>{active ? `${activityById(active)?.label} near you` : `Picked for ${first}`}</SectionTitle>
              {loading || studios.isPending ? (
                <CardListSkeleton count={3} />
              ) : matches.length ? (
                matches.map((m, i) => (
                  <StaggerItem key={m.session.id} index={i}>
                    <SessionRow
                      session={m.session}
                      studio={m.studio}
                      km={m.km}
                      reason={m.reason}
                      showDay
                      onPress={() => {
                        feel.tap();
                        setPicked(m);
                      }}
                    />
                  </StaggerItem>
                ))
              ) : (
                <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
                  {active ? `No ${activityById(active)?.label.toLowerCase()} classes that suit ${first} in the next two days. Try another kind.` : "Nothing open nearby in the next two days. Try another city."}
                </Text>
              )}
            </View>

            <View style={{ gap: 10 }}>
              <SectionTitle>Studios near you</SectionTitle>
              {studios.isPending ? (
                <CardListSkeleton count={3} />
              ) : (
                ranked.slice(0, 12).map((r, i) => (
                  <StaggerItem key={r.studio.id} index={i}>
                    <StudioCard studio={r.studio} km={r.km} reason={i < 2 ? r.reason : null} onPress={() => router.push({ pathname: "/fitness/studio/[id]", params: { id: r.studio.id, ...(active ? { activity: active } : {}) } })} />
                  </StaggerItem>
                ))
              )}
            </View>

            <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], textAlign: "center" }}>
              Preview · sample studios, times and prices. Real studios in 200+ cities appear once the partner network is connected. Nothing is charged.
            </Text>
          </>
        ) : null}
      </ScrollView>

      <PlaceSheet open={cityOpen} onClose={() => setCityOpen(false)} near={where} onLocate={() => void near.locate()} onPick={(p, how) => void near.pick(p, how)} />

      <BookSheet open={Boolean(picked)} onClose={() => setPicked(null)} session={picked?.session ?? null} studio={picked?.studio ?? null} place={where} />
    </View>
  );
}
