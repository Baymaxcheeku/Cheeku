import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  BadgeCheck,
  ChevronRight,
  Clock3,
  Cookie,
  Download,
  FileText,
  LockKeyhole,
  Pause,
  ScrollText,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Panel, Section, SettingsScreen } from "@/components/settings/chrome";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { SpringSwitch } from "@/components/ui/motion";
import { discardExport, exportAccount, shareExport } from "@/lib/account/actions";
import { CONSENT_KEY, optionalOn, recordConsent, useConsentState } from "@/lib/legal/consent";
import { LEGAL_DOCUMENTS, LEGAL_ORDER, type LegalKind } from "@/lib/legal/documents";
import { LEGAL_ENTITY } from "@/lib/legal/entity";
import { ALL_PURPOSES, OPTIONAL_PURPOSES, PURPOSE_COPY, REQUIRED_PURPOSES, isPurpose, type OptionalPurpose } from "@/lib/legal/purposes";
import { logActivity } from "@/lib/privacy/activity";
import { REQUEST_COPY, REQUESTS_KEY, STATUS_LABEL, openRequest, useRequests, type RequestKind } from "@/lib/privacy/requests";
import { supabase } from "@/lib/supabase/client";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

const DOC_ICON: Record<LegalKind, LucideIcon> = { terms: ScrollText, privacy: ShieldCheck, health_consent: FileText, storage: Cookie };

