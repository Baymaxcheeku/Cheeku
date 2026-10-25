import { LocateFixed, MapPin, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Sheet, useSheetMax } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { CITIES, cityPlace, searchPlaces, type Place } from "@/lib/location/geo";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * PICK A PLACE: the current location, a search (an area, a pincode, a
 * landmark) through our geo function, or one of the big cities. Used by
 * every "Change" next to a place, and to set where a family member lives.
 */
export function PlaceSheet({
  open,
  onClose,
  onPick,
  onLocate,
  near,
  title = "Where should we look?",
  locateLabel = "Use my current location",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Place, how: "search" | "city") => void;
  /** Hidden when picking for someone else. */
  onLocate?: () => void;
  near: { lat: number; lng: number } | null;
  title?: string;
  locateLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const max = useSheetMax(0.85);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
      setNote(null);
    }
  }, [open]);

  useEffect(() => {
    const words = q.trim();
    if (words.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }
    const mine = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      void searchPlaces(words, near).then(({ places, error }) => {
        if (mine !== seq.current) return;
        setResults(places);
        setBusy(false);
        setNote(error === "daily_limit" ? "Search is resting for today. Pick a city below." : error === "offline" && !places.length ? "Search isn't reachable right now. Pick a city below." : null);
      });
    }, 350);
    return () => clearTimeout(t);
  }, [q, near]);

  const choose = (p: Place, how: "search" | "city") => {
    feel.tick();
    onPick(p, how);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Close place search">
      <View style={{ maxHeight: max, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, paddingTop: 28, paddingBottom: insets.bottom + 16 }}>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{title}</Text>
          <View style={{ height: 50, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16 }}>
            <Search size={18} color={ink[500]} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus={false}
              placeholder="Area, pincode or landmark"
              placeholderTextColor={ink[300]}
              accessibilityLabel="Search a place"
              returnKeyType="search"
              style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900], paddingVertical: 0 }}
            />
            {busy ? <ActivityIndicator size="small" color={brand[600]} /> : q ? (
              <Tap accessibilityRole="button" accessibilityLabel="Clear" onPress={() => setQ("")} style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
                <X size={16} color={ink[500]} />
              </Tap>
            ) : null}
          </View>
          {onLocate ? (
            <Tap
              accessibilityRole="button"
              onPress={() => {
                feel.tap();
                onClose();
                onLocate();
              }}
              style={{ height: 48, borderRadius: 999, backgroundColor: brand[50], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
              scale={0.98}
            >
              <LocateFixed size={16} color={brand[600]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>{locateLabel}</Text>
            </Tap>
          ) : null}
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, gap: 6 }}>
          {results.map((p) => (
            <Tap
              key={`${p.lat},${p.lng},${p.label}`}
              accessibilityRole="button"
              accessibilityLabel={p.formatted ?? p.label}
              onPress={() => choose(p, "search")}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#fff" }}
              scale={0.98}
            >
              <MapPin size={16} color={brand[600]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{p.label}</Text>
                {p.formatted ? <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{p.formatted}</Text> : null}
              </View>
            </Tap>
          ))}
          {note ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], paddingVertical: 4 }}>{note}</Text> : null}
          {q.trim().length >= 2 && !busy && !results.length && !note ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], paddingVertical: 4 }}>Nothing found. Try an area or a pincode.</Text> : null}

          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[500], marginTop: 10 }}>Cities</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CITIES.map((c) => (
              <Tap
                key={c.label}
                accessibilityRole="button"
                onPress={() => choose(cityPlace(c), "city")}
                style={{ height: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: surface.line, backgroundColor: "#fff", justifyContent: "center" }}
                scale={0.95}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{c.label}</Text>
              </Tap>
            ))}
          </View>
        </ScrollView>
      </View>
    </Sheet>
  );
}
