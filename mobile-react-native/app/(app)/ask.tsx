import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Activity,
  ArrowUp,
  Camera,
  FileText,
  History,
  Sparkles,
  Stethoscope,
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
import { MascotBust } from "@/components/illustrations/sprout";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import {
  askAboutProduct,
  askBaymax,
  chatQuota,
  recordEscalation,
  type ChatTurn,
} from "@/lib/ai/chat";
import { activeProfile } from "@/lib/profiles/context";
import { detect, type SafetyResult } from "@/lib/safety/detect";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

const STARTERS: readonly { text: string; icon: LucideIcon }[] = [
  { text: "What do my recent reports say?", icon: FileText },
  { text: "Has anything changed since last time?", icon: History },
  { text: "Is running safe during pregnancy?", icon: Activity },
];

/*
 * E1 — Ask Baymax.
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
  const { q, upload } = useLocalSearchParams<{ q?: string; upload?: string }>();

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const sentInitial = useRef(false);

  const context = useQuery({
    queryKey: ["ask-context"],
    queryFn: async () => {
      const [profile, quota] = await Promise.all([activeProfile(), chatQuota()]);
      return { profile, quota };
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
      const result = await askBaymax(text, conversationId, verdict.status);
      if (!result.ok) {
        if (result.quota) {
          // Not an error — the free allowance ran out. The question is put back
          // in the composer rather than thrown away.
          setLimitReached(true);
          setDraft(text);
          return;
        }
        setError(result.message);
        setDraft(text);
        return;
      }
      setConversationId(result.conversationId);
      setTurns((t) => [...t, result.user, result.assistant]);
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
          setLimitReached(true);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-2.5 px-5 pb-2 pt-2">
          <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand-50">
            <Stethoscope size={18} color={brand[600]} />
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-ink-900">Ask Baymax</Text>
            <Text className="text-[11.5px] text-ink-500">
              Answers about {context.data.profile.name}&apos;s records
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
            <View className="flex-1 items-center justify-center py-8">
              <MascotBust size={132} />
              <Text className="mt-3 text-center text-[17px] font-bold text-ink-900">
                Hi, I&apos;m Baymax
              </Text>
              <Text className="mt-1.5 max-w-[280px] text-center text-[13px] leading-[19px] text-ink-500">
                Ask me about {context.data.profile.name}&apos;s reports. I explain what they say. I
                never diagnose or prescribe.
              </Text>

              <View className="mt-5 w-full gap-2">
                {STARTERS.map(({ text, icon: Icon }) => (
                  <Pressable
                    key={text}
                    accessibilityRole="button"
                    onPress={() => void send(text)}
                    className="flex-row items-center gap-2.5 rounded-card bg-surface px-3.5 py-3"
                    style={shadow.e1}
                  >
                    <Icon size={16} color={brand[500]} />
                    <Text className="flex-1 text-[13.5px] text-ink-700">{text}</Text>
                  </Pressable>
                ))}
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

          {limitReached ? (
            <View className="mt-4 rounded-card bg-brand-50 p-4">
              <Text className="text-[14px] font-bold text-brand-700">
                You&apos;ve used your free chats this month
              </Text>
              <Text className="mt-1 text-[12.5px] leading-[18px] text-ink-700">
                Your question is still in the box. Plans arrive with the first store build, and your
                allowance resets on the 1st.
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-[13px] font-medium text-danger-text">
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View
          className="flex-row items-end gap-2 px-5 pt-2"
          style={{
            paddingBottom: 8,
            borderTopWidth: 1,
            borderTopColor: surface.line,
            backgroundColor: surface.base,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask anything…"
            placeholderTextColor={ink[300]}
            accessibilityLabel="Ask Baymax a question"
            multiline
            className="flex-1 rounded-card bg-canvas px-3.5 py-2.5"
            style={{
              maxHeight: 120,
              fontSize: 15,
              color: ink[900],
              fontFamily: "Inter_400Regular",
              borderWidth: 1,
              borderColor: surface.line,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask about a product"
            onPress={() => setPickerOpen(true)}
            className="h-11 w-11 items-center justify-center rounded-pill bg-canvas"
            style={{ borderWidth: 1, borderColor: surface.line }}
          >
            <Camera size={18} color={brand[600]} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: pending || !draft.trim() }}
            disabled={pending || !draft.trim()}
            onPress={() => void send(draft)}
            className="h-11 w-11 items-center justify-center rounded-pill bg-brand-600"
            style={{ opacity: pending || !draft.trim() ? 0.5 : 1 }}
          >
            <ArrowUp size={19} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ProductPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(id) => void sendProduct(id)}
      />

      <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />
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
        <View className="rounded-card bg-brand-600 px-3.5 py-2.5">
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
    <View className="max-w-[92%] self-start">
      <View className="rounded-card bg-surface px-3.5 py-3" style={shadow.e1}>
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
