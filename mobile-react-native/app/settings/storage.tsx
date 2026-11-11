import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Cookie, Eraser, HardDrive, KeyRound, ScanEye, WifiOff } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Panel, Section, SettingsScreen } from "@/components/settings/chrome";
import { SpringSwitch } from "@/components/ui/motion";
import { clearOfflineCache } from "@/lib/offline/cache";
import { OFFLINE_WINDOWS, loadOfflinePrefs, saveOfflinePrefs, type OfflinePrefs } from "@/lib/offline/prefs";
import { clearCaches, formatBytes, storageUsage } from "@/lib/privacy/local-data";
import { STORAGE_REGISTRY, WHERE_LABEL, type StoredItem } from "@/lib/privacy/storage-registry";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { LinesSkeleton } from "@/components/ui/skeleton";

/**
 * Storage and cache: what this app keeps on the phone, and the controls.
 *
 * The app's answer to a cookie banner, without the banner. There is nothing
 * to accept because nothing optional is stored: no advertising cookies, no
 * analytics, no trackers. What IS stored is listed here in full, from the
 * same registry sign-out uses, so the list cannot drift from what the code
 * does.
 */
export default function StorageSettings() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usage = useQuery({ queryKey: ["storage-usage"], queryFn: storageUsage });
  const prefs = useQuery({ queryKey: ["offline-prefs"], queryFn: loadOfflinePrefs });

  async function update(next: OfflinePrefs) {
    await saveOfflinePrefs(next);
    // Off, or a shorter window: the copy already on the phone goes now, not
    // at the next launch.
    if (!next.enabled || (prefs.data && next.days < prefs.data.days)) await clearOfflineCache();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["offline-prefs"] }),
      queryClient.invalidateQueries({ queryKey: ["storage-usage"] }),
    ]);
    setNote(next.enabled ? `Offline copies are kept for ${next.days === 1 ? "1 day" : `${next.days} days`}.` : "Offline copies are off and the copy on this phone was removed.");
  }

  async function clear() {
    setBusy(true);
    setNote(null);
    try {
      await clearCaches(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["storage-usage"] });
      setNote("Cache cleared. Your records come back from the server as you open them.");
    } finally {
      setBusy(false);
    }
  }

  const p = prefs.data;
  const total = (usage.data?.offline ?? 0) + (usage.data?.temporary ?? 0);

  return (
    <SettingsScreen title="Storage & cache" eyebrow="What stays on this phone, and your controls" icon={HardDrive}>
      {/* --------------------------------------------------- on this phone -- */}
      <Section>
        <Panel>
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, color: ink[500] }}>ON THIS PHONE</Text>
          {usage.isPending ? (
            <LinesSkeleton style={{ marginTop: 10 }} />
          ) : (
            <>
              <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900], marginTop: 6 }}>
                {formatBytes(total)}
              </Text>
              <View className="mt-3 gap-2">
                <UsageRow label="Offline copy of records" value={formatBytes(usage.data?.offline ?? 0)} />
                <UsageRow label="Temporary files" value={formatBytes(usage.data?.temporary ?? 0)} />
              </View>
            </>
          )}
          <Tap
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void clear()}
            className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-pill"
            style={{ backgroundColor: ink[900], opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Eraser size={16} color="#fff" />}
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Clear cache</Text>
          </Tap>
          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 8 }}>
            Keeps you signed in and keeps your settings. Nothing on our servers is deleted.
          </Text>
        </Panel>
        {note ? (
          <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 10, fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: ink[700] }}>
            {note}
          </Text>
        ) : null}
      </Section>

      {/* ---------------------------------------------------- offline copy -- */}
      <Section label="Offline reading">
        <Panel>
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-tile" style={{ backgroundColor: brand[50] }}>
              <WifiOff size={17} color={ink[900]} />
            </View>
            <View className="min-w-0 flex-1">
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Keep records readable offline</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>
                Your records list and details, for a waiting room with no signal.
              </Text>
            </View>
            {p ? <SpringSwitch checked={p.enabled} onChange={() => void update({ ...p, enabled: !p.enabled })} label="Keep records readable offline" /> : null}
          </View>

          {p?.enabled ? (
            <View className="mt-4">
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>Keep the offline copy for</Text>
              <View className="mt-2 flex-row gap-2">
                {OFFLINE_WINDOWS.map((w) => {
                  const on = p.days === w.days;
                  return (
                    <Tap
                      key={w.days}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => void update({ ...p, days: w.days })}
                      className="h-10 flex-1 items-center justify-center rounded-pill"
                      style={{ backgroundColor: on ? brand[600] : surface.base, borderWidth: 1, borderColor: on ? brand[600] : surface.line }}
                    >
                      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[700] }}>{w.label}</Text>
                    </Tap>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Panel>
      </Section>

      {/* ------------------------------------------------ cookies, trackers -- */}
      <Section label="Cookies and tracking">
        <Panel>
          <Fact icon={Cookie} title="No advertising cookies" body="The app uses no cookies at all, and none that follow you across apps or sites." />
          <Divider />
          <Fact icon={ScanEye} title="No trackers or analytics" body="No advertising SDK, no analytics or session-recording tool, and your advertising ID is never read." />
          <Divider />
          <Fact icon={KeyRound} title="Your sign-in stays in the keychain" body="Held by iOS Keychain or Android Keystore, not in a plain file." />
          <Tap accessibilityRole="link" onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "storage" } })} className="mt-3">
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>Read the cookie and storage notice</Text>
          </Tap>
        </Panel>
      </Section>

      {/* ------------------------------------------------------- inventory -- */}
      <Section label="Everything stored on this phone">
        <Text style={{ marginHorizontal: 20, marginBottom: 10, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: ink[500] }}>
          The complete list. Items about you are removed when you sign out; a few settings belong to the phone and stay.
        </Text>
        <Panel padded={false}>
          {STORAGE_REGISTRY.map((item, i) => (
            <InventoryRow key={item.key} item={item} last={i === STORAGE_REGISTRY.length - 1} />
          ))}
        </Panel>
      </Section>
    </SettingsScreen>
  );
}

function UsageRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>{label}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{value}</Text>
    </View>
  );
}

function Fact({ icon: Icon, title, body }: { icon: typeof Cookie; title: string; body: string }) {
  return (
    <View className="flex-row gap-3">
      <Icon size={17} color={brand[500]} style={{ marginTop: 2 }} />
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{body}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="my-3 h-px" style={{ backgroundColor: surface.line }} />;
}

function InventoryRow({ item, last }: { item: StoredItem; last: boolean }) {
  const kept = item.scope === "device";
  return (
    <View className="px-4 py-3" style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: surface.line }}>
      <View className="flex-row items-start gap-2">
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{item.label}</Text>
        <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: kept ? surface.tint : brand[50] }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 11, color: kept ? ink[500] : brand[700] }}>
            {kept ? "Kept for this phone" : item.scope === "session" ? "Ends at sign-out" : "Removed at sign-out"}
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{item.why}</Text>
      <Text style={{ fontFamily: font.medium, fontSize: 11, color: ink[300], marginTop: 3 }}>
        {WHERE_LABEL[item.where]} · {item.lasts}
      </Text>
    </View>
  );
}