const METHOD_LABEL: Record<string, string> = {
  signup_checkbox: "At sign-up",
  reconsent_sheet: "In the app",
  privacy_settings: "In Privacy settings",
  withdrawal: "Withdrawn in the app",
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Privacy and consent: everything the DPDP Act gives a person, in one place.
 *
 * Laid out in the order people come looking: "what did I agree to" first,
 * then the switches they can change, then the documents, then the rights that
 * need us to act. Withdrawing sits last and behind a confirmation, because it
 * pauses the service, and it says so before anyone taps it.
 */
export default function PrivacySettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const consent = useConsentState();
  const requests = useRequests();

  const [pending, setPending] = useState<OptionalPurpose | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [asking, setAsking] = useState<RequestKind | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);

  const history = useQuery({
    queryKey: ["consent-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consent_log")
        .select("consent_type, granted, granted_at, method, bundle_id")
        .order("granted_at", { ascending: false })
        .limit(60);
      if (error) return [];
      return groupHistory((data ?? []) as HistoryRow[]);
    },
  });

  const state = consent.data;
  const active = Boolean(state?.available && state.missing.length === 0);
  const agreedAt = state?.decisions.health_records?.granted ? state.decisions.health_records.at : null;

  async function toggle(p: OptionalPurpose) {
    if (!state) return;
    setPending(p);
    setNote(null);
    const next = !optionalOn(state, p);
    const result = await recordConsent([p], next, next ? "privacy_settings" : "withdrawal");
    setPending(null);
    if (!result.ok) {
      setNote(result.message);
      return;
    }
    queryClient.setQueryData(CONSENT_KEY, result.state);
    void queryClient.invalidateQueries({ queryKey: ["consent-history"] });
    setNote(`${PURPOSE_COPY[p].title} is ${next ? "on" : "off"}.`);
  }

  async function download() {
    setExporting(true);
    setNote(null);
    try {
      const result = await exportAccount();
      if (!result.ok) {
        setNote(result.message);
        return;
      }
      void logActivity("data_exported");
      await shareExport(result.uri);
      discardExport(result.uri);
    } finally {
      setExporting(false);
    }
  }

  async function pause() {
    const result = await recordConsent(ALL_PURPOSES, false, "withdrawal");
    setPauseOpen(false);
    if (!result.ok) {
      setNote(result.message);
      return;
    }
    // The gate in the signed-in shell sees this and takes over.
    queryClient.setQueryData(CONSENT_KEY, result.state);
  }

  return (
    <SettingsScreen title="Privacy & consent" eyebrow="What you agreed to, your choices and your rights" icon={LockKeyhole}>
      {/* ---------------------------------------------------------- status -- */}
      <Section>
        <Panel>
          {consent.isPending ? (
            <ActivityIndicator color={brand[600]} />
          ) : !state?.available ? (
            <StatusLine
              icon={Clock3}
              title="Consent records are being set up"
              body="Your choices will show here once the latest server update is live. Nothing about how your data is used has changed."
            />
          ) : active ? (
            <StatusLine
              icon={BadgeCheck}
              title="You're all set"
              body={`You agreed to the current terms${agreedAt ? ` on ${shortDate(agreedAt)}` : ""}. Terms ${state.acceptedVersions.terms ?? "n/a"} · Privacy ${state.acceptedVersions.privacy ?? "n/a"}.`}
            />
          ) : (
            <StatusLine icon={Pause} title="Cheeku is paused" body="You withdrew consent for a required use. Your records are safe and are not being used." />
          )}
        </Panel>
      </Section>

      {/* --------------------------------------------------------- required -- */}
      <Section label="What Cheeku uses your data for">
        <Panel padded={false}>
          {REQUIRED_PURPOSES.map((p, i) => (
            <View key={p} className="px-4 py-3" style={i ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>{PURPOSE_COPY[p].title}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{PURPOSE_COPY[p].line}</Text>
            </View>
          ))}
        </Panel>
        <Text style={{ marginHorizontal: 20, marginTop: 8, fontFamily: font.regular, fontSize: 11.5, lineHeight: 17, color: ink[500] }}>
          These are needed for Cheeku to work and were agreed together. To stop all of them, pause Cheeku at the bottom of this page.
        </Text>
      </Section>

      {/* --------------------------------------------------------- optional -- */}
      <Section label="Your choices">
        <Panel padded={false}>
          {OPTIONAL_PURPOSES.map((p, i) => {
            const on = optionalOn(state, p);
            return (
              <View key={p} className="flex-row items-center gap-3 px-4 py-3.5" style={i ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}>
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{PURPOSE_COPY[p].title}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 2 }}>{PURPOSE_COPY[p].line}</Text>
                </View>
                {pending === p ? (
                  <ActivityIndicator size="small" color={brand[600]} />
                ) : (
                  <SpringSwitch checked={on} onChange={() => (active ? void toggle(p) : setNote("Agree to the required uses first, then you can change these."))} label={PURPOSE_COPY[p].title} />
                )}
              </View>
            );
          })}
        </Panel>
        <Text style={{ marginHorizontal: 20, marginTop: 8, fontFamily: font.regular, fontSize: 11.5, lineHeight: 17, color: ink[500] }}>
          Off unless you turn them on. Anything shared for research or improvement is de-identified first, and your data is never sold.
        </Text>
        {note ? (
          <Text accessibilityRole="alert" style={{ marginHorizontal: 20, marginTop: 8, fontFamily: font.medium, fontSize: 12.5, lineHeight: 18, color: ink[700] }}>
            {note}
          </Text>
        ) : null}
      </Section>

      {/* -------------------------------------------------------- documents -- */}
      <Section label="Documents">
        <Panel padded={false}>
          {LEGAL_ORDER.map((k, i) => {
            const doc = LEGAL_DOCUMENTS[k];
            return (
              <LinkRow
                key={k}
                icon={DOC_ICON[k]}
                title={doc.title}
                body={`Version ${doc.version}`}
                first={i === 0}
                onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: k } })}
              />
            );
          })}
        </Panel>
      </Section>

      {/* ----------------------------------------------------------- rights -- */}
      <Section label="Your rights">
        <Panel padded={false}>
          <LinkRow icon={Download} title="Download my data" body="Everything we hold, as one file" first busy={exporting} onPress={() => void download()} />
          {(Object.keys(REQUEST_COPY) as RequestKind[]).map((k) => (
            <LinkRow key={k} icon={REQUEST_ICON[k]} title={REQUEST_COPY[k].title} body={REQUEST_COPY[k].line} onPress={() => setAsking(k)} />
          ))}
          <LinkRow icon={Trash2} title="Delete all my data" body="From the Profile tab, at the bottom" onPress={() => router.navigate("/settings")} />
        </Panel>
      </Section>

      {requests.data?.length ? (
        <Section label="Your requests">
          <Panel padded={false}>
            {requests.data.map((r, i) => (
              <View key={r.id} className="px-4 py-3" style={i ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>
                    {r.kind in REQUEST_COPY ? REQUEST_COPY[r.kind as RequestKind].title : r.kind}
                  </Text>
                  <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: brand[50] }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>{STATUS_LABEL[r.status]}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 3 }}>
                  Sent {shortDate(r.created_at)}
                  {r.status === "resolved" || r.status === "rejected" ? "" : ` · answer due by ${shortDate(r.due_by)}`}
                </Text>
                {r.response ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[700], marginTop: 4 }}>{r.response}</Text> : null}
              </View>
            ))}
          </Panel>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- history -- */}
      {history.data?.length ? (
        <Section label="Consent history">
          <Panel padded={false}>
            {history.data.slice(0, 12).map((h, i) => (
              <View key={h.key} className="px-4 py-3" style={i ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>
                  {h.granted ? "Agreed" : "Withdrew"} · {h.label}
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500], marginTop: 2 }}>
                  {shortDate(h.at)} · {METHOD_LABEL[h.method ?? ""] ?? "Recorded"}
                </Text>
              </View>
            ))}
          </Panel>
        </Section>
      ) : null}

      {/* ------------------------------------------------------------ pause -- */}
      {active ? (
        <Section label="Pause Cheeku">
          <Panel>
            <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18.5, color: ink[700] }}>
              Withdraw all consent. Cheeku stops using your data and stops saving anything new. Your records stay, so you can
              download them, delete them, or agree again to carry on.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPauseOpen(true)}
              className="mt-3 h-11 items-center justify-center rounded-pill"
              style={{ borderWidth: 1.5, borderColor: ink[300] }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>Withdraw consent and pause</Text>
            </Pressable>
          </Panel>
        </Section>
      ) : null}

      <Text style={{ marginHorizontal: 20, marginTop: 24, fontFamily: font.regular, fontSize: 11.5, lineHeight: 17, color: ink[300] }}>
        Grievance Officer: {LEGAL_ENTITY.grievanceOfficer}, {LEGAL_ENTITY.privacyEmail}. If you are not satisfied with our answer, you may
        complain to the Data Protection Board of India.
      </Text>

      <ConfirmSheet
        open={pauseOpen}
        title="Pause Cheeku?"
        body="Cheeku will stop answering, reading and saving until you agree again. Nothing is deleted, and you can download or delete your data at any time."
        confirmLabel="Withdraw and pause"
        cancelLabel="Keep using Cheeku"
        onConfirm={pause}
        onClose={() => setPauseOpen(false)}
      />

      <RequestSheet
        kind={asking}
        onClose={() => setAsking(null)}
        onSent={() => {
          setAsking(null);
          void queryClient.invalidateQueries({ queryKey: REQUESTS_KEY });
          setNote("Request sent. You'll see its status under Your requests.");
        }}
      />
    </SettingsScreen>
  );
}

