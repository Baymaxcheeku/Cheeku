import { LocateFixed, MapPin, ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton } from "@/components/ui/screen";
import { PulseRing } from "@/components/ui/motion";
import { Sheet } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { useNearbyPlace } from "@/lib/location/live";
import { readPermission, useLocationStore } from "@/lib/location/store";
import { kv } from "@/lib/storage";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { PlaceSheet } from "./place-sheet";

/*
 * ASKING FOR LOCATION, ONCE, ON OUR TERMS.
 *
 * Shown on Home a moment after the first open (sign-up lands here too), when
 * the phone has not decided yet and nothing is saved. It says what location
 * is for and that it is saved to the account, then "Use my location" hands
 * over to the system prompt. "Not now" waits a week. A city works instead.
 */

const KEY = "cheeku.locationPrimer";
const WAIT_MS = 7 * 86_400_000;

export function LocationPrimer() {
  const insets = useSafeAreaInsets();
  const near = useNearbyPlace();
  const hydrated = useLocationStore((s) => s.hydrated);
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState(false);

  useEffect(() => {
    if (!hydrated || !near.loaded || near.place) return;
    let live = true;
    const t = setTimeout(() => {
      void Promise.all([readPermission(), kv.get(KEY).catch(() => null)]).then(([perm, last]) => {
        if (!live || perm !== "undetermined") return;
        if (last && Date.now() - Number(last) < WAIT_MS) return;
        setOpen(true);
      });
    }, 1500);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [hydrated, near.loaded, near.place]);

  const later = () => {
    void kv.set(KEY, String(Date.now())).catch(() => undefined);
    setOpen(false);
  };

  return (
    <>
      <Sheet open={open} onClose={later} label="Not now">
        <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, paddingHorizontal: 20, paddingTop: 28, paddingBottom: insets.bottom + 16, alignItems: "center", gap: 14 }}>
          <View style={{ width: 96, height: 96, alignItems: "center", justifyContent: "center" }}>
            <PulseRing size={80} />
            <View style={{ width: 80, height: 80, borderRadius: 999, backgroundColor: lilac.base, alignItems: "center", justifyContent: "center" }}>
              <MapPin size={34} color={brand[600]} />
            </View>
          </View>
          <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], textAlign: "center" }}>Care near you</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700], textAlign: "center" }}>
            Share your location to see the closest doctors, labs, pharmacies and classes, and to fill in addresses for home visits.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 16, padding: 12, alignSelf: "stretch" }}>
            <ShieldCheck size={15} color={brand[600]} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              Only while the app is open. Saved to your account so bookings know where you are; turn it off or wipe it any time in Profile.
            </Text>
          </View>
          <PillButton
            style={{ alignSelf: "stretch" }}
            icon={<LocateFixed size={17} color="#fff" />}
            onPress={() => {
              void kv.set(KEY, String(Date.now())).catch(() => undefined);
              setOpen(false);
              void near.locate();
            }}
          >
            Use my location
          </PillButton>
          <View style={{ flexDirection: "row", gap: 24 }}>
            <Tap accessibilityRole="button" onPress={() => { later(); setCity(true); }} style={{ height: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[600] }}>Pick a city</Text>
            </Tap>
            <Tap accessibilityRole="button" onPress={later} style={{ height: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Not now</Text>
            </Tap>
          </View>
        </View>
      </Sheet>
      <PlaceSheet open={city} onClose={() => setCity(false)} near={null} onPick={(p, how) => void near.pick(p, how)} />
    </>
  );
}
