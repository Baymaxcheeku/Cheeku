import { useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  Check,
  ArrowLeftRight,
  BookOpen,
  Camera,
  CalendarClock,
  FileText,
  History,
  Pill,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { AskSkeleton } from "@/components/ui/skeleton";
import { MemoryIcon, ReadsIcon, type AppIcon } from "@/components/ui/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type ScrollViewInstance, type TextInputInstance } from "react-native";
import { Pressable } from "@/components/ui/pressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductAssessmentCard } from "@/components/ai/product-assessment-card";
import { Paywall } from "@/components/billing/paywall";
import { AssistantTurn, UserBubble } from "@/components/chat/turn";
import { MascotBust, MascotFigure } from "@/components/illustrations/sprout";
import { DailyCard, ShortcutRow } from "@/components/chat/front-door";
import { dailyNote, shortcuts, type NoteButton, type Shortcut } from "@/lib/chat/daily";
import { useChatNotes } from "@/lib/chat/use-notes";
import { useAreas } from "@/lib/longevity/use-areas";
import { TypingDots } from "@/components/onboarding/motion";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { Brand } from "@/components/ui/brand";
import { Glass, GlassCircle, glass, glassShadow } from "@/components/ui/glass";
import { Backdrop } from "@/components/ui/screen";
import { chatQuota } from "@/lib/ai/chat";
import { pickChatPhoto, type ChatPhoto } from "@/lib/chat/photo";
import { FREE_CHAT_SOFT_LINE } from "@/lib/billing/plans";
import { promptEntriesFor } from "@/lib/ask/prompts";
import { profileSignalsFor } from "@/lib/knowledge/queries";
import { buildContext, memoryLine } from "@/lib/memory/context";
import { memoryStarters, type Starter } from "@/lib/memory/starters";
import { memberIntent } from "@/lib/memory/intent";
import { applyGoal } from "@/lib/chat/actions";
import { todayIso } from "@/lib/memory/clock";
import { fetchMemory, fetchThread, memoryKey, PHOTO_QUESTION, refreshMemory, sendTurn, threadKey, useMemory, useThread } from "@/lib/memory/store";
import { inOrder, withDayBreaks, type ThreadMessage, type TurnMemory } from "@/lib/memory/thread";
import { useLabCart } from "@/lib/labs/queries";
import { useFamily, useSwitchMember } from "@/lib/profiles/family";
import { shortDate } from "@/lib/records/details";
import { detect, type SafetyResult } from "@/lib/safety/detect";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * ASK CHEEKU: ONE CONTINUOUS, REMEMBERED THREAD PER FAMILY MEMBER.
 *
 * Cheeku is a longitudinal health memory, and this is the way in and out of
 * it. The screen opens on everything already said about the active member,
 * not a blank page, because the value is that last week's bilirubin, last
 * month's prescription and tonight's question sit in one scroll.
 *
 * Every message runs through the memory layer (lib/memory/pipeline):
 *
 *   1. THE SAFETY GATE RUNS HERE FIRST, on the device, before anything else.
 *      An emergency gets the full-screen interrupt immediately and is recorded
 *      for audit afterwards. Rule 2 of PLAN.md, unchanged.
 *   2. Clock-aware hard-stops (reduced movements at 30 weeks, a fever at three
 *      weeks old) answer with a go-now card and never reach the model.
 *   3. Everything else is read against the person's own history: their clock,
 *      their numbers and how they changed, their medicines, what is pending.
 *      The answer carries an urgency tier, what it read, the signs to watch,
 *      and a script for the doctor when the tier calls for one.
 *
 * ONE MEMORY, EVERY DOOR (2026-10-04). This screen, Home's ask bar and the
 * booking flows all write to the same per-person thread:
 *
 *   - "Book test again", "see a gynaecologist", "order my medicines": the
 *     answer carries a booking card read against the memory (which test, why
 *     now), and one tap runs the marketplace flow already filled in. The
 *     booking comes back into this thread as a "Booked" card.
 *   - Name another family member ("Imaad has a cough", "my wife's thyroid
 *     test") and the turn goes to THEIR memory: the screen switches to them
 *     first, says so, and offers the way back. Two people named, or someone
 *     the plan doesn't cover, and it stays put and says why.
 *
 * It does not diagnose. It understands a symptom to a point using general
 * health models, cuts the noise, says how urgent it looks and why, and makes
 * the conversation with the doctor better.
 */

const STARTER_ICON: Record<Starter["icon"] | string, LucideIcon> = {
  loop: CalendarClock,
  trend: TrendingUp,
  clock: CalendarClock,
  meds: Pill,
  symptom: Stethoscope,
  file: FileText,
  "last-report": FileText,
  jargon: BookOpen,
  appointment: CalendarClock,
};

export default function Ask() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { q, t: qAt, upload, record } = useLocalSearchParams<{ q?: string; t?: string; upload?: string; record?: string }>();

  const family = useFamily();
  const switchMember = useSwitchMember();
  const cart = useLabCart();
  const member = family.data?.profile ?? null;
  const memberId = member?.id;
  const name = member?.name.split(/\s+/)[0] ?? "them";

  const memory = useMemory(memberId);
  const thread = useThread(memberId);
  const quota = useQuery({ queryKey: ["ask-context", memberId, "quota"], queryFn: chatQuota, enabled: Boolean(memberId) });
  const quotaLeft = quota.data?.remaining ?? null;
  const signals = useQuery({ queryKey: ["ask-context", memberId, "signals"], queryFn: () => profileSignalsFor(memberId), enabled: Boolean(memberId) });

  const ctx = useMemo(() => (memory.data ? buildContext(memory.data, todayIso()) : null), [memory.data]);
  const messages = useMemo(() => inOrder(thread.data?.pages.flat() ?? []), [thread.data]);
  const items = useMemo(() => withDayBreaks(messages), [messages]);

  const [draft, setDraft] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  /** A photo was chosen and is being made ready (resized, thumbnail). */
  const [photoBusy, setPhotoBusy] = useState(false);
  /** The photo waiting to go with the next message, shown above the composer. */
  const [photo, setPhoto] = useState<ChatPhoto | null>(null);
  /** "Keep photo": off by default, so only what Cheeku saw is saved. Per photo. */
  const [keepThis, setKeepThis] = useState(false);
  /** The photo in flight, for the pending bubble. */
  const [pendingPhoto, setPendingPhoto] = useState<ChatPhoto | null>(null);
  const [focused, setFocused] = useState(false);
  const [aboutId, setAboutId] = useState<string | null>(record ?? null);
  const [logOpen, setLogOpen] = useState(false);
  const [hiddenNote, setHiddenNote] = useState<string | null>(null);
  // Once they start talking, Cheeku's notes stay quiet for the rest of this visit.
  const [talking, setTalking] = useState(false);
  const areas = useAreas(memberId);
  const told = useChatNotes(memberId, ctx, member?.name.split(/\s+/)[0] ?? "them");
  const input = useRef<TextInputInstance>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  const stickToEnd = useRef(true);
  const sentInitial = useRef<string | null>(null);
  /** Set when the chat itself switched member, so the switch doesn't wipe the turn in flight. */
  const chatSwitch = useRef<string | null>(null);
  const [switched, setSwitched] = useState<{ fromId: string; fromName: string; toName: string; because: string } | null>(null);

  // A different member is a different thread: clear what was being typed.
  const lastMember = useRef(memberId);
  useEffect(() => {
    if (lastMember.current && memberId && lastMember.current !== memberId && chatSwitch.current === memberId) {
      chatSwitch.current = null;
    } else if (lastMember.current && memberId && lastMember.current !== memberId) {
      setSwitched(null);
      setDraft("");
      setError(null);
      setAboutId(null);
      setPendingText(null);
      setPhoto(null);
      stickToEnd.current = true;
    }
    lastMember.current = memberId;
  }, [memberId]);

  const about = useMemo(() => {
    if (!aboutId || !memory.data) return null;
    const d = memory.data.documents.find((x) => x.id === aboutId);
    if (!d) return null;
    return { id: aboutId, title: String(d.title ?? "this record"), date: (d.event_date as string | null) ?? null };
  }, [aboutId, memory.data]);

  /** Puts a just-saved turn into the cached thread without a refetch. */
  function appendToThread(rows: ThreadMessage[], profileId: string | undefined = memberId) {
    qc.setQueryData<InfiniteData<ThreadMessage[], string | null>>(threadKey(profileId), (old) => {
      if (!old) return { pages: [rows.slice().reverse()], pageParams: [null] };
      const [first = [], ...rest] = old.pages;
      return { ...old, pages: [[...rows.slice().reverse(), ...first], ...rest] };
    });
  }

  /** `aboutOverride`: scope this one question to a record, set in the same tap (a note's button). */
  async function send(raw: string, aboutOverride?: { id: string; title: string; date: string | null } | null, withPhoto: ChatPhoto | null = null) {
    const text = raw.trim() || (withPhoto ? PHOTO_QUESTION : "");
    // Typing past Cheeku's notes counts as having read them: they don't follow every answer down.
    if (text && shownNotes.length) told.seen(...shownNotes.map((n) => n.key));
    if (text) setTalking(true);
    if (!text || pendingText || !memberId) return;

    // THE GATE. Before the network, before the model, before anything.
    const verdict = detect(text);
    if (verdict.status === "escalate") {
      setDraft("");
      setEscalation(verdict);
    }

    if (!memory.data) {
      if (verdict.status !== "escalate") setError("Still loading what I remember. Try again in a moment.");
      return;
    }

    // WHOSE MEMORY. A message about another family member goes to theirs.
    let profileId = memberId;
    let bundle = memory.data;
    let thread = messages;
    const everyone = family.data?.access.all ?? [];
    const target = memberIntent(text, everyone, memberId);
    if (target) {
      if (!family.data?.access.selectable.some((p) => p.id === target.id)) {
        setError(`${target.name} is paused on your plan, so I can't open their memory. Nothing was sent.`);
        return;
      }
      setDraft("");
      setPendingText(text);
      try {
        // Their memory and thread first, so the screen never flashes empty.
        const theirs = await qc.fetchQuery({ queryKey: memoryKey(target.id), queryFn: () => fetchMemory(target.id), staleTime: 30_000 });
        const pages = await qc.fetchInfiniteQuery({
          queryKey: threadKey(target.id),
          queryFn: ({ pageParam }) => fetchThread(target.id, pageParam),
          initialPageParam: null as string | null,
          staleTime: 15_000,
        });
        if (!theirs) throw new Error("no memory");
        chatSwitch.current = target.id;
        setSwitched({ fromId: memberId, fromName: name, toName: target.name, because: target.because });
        await switchMember(target.id);
        profileId = target.id;
        bundle = theirs;
        thread = inOrder(pages.pages.flat());
        setAboutId(null);
      } catch {
        chatSwitch.current = null;
        setPendingText(null);
        setDraft(text);
        setError(`Couldn't open ${target.name}'s memory. Check your connection and try again.`);
        return;
      }
    }

    stickToEnd.current = true;
    setError(null);
    setDraft("");
    setPhoto(null);
    setPendingText(text);
    setPendingPhoto(withPhoto);
    try {
      const res = await sendTurn({ text, profileId, thread, bundle, about: profileId === memberId ? (aboutOverride !== undefined ? aboutOverride : about) : null, isPrimary: Boolean(everyone.find((p) => p.id === profileId)?.isPrimary), photo: withPhoto, keepPhoto: Boolean(withPhoto) && keepThis, qc });
      if (!res.ok) {
        // Nothing was saved: put their words and photo back to send again.
        if (withPhoto) setPhoto(withPhoto);
        const back = raw.trim();
        if (res.quota) {
          setPaywallFor(text);
          setDraft(back);
          return;
        }
        if (verdict.status !== "escalate") {
          setError(res.message);
          setDraft(back);
        }
        return;
      }
      appendToThread(res.assistant ? [res.user, res.assistant] : [res.user], profileId);
      if (withPhoto) setKeepThis(false);
      if (res.photoNotKept) setError("Couldn't keep the photo, so only what it showed was saved.");
      if (withPhoto) void qc.invalidateQueries({ queryKey: memoryKey(profileId) });
      setAboutId(null);
      if (res.plan.facts.length || res.plan.revisions.length) refreshMemory(qc, profileId);
      void qc.invalidateQueries({ queryKey: ["ask-context", profileId, "quota"] });
    } finally {
      setPendingText(null);
      setPendingPhoto(null);
    }
  }

  /*
   * The system picker opens straight from the tap or from the platform's own
   * action sheet, never from one of our modals: iOS won't present over a
   * modal that is still animating away, and the picker then never answers
   * (the chat froze on "choose from photos", 2026-11-17). On web the file
   * dialog only opens inside the tap itself, so it opens the library at once
   * (a phone browser offers the camera there too).
   */
  async function choosePhoto(source: "camera" | "library") {
    if (photoBusy || pendingText) return;
    setError(null);
    try {
      const got = await pickChatPhoto(source, () => setPhotoBusy(true));
      if (typeof got === "string") setError(got);
      else if (got) {
        setPhoto(got);
        setKeepThis(false);
      }
    } finally {
      setPhotoBusy(false);
    }
  }

  function openPhotoMenu() {
    if (photoBusy || pendingText) return;
    input.current?.blur();
    if (Platform.OS === "web") {
      void choosePhoto("library");
      return;
    }
    const title = "Ask about a photo";
    const message = "A medicine strip, a label, a rash, a report. Cheeku looks at it once and keeps only a small preview.";
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions({ title, message, options: ["Take a photo", "Choose from photos", "Cancel"], cancelButtonIndex: 2 }, (i) => {
        if (i === 0) void choosePhoto("camera");
        if (i === 1) void choosePhoto("library");
      });
      return;
    }
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Take a photo", onPress: () => void choosePhoto("camera") },
      { text: "Choose from photos", onPress: () => void choosePhoto("library") },
    ]);
  }

  /** The booking card's button: the same flows the marketplace uses, filled in. */
  function startBooking(b: NonNullable<TurnMemory["booking"]>) {
    if (b.service === "lab") {
      if (!b.tests.length) {
        router.push("/labs");
        return;
      }
      cart.clear();
      cart.add(b.tests.map((t) => t.id));
      router.push("/labs/choose");
      return;
    }
    if (b.service === "medicine") {
      router.push("/pharmacy" as never);
      return;
    }
    if (b.service === "fitness") {
      router.push({ pathname: "/fitness", params: b.activity ? { activity: b.activity } : {} });
      return;
    }
    if (b.service === "care" && b.careId) {
      router.push(`/services/${b.careId}` as never);
      return;
    }
    if (b.service === "doctor") {
      router.push({
        pathname: "/book/consult",
        params: { who: b.forName, ...(b.mode ? { mode: b.mode } : {}), ...(b.specialty ? { specialty: b.specialty } : {}) },
      });
    }
  }

  useEffect(() => {
    // From Home's camera button: the menu opens here (web needs a tap of its own).
    if (upload === "1" && Platform.OS !== "web") setTimeout(openPhotoMenu, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A question carried in from elsewhere: sent once, when the memory is ready.
  useEffect(() => {
    // Keyed by the question and its tap time, so the same area tapped again on Home asks again.
    const key = q ? `${q}|${qAt ?? ""}` : null;
    if (!key || sentInitial.current === key || !memory.data || !thread.data) return;
    sentInitial.current = key;
    // From Home's camera button: their words wait in the box for the photo.
    if (upload === "1") {
      setDraft(q!);
      return;
    }
    // Carried in with a record (a lab result): scope this question to it, and keep it scoped.
    const d = record ? memory.data.documents.find((x) => x.id === record) : null;
    if (d && record) {
      setAboutId(record);
      void send(q!, { id: record, title: String(d.title ?? "this record"), date: (d.event_date as string | null) ?? null });
    } else void send(q!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, qAt, memory.data, thread.data]);

  if (family.isPending || (memberId && (memory.isPending || thread.isPending))) {
    return <AskSkeleton topInset={insets.top} bottomInset={insets.bottom} />;
  }

  if (!member && family.isFetching) {
    return <AskSkeleton topInset={insets.top} bottomInset={insets.bottom} />;
  }

  if (!member) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-base text-ink-500">Set up a profile before asking.</Text>
      </View>
    );
  }

  const empty = messages.length === 0 && !pendingText;
  const fromMemory = ctx ? memoryStarters(ctx) : [];
  const starters: { key: string; text: string; detail: string | null; icon: string }[] = fromMemory.length
    ? fromMemory
    : promptEntriesFor(signals.data?.journey, signals.data?.conditions ?? []).map((p) => ({ key: p.text, text: p.text, detail: null, icon: p.topic }));
  const loops = ctx?.loops.length ?? 0;

  // Cheeku's note for today: shown until something is sent today, or it is hidden.
  const everyoneHere = family.data?.access.all ?? [];
  const isSelf = Boolean(member?.isPrimary);
  const today = todayIso();
  const talkedToday = messages.some((m) => m.role === "user" && m.createdAt.slice(0, 10) === today);
  const note = memberId && !talkedToday && !pendingText ? dailyNote({ name, self: isSelf, areas: areas.data, now: new Date() }) : null;
  const showNoteRaw = note && hiddenNote !== `${memberId}:${today}:${note.key}` ? note : null;
  const chips = shortcuts(isSelf && everyoneHere.length > 1);

  function onNoteButton(b: NoteButton) {
    if (b.send && b.record) {
      const d = memory.data?.documents.find((x) => x.id === b.record);
      const scoped = d ? { id: b.record, title: String(d.title ?? "this record"), date: (d.event_date as string | null) ?? null } : null;
      setAboutId(b.record);
      void send(b.send, scoped);
    } else if (b.send) void send(b.send);
    else if (b.route) router.push(b.route as never);
  }
  // What happened since they last looked: new reports, bookings, visits. Two at a time.
  const shownNotes = pendingText || talking ? [] : told.notes.slice(0, 2);
  // News first: the daily note waits while there is something new to say.
  const showNote = shownNotes.length ? null : showNoteRaw;
  const noteCards = shownNotes.map((n) => (
    <DailyCard
      key={n.key}
      note={{ key: n.key, greeting: n.title, line: n.line, primary: n.primary, secondary: n.secondary }}
      onButton={(b) => {
        told.seen(n.key);
        onNoteButton(b);
      }}
      onClose={() => told.seen(n.key)}
    />
  ));
  function onShortcut(sc: Shortcut) {
    if (sc.key === "log") {
      setLogOpen(true);
      return;
    }
    if (sc.send) void send(sc.send);
  }
  function onLog(text: string) {
    setLogOpen(false);
    setDraft(text);
    setTimeout(() => input.current?.focus(), 50);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <Backdrop height={360} />

        <View className="flex-row items-center gap-3 px-4 pb-1 pt-2">
          <Glass strong className="h-12 w-12 items-center justify-center overflow-hidden rounded-pill">
            <View style={{ marginTop: 8 }}>
              <MascotBust size={40} mood="calm" motion="breathe" />
            </View>
          </Glass>
          <View className="flex-1">
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
              <Brand />
            </Text>
            <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
              {name}&apos;s health memory
            </Text>
          </View>
          <GlassCircle label="Past conversations" onPress={() => router.push("/chats")}>
            <History size={19} color={ink[900]} />
          </GlassCircle>
          <GlassCircle label={`What Cheeku remembers about ${name}`} onPress={() => router.push("/memory")}>
            <MemoryIcon size={20} color={ink[900]} />
          </GlassCircle>
        </View>

        {/* What is remembered, at a glance. One row, scrolls rather than wraps. */}
        {ctx ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
            <MemoryChip label={ctx.clock.label} strong onPress={() => router.push("/memory")} />
            <MemoryChip label={memoryLine(ctx)} onPress={() => router.push("/memory")} />
            {loops ? <MemoryChip label={`${loops} open item${loops === 1 ? "" : "s"}`} onPress={() => router.push("/memory")} /> : null}
            {quota.data?.remaining !== null && quota.data?.remaining !== undefined ? <MemoryChip label={`${quota.data.remaining} chats left today`} /> : null}
          </ScrollView>
        ) : null}

        <ScrollView
          ref={scroller}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onContentSizeChange={() => {
            // An empty thread is the intro, which reads from the top: scrolling
            // it to the end opened Ask with the mascot cut off under the chips.
            if (stickToEnd.current && messages.length > 0) scroller.current?.scrollToEnd({ animated: true });
          }}
        >
          {empty ? (
            <View className="flex-1 justify-center py-4">
              <View className="items-center">
                <MascotFigure size={132} moment="present" move="float" hop />
                <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900], marginTop: 6, textAlign: "center" }}>
                  Hi, I&apos;m{" "}
                  <Text style={{ color: ink[300] }}>
                    <Brand />
                  </Text>
                </Text>
                <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], marginTop: 6, textAlign: "center", maxWidth: 320 }}>
                  I keep {name}&apos;s health memory: every report, every reading you tell me, everything we talk about. Tell me what&apos;s going on and I&apos;ll read it against {name}&apos;s history.
                </Text>
              </View>

              {noteCards.length ? <View className="mt-5 w-full gap-3">{noteCards}</View> : null}

              {showNote ? (
                <View className="mt-5 w-full">
                  <DailyCard note={showNote} onButton={onNoteButton} onClose={() => setHiddenNote(`${memberId}:${today}:${showNote.key}`)} />
                </View>
              ) : null}

              <View className="mt-5 w-full gap-2">
                {starters.map((s) => {
                  const Icon = STARTER_ICON[s.icon] ?? FileText;
                  return (
                    <Tap scale={0.98}
                      key={s.key}
                      accessibilityRole="button"
                      onPress={() => void send(s.text)}
                      className="flex-row items-center gap-3 rounded-xl px-3 py-3"
                      style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-50">
                        <Icon size={17} color={ink[900]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: font.medium, fontSize: 15, lineHeight: 19, color: ink[900] }}>{s.text}</Text>
                        {s.detail ? (
                          <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>
                            {s.detail}
                          </Text>
                        ) : null}
                      </View>
                      <ArrowUpRight size={15} color={ink[300]} />
                    </Tap>
                  );
                })}
                <Tap scale={0.98}
                  accessibilityRole="button"
                  onPress={() => input.current?.focus()}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3"
                  style={{ borderWidth: 1, borderStyle: "dashed", borderColor: brand[200] }}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-md bg-white">
                    <Stethoscope size={17} color={ink[900]} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: ink[900] }}>Something&apos;s not right with {name}</Text>
                </Tap>
              </View>

              <View className="mt-4 gap-2.5 rounded-xl p-4" style={{ backgroundColor: "rgba(241,240,254,0.85)" }}>
                <How icon={ReadsIcon} text={`Reads what you describe against ${name}'s own reports, readings and medicines`} />
                <How icon={ShieldCheck} text="Tells you how urgent it looks: fits the pattern, keep an eye on it, call today, or go now" />
                <How icon={Stethoscope} text="Writes out exactly what to tell the doctor, with the numbers" />
                <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>
                  I don&apos;t diagnose. The doctor examines and decides; I make sure they hear the whole story.
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: 14, paddingTop: 4 }}>
              {thread.hasNextPage ? (
                <Tap
                  accessibilityRole="button"
                  onPress={() => {
                    stickToEnd.current = false;
                    void thread.fetchNextPage();
                  }}
                  style={{ alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: surface.tint }}
                >
                  <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{thread.isFetchingNextPage ? "Loading…" : "Show earlier"}</Text>
                </Tap>
              ) : messages.length ? (
                <Text style={{ alignSelf: "center", fontFamily: font.regular, fontSize: 12, color: ink[300] }}>
                  Everything you&apos;ve told me about {name} starts here
                </Text>
              ) : null}

              {items.map((item) => {
                if (item.kind === "day") {
                  return (
                    <View key={item.key} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: surface.line }} />
                      <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.4, color: ink[500] }}>{item.label}</Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: surface.line }} />
                    </View>
                  );
                }
                const m = item.message;
                if (m.role === "user") return <UserBubble key={item.key} message={m} />;
                if (m.assessment) {
                  return (
                    <View key={item.key} style={{ alignSelf: "stretch" }}>
                      <ProductAssessmentCard assessment={m.assessment} />
                    </View>
                  );
                }
                const last = m.id === messages[messages.length - 1]?.id;
                return (
                  <AssistantTurn
                    key={item.key}
                    message={m}
                    name={name}
                    onSend={last ? (t) => void send(t) : undefined}
                    onOpenRecord={(id) => router.push(`/records/${id}`)}
                    onOpenMemory={() => router.push("/memory")}
                    onBook={(mode) => (mode === "online" ? router.push({ pathname: "/book/instant", params: { who: memberId ?? "" } } as never) : router.push({ pathname: "/book/consult", params: { mode, who: name } }))}
                    onStartBooking={startBooking}
                    onNowBooking={(b) => {
                      const first = b.forName.split(/\s+/)[0]?.toLowerCase();
                      const who = (family.data?.access.selectable ?? []).find((p) => p.name.split(/\s+/)[0]?.toLowerCase() === first)?.id ?? memberId ?? "";
                      router.push({ pathname: "/book/instant", params: { who } } as never);
                    }}
                    onOpenRoute={(route) => router.push(route as never)}
                    onSetGoal={memberId ? (goal) => applyGoal(qc, memberId, goal, todayIso()) : undefined}
                  />
                );
              })}

              {noteCards}

              {showNote ? <DailyCard note={showNote} onButton={onNoteButton} onClose={() => setHiddenNote(`${memberId}:${today}:${showNote.key}`)} /> : null}

              {pendingText ? (
                <>
                  <UserBubble message={{ id: "pending", conversationId: "", role: "user", content: pendingText, createdAt: "", tier: null, memory: null, citations: [], safety: "clear", attachment: pendingPhoto ? { kind: "photo", summary: null, path: null, thumb: pendingPhoto.uri } : null, assessment: null }} />
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MascotBust size={28} mood="thinking" motion="idle" />
                    <Glass strong className="rounded-xl px-4 py-3.5" style={{ borderTopLeftRadius: 6 }}>
                      <TypingDots color={brand[400]} />
                    </Glass>
                    <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>Reading {name}&apos;s history…</Text>
                  </View>
                </>
              ) : null}
            </View>
          )}

          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-sm font-medium text-danger-text">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View className="px-4 pt-2" style={{ paddingBottom: 6, gap: 6 }}>
          {switched && switched.toName === name ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4, paddingVertical: 4, borderRadius: 999, backgroundColor: ink[900], alignSelf: "flex-start" }}>
              <ArrowLeftRight size={13} color="#fff" />
              <Text numberOfLines={1} style={{ maxWidth: 200, fontFamily: font.medium, fontSize: 13, color: "#fff" }}>
                Now in {switched.toName}&apos;s memory
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Back to ${switched.fromName}`}
                onPress={() => {
                  const back = switched.fromId;
                  setSwitched(null);
                  void switchMember(back);
                }}
                style={({ pressed }) => ({ height: 28, paddingHorizontal: 10, borderRadius: 999, justifyContent: "center", backgroundColor: pressed ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.16)" })}
              >
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>Back to {switched.fromName}</Text>
              </Pressable>
            </View>
          ) : null}
          {about ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", paddingLeft: 12, paddingRight: 6, paddingVertical: 6, borderRadius: 999, backgroundColor: brand[50] }}>
              <FileText size={13} color={ink[900]} />
              <Text numberOfLines={1} style={{ maxWidth: 240, fontFamily: font.medium, fontSize: 13, color: brand[700] }}>
                About {about.title}
                {about.date ? ` · ${shortDate(about.date)}` : ""}
              </Text>
              <Tap accessibilityRole="button" accessibilityLabel="Stop asking about this record" onPress={() => setAboutId(null)} hitSlop={8}>
                <X size={14} color={ink[900]} />
              </Tap>
            </View>
          ) : null}
          {quotaLeft !== null && quotaLeft > 0 && quotaLeft <= FREE_CHAT_SOFT_LINE ? (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`${quotaLeft} free ${quotaLeft === 1 ? "chat" : "chats"} left today. See plans`}
              onPress={() => setPaywallFor("")}
              hitSlop={6}
              style={{ alignSelf: "center", paddingHorizontal: 12, paddingVertical: 4 }}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>
                {quotaLeft} free {quotaLeft === 1 ? "chat" : "chats"} left today ·{" "}
                <Text style={{ fontFamily: font.semibold, color: brand[600] }}>Unlimited with a plan</Text>
              </Text>
            </Tap>
          ) : null}
          {photoBusy ? (
            <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 10, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }}>
              <ActivityIndicator size="small" color={brand[500]} />
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>Getting the photo ready…</Text>
            </View>
          ) : photo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "flex-start", padding: 6, paddingRight: 8, borderRadius: 20, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }}>
              <Image source={{ uri: photo.uri }} accessibilityLabel="Photo to ask about" style={{ width: 56, height: 56, borderRadius: 14 }} resizeMode="cover" />
              <View style={{ maxWidth: 190, gap: 6 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>Ask anything about it</Text>
                <Tap
                  scale={0.97}
                  accessibilityRole="switch"
                  accessibilityLabel="Keep photo"
                  accessibilityHint="Saves a copy in your private storage. Off: only what Cheeku saw is remembered."
                  accessibilityState={{ checked: keepThis }}
                  onPress={() => setKeepThis((v) => !v)}
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: keepThis ? brand[600] : surface.tint }}
                >
                  {keepThis ? <Check size={13} color="#fff" /> : <Bookmark size={13} color={ink[700]} />}
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: keepThis ? "#fff" : ink[700] }}>{keepThis ? "Photo will be kept" : "Keep photo"}</Text>
                </Tap>
              </View>
              <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setPhoto(null)} hitSlop={10} style={{ width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: surface.tint }}>
                <X size={15} color={ink[700]} />
              </Tap>
            </View>
          ) : null}
          {(!draft.trim() && !photo) || logOpen ? <ShortcutRow items={chips} logOpen={logOpen} disabled={Boolean(pendingText)} onShortcut={onShortcut} onLog={onLog} onCloseLog={() => setLogOpen(false)} /> : null}
          <View
            className="flex-row items-end gap-1.5 rounded-xl p-1.5 pl-4"
            style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: focused ? 1.5 : 1, borderColor: focused ? brand[300] : glass.rim }]}
          >
            <TextInput
              ref={input}
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={photo ? "What do you want to know about it?" : about ? `What do you want to know about it?` : `Ask, or tell me what's going on with ${name}`}
              placeholderTextColor={ink[300]}
              accessibilityLabel="Message Cheeku"
              multiline
              className="flex-1 py-2"
              style={{ maxHeight: 120, fontSize: 15, color: ink[900], fontFamily: "Inter_400Regular" }}
            />
            <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Ask about a photo" disabled={Boolean(pendingText) || photoBusy} onPress={openPhotoMenu} className="h-10 w-10 items-center justify-center rounded-pill">
              <Camera size={19} color={ink[900]} />
            </Tap>
            <Tap scale={0.95}
              accessibilityRole="button"
              accessibilityLabel="Send"
              accessibilityState={{ disabled: Boolean(pendingText) || photoBusy || (!draft.trim() && !photo) }}
              disabled={Boolean(pendingText) || photoBusy || (!draft.trim() && !photo)}
              onPress={() => void send(draft, undefined, photo)}
              className="h-11 w-11 items-center justify-center rounded-pill"
              style={{ backgroundColor: ink[900], opacity: pendingText || photoBusy || (!draft.trim() && !photo) ? 0.35 : 1 }}
            >
              <ArrowUp size={19} color="#ffffff" />
            </Tap>
          </View>
        </View>
      </View>

      <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />
      <Paywall
        open={paywallFor !== null}
        reason="quota"
        pendingQuestion={paywallFor || undefined}
        onClose={() => setPaywallFor(null)}
        onActivated={() => {
          const held = paywallFor;
          setPaywallFor(null);
          void qc.invalidateQueries({ queryKey: ["ask-context"] });
          void qc.invalidateQueries({ queryKey: ["entitlement"] });
          if (held) {
            setDraft("");
            void send(held);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

function MemoryChip({ label, strong, onPress }: { label: string; strong?: boolean; onPress?: () => void }) {
  return (
    <Tap
      accessibilityRole={onPress ? "button" : "text"}
      disabled={!onPress}
      onPress={onPress}
      style={[glassShadow, { height: 32, justifyContent: "center", paddingHorizontal: 12, borderRadius: 999, backgroundColor: strong ? brand[600] : glass.fillStrong, borderWidth: strong ? 0 : 1, borderColor: glass.rim }]}
    >
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 12, color: strong ? "#fff" : ink[700] }}>
        {label}
      </Text>
    </Tap>
  );
}

function How({ icon: Icon, text }: { icon: AppIcon; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
      <Icon size={15} color={ink[900]} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{text}</Text>
    </View>
  );
}
