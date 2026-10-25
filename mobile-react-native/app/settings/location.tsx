import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LocateFixed, MapPin, ShieldCheck, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Text, View } from "react-native";

import { freshLine, LiveDot } from "@/components/location/location-chip";
import { PlaceSheet } from "@/components/location/place-sheet";
import { Panel, Section, SettingsScreen } from "@/components/settings/chrome";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SpringSwitch } from "@/components/ui/motion";
import { PillButton } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import type { Place } from "@/lib/location/geo";
import { useNearbyPlace } from "@/lib/location/live";
import { placeLine } from "@/lib/location/rules";
import { forgetLocations, MEMBER_LOCATIONS_KEY, saveMemberLocation, setLive, useLocationStore, useMemberLocations } from "@/lib/location/store";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * LOCATION, IN PROFILE.
 *
 * Where this phone is (live while the app is open), where each family member
 * lives, the switch that keeps it fresh, and a way to wipe it. Every booking
 * screen reads the same place, so changing it here changes it everywhere.
 */
export default function LocationSettings() {
  const qc = useQueryClient();
  const family = useFamily();
  const rows = useMemberLocations();
  const near = useNearbyPlace(family.data?.access.all.find((m) => m.isPrimary)?.id);
  const live = useLocationStore((s) => s.live);
  const fix = useLocationStore((s) => s.fix);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [wipe, setWipe] = useState(false);

  const members = family.data?.access.all ?? [];
  const others = members.filter((m) => !m.isPrimary);
  const place = near.place;
  const denied = near.permission === "denied";
  const forName = members.find((m) => m.id === pickFor)?.name.split(" ")[0];

  async function setFor(profileId: string, p: Place, how: "search" | "city") {
    await saveMemberLocation(profileId, p, how, null);
    await qc.invalidateQueries({ queryKey: MEMBER_LOCATIONS_KEY });
  }

  return (
    <SettingsScreen title="Location" eyebrow="Care near you, and addresses filled in" icon={MapPin}>
      <Section>
        <Panel>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: lilac.base, alignItems: "center", justifyContent: "center" }}>
              {near.source === "gps" ? <LiveDot size={14} /> : <MapPin size={24} color={brand[600]} />}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: "uppercase", color: brand[600] }}>
                {near.source === "gps" ? "You are here" : place ? "Your place" : "Not set yet"}
              </Text>
              <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{place ? placeLine(place) : "Share your location"}</Text>
              {place?.formatted ? <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{place.formatted}</Text> : null}
              {place ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[300], marginTop: 4 }}>{freshLine(near.updatedAt, near.source)}{fix?.accuracy ? ` · within ${Math.round(fix.accuracy)} m` : ""}</Text> : null}
            </View>
          </View>
          <View style={{ gap: 8, marginTop: 16 }}>
            <PillButton
              style={{ height: 48 }}
              loading={near.locating}
              icon={<LocateFixed size={16} color="#fff" />}
              onPress={() => {
                feel.tap();
                void near.locate();
              }}
            >
              {place ? "Update now" : "Use my location"}
            </PillButton>
            <PillButton tone="light" style={{ height: 48 }} onPress={() => setPickFor(members.find((m) => m.isPrimary)?.id ?? null)}>
              Pick a place instead
            </PillButton>
          </View>
          {denied ? (
            <Tap accessibilityRole="button" onPress={() => void (Platform.OS === "web" ? null : Linking.openSettings())} style={{ marginTop: 12 }}>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: semantic.cautionText }}>
                Location is off for Cheeku{Platform.OS === "web" ? " in this browser. Allow it in the site settings, or pick a place." : ". Tap to open Settings, or pick a place."}
              </Text>
            </Tap>
          ) : null}
          {near.error === "daily_limit" ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 10 }}>Address lookups are resting for today; your last place is kept.</Text> : null}
        </Panel>
      </Section>

      <Section label="Keep it up to date">
        <Panel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Update while the app is open</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>
                When you move 250 m or more, nearby doctors, labs and classes follow. Never in the background.
              </Text>
            </View>
            <SpringSwitch checked={live} onChange={() => setLive(!live)} label="Update while the app is open" />
          </View>
        </Panel>
      </Section>

      {others.length ? (
        <Section label="Where your family lives">
          <Panel padded={false}>
            {others.map((m, i) => {
              const row = rows.data?.[m.id];
              return (
                <Tap
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.name}: ${row ? row.label : "not set"}. Change`}
                  onPress={() => setPickFor(m.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}
                  scale={0.99}
                >
                  <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={40} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{m.name.split(" ")[0]}</Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: row ? ink[700] : ink[300] }}>{row ? placeLine(row) : "Same as you"}</Text>
                  </View>
                  <ChevronRight size={18} color={ink[300]} />
                </Tap>
              );
            })}
          </Panel>
          <Text style={{ marginHorizontal: 24, marginTop: 8, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
            When you book for someone who lives elsewhere, their place is used instead of yours.
          </Text>
        </Section>
      ) : null}

      <Section>
        <View style={{ marginHorizontal: 20, flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500] }}>
            Saved to your account, the latest place only, no history. Never shared with a partner: a booking carries the address you confirm. Addresses are looked up through our own server, so no maps company sees who you are.
          </Text>
        </View>
        <Tap accessibilityRole="button" onPress={() => setWipe(true)} style={{ marginTop: 18, marginHorizontal: 20, height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Trash2 size={16} color={semantic.dangerText} />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Forget all locations</Text>
        </Tap>
      </Section>

      <PlaceSheet
        open={Boolean(pickFor)}
        onClose={() => setPickFor(null)}
        near={place}
        title={pickFor && members.find((m) => m.id === pickFor)?.isPrimary ? "Where are you?" : `Where does ${forName ?? "they"} live?`}
        onLocate={pickFor && members.find((m) => m.id === pickFor)?.isPrimary ? () => void near.locate() : undefined}
        onPick={(p, how) => {
          const m = members.find((x) => x.id === pickFor);
          if (!m) return;
          if (m.isPrimary) void near.pick(p, how);
          else void setFor(m.id, p, how);
        }}
      />
      <ConfirmSheet
        open={wipe}
        title="Forget all locations?"
        body="Your place and every family member's place are removed from your account and this phone. Nearby lists will ask again."
        confirmLabel="Forget them"
        destructive
        onConfirm={async () => {
          setLive(false);
          await forgetLocations();
          await qc.invalidateQueries({ queryKey: MEMBER_LOCATIONS_KEY });
        }}
        onClose={() => setWipe(false)}
      />
    </SettingsScreen>
  );
}
