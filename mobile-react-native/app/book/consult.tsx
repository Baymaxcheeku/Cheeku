import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ArrowUp, Building2, ChevronLeft, MonitorPlay, RotateCcw, Stethoscope } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { NoteCard } from "@/components/booking/note-card";
import { MascotBust } from "@/components/illustrations/sprout";
import { BubblePop, TypingDots } from "@/components/onboarding/motion";
import { CautionNote } from "@/components/safety/caution-note";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { Glass, GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { CONCERNS, SPECIALTIES, type Mode, type SpecialtyId } from "@/lib/booking/catalog";
import { useBookingDraft, type Intake } from "@/lib/booking/draft";
import { profileAccess } from "@/lib/profiles/context";
import { detect, type SafetyResult } from "@/lib/safety/detect";
import { shouldCaution } from "@/lib/safety/caution";
import { brand, hue, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { SkyWash } from "@/components/home/front";
import { SpecialistFallback, useSupply } from "@/components/booking/specialist-fallback";
import { PILLAR_TONE, glassCard } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { Brand } from "@/components/ui/brand";
import { goBack } from "@/lib/nav/go-back";

/*
 * Book a doctor — the conversation.
 *
 * ┌─ WHAT THIS SCREEN DOES ──────────────────────────────────────────────────┐
 * │                                                                          │
 * │ Cheeku interviews the reader the way a good clinic receptionist would,   │
 * │ one question at a time, and writes the answers up as a PRE-CONSULTATION  │
 * │ NOTE the doctor reads before the appointment. Then the reader picks the  │
 * │ kind of doctor and how to meet, and the flow hands over to the list.     │
 * │                                                                          │
 * │ It is scripted, not generated. Every question and every Cheeku line is   │
 * │ written here, so nothing in this flow can drift into advice.             │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * THE SAFETY GATE RUNS ON EVERY FREE-TEXT ANSWER, on device, before the flow
 * moves on — the same `detect` the chat uses. Anything that trips "escalate"
 * stops the booking and opens the emergency screen: somebody describing chest
 * pain must be sent to 112, not offered a slot on Thursday. Tier-2 shows the
 * caution note and lets them continue.
 *
 * NO TRIAGE. The reader chooses the area of concern; Cheeku only names the
 * department that handles that area and always offers a general physician.
 * It never reads symptoms, duration or severity to recommend a specialty —
 * those answers go into the note for the DOCTOR to read, and nowhere else.
 */

type Step = "who" | "concern" | "details" | "since" | "impact" | "tried" | "share" | "note" | "specialty" | "mode" | "done" | "stopped";

type Message =
  | { id: string; from: "cheeku"; text: string }
  | { id: string; from: "me"; text: string }
  | { id: string; from: "note"; intake: Intake }
  | { id: string; from: "caution"; result: SafetyResult };

const SINCE = ["Today", "2–3 days", "About a week", "More than a week", "Months"] as const;
const IMPACT = ["Hardly at all", "Somewhat", "A lot"] as const;

const QUESTION: Record<Exclude<Step, "note" | "done" | "stopped">, string> = {
  who: "Who is this appointment for?",
  concern: "What would you like to see a doctor about?",
  details: "Tell me a little more, in your own words. What's going on?",
  since: "Since when has this been going on?",
  impact: "How much is it getting in the way of your day?",
  tried: "Anything you've already tried, or are taking for it?",
  share: "Should I share your recent reports with the doctor too?",
  specialty: "",
  mode: "How would you like to meet the doctor?",
};

export default function Consult() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const draft = useBookingDraft();
  // Set when the chat's "Doctors nearby" or "Online consultation" opened this:
  // the person already said how they want to meet, so it is not asked again.
  //
  // From the chat's booking card, it also knows WHO (the person whose thread
  // it came from) and, when they named one, the kind of doctor. Neither is
  // asked again: the chat already heard it.
  const { mode: modeParam, who: whoParam, specialty: specialtyParam } = useLocalSearchParams<{ mode?: string; who?: string; specialty?: string }>();
  const presetMode: Mode | null = modeParam === "online" || modeParam === "clinic" ? modeParam : null;
  const presetSpecialty: SpecialtyId | null = specialtyParam && specialtyParam in SPECIALTIES ? (specialtyParam as SpecialtyId) : null;
  const presetWho = typeof whoParam === "string" && whoParam.trim() ? whoParam.trim() : null;
  const scroll = useRef<ScrollViewInstance>(null);
  const chosenSpecialty = useRef<SpecialtyId>("gp");
  // The result that stopped the flow, so the emergency screen can be reopened.
  const stoppedBy = useRef<SafetyResult | null>(null);

  const family = useQuery({
    queryKey: ["book-family"],
    queryFn: async () => (await profileAccess()).selectable.map((p) => p.name.split(" ")[0] ?? p.name),
    retry: false,
  });

  const [step, setStep] = useState<Step>("who");
  const [typing, setTyping] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  const [answers, setAnswers] = useState<Partial<Intake> & { concernId?: string }>({});

  // The opening: a greeting, then the first question, each after a "typing" beat.
  useEffect(() => {
    draft.reset();
    if (presetSpecialty) chosenSpecialty.current = presetSpecialty;
    if (presetWho) {
      setAnswers((a) => ({ ...a, forName: presetWho }));
      say(
        [
          presetSpecialty ? `Let's get ${presetWho} booked with a ${SPECIALTIES[presetSpecialty].label.toLowerCase()}.` : `Let's find ${presetWho} the right doctor.`,
          `A few quick questions and I'll write them up with what I already remember about ${presetWho}, so the doctor knows the story before you meet.`,
          QUESTION.concern,
        ],
        "concern",
      );
      return;
    }
    say(
      [
        "Let's find you the right doctor.",
        "I'll ask a few quick questions and write them up, so the doctor knows your story before you meet. No repeating yourself.",
        QUESTION.who,
      ],
      "who",
    );
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cheeku says one or more lines, each after a short typing pause. */
  function say(lines: string[], next: Step, extra?: Message[]) {
    setTyping(true);
    const beat = still ? 0 : 650;
    lines.forEach((text, i) => {
      setTimeout(() => {
        setMessages((m) => [...m, ...(i === 0 && extra ? extra : []), { id: `c${Date.now()}${i}`, from: "cheeku", text }]);
        if (i === lines.length - 1) {
          setTyping(false);
          setStep(next);
        }
      }, beat * (i + 1));
    });
  }

  function finish(mode: Mode) {
    draft.choose(chosenSpecialty.current, mode);
    const sp = SPECIALTIES[chosenSpecialty.current];
    say(
      [
        mode === "online"
          ? `Lovely. Let me see which ${sp.plural.toLowerCase()} are free on video. Your note goes ahead of you.`
          : `Lovely. Let me see which ${sp.plural.toLowerCase()} have clinic slots near you. Your note goes ahead of you.`,
      ],
      "done",
    );
  }

  function reply(text: string) {
    setMessages((m) => [...m, { id: `m${Date.now()}`, from: "me", text }]);
  }

  /** The gate. Returns false when the flow must stop. */
  function gate(text: string): { ok: boolean; caution?: Message } {
    if (!text.trim()) return { ok: true };
    const result = detect(text);
    if (result.status === "escalate") {
      stoppedBy.current = result;
      setEscalation(result);
      say(
        [
          "What you've described needs urgent care, not an appointment later. Please call 112 or get to the nearest emergency room now.",
        ],
        "stopped",
      );
      return { ok: false };
    }
    if (shouldCaution(result)) return { ok: true, caution: { id: `k${Date.now()}`, from: "caution", result } };
    return { ok: true };
  }

  function answer(value: string) {
    if (typing) return;
    const concern = CONCERNS.find((c) => c.id === answers.concernId);

    switch (step) {
      case "who":
        reply(value);
        setAnswers((a) => ({ ...a, forName: value }));
        say([QUESTION.concern], "concern");
        return;
      case "concern": {
        const picked = CONCERNS.find((c) => c.label === value);
        reply(value);
        setAnswers((a) => ({ ...a, concern: value, concernId: picked?.id }));
        say([QUESTION.details], "details");
        return;
      }
      case "details": {
        const text = value.trim();
        reply(text || "I'd rather not say");
        setInput("");
        const g = gate(text);
        if (!g.ok) return;
        setAnswers((a) => ({ ...a, details: text }));
        say(["Thanks, that helps.", QUESTION.since], "since", g.caution ? [g.caution] : undefined);
        return;
      }
      case "since":
        reply(value);
        setAnswers((a) => ({ ...a, since: value }));
        say([QUESTION.impact], "impact");
        return;
      case "impact":
        reply(value);
        setAnswers((a) => ({ ...a, impact: value }));
        say([QUESTION.tried], "tried");
        return;
      case "tried": {
        const text = value.trim();
        reply(text || "Nothing yet");
        setInput("");
        const g = gate(text);
        if (!g.ok) return;
        setAnswers((a) => ({ ...a, tried: text || "Nothing yet" }));
        say([QUESTION.share], "share", g.caution ? [g.caution] : undefined);
        return;
      }
      case "share": {
        reply(value);
        const intake: Intake = {
          forName: answers.forName ?? "Me",
          concern: answers.concern ?? "",
          details: answers.details ?? "",
          since: answers.since ?? "",
          impact: answers.impact ?? "",
          tried: answers.tried ?? "Nothing yet",
          shareRecords: value.startsWith("Yes"),
        };
        draft.setIntake(intake);
        say(["Here's your pre-consultation note. The doctor reads this before you meet."], "note");
        setTimeout(() => setMessages((m) => [...m, { id: `n${Date.now()}`, from: "note", intake }]), still ? 0 : 700);
        return;
      }
      case "note": {
        if (value === "Start over") {
          router.replace("/book/consult");
          return;
        }
        reply(value);
        // The kind of doctor was named in the chat: straight to how to meet.
        if (presetSpecialty) {
          if (presetMode) {
            finish(presetMode);
            return;
          }
          say([QUESTION.mode], "mode");
          return;
        }
        const depts = (concern?.departments ?? ["gp"]).map((d) => SPECIALTIES[d]);
        const area = (concern?.label ?? "this").toLowerCase();
        const line =
          depts.length > 1
            ? `For ${area}, many people start with a ${depts[0]?.label.toLowerCase()}. You can also go straight to a ${depts[1]?.label.toLowerCase()}. Your pick.`
            : `For ${area}, a ${depts[0]?.label.toLowerCase()} is the place to start.`;
        say([line], "specialty");
        return;
      }
      case "specialty": {
        const sp = Object.values(SPECIALTIES).find((s) => s.label === value);
        reply(value);
        chosenSpecialty.current = sp?.id ?? "gp";
        if (presetMode) {
          finish(presetMode);
          return;
        }
        say([QUESTION.mode], "mode");
        return;
      }
      case "mode": {
        reply(value);
        finish(value.startsWith("Online") ? "online" : "clinic");
        return;
      }
      default:
    }
  }

  const concern = CONCERNS.find((c) => c.id === answers.concernId);
  const whoOptions = [...(family.data?.length ? family.data : ["Me"]), "Someone else"];

  const chips: readonly string[] =
    step === "who"
      ? whoOptions
      : step === "concern"
        ? CONCERNS.map((c) => c.label)
        : step === "since"
          ? SINCE
          : step === "impact"
            ? IMPACT
            : step === "tried"
              ? ["Nothing yet"]
              : step === "details"
                ? ["Skip this"]
                : step === "share"
                  ? ["Yes, share them", "No, just the note"]
                  : step === "note"
                    ? ["Looks good", "Start over"]
                    : step === "specialty"
                      ? (concern?.departments ?? ["gp"]).map((d) => SPECIALTIES[d].label)
                      : [];

  const freeText = step === "details" || step === "tried";

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-canvas">
        <SkyWash top={0} />

        <Header onBack={() => goBack(router, "/home")} topInset={insets.top} />

        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 }}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !still })}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <Animated.View key={m.id} entering={still ? undefined : FadeInDown.duration(260)}>
              {m.from === "cheeku" ? <CheekuLine text={m.text} /> : null}
              {m.from === "me" ? <MyLine text={m.text} /> : null}
              {m.from === "note" ? <NoteCard intake={m.intake} /> : null}
              {m.from === "caution" ? <CautionNote result={m.result} /> : null}
            </Animated.View>
          ))}

          {typing ? (
            <View className="flex-row items-end gap-2">
              <View style={{ width: 34, flexShrink: 0 }}>
                <MascotBust size={34} mood="calm" />
              </View>
              <Glass strong className="rounded-lg px-4 py-3" style={{ borderBottomLeftRadius: 6 }}>
                <TypingDots color={brand[400]} />
              </Glass>
            </View>
          ) : null}

          {!typing && step === "mode" ? (
            <BubblePop from="right" style={{ gap: 10, marginTop: 4 }}>
              <ModeCard
                icon={<Icon3D name="video" size={40} />}
                tint={PILLAR_TONE.sleep.bg}
                title="Online consultation"
                body="Video call from home. 15 minutes, today if you like."
                onPress={() => answer("Online consultation")}
              />
              <ModeCard
                icon={<Icon3D name="hospital" size={40} />}
                tint={PILLAR_TONE.eat.bg}
                title="Clinic visit (OPD)"
                body="Pick an arrival window, get a token at the desk."
                onPress={() => answer("Clinic visit (OPD)")}
              />
            </BubblePop>
          ) : null}

          {!typing && step === "done" ? (
            <BubblePop from="right" style={{ marginTop: 4 }}>
              <DoneNext
                specialty={draft.specialty ?? chosenSpecialty.current}
                mode={draft.mode ?? "online"}
                onSee={() => router.push("/book/doctors")}
                onGp={() => {
                  draft.choose("gp", draft.mode ?? "online");
                  router.push("/book/doctors");
                }}
                onOtherMode={() => {
                  draft.setMode(draft.mode === "clinic" ? "online" : "clinic");
                  router.push("/book/doctors");
                }}
              />
            </BubblePop>
          ) : null}

          {step === "stopped" && !typing ? (
            <Tap
              accessibilityRole="button"
              onPress={() => setEscalation(stoppedBy.current)}
              className="mt-1 self-start rounded-pill px-4 py-2.5"
              style={{ backgroundColor: brand[600] }}
            >
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Show emergency numbers</Text>
            </Tap>
          ) : null}
        </ScrollView>

        {/* Quick replies sit right above the thumb, one tap each. */}
        {!typing && chips.length > 0 ? (
          <ScrollView
            horizontal={step !== "concern" && step !== "who"}
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 10,
              gap: 8,
              ...(step === "concern" || step === "who" ? { flexDirection: "row", flexWrap: "wrap" } : null),
            }}
            keyboardShouldPersistTaps="handled"
          >
            {chips.map((c) => (
              <Tap
                key={c}
                accessibilityRole="button"
                onPress={() => {
                  if (step === "details" && c === "Skip this") answer("");
                  else answer(c);
                }}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  backgroundColor: c === "Start over" ? "transparent" : c === "Looks good" ? brand[600] : "#fff",
                  borderWidth: 1,
                  borderColor: c === "Looks good" ? brand[600] : surface.line,
                }}
                scale={0.95}
              >
                <View className="flex-row items-center gap-1.5">
                  {c === "Start over" ? <RotateCcw size={14} color={ink[500]} /> : null}
                  <Text style={{ fontFamily: font.medium, fontSize: 15, color: c === "Looks good" ? "#fff" : ink[900] }}>{c}</Text>
                </View>
              </Tap>
            ))}
          </ScrollView>
        ) : null}

        {freeText && !typing ? (
          <View className="flex-row items-center gap-2 px-4 pt-1" style={{ paddingBottom: insets.bottom + 10 }}>
            <View style={[glassCard("#ffffff", "#0f1030"), { height: 56, flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 18, shadowOpacity: 0.06 }]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => answer(input)}
                placeholder={step === "details" ? "e.g. itchy rash on my arm since Sunday" : "e.g. an antacid, twice"}
                placeholderTextColor={ink[300]}
                accessibilityLabel="Your answer"
                returnKeyType="send"
                autoFocus
                style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: ink[900] }}
              />
            </View>
            <Tap accessibilityRole="button" accessibilityLabel="Send" onPress={() => answer(input)} scale={0.94} style={{ width: 56, height: 56, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: brand[600] }}>
              <ArrowUp size={21} color="#fff" />
            </Tap>
          </View>
        ) : (
          <View style={{ height: insets.bottom + 6 }} />
        )}

        <EmergencyEscalation result={escalation} onClose={() => setEscalation(null)} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Header({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  return (
    <View className="flex-row items-center gap-3 px-4 pb-2" style={{ paddingTop: topInset + 6 }}>
      <GlassCircle label="Go back" onPress={onBack}>
        <ChevronLeft size={21} color={ink[900]} />
      </GlassCircle>
      <View className="flex-1 items-center">
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>Book a doctor</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>with <Brand /></Text>
      </View>
      <View style={{ height: 28, paddingHorizontal: 12, borderRadius: 999, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 12, color: brand[700] }}>Preview</Text>
      </View>
    </View>
  );
}

function CheekuLine({ text }: { text: string }) {
  return (
    <View className="flex-row items-end gap-2 pr-10">
      {/* Fixed width: in a row with a growing bubble the mascot would shrink. */}
      <View style={{ width: 34, flexShrink: 0 }}>
        <MascotBust size={34} mood="thinking" motion="idle" />
      </View>
      <View style={[glassCard("#ffffff", "#0f1030"), { flexShrink: 1, borderRadius: 22, borderBottomLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 12, shadowOpacity: 0.05 }]}>
        <Text style={{ fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ink[900] }}>{text}</Text>
      </View>
    </View>
  );
}

function MyLine({ text }: { text: string }) {
  return (
    <View className="items-end pl-14">
      <View style={{ borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: brand[600], borderBottomRightRadius: 6 }}>
        <Text style={{ fontFamily: font.medium, fontSize: 16, lineHeight: 22, color: "#fff" }}>{text}</Text>
      </View>
    </View>
  );
}

function ModeCard({ icon, tint, title, body, onPress }: { icon: React.ReactNode; tint: string; title: string; body: string; onPress: () => void }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}`}
      onPress={onPress}
      scale={0.98}
    >
      <View style={[glassCard("#ffffff", "#0f1030"), { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 24, padding: 12, paddingRight: 16, shadowOpacity: 0.05 }]}>
        <View style={{ width: 60, height: 60, borderRadius: 18, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
          {icon}
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{title}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 2 }}>{body}</Text>
        </View>
      </View>
    </Tap>
  );
}

/**
 * The last step of the chat. Checks the partner has this department in this
 * mode before sending the person to an empty list; if not, offers a GP (or
 * the other way to meet) right here in the chat.
 */
function DoneNext({ specialty, mode, onSee, onGp, onOtherMode }: { specialty: SpecialtyId; mode: Mode; onSee: () => void; onGp: () => void; onOtherMode: () => void }) {
  const supply = useSupply(specialty, mode);
  if (specialty !== "gp" && !supply.loading && !supply.error && supply.count === 0) {
    return <SpecialistFallback specialty={specialty} mode={mode} onGp={onGp} onOtherMode={onOtherMode} />;
  }
  return (
    <Tap accessibilityRole="button" onPress={onSee} scale={0.98}>
      <View style={[glassCard(PILLAR_TONE.sleep.glass), { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 24, padding: 12, paddingRight: 14 }]}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon3D name="doctor" size={42} />
        </View>
        <View className="flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{supply.loading ? "Checking who's free" : "See available doctors"}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>
            {supply.count > 0 ? `${supply.count} ${supply.count === 1 ? "doctor" : "doctors"} · your note goes with the booking` : "Your note goes with the booking"}
          </Text>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
          <ArrowRight size={18} color="#fff" />
        </View>
      </View>
    </Tap>
  );
}
