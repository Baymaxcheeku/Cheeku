import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Camera,
  CalendarCheck,
  CalendarClock,
  FileText,
  FolderOpen,
  History,
  Pill,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductAssessmentCard } from "@/components/ai/product-assessment-card";
import { ProductPicker } from "@/components/ai/product-picker";
import { CautionNote } from "@/components/safety/caution-note";
import { shouldCaution } from "@/lib/safety/caution";
import { Paywall } from "@/components/billing/paywall";
import { MascotBust } from "@/components/illustrations/sprout";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import {
  askAboutProduct,
  askCheeku,
  chatQuota,
  recordEscalation,
  type ChatTurn,
} from "@/lib/ai/chat";
import { promptEntriesFor } from "@/lib/ask/prompts";
import { profileSignalsFor } from "@/lib/knowledge/queries";
import { activeProfile } from "@/lib/profiles/context";
import { detect, type SafetyResult } from "@/lib/safety/detect";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/*
 * The starter rows are generated, not written here.
 *
 * They were three fixed strings ending in "Is running safe during pregnancy?",
 * which is what a reader tracking their weight saw on the empty chat screen —
 * the same miss as the Home chips, one tap deeper. Both surfaces now draw from
 * `promptEntriesFor`, so a question offered on Home is the same question
 * offered here, chosen from the same two signals: the journey picked at
 * onboarding and the conditions typed into the profile. Never a document.
 *
 * The icon follows the topic rather than the wording, which is why prompts
 * carry a topic at all.
 */
const TOPIC_ICON: Record<string, LucideIcon> = {
  "last-report": FileText,
  "last-scan": ScanLine,
  changed: History,
  jargon: BookOpen,
  appointment: CalendarCheck,
  "out-of-range": Activity,
  file: FolderOpen,
  vaccines: Syringe,
  medicines: Pill,
  due: CalendarClock,
};

/*
 * E1 — Ask Cheeku.
 *
 * THE SAFETY GATE RUNS HERE, on the device, before anything is sent. Rule 2
 * requires it to be deterministic and under 200ms, and a network round trip can
 * promise neither. It is the first statement in `send()` for the same reason
 * there is only one send path: a second way to reach the model would be a
 * second place to forget the gate.
 *
 * Three kinds of answer can come back: grounded in the active profile's own
 * records and cited, general information on a known health topic, or silent
 * when neither applies. None of them diagnose or give a dose.
 */
