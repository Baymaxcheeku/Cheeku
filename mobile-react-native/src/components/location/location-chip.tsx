import { LocateFixed, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { useReducedMotion } from "@/components/ui/motion";
import { Tap } from "@/components/ui/tap";
import { useNearbyPlace } from "@/lib/location/live";
import { freshness } from "@/lib/location/rules";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

import { PlaceSheet } from "./place-sheet";

/*
 * "Indiranagar, Bengaluru · Change": the place a screen is looking near, for
 * the member being viewed. A live GPS place gets a small pulsing dot; a
 * picked place does not. Tapping opens the place sheet.
 */
export function LocationChip({ profileId, prefix = "Near", onDark = false }: { profileId?: string | null; prefix?: string; onDark?: boolean }) {
  const near = useNearbyPlace(profileId);
  const [open, setOpen] = useState(false);
  const live = near.source === "gps" && !near.isTheirs;
  const who = near.forMember && !near.forMember.isPrimary ? near.forMember.name.split(" ")[0] : null;

  return (
    <>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={near.place ? `${prefix} ${near.place.label}. Change` : "Set your location"}
        onPress={() => setOpen(true)}
        style={{ alignSelf: "flex-start", maxWidth: "100%", height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: onDark ? "rgba(255,255,255,0.18)" : "#fff", flexDirection: "row", alignItems: "center", gap: 6 }}
        scale={0.96}
      >
        {near.locating ? <ActivityIndicator size="small" color={ink[900]} /> : live ? <LiveDot /> : <MapPin size={14} color={ink[900]} />}
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: onDark ? "#fff" : ink[900] }}>
          {near.place ? `${who && near.isTheirs ? `${who}: ` : ""}${near.place.label}` : near.locating ? "Finding you" : "Set location"}
        </Text>
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: onDark ? "#fff" : brand[600] }}>{near.place ? "Change" : ""}</Text>
      </Tap>
      <PlaceSheet
        open={open}
        onClose={() => setOpen(false)}
        near={near.place}
        title={who ? `Where does ${who} live?` : "Where should we look?"}
        onLocate={who ? undefined : () => void near.locate()}
        onPick={(p, how) => void near.pick(p, how)}
      />
    </>
  );
}

/** A small live dot: steady under Reduce Motion. */
export function LiveDot({ size = 10 }: { size?: number }) {
  const still = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    s.set(withRepeat(withSequence(withTiming(1.9, { duration: 900 }), withTiming(1, { duration: 0 })), -1));
  }, [still, s]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }], opacity: still ? 0 : 2 - s.get() - 0.3 }));
  return (
    <View style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: brand[300] }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: brand[600], borderWidth: 2, borderColor: "#fff" }} />
    </View>
  );
}

/** "Updated 3 min ago · GPS" for a settings row. */
export function freshLine(updatedAt: number | string | null, source: string | null): string {
  const when = freshness(updatedAt);
  const how = source === "gps" ? "from this phone" : source === "city" ? "city picked" : source === "search" ? "place picked" : "";
  return [when, how].filter(Boolean).join(" · ");
}

export { LocateFixed };
