import {
  Activity,
  Bike,
  Check,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Flower2,
  Leaf,
  LocateFixed,
  MapPin,
  Music,
  PersonStanding,
  Sparkles,
  Star,
  Target,
  Wind,
  Zap,
} from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Linking, Platform, Text, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";

import type { AppIcon } from "@/components/ui/icons";
import { glass, glassShadow } from "@/components/ui/glass";
import { PulseRing, useReducedMotion } from "@/components/ui/motion";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { activityById, priceFor, rupees, type ActivityId } from "@/lib/fitness/catalog";
import { distanceLabel, type Session, type Studio } from "@/lib/fitness/provider";
import { brand, hue, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The fitness pieces every screen shares: an activity's art, chips, a class
 * row, a studio card, the location explainer and the success tick.
 *
 * Colour is per activity, drawn from the category hues (never semantic
 * green/red, which mean health), so a list scans by kind before it is read.
 */

type Art = { icon: AppIcon; fg: string; bg: string };

export const ACTIVITY_ART: Record<ActivityId, Art> = {
  gym: { icon: Dumbbell, fg: hue.indigo.fg, bg: lilac.violet },
  yoga: { icon: Flower2, fg: hue.teal.fg, bg: hue.teal.bg },
  zumba: { icon: Music, fg: hue.orange.fg, bg: hue.orange.bg },
  swimming: { icon: Droplets, fg: hue.blue.fg, bg: hue.blue.bg },
  dance: { icon: Sparkles, fg: hue.plum.fg, bg: hue.plum.bg },
  pilates: { icon: PersonStanding, fg: hue.rose.fg, bg: hue.rose.bg },
  functional: { icon: Flame, fg: hue.orange.fg, bg: hue.orange.wash },
  hiit: { icon: Zap, fg: hue.indigo.fg, bg: brand[100] },
  aerobics: { icon: Activity, fg: hue.ocean.fg, bg: hue.ocean.bg },
  kickboxing: { icon: Target, fg: hue.slate.fg, bg: hue.slate.bg },
  prenatal_yoga: { icon: Leaf, fg: hue.plum.fg, bg: hue.plum.bg },
  meditation: { icon: Wind, fg: hue.teal.fg, bg: hue.teal.bg },
  aqua: { icon: Droplets, fg: hue.ocean.fg, bg: hue.ocean.bg },
};

export const artFor = (id: ActivityId): Art => ACTIVITY_ART[id] ?? { icon: Bike, fg: brand[600], bg: brand[50] };

export function ActivityArt({ id, size = 48, radius = 16 }: { id: ActivityId; size?: number; radius?: number }) {
  const a = artFor(id);
  const Icon = a.icon;
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: a.bg, alignItems: "center", justifyContent: "center" }}>
      <Icon size={Math.round(size * 0.44)} color={a.fg} />
    </View>
  );
}

/** A filter chip. The fill springs in so a pick feels like it landed. */
export function ActivityChip({ id, label, on, onPress }: { id: ActivityId | "all"; label: string; on: boolean; onPress: () => void }) {
  const still = useReducedMotion();
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.set(still ? (on ? 1 : 0) : withSpring(on ? 1 : 0, { damping: 18, stiffness: 320 }));
  }, [on, still, p]);
  const fill = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ scale: interpolate(p.get(), [0, 1], [0.85, 1]) }] }));
  const art = id === "all" ? null : artFor(id);
  const Icon = art?.icon;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={label}
      onPress={() => {
        feel.tick();
        onPress();
      }}
      style={{ height: 40, borderRadius: 999, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: on ? brand[600] : surface.line, overflow: "hidden" }}
      scale={0.95}
    >
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderRadius: 999, backgroundColor: brand[600] }, fill]} />
      {Icon ? <Icon size={15} color={on ? "#fff" : art.fg} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[700] }}>{label}</Text>
    </Tap>
  );
}

export function timeLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).replace(/\s?(am|pm)/i, (m) => m.toLowerCase());
}

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (day(d) === day(now)) return "Today";
  if (day(d) === day(new Date(now.getTime() + 86_400_000))) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

/** A small pill saying why this suits them. */
export function ReasonPill({ text }: { text: string }) {
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 999, backgroundColor: lilac.base }}>
      <Sparkles size={11} color={brand[600]} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>{text}</Text>
    </View>
  );
}

