import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, ChevronRight, Lock, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PageTitle, PillButton, ScreenHeader, SectionTitle } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

import { connectSource, disconnectSource, useWearables } from "../queries";
import { DEMO_SOURCE, SOURCES, type SourceInfo } from "../registry";
import { needsDemo, OS } from "../runtime";
import { STRAVA_GUIDE } from "../sources/strava";
import { isConnected } from "../store";
import type { Availability, SourceId } from "../types";
import { SOURCE_ART } from "./parts";
import { glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { SkyWash } from "@/components/ui/sky-wash";

/*
 * Connect a device. One row per source, each saying plainly what state it is
 * in on this phone; tapping a row opens a sheet with what it brings and the
 * one thing to do. Nothing is asked for before the person taps Connect, and
 * the system's own permission screen does the asking.
 */

type Status = { label: string; tone: "on" | "action" | "muted" };

function statusOf(connected: boolean, a: Availability | undefined): Status {
  if (connected) return { label: "Connected", tone: "on" };
  switch (a?.state) {
    case "ready":
      return { label: "Connect", tone: "action" };
    case "guide":
      return { label: "How to", tone: "action" };
    case "needs_build":
      return { label: "Needs the installed app", tone: "muted" };
    case "needs_install":
      return { label: "Install Health Connect", tone: "muted" };
    case "off":
      return { label: "Coming soon", tone: "muted" };
    case "wrong_platform":
      return { label: OS === "ios" ? "Android only" : OS === "android" ? "iPhone only" : "On your phone", tone: "muted" };
    default:
      return { label: "", tone: "muted" };
  }
}

export function WearablesConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const family = useFamily();
  const me = family.data?.access.all.find((m) => m.isPrimary);
  const state = useWearables();
  const [avail, setAvail] = useState<Partial<Record<SourceId, Availability>>>({});
  const [open, setOpen] = useState<SourceInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all([...SOURCES, DEMO_SOURCE].map(async (s) => [s.id, await s.adapter.availability().catch(() => ({ state: "wrong_platform" }) as Availability)] as const)).then((pairs) => {
      if (alive) setAvail(Object.fromEntries(pairs));
    });
    return () => {
      alive = false;
    };
  }, []);

  const connected = (id: SourceId) => Boolean(state.data && isConnected(state.data, id));

  async function connect(info: SourceInfo) {
    if (!me) return;
    setBusy(true);
    setNote(null);
    const r = await connectSource(qc, info.id, me.id);
    setBusy(false);
    if (!r.ok) return setNote(r.message);
    setOpen(null);
    router.replace("/wearables" as never);
  }

  async function disconnect(info: SourceInfo) {
    setBusy(true);
    await disconnectSource(qc, info.id);
    setBusy(false);
    setOpen(null);
  }

  const a = open ? avail[open.id] : undefined;
  const isOn = open ? connected(open.id) : false;
  const guide = open?.id === "strava" ? (OS === "android" ? STRAVA_GUIDE.android : STRAVA_GUIDE.ios) : null;

  return (
    <View className="flex-1 bg-canvas">
      <SkyWash top={0} />
      <ScreenHeader fallback="/wearables" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <PageTitle title="Connect a device" line="Pick where your steps, sleep and heart rate already live." />

        <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 18, borderRadius: 24, paddingHorizontal: 16, shadowOpacity: 0.05 }]}>
          {SOURCES.map((s, i) => (
            <Row key={s.id} info={s} first={i === 0} status={statusOf(connected(s.id), avail[s.id])} onPress={() => { setNote(null); setOpen(s); }} />
          ))}
        </View>

        {needsDemo() ? (
          <>
            <View style={{ marginTop: 26 }}>
              <SectionTitle>Just looking?</SectionTitle>
            </View>
            <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 12, borderRadius: 24, paddingHorizontal: 16, shadowOpacity: 0.05 }]}>
              <Row info={DEMO_SOURCE} first status={connected("demo") ? { label: "On", tone: "on" } : { label: "Try it", tone: "action" }} onPress={() => { setNote(null); setOpen(DEMO_SOURCE); }} />
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 10, paddingHorizontal: 4 }}>
              Apple Health and Health Connect need the installed Cheeku app. In this preview, sample data shows how everything looks.
            </Text>
          </>
        ) : null}

        <View style={{ marginTop: 26 }}>
          <SectionTitle>What Cheeku does with it</SectionTitle>
        </View>
        <View style={[glassCard("#ffffff", "#0f1030"), { marginTop: 12, borderRadius: 24, padding: 16, gap: 12, shadowOpacity: 0.05 }]}>
          {[
            ["Reads, never writes", "Cheeku can't add or change anything in your health app."],
            ["Keeps one summary a day", "A day's totals and averages. No minute-by-minute record, no location."],
            ["Uses it for you", "Today's plan fills in your steps, and Cheeku answers with your sleep and heart rate in mind."],
            ["Stops when you say", "Disconnect here at any time and the copy on this phone is removed."],
          ].map(([title, body]) => (
            <View key={title} style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Check size={13} color={ink[900]} strokeWidth={2.6} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 1 }}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 16, paddingHorizontal: 4 }}>
          <Lock size={13} color={ink[300]} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>Only you can see these numbers. They are never sold or used for advertising.</Text>
        </View>
      </ScrollView>

      <Sheet open={open !== null} onClose={() => (busy ? undefined : setOpen(null))} dismissible={!busy}>
        {open ? (
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 30, paddingBottom: insets.bottom + 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                {SOURCE_ART[open.id] ? <Icon3D name={SOURCE_ART[open.id]!} size={36} /> : <open.icon size={24} color={brand[600]} strokeWidth={1.8} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.3, color: ink[900] }}>{open.name}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 1 }}>{open.line}</Text>
              </View>
              <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => setOpen(null)} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
                <X size={17} color={ink[700]} />
              </Tap>
            </View>

            <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginTop: 20 }}>{guide ? "Turn it on in Strava" : "What it brings"}</Text>
            <View style={{ marginTop: 8, gap: 9 }}>
              {(guide ?? open.brings).map((line, i) => (
                <View key={line} style={{ flexDirection: "row", gap: 10 }}>
                  {guide ? (
                    <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: "#fff" }}>{i + 1}</Text>
                    </View>
                  ) : (
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: ink[300], marginTop: 8, marginHorizontal: 3 }} />
                  )}
                  <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[700] }}>{line}</Text>
                </View>
              ))}
            </View>

            {guide ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>
                Strava doesn't allow apps to read your activities directly for this. Sharing through your phone's health app keeps it within their rules, and yours.
              </Text>
            ) : a?.state === "needs_build" ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>This works in the installed Cheeku app. It can't run in the preview app you're using now.</Text>
            ) : a?.state === "off" ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>
                {OS === "android" ? "We're finishing this connection. Until then, Health Connect brings in your Fitbit or Pixel Watch." : "We're finishing this connection and will switch it on soon."}
              </Text>
            ) : a?.state === "wrong_platform" ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>This one isn't available on this phone.</Text>
            ) : a?.state === "needs_install" ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>Install or update Health Connect from the Play Store, then come back.</Text>
            ) : null}

            {note ? (
              <View style={{ marginTop: 14, borderRadius: 12, backgroundColor: semantic.dangerBg, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: semantic.dangerText }}>{note}</Text>
              </View>
            ) : null}

            <View style={{ marginTop: 20 }}>
              {isOn ? (
                <PillButton tone="light" onPress={() => void disconnect(open)} loading={busy}>
                  {open.id === "demo" ? "Turn off sample data" : "Disconnect"}
                </PillButton>
              ) : a?.state === "ready" ? (
                <PillButton onPress={() => void connect(open)} loading={busy}>
                  {open.id === "demo" ? "Show sample data" : `Connect ${open.name}`}
                </PillButton>
              ) : (
                <PillButton tone="light" onPress={() => setOpen(null)}>
                  {guide ? "Got it" : "Close"}
                </PillButton>
              )}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function Row({ info, first, status, onPress }: { info: SourceInfo; first: boolean; status: Status; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={`${info.name}. ${status.label}`} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderTopColor: surface.line }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
        {SOURCE_ART[info.id] ? <Icon3D name={SOURCE_ART[info.id]!} size={30} /> : <info.icon size={21} color={brand[600]} strokeWidth={1.8} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{info.name}</Text>
        <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 1 }}>{info.line}</Text>
      </View>
      {status.label ? (
        status.tone === "action" ? (
          <View style={{ height: 32, paddingHorizontal: 14, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>{status.label}</Text>
          </View>
        ) : status.tone === "on" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: semantic.safeBg }}>
            <Check size={12} color={semantic.safeText} strokeWidth={3} />
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: semantic.safeText }}>{status.label}</Text>
          </View>
        ) : (
          <Text numberOfLines={2} style={{ maxWidth: 96, textAlign: "right", fontFamily: font.regular, fontSize: 12, lineHeight: 15, color: ink[300] }}>{status.label}</Text>
        )
      ) : (
        <ActivityIndicator size="small" color={ink[300]} />
      )}
      <ChevronRight size={16} color={ink[300]} />
    </Tap>
  );
}