export default function Ask() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { q, upload } = useLocalSearchParams<{ q?: string; upload?: string }>();

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  /*
   * The paywall, and the question that triggered it.
   *
   * Held rather than discarded: someone hits the limit mid-thought, and making
   * them retype it after paying is the moment a plan starts feeling like a toll
   * booth. It goes back in the composer immediately and is sent automatically
   * once a tier is active.
   */
  const [paywallFor, setPaywallFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const sentInitial = useRef(false);

  const context = useQuery({
    queryKey: ["ask-context"],
    queryFn: async () => {
      const [profile, quota] = await Promise.all([activeProfile(), chatQuota()]);
      // Read after the profile, not alongside it: the signals belong to
      // whichever member is active, and asking for them before knowing who
      // that is would return the wrong person's starters on a switch.
      const signals = await profileSignalsFor(profile?.id);
      return { profile, quota, signals };
    },
  });

  useEffect(() => {
    scroller.current?.scrollToEnd({ animated: true });
  }, [turns, pending]);

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    /*
     * THE GATE. Before the transcript, before the network, before anything.
     */
    const verdict = detect(text);
    if (verdict.status === "escalate") {
      setDraft("");
      setEscalation(verdict);
      // The question still enters the transcript, flagged. An escalation that
      // leaves no record is not auditable.
      void recordEscalation(text, conversationId).then((r) => {
        if (r.conversationId) setConversationId(r.conversationId);
      });
      return;
    }

    setDraft("");
    setError(null);
    setPending(true);
    try {
      const result = await askCheeku(text, conversationId, verdict.status);
      if (!result.ok) {
        if (result.quota) {
          // Not an error — the free allowance ran out. The question goes back
          // in the composer AND is held for the paywall to send on activation.
          setPaywallFor(text);
          setDraft(text);
          return;
        }
        setError(result.message);
        setDraft(text);
        return;
      }
      setConversationId(result.conversationId);
      /*
       * The verdict rides along on the assistant turn rather than being held in
       * screen state. Screen state would show one banner for the whole
       * conversation and move it to whichever message was last; attaching it
       * here keeps it beside the answer it belongs to, still there when someone
       * scrolls back an hour later.
       */
      setTurns((t) => [...t, result.user, { ...result.assistant, caution: verdict }]);
    } finally {
      setPending(false);
    }
  }

  async function sendProduct(scenarioId: string) {
    setPickerOpen(false);
    setError(null);
    setPending(true);
    try {
      // "clear" rather than a gate result: the question text is fixed copy
      // attached to the scenario, not something the reader typed, so there is
      // no free input to screen. See askAboutProduct.
      const result = await askAboutProduct(scenarioId, conversationId, "clear");
      if (!result.ok) {
        if (result.quota) {
          // No text to hold: the question is fixed copy on the scenario.
          setPaywallFor("");
          return;
        }
        setError(result.message);
        return;
      }
      setConversationId(result.conversationId);
      setTurns((t) => [...t, result.user, result.assistant]);
    } finally {
      setPending(false);
    }
  }

  // Home's Ask box camera button lands here with ?upload=1. Runs once, so
  // closing the sheet does not reopen it on the next render.
  useEffect(() => {
    if (upload === "1") setPickerOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A question carried in from Home's Ask box. Runs once: a later re-render
  // must not re-send it.
  useEffect(() => {
    if (sentInitial.current || !q || !context.data) return;
    sentInitial.current = true;
    void send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, context.data]);

  if (context.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  if (!context.data?.profile) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-[15px] text-ink-500">
          Set up a profile before asking.
        </Text>
      </View>
    );
  }

  const quota = context.data.quota;
  const empty = turns.length === 0;
  const starters = promptEntriesFor(
    context.data.signals?.journey,
    context.data.signals?.conditions ?? [],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-2.5 px-5 pb-2 pt-2">
          {/*
           * The mascot in the header, not a stethoscope.
           *
           * This is a conversation with a character the app has already
           * introduced by name twice — on the carousel and on Home. Swapping in
           * a clinical glyph at the moment the conversation starts is the point
           * where a companion turns back into a medical form.
           *
           * It sits on a brand-tinted disc for the same reason it does
           * everywhere else: the mascot's own gradient starts near-white, so on
           * the plain canvas it washes out to an outline.
           */}
          <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-pill bg-brand-100">
            {/* Nudged down so the disc frames the face rather than the stalk:
                the bust's viewBox starts above the head to make room for the
                heart, which at 34px is most of the circle. */}
            <View style={{ marginTop: 7 }}>
              <MascotBust size={34} />
            </View>
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-ink-900">Cheeku</Text>
            <Text className="text-[11.5px] text-ink-500">
              Reading {context.data.profile.name}&apos;s records with you
            </Text>
          </View>
          {quota.remaining !== null ? (
            <View className="rounded-pill bg-surface px-2.5 py-1" style={shadow.e1}>
              <Text className="text-[11px] font-semibold text-ink-500">
                {quota.remaining} left
              </Text>
            </View>
          ) : null}
        </View>

        <ScrollView
          ref={scroller}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {empty ? (
            <View className="flex-1 justify-center py-6">
              {/*
               * The mascot needs a ground to stand on.
               *
               * Its shell gradient starts at #e6e1fb, which is nearly the
               * canvas colour — on a plain background only the outline and the
               * face survived, so the friendliest element on the screen
               * rendered as a ghost. A brand-tinted disc behind it restores the
               * character, and it is the same treatment used on Home and About,
               * which is what "consistent" has to mean here.
               */}
              <View className="items-center">
                <View
                  className="h-[116px] w-[116px] items-center justify-center overflow-hidden rounded-pill"
                  style={{ backgroundColor: brand[100] }}
                >
                  <View style={{ marginTop: 20 }}>
                    <MascotBust size={110} />
                  </View>
                </View>

                <Text className="mt-3.5 text-center text-[19px] font-bold tracking-tight text-ink-900">
                  Hi, I&apos;m Cheeku
                </Text>
                {/*
                 * The old line spent its second half on two things Cheeku will
                 * not do. The limit belongs on this screen — it just does not
                 * belong in the greeting, where it makes the first thing the
                 * companion says about itself a disclaimer. It now sits under
                 * the starters, where it reads as candour rather than a warning
                 * label.
                 */}
                <Text className="mt-1.5 max-w-[290px] text-center text-[13.5px] leading-[20px] text-ink-500">
                  Ask me anything about {context.data.profile.name}&apos;s health — a word on a
                  report, something that has been bothering you, or what to raise at the next
                  appointment.
                </Text>
              </View>

              <View className="mt-5 w-full gap-2">
                <Text className="px-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-300">
                  Try one of these
                </Text>
                {starters.map(({ text, topic }) => {
                  const Icon = TOPIC_ICON[topic] ?? Sparkles;
                  return (
                  <Pressable
                    key={text}
                    accessibilityRole="button"
                    onPress={() => void send(text)}
                    className="flex-row items-center gap-3 rounded-card bg-surface px-3 py-3"
                    style={[shadow.e1, { borderWidth: 1, borderColor: brand[50] }]}
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-tile bg-brand-50">
                      <Icon size={15} color={brand[600]} />
                    </View>
                    <Text className="min-w-0 flex-1 text-[13.5px] leading-[18px] text-ink-900">
                      {text}
                    </Text>
                    <ArrowUpRight size={14} color={ink[300]} />
                  </Pressable>
                  );
                })}
              </View>

              <View className="mt-4 flex-row items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3">
                <ShieldCheck size={14} color={brand[500]} style={{ marginTop: 1 }} />
                <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-700">
                  I answer from your own records and name the one I used. I never diagnose or
                  prescribe.
                </Text>
              </View>
            </View>
          ) : (
            <View className="gap-3 pt-2">
              {turns.map((turn) => (
                <Turn key={turn.id} turn={turn} onCitation={(id) => router.push(`/records/${id}`)} />
              ))}
              {pending ? (
                <View className="self-start rounded-card bg-surface px-4 py-3" style={shadow.e1}>
                  <ActivityIndicator size="small" color={brand[600]} />
                </View>
              ) : null}
            </View>
          )}


          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-[13px] font-medium text-danger-text">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        {/*
         * The composer as one object, not three.
         *
         * Three separate boxes with their own borders made the bar read as a
         * toolbar. Wrapping the field and both controls in a single rounded
         * shell — which brightens to brand on focus — makes it read as one
         * place to talk, and matches the Ask box on Home so the two entry
         * points feel like the same product.
         */}
        <View
          className="px-4 pt-2"
          style={{
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: surface.line,
            backgroundColor: surface.base,
          }}
        >
          <View
            className="flex-row items-end gap-1.5 rounded-card bg-canvas p-1.5 pl-3.5"
            style={{ borderWidth: 1, borderColor: composerFocused ? brand[300] : surface.line }}
          >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            placeholder="Ask anything…"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Ask Cheeku a question"
            multiline
            className="flex-1 py-2"
            style={{
              maxHeight: 120,
              fontSize: 15,
              color: ink[900],
              fontFamily: "Inter_400Regular",
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask about a product"
            onPress={() => setPickerOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-pill"
          >
            <Camera size={19} color={brand[600]} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: pending || !draft.trim() }}
            disabled={pending || !draft.trim()}
            onPress={() => void send(draft)}
            className="h-10 w-10 items-center justify-center rounded-pill bg-brand-600"
            style={{ opacity: pending || !draft.trim() ? 0.4 : 1 }}
          >
            <ArrowUp size={19} color="#ffffff" />
          </Pressable>
          </View>
        </View>
      </View>

      <ProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => void sendProduct(id)}
      />

      <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />

      <Paywall
        open={paywallFor !== null}
        reason="quota"
        pendingQuestion={paywallFor || undefined}
        onClose={() => setPaywallFor(null)}
        onActivated={() => {
          const held = paywallFor;
          setPaywallFor(null);
          /*
           * The quota banner reads from the entitlement, so it has to be
           * refetched before the header can stop saying zero left. Invalidating
           * rather than patching keeps one source of truth.
           */
          void queryClient.invalidateQueries({ queryKey: ["ask-context"] });
          void queryClient.invalidateQueries({ queryKey: ["entitlement"] });
          // The promise of the held question: it goes now, without being
          // retyped. An empty string is the product path, which has nothing to
          // resend.
          if (held) {
            setDraft("");
            void send(held);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Turn({ turn, onCitation }: { turn: ChatTurn; onCitation: (id: string) => void }) {
  if (turn.role === "user") {
    return (
      <View className="max-w-[85%] items-end self-end gap-1.5">
        {turn.attachment ? (
          <View className="flex-row items-center gap-2 rounded-card bg-surface px-2.5 py-2" style={shadow.e1}>
            <SvgXml xml={turn.attachment.thumbnail} width={28} height={28} />
            <Text className="text-[12px] font-medium text-ink-700">{turn.attachment.title}</Text>
          </View>
        ) : null}
        {/*
         * Asymmetric corners. One squared corner on the side a bubble came
         * from reads as speech; four equal corners read as a card. The user's
         * squares bottom-right and Cheeku's bottom-left, so the two sides of
         * the conversation lean towards each other.
         */}
        <View
          className="bg-brand-600 px-3.5 py-2.5"
          style={{ borderRadius: 20, borderBottomRightRadius: 6 }}
        >
          <Text className="text-[14px] leading-[20px] text-white">{turn.content}</Text>
        </View>
      </View>
    );
  }

  if (turn.assessment) {
    return (
      <View className="w-full self-start">
        <ProductAssessmentCard assessment={turn.assessment} />
      </View>
    );
  }

  return (
    <View className="max-w-[92%] gap-2 self-start">
      {/*
       * ABOVE the answer, not below it. Someone who has just described a
       * three-day fever should meet "see a doctor today" before they meet an
       * explanation they might read as reassurance and stop there.
       */}
      {turn.caution && shouldCaution(turn.caution) ? <CautionNote result={turn.caution} /> : null}

      {/*
       * The face beside the answer.
       *
       * Without it an answer is a white card from nobody in particular, which
       * is exactly the tone this app is trying not to have. The mascot sits on
       * its brand disc for contrast — its own gradient starts near-white — and
       * aligns to the first line rather than centring, so a long answer does
       * not leave it floating in the middle of a paragraph.
       */}
      <View className="flex-row items-start gap-2">
        <View className="h-7 w-7 items-center justify-center overflow-hidden rounded-pill bg-brand-100">
          <View style={{ marginTop: 5 }}>
            <MascotBust size={24} />
          </View>
        </View>

        <View
          className="min-w-0 flex-1 bg-surface px-3.5 py-3"
          style={[shadow.e1, { borderRadius: 20, borderBottomLeftRadius: 6 }]}
        >
        <Text className="text-[14px] leading-[21px] text-ink-900">{turn.content}</Text>

        {/*
         * Citations are tappable through to the record. A citation that cannot
         * be checked is decoration — and on a medical answer, decoration that
         * looks like evidence.
         */}
        {turn.citations.length > 0 ? (
          <View className="mt-2.5 gap-1.5 border-t pt-2.5" style={{ borderTopColor: surface.line }}>
            {turn.citations.map((citation) => (
              <Pressable
                key={citation.documentId}
                accessibilityRole="button"
                accessibilityLabel={`Open ${citation.label}`}
                onPress={() => onCitation(citation.documentId)}
                className="flex-row items-center gap-1.5"
              >
                <FileText size={12} color={brand[600]} />
                <Text className="flex-1 text-[11.5px] font-medium text-brand-700" numberOfLines={1}>
                  {citation.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        </View>
      </View>

      {/*
       * A general answer is labelled as one. The difference between "your
       * report says" and "in general" is the difference between a fact about
       * the reader and a fact about the world, and blurring it is how an app
       * ends up implying it knows something it does not.
       */}
      {turn.kind === "general" ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <Sparkles size={11} color={ink[300]} />
          <Text className="text-[11px] text-ink-300">
            General information, not from your records
          </Text>
        </View>
      ) : null}

      {turn.kind === "silent" ? (
        <View className="mt-1.5 flex-row items-center gap-1.5">
          <TriangleAlert size={11} color={semantic.caution} />
          <Text className="flex-1 text-[11px] text-ink-500">
            Nothing in your records covers this
          </Text>
        </View>
      ) : null}

      {turn.followUps.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {turn.followUps.map((followUp) => (
            <View key={followUp} className="rounded-pill bg-surface px-3 py-1.5" style={shadow.e1}>
              <Text className="text-[11.5px] text-ink-500">{followUp}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