/** One bookable class: when, what, where, why, and the price. */
export function SessionRow({ session, studio, km, reason, showDay, onPress }: { session: Session; studio?: Studio; km?: number; reason?: string | null; showDay?: boolean; onPress: () => void }) {
  const a = activityById(session.activity);
  const price = priceFor(session.basePrice).price;
  const low = session.seatsLeft <= 3;
  const art = artFor(session.activity);
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${session.title}, ${dayLabel(session.startsAt)} ${timeLabel(session.startsAt)}${studio ? `, ${studio.name}` : ""}, ${rupees(price)}`}
      onPress={onPress}
      style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 12, flexDirection: "row", alignItems: "center", gap: 12 }]}
      scale={0.98}
    >
      <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: art.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], letterSpacing: -0.3 }}>{timeLabel(session.startsAt).replace(/ (am|pm)/, "")}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 10, color: art.fg }}>{showDay ? dayLabel(session.startsAt) : timeLabel(session.startsAt).slice(-2)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 15, lineHeight: 19, color: ink[900] }}>{session.title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
          {studio ? `${studio.name}${km !== undefined ? ` · ${distanceLabel(km)}` : ""}` : `${session.durationMin} min · ${a?.intensity ?? ""} pace`}
        </Text>
        {reason ? <ReasonPill text={reason} /> : null}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{rupees(price)}</Text>
        <Text style={{ fontFamily: font.medium, fontSize: 11, color: low ? hue.orange.fg : ink[300] }}>{low ? `${session.seatsLeft} left` : studio ? `${session.durationMin} min` : ""}</Text>
      </View>
    </Tap>
  );
}

/** A studio in the list: art, name, distance, rating, what it offers. */
export function StudioCard({ studio, km, reason, onPress }: { studio: Studio; km: number; reason: string | null; onPress: () => void }) {
  const main = studio.activities[0] as ActivityId;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${studio.name}, ${distanceLabel(km)} away`}
      onPress={onPress}
      style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 14, gap: 10 }]}
      scale={0.98}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <ActivityArt id={main} size={52} radius={16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], letterSpacing: -0.2 }}>{studio.name}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <MapPin size={12} color={ink[500]} />
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{distanceLabel(km)}</Text>
            </View>
            {studio.rating ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Star size={12} color={hue.orange.fg} fill={hue.orange.fg} />
                <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{studio.rating.toFixed(1)} ({studio.reviews})</Text>
              </View>
            ) : null}
            {studio.sample ? <Text style={{ fontFamily: font.semibold, fontSize: 10, color: ink[300], letterSpacing: 0.6 }}>SAMPLE</Text> : null}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {studio.activities.map((id) => (
          <View key={id} style={{ height: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: artFor(id).bg, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: artFor(id).fg }}>{activityById(id)?.label}</Text>
          </View>
        ))}
        {studio.womenOnly ? (
          <View style={{ height: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: hue.rose.bg, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: hue.rose.fg }}>Women only</Text>
          </View>
        ) : null}
      </View>
      {reason ? <ReasonPill text={reason} /> : null}
    </Tap>
  );
}

/** Asking for location on our own terms first, with a calm pulse while it works. */
export function LocateCard({ locating, denied, onLocate, onPickCity }: { locating: boolean; denied: boolean; onLocate: () => void; onPickCity: () => void }) {
  return (
    <View style={[glassShadow, { borderRadius: 32, backgroundColor: "#fff", borderWidth: 1, borderColor: glass.rim, padding: 20, alignItems: "center", gap: 14 }]}>
      <View style={{ width: 84, height: 84, alignItems: "center", justifyContent: "center" }}>
        {locating ? <PulseRing size={72} /> : null}
        <View style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: lilac.base, alignItems: "center", justifyContent: "center" }}>
          <LocateFixed size={30} color={brand[600]} />
        </View>
      </View>
      <View style={{ gap: 6, alignItems: "center" }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900], textAlign: "center" }}>Find classes near you</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], textAlign: "center" }}>
          {denied
            ? "Location is off for Cheeku. Pick your city instead, or turn it on in Settings."
            : "Your location stays on this phone. It is used only to show studios close by, never saved on our servers."}
        </Text>
      </View>
      {!denied ? (
        <Tap
          accessibilityRole="button"
          disabled={locating}
          onPress={() => {
            feel.tap();
            onLocate();
          }}
          style={{ alignSelf: "stretch", height: 52, borderRadius: 999, backgroundColor: brand[600], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
          scale={0.98}
        >
          {locating ? <ActivityIndicator color="#fff" /> : <LocateFixed size={17} color="#fff" />}
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>{locating ? "Finding you" : "Use my location"}</Text>
        </Tap>
      ) : null}
      <Tap accessibilityRole="button" onPress={onPickCity} style={{ alignSelf: "stretch", height: 48, borderRadius: 999, borderWidth: 1, borderColor: surface.line, alignItems: "center", justifyContent: "center" }} scale={0.98}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Pick a city</Text>
      </Tap>
    </View>
  );
}

/** The booking's "it worked" moment: a check that springs in, a ring that settles. */
export function SuccessTick({ size = 88 }: { size?: number }) {
  const still = useReducedMotion();
  const p = useSharedValue(still ? 1 : 0);
  const ring = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    feel.success();
    if (still) return;
    p.set(withSpring(1, { damping: 11, stiffness: 260 }));
    ring.set(withTiming(1, { duration: 700 }));
  }, [still, p, ring]);
  const tick = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(p.get(), [0, 1], [0.4, 1]) }], opacity: p.get() }));
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(ring.get(), [0, 1], [0.7, 1.35]) }], opacity: interpolate(ring.get(), [0, 0.3, 1], [0, 0.45, 0]) }));
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: brand[300] }, halo]} />
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }, tick]}>
        <Check size={size * 0.45} color="#fff" strokeWidth={3} />
      </Animated.View>
    </View>
  );
}

/** A quiet line of meta: an icon and a few words. */
export function Meta({ icon: Icon, text }: { icon: AppIcon; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Icon size={14} color={ink[500]} />
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{text}</Text>
    </View>
  );
}

/** Opens the phone's maps app at a place; the web opens Google Maps. */
export function openDirections(lat: number, lng: number, name: string) {
  const label = encodeURIComponent(name);
  const url = Platform.OS === "ios" ? `maps:?q=${label}&ll=${lat},${lng}` : Platform.OS === "android" ? `geo:${lat},${lng}?q=${lat},${lng}(${label})` : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`));
}

export { Clock, MapPin };
