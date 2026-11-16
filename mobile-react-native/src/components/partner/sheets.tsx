import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Field } from "@/components/partner/forms";
import { PillButton } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { Tap } from "@/components/ui/tap";
import { clock } from "@/lib/partner/labstack";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The three things you can do to a booking after it's made, for labs,
 * medicines and doctor visits alike: move it, cancel it with a reason,
 * or report a problem (LabStack escalations).
 */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Shell({ open, onClose, busy, title, line, children, footer }: { open: boolean; onClose: () => void; busy: boolean; title: string; line?: string; children: React.ReactNode; footer: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // A fixed cap from the screen (a % of an auto-height parent doesn't hold on web),
  // and the middle scrolls so the buttons are always on screen.
  return (
    <Sheet open={open} onClose={onClose} dismissible={!busy}>
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, padding: 22, paddingBottom: insets.bottom + 16, gap: 14, maxHeight: Math.round(height * 0.92) - insets.top }}>
        <View>
          <Text style={{ fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5, color: ink[900] }}>{title}</Text>
          {line ? <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4 }}>{line}</Text> : null}
        </View>
        <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={{ flexShrink: 0, gap: 4 }}>{footer}</View>
      </View>
    </Sheet>
  );
}

/** Pick a new day and one of the times that day really has. `times(date)` returns "HH:mm" (labs) or ISO starts (doctors). */
export function RescheduleSheet({ open, onClose, title, times, onPick }: { open: boolean; onClose: () => void; title: string; times: (date: string) => Promise<string[]>; onPick: (date: string, time: string) => Promise<string | null> }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 864e5)), []);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const day = iso(days[dayIdx]!);
  const q = useQuery({ queryKey: ["reschedule-times", title, day], queryFn: () => times(day), enabled: open });
  const label = (t: string) => clock(t.length > 5 ? t.slice(11, 16) : t);

  return (
    <Shell
      open={open}
      onClose={onClose}
      busy={busy}
      title={title}
      line="Only times that are really open are shown."
      footer={
        <>
          {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>{error}</Text> : null}
          <PillButton
            tone="brand"
            loading={busy}
            disabled={!time}
            onPress={async () => {
              if (!time) return;
              setBusy(true);
              setError(null);
              const err = await onPick(day, time);
              setBusy(false);
              if (err) setError(err);
              else {
                setTime(null);
                onClose();
              }
            }}
          >
            {time ? `Move to ${label(time)}` : "Pick a time"}
          </PillButton>
        </>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8 }}>
        {days.map((d, i) => {
          const on = i === dayIdx;
          return (
            <Tap key={i} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { setDayIdx(i); setTime(null); }} style={{ width: 58, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
              <Text style={{ fontFamily: font.medium, fontSize: 12, color: on ? "rgba(255,255,255,0.75)" : ink[500] }}>{i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { weekday: "short" })}</Text>
              <Text style={{ fontFamily: font.semibold, fontSize: 18, color: on ? "#fff" : ink[900] }}>{d.getDate()}</Text>
            </Tap>
          );
        })}
      </ScrollView>
      {q.isPending ? (
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Checking times…</Text>
      ) : (q.data ?? []).length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(q.data ?? []).map((t) => {
            const on = t === time;
            return (
              <Tap key={t} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setTime(t)} style={{ width: "31.8%", height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[50] : "#fff", borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
                <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? brand[700] : ink[700] }}>{label(t)}</Text>
              </Tap>
            );
          })}
        </View>
      ) : (
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>Nothing open this day. Try another.</Text>
      )}
    </Shell>
  );
}

/** Cancel, with one of a few reasons (sent to the partner as the cancel reason). */
export function CancelSheet({ open, onClose, title, line, reasons, onCancel }: { open: boolean; onClose: () => void; title: string; line: string; reasons: string[]; onCancel: (reason: string) => Promise<string | null> }) {
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell
      open={open}
      onClose={onClose}
      busy={busy}
      title={title}
      line={line}
      footer={
        <>
          {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>{error}</Text> : null}
          <PillButton
            tone="brand"
            loading={busy}
            disabled={!reason}
            onPress={async () => {
              if (!reason) return;
              setBusy(true);
              setError(null);
              const err = await onCancel(reason);
              setBusy(false);
              if (err) setError(err);
              else onClose();
            }}
          >
            Yes, cancel it
          </PillButton>
          <Tap accessibilityRole="button" onPress={onClose} style={{ height: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Keep it</Text>
          </Tap>
        </>
      }
    >
      <View style={{ gap: 8 }}>
        {reasons.map((r) => {
          const on = r === reason;
          return (
            <Tap key={r} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setReason(r)} style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 16, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
              <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 15, color: ink[900] }}>{r}</Text>
            </Tap>
          );
        })}
      </View>
    </Shell>
  );
}

/** Report a problem: pick what happened, add a line, and it goes to the partner's escalation desk. */
export function ProblemSheet({ open, onClose, issues, onSend }: { open: boolean; onClose: () => void; issues: string[]; onSend: (issue: string, details: string) => Promise<string | null> }) {
  const [issue, setIssue] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setSent(false);
    setIssue(null);
    setDetails("");
    onClose();
  };
  return (
    <Shell
      open={open}
      onClose={close}
      busy={busy}
      title={sent ? "Sent. They'll look into it." : "Report a problem"}
      line={sent ? "The partner's support team gets this with the booking attached. Updates show up on this booking and in your inbox." : "Tell us what happened. It goes to the partner's support team with the booking attached."}
      footer={
        sent ? (
          <PillButton tone="brand" onPress={close}>
            Done
          </PillButton>
        ) : (
          <>
            {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText }}>{error}</Text> : null}
            <PillButton
              tone="brand"
              loading={busy}
              disabled={!issue || details.trim().length < 5}
              onPress={async () => {
                if (!issue) return;
                setBusy(true);
                setError(null);
                const err = await onSend(issue, details.trim());
                setBusy(false);
                if (err) setError(err);
                else setSent(true);
              }}
            >
              Send to support
            </PillButton>
          </>
        )
      }
    >
      {sent ? null : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {issues.map((r) => {
              const on = r === issue;
              return (
                <Tap key={r} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setIssue(r)} style={{ height: 40, paddingHorizontal: 14, borderRadius: 999, justifyContent: "center", backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? "#fff" : ink[900] }}>{r}</Text>
                </Tap>
              );
            })}
          </View>
          <Field page label="What happened" hint="A line or two is enough." value={details} onChangeText={setDetails} multiline maxLength={500} placeholder="The collector came at 11 instead of 8" />
        </>
      )}
    </Shell>
  );
}
