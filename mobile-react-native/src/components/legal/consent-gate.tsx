import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronLeft, Download, LogOut } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Modal, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { ConsentBox } from "@/components/legal/consent-box";
import { DocumentBody } from "@/components/legal/document-body";
import { exportAccount, shareExport } from "@/lib/account/actions";
import { CONSENT_KEY, onConsentRefused, recordConsent, useConsentState, type ConsentState } from "@/lib/legal/consent";
import { LEGAL_DOCUMENTS, type LegalKind } from "@/lib/legal/documents";
import { PURPOSE_COPY, REQUIRED_PURPOSES } from "@/lib/legal/purposes";
import { logActivity } from "@/lib/privacy/activity";
import { signOutAndWipe } from "@/lib/privacy/local-data";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";
import { Tap } from "@/components/ui/tap";
import { startFresh } from "@/lib/nav/start-fresh";

/*
 * Asks a signed-in person to agree, when the database says they have to.
 *
 * Three people meet this sheet, and each gets different words:
 *
 *   NEVER      Signed up before consent was recorded, or the sign-up record
 *              failed. Same box as sign-up, framed as "one quick thing".
 *   UPDATED    A material change to a document they agreed to. Names which
 *              documents changed and shows what changed, so agreeing again is
 *              informed rather than a speed bump.
 *   WITHDRAWN  They paused the service themselves. Says their records are
 *              safe and not being used, and how to carry on.
 *
 * WHY IT CANNOT BE DISMISSED, AND WHY THAT IS NOT A HOSTAGE SITUATION. The
 * database refuses new health data without consent (migration 0031), so
 * letting someone past this sheet would only let them into an app whose every
 * save fails. But the way out is never "agree or lose your records": download
 * and sign out are on the sheet itself, and deletion is in Settings after
 * signing back in. Withholding consent never withholds a person's own data.
 *
 * Mounted once, in the root layout, so it covers every signed-in screen
 * including one opened directly by a link. Checks again whenever the app comes
 * back to the foreground, so a withdrawal on another phone or a policy update
 * mid-session is caught without a restart, and on every sign-in and sign-out,
 * so the answer for a signed-out visitor is never reused for the account.
 */
export function ConsentGate() {
  const queryClient = useQueryClient();
  const state = useConsentState();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void queryClient.invalidateQueries({ queryKey: CONSENT_KEY });
    });
    const off = onConsentRefused(() => void queryClient.invalidateQueries({ queryKey: CONSENT_KEY }));
    const { data: auth } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void queryClient.invalidateQueries({ queryKey: CONSENT_KEY });
      }
    });
    return () => {
      sub.remove();
      off();
      auth.subscription.unsubscribe();
    };
  }, [queryClient]);

  const data = state.data;
  if (!data?.available || !data.needsConsent) return null;
  return <ConsentSheet state={data} />;
}