const REQUEST_ICON: Record<RequestKind, LucideIcon> = {
  correction: FileText,
  access: ShieldCheck,
  nomination: BadgeCheck,
  grievance: ScrollText,
};

type HistoryRow = { consent_type: string; granted: boolean; granted_at: string; method: string | null; bundle_id: string | null };

/** One line per decision: a bundle of purposes agreed or withdrawn together. */
function groupHistory(rows: HistoryRow[]) {
  const groups = new Map<string, { key: string; granted: boolean; at: string; method: string | null; purposes: string[] }>();
  for (const r of rows) {
    if (!isPurpose(r.consent_type)) continue;
    const key = r.bundle_id ?? `${r.granted_at}-${r.granted}-${r.method}`;
    const g = groups.get(key) ?? { key, granted: r.granted, at: r.granted_at, method: r.method, purposes: [] };
    g.purposes.push(r.consent_type);
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => {
    const all = REQUIRED_PURPOSES.every((p) => g.purposes.includes(p));
    const optional = g.purposes.filter((p) => !(REQUIRED_PURPOSES as readonly string[]).includes(p));
    const label = all
      ? optional.length
        ? "All uses"
        : "Required uses"
      : g.purposes.map((p) => (isPurpose(p) ? PURPOSE_COPY[p].title : p)).join(", ");
    return { ...g, label };
  });
}

function StatusLine({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View className="flex-row gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-[13px]" style={{ backgroundColor: brand[50] }}>
        <Icon size={19} color={brand[600]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 15.5, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500], marginTop: 3 }}>{body}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon: Icon,
  title,
  body,
  first = false,
  busy = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  first?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      className="flex-row items-center gap-3 px-4 py-3"
      style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-tile" style={{ backgroundColor: brand[50] }}>
        <Icon size={16} color={brand[600]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: ink[500], marginTop: 1 }}>{body}</Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={brand[600]} /> : <ChevronRight size={16} color={ink[300]} />}
    </Pressable>
  );
}

function RequestSheet({ kind, onClose, onSent }: { kind: RequestKind | null; onClose: () => void; onSent: () => void }) {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!kind) return;
    setBusy(true);
    setError(null);
    const result = await openRequest(kind, text);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setText("");
    onSent();
  }

  const copy = kind ? REQUEST_COPY[kind] : null;
  return (
    <Modal visible={kind !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessibilityLabel="Close" onPress={busy ? undefined : onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }} />
        <View className="rounded-t-sheet bg-canvas px-5 pt-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 19, color: ink[900] }}>{copy?.title}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[500], marginTop: 4 }}>
            {copy?.line} We reply within 90 days, usually much sooner.
          </Text>
          <TextInput
            accessibilityLabel={copy?.title ?? "Request"}
            value={text}
            onChangeText={setText}
            placeholder={copy?.placeholder}
            placeholderTextColor={ink[300]}
            multiline
            maxLength={2000}
            style={{
              marginTop: 14,
              minHeight: 110,
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: surface.line,
              backgroundColor: surface.base,
              padding: 14,
              fontSize: 15,
              fontFamily: font.regular,
              color: ink[900],
              textAlignVertical: "top",
            }}
          />
          <Text style={{ fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: ink[300], marginTop: 6 }}>
            Please don&apos;t include medical details we don&apos;t need to act on this.
          </Text>
          {error ? (
            <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 12.5, color: ink[700], marginTop: 8 }}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void send()}
            className="mt-4 h-[52px] items-center justify-center rounded-pill"
            style={{ backgroundColor: ink[900], opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Send request</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
