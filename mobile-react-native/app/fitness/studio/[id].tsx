import { useLocalSearchParams } from "expo-router";
import { Navigation, Star } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookSheet } from "@/components/fitness/book-sheet";
import { ActivityArt, ActivityChip, artFor, openDirections, SessionRow } from "@/components/fitness/parts";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { StaggerItem } from "@/components/ui/motion";
import { Backdrop, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { CardListSkeleton, DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { activityById, type ActivityId } from "@/lib/fitness/catalog";
import { allows, reasonFor } from "@/lib/fitness/match";
import { distanceKm, distanceLabel, type Session } from "@/lib/fitness/provider";
import { useFitnessFit, useStudio, useStudioSessions } from "@/lib/fitness/use-fitness";
import { useWhere } from "@/lib/fitness/where";
import { useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * One studio: what it is, how far, and its classes over the next week.
 *
 * Classes that suit the person being viewed come first with the reason;
 * the rest are under "Also here", greyed a little, still bookable.
 */

const week = () => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86_400_000));

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const { id, activity: activityParam } = useLocalSearchParams<{ id: string; activity?: string }>();
  const { where } = useWhere();
  const studio = useStudio(id, where);
  const family = useFamily();
  const member = family.data?.profile;
  const first = member?.name.split(" ")[0] ?? "you";
  const { fit } = useFitnessFit(member?.id);
  const days = useMemo(week, []);
  const [dayIdx, setDayIdx] = useState(0);
  const [only, setOnly] = useState<ActivityId | null>(activityById(activityParam)?.id ?? null);
  const [picked, setPicked] = useState<Session | null>(null);
  const sessions = useStudioSessions(studio.data, days[dayIdx] as Date);

  if (studio.isPending) {
    return (
      <ScreenSkeleton title="Studio">
        <DetailSkeleton hero={180} />
      </ScreenSkeleton>
    );
  }
  const s = studio.data;
  if (!s) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Studio" fallback="/fitness" />
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center", marginTop: 40, paddingHorizontal: 32 }}>This studio isn&apos;t showing any more. Go back and pick another nearby.</Text>
      </View>
    );
  }

  const km = where ? distanceKm(where, s) : null;
  const list = (sessions.data ?? []).filter((x) => !only || x.activity === only);
  const suits = list.filter((x) => allows(fit, x));
  const rest = list.filter((x) => !allows(fit, x));
  const art = artFor(s.activities[0] as ActivityId);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title={s.name} fallback="/fitness" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40, gap: 18 }} showsVerticalScrollIndicator={false}>
        <StaggerItem index={0}>
          <View className="mt-2 overflow-hidden rounded-2xl p-5" style={glassShadow}>
            <Gradient from={art.bg} to="#ffffff" glow="#ffffff" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <ActivityArt id={s.activities[0] as ActivityId} size={64} radius={20} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: ink[900] }}>{s.name}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                  {s.rating ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Star size={13} color={hue.orange.fg} fill={hue.orange.fg} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{s.rating.toFixed(1)}</Text>
                      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>({s.reviews})</Text>
                    </View>
                  ) : null}
                  {km !== null ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{distanceLabel(km)} away</Text> : null}
                  {s.sample ? <Text style={{ fontFamily: font.semibold, fontSize: 10, letterSpacing: 0.6, color: ink[300] }}>SAMPLE</Text> : null}
                </View>
              </View>
            </View>
            {s.amenities.length ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 12 }}>{s.amenities.join(" · ")}{s.womenOnly ? " · Women only" : ""}</Text>
            ) : null}
            <Tap
              accessibilityRole="button"
              onPress={() => openDirections(s.lat, s.lng, s.name)}
              style={{ alignSelf: "flex-start", marginTop: 14, height: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 6 }}
              scale={0.96}
            >
              <Navigation size={14} color={brand[600]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>Directions</Text>
            </Tap>
          </View>
        </StaggerItem>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {days.map((d, i) => {
            const on = i === dayIdx;
            return (
              <Tap
                key={d.toDateString()}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={d.toDateString()}
                onPress={() => {
                  feel.tick();
                  setDayIdx(i);
                }}
                style={{ width: 56, height: 68, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: on ? brand[600] : "#fff", borderWidth: 1, borderColor: on ? brand[600] : surface.line }}
                scale={0.95}
              >
                <Text style={{ fontFamily: font.medium, fontSize: 11, color: on ? brand[100] : ink[500] }}>{i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, color: on ? "#fff" : ink[900] }}>{d.getDate()}</Text>
              </Tap>
            );
          })}
        </ScrollView>

        {s.activities.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            <ActivityChip id="all" label="All classes" on={!only} onPress={() => setOnly(null)} />
            {s.activities.map((a) => (
              <ActivityChip key={a} id={a} label={activityById(a)?.label ?? a} on={only === a} onPress={() => setOnly(only === a ? null : a)} />
            ))}
          </ScrollView>
        ) : null}

        <View style={{ gap: 10 }}>
          <SectionTitle>{fit.needs.length ? `Suits ${first}` : "Classes"}</SectionTitle>
          {sessions.isPending ? (
            <CardListSkeleton count={3} />
          ) : suits.length ? (
            suits.map((x, i) => (
              <StaggerItem key={x.id} index={i}>
                <SessionRow session={x} reason={reasonFor(fit, x.activity)} onPress={() => setPicked(x)} />
              </StaggerItem>
            ))
          ) : (
            <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{list.length ? `Nothing here this day that suits ${first}. Try another day.` : "No classes left this day. Try another day."}</Text>
          )}
        </View>

        {rest.length ? (
          <View style={{ gap: 10, opacity: 0.7 }}>
            <SectionTitle>Also here</SectionTitle>
            {rest.map((x) => (
              <SessionRow key={x.id} session={x} onPress={() => setPicked(x)} />
            ))}
          </View>
        ) : null}

        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center" }}>Preview · sample studio and times. Nothing is charged.</Text>
      </ScrollView>
      <BookSheet open={Boolean(picked)} onClose={() => setPicked(null)} session={picked} studio={s} place={where} />
    </View>
  );
}