function ConsentSheet({ state }: { state: ConsentState }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<null | "agree" | "export" | "signout">(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<LegalKind | null>(null);

  const copy = copyFor(state);
  // Joined before consent was saved; their sign-up tick was carried over
  // (migration 0032). They never saw these documents, so "what changed" cards
  // would be noise: one line and the box is the whole ask.
  const carried = state.decisions.health_records?.method === "carried_over";

  async function agree() {
    if (!checked) {
      setError("Tick the box to agree, or use one of the options below.");
      return;
    }
    setBusy("agree");
    setError(null);
    const result = await recordConsent(REQUIRED_PURPOSES, true, "reconsent_sheet");
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    queryClient.setQueryData(CONSENT_KEY, result.state);
    // Anything that failed to save while consent was missing can try again.
    void queryClient.invalidateQueries();
  }

  async function download() {
    setBusy("export");
    setError(null);
    const result = await exportAccount();
    setBusy(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void logActivity("data_exported");
    await shareExport(result.uri);
  }

  async function signOut() {
    setBusy("signout");
    await signOutAndWipe(queryClient);
    setBusy(null);
    startFresh(router, "/welcome");
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => undefined}>
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top + 8 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View className="items-center">
            <MascotBust size={112} moment={state.reason === "withdrawn" ? "idle" : "present"} />
          </View>

          <Text accessibilityRole="header" style={[type.title, { textAlign: "center", marginTop: 12 }]}>
            {copy.title}
          </Text>
          <Text style={[type.body, { textAlign: "center", marginTop: 8 }]}>{copy.body}</Text>

          {state.reason === "updated" && !carried ? (
            <View className="mt-5 gap-2.5">
              {state.stale.map((k) => {
                const doc = LEGAL_DOCUMENTS[k as LegalKind];
                if (!doc) return null;
                return (
                  <Tap scale={0.98}
                    key={k}
                    accessibilityRole="button"
                    onPress={() => setReading(doc.kind)}
                    className="rounded-lg p-4"
                    style={[{ backgroundColor: surface.base }, shadow.e1]}
                  >
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{doc.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 4 }}>
                      {doc.changes[0] ?? doc.summary}
                    </Text>
                    <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600], marginTop: 8 }}>
                      {doc.changes.length ? "Read what changed" : `Read the ${doc.title}`}
                    </Text>
                  </Tap>
                );
              })}
            </View>
          ) : null}

          {state.reason === "withdrawn" && state.missing.length ? (
            <View className="mt-5 rounded-lg p-4" style={{ backgroundColor: surface.base, borderWidth: 1, borderColor: surface.line }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>Paused because you withdrew</Text>
              {state.missing.map((p) => (
                <Text key={p} style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], marginTop: 4 }}>
                  {PURPOSE_COPY[p].title}
                </Text>
              ))}
            </View>
          ) : null}

          <View className="mt-6">
            <ConsentBox
              checked={checked}
              onToggle={() => {
                setChecked((v) => !v);
                setError(null);
              }}
              onOpenDocument={setReading}
              // Open only for someone who has never seen it. "Updated" has its own
              // cards above, and "withdrawn" already lists the paused uses.
              startOpen={state.reason === "never"}
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 12 }}>
              {error}
            </Text>
          ) : null}

          <Tap
            accessibilityRole="button"
            disabled={busy !== null}
            onPress={() => void agree()}
            className="mt-5 h-[54px] items-center justify-center rounded-pill"
            style={{ backgroundColor: checked ? brand[600] : ink[900], opacity: busy && busy !== "agree" ? 0.5 : 1 }}
          >
            {busy === "agree" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#fff" }}>{copy.cta}</Text>
            )}
          </Tap>

          <View className="mt-4 flex-row gap-2.5">
            <Secondary icon={Download} label="Download my data" busy={busy === "export"} disabled={busy !== null} onPress={() => void download()} />
            <Secondary icon={LogOut} label="Sign out" busy={busy === "signout"} disabled={busy !== null} onPress={() => void signOut()} />
          </View>

          <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[300], marginTop: 16, textAlign: "center" }}>
            Not agreeing never costs you your records. Download them here, or sign in later to delete everything from
            Settings.
          </Text>
        </ScrollView>
      </View>

      {/* The reader opens over the sheet, so nothing typed or ticked is lost. */}
      <Modal visible={reading !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReading(null)}>
        <View className="flex-1 bg-canvas">
          <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: 14 }}>
            <Tap scale={0.95}
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setReading(null)}
              className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
              style={shadow.e1}
            >
              <ChevronLeft size={20} color={ink[700]} />
            </Tap>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
              {reading ? LEGAL_DOCUMENTS[reading].title : ""}
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 32 }}>
            {reading ? <DocumentBody doc={LEGAL_DOCUMENTS[reading]} /> : null}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

function copyFor(state: ConsentState): { title: string; body: string; cta: string } {
  if (state.reason === "updated" && state.decisions.health_records?.method === "carried_over") {
    return {
      title: "We've updated our terms",
      body: "When you joined, you agreed to Cheeku keeping your family's health records. Our terms now explain each use in plain words. Nothing about your records changes; tick once to keep going.",
      cta: "Agree and continue",
    };
  }
  if (state.reason === "updated") {
    return {
      title: "We've updated our terms",
      body: "Nothing about your records changes. Have a look at what's new, then agree to keep using Cheeku.",
      cta: "Agree and continue",
    };
  }
  if (state.reason === "withdrawn") {
    return {
      title: "Cheeku is paused",
      body: "Your records are safe and are not being used. Agree again to carry on, or download your data.",
      cta: "Agree and resume",
    };
  }
  return {
    title: "One quick thing",
    body: "Before you carry on, confirm how Cheeku can use your family's health data. It's the same agreement everyone makes at sign-up.",
    cta: "Agree and continue",
  };
}

function Secondary({
  icon: Icon,
  label,
  busy,
  disabled,
  onPress,
}: {
  icon: typeof Download;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-pill"
      style={{ backgroundColor: surface.base, borderWidth: 1, borderColor: surface.line, opacity: disabled && !busy ? 0.6 : 1 }}
    >
      {busy ? <ActivityIndicator size="small" color={ink[900]} /> : <Icon size={16} color={ink[700]} />}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{label}</Text>
    </Tap>
  );
}
