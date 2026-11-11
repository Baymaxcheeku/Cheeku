import { useRouter } from "expo-router";
import {
  Activity,
  ChevronLeft,
  CircleCheck,
  ClipboardList,
  Download,
  Eye,
  FileHeart,
  FlaskConical,
  HeartHandshake,
  History,
  Lock,
  MessageCircleHeart,
  PhoneCall,
  PillBottle,
  ScanLine,
  Siren,
  Stethoscope,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Brand } from "@/components/ui/brand";
import { GlassCircle, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { Drift, PulseRing } from "@/components/ui/motion";
import { Body, Eyebrow, Question, Title } from "@/components/settings/editorial";
import { Reveal, RevealScroll, Spin } from "@/components/ui/reveal";
import { APP_VERSION } from "@/lib/app-meta";
import { castFaces } from "@/lib/profiles/avatar";
import { brand, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { goBack } from "@/lib/nav/go-back";

/*
 * ABOUT CHEEKU. The product's case for itself, told as a short story:
 *
 *   hero          what it is, in one line, with Cheeku and the kind of thing
 *                 it remembers floating around it
 *   how it works  four steps, revealed as you scroll
 *   four levels   the urgency ladder, which is the promise in one picture
 *   inside        the parts nobody else does: the doctor script, medicine
 *                 overlaps, results still pending, honest corrections
 *   families      one plan, separate files
 *   trust         private, exportable, deletable; and what it will never do
 *   questions     the awkward ones, answered plainly
 *
 * WHAT IT MAY CLAIM. Cheeku reads symptoms against a person's own history
 * using general health knowledge and says how urgent things look, up to the
 * point where a doctor or an emergency is needed. It does not diagnose, and
 * no line on this page says or implies it does. No invented user counts,
 * ratings or testimonials: every claim here can be checked inside the app.
 *
 * MOTION. Sections rise in once as they scroll into view (Reveal), the hero
 * floats, a ring turns behind Cheeku. All of it stops for "Reduce motion".
 */

export default function About() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const faces = castFaces(4);

  return (
    <View style={{ flex: 1, backgroundColor: surface.canvas }}>
      <RevealScroll contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* ------------------------------------------------------------ hero */}
        <View style={{ overflow: "hidden", paddingTop: insets.top + 8, paddingBottom: 30 }}>
          <Gradient from={lilac.violet} to={surface.canvas} angle="vertical" glow="#ffffff" />
          <View style={{ paddingHorizontal: 16 }}>
            <GlassCircle label="Go back" onPress={() => goBack(router, "/settings")}>
              <ChevronLeft size={21} color={ink[900]} />
            </GlassCircle>
          </View>

          <View style={{ height: 300, alignItems: "center", justifyContent: "center", marginTop: 4 }}>
            <Spin seconds={40} style={{ position: "absolute", width: 260, height: 260, zIndex: 0 }}>
              <View style={{ flex: 1, borderRadius: 999, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[200] }} />
            </Spin>
            <View style={{ position: "absolute", width: 170, height: 170, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.7)", zIndex: 0 }} />
            <View style={{ position: "absolute", zIndex: 0, alignItems: "center", justifyContent: "center", width: 170, height: 170 }}>
              <PulseRing size={170} />
            </View>
            <View style={{ zIndex: 2 }}>
              <MascotFigure size={176} moment="joy" hop />
            </View>

            <Floating label="Bilirubin 11.0" note="day 3" icon={FlaskConical} style={{ left: 14, top: 26 }} delay={0} />
            <Floating label="BP 132/84" note="home monitor" icon={Activity} style={{ right: 10, top: 64 }} delay={0.6} />
            <Floating label="Vitamin D3 drops" note="400 IU" icon={PillBottle} style={{ left: 6, bottom: 54 }} delay={1.2} />
            <Floating label="Follow-up" note="in 6 days" icon={History} style={{ right: 18, bottom: 22 }} delay={1.8} />
          </View>

          <View style={{ paddingHorizontal: 24, alignItems: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: brand[600] }}>
              About <Brand ai size={12} style={{ textTransform: "none", letterSpacing: 0.2 }} />
            </Text>
            <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 34, lineHeight: 37, letterSpacing: -1, color: ink[900], textAlign: "center", marginTop: 8 }}>
              Your family&apos;s health,{"\n"}
              <Text style={{ fontFamily: font.italic, color: brand[600] }}>remembered.</Text>
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 23, color: ink[700], textAlign: "center", marginTop: 12, maxWidth: 330 }}>
              <Brand /> keeps every report, every reading and every conversation, for every person in your family. So when something isn&apos;t right, the answer starts from everything that came before.
            </Text>
          </View>
        </View>

        {/* ------------------------------------------------------ how it works */}
        <Reveal style={{ paddingHorizontal: 20, marginTop: 6 }}>
          <Eyebrow>How it works</Eyebrow>
          <Title>From a photo of a report to knowing what to do</Title>
        </Reveal>
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 60} style={{ paddingHorizontal: 20 }}>
            <Step n={i + 1} last={i === STEPS.length - 1} {...s} />
          </Reveal>
        ))}

        {/* ------------------------------------------------------- four levels */}
        <Reveal style={{ marginHorizontal: 20, marginTop: 30 }}>
          <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", padding: 20 }]}>
            <Gradient from="#ffffff" to={brand[50]} angle="diagonal" />
            <Eyebrow>One clear answer</Eyebrow>
            <Title>Every worry lands on one of four levels</Title>
            <Body>
              <Brand /> understands a symptom the way a sensible nurse on the phone would: what usually causes it at this age, what this person&apos;s own numbers say, and what would change the picture. Then it tells you plainly how urgent it looks.
            </Body>
            <View style={{ marginTop: 16, gap: 10 }}>
              {LEVELS.map((l) => (
                <Level key={l.title} {...l} />
              ))}
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 14 }}>
              Some things skip the reasoning entirely: fewer movements late in pregnancy, a fever in a baby under three months. Those go straight to &quot;go now&quot;, every time.
            </Text>
          </View>
        </Reveal>

        {/* ------------------------------------------------------------ inside */}
        <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
          <Eyebrow>What makes it different</Eyebrow>
          <Title>A memory, not a search box</Title>
          <Body>Search engines know medicine. They don&apos;t know that Imaad is 22 days old, that his last bilirubin was 11.0, or that two of his drops both contain vitamin D.</Body>
        </Reveal>
        <Reveal style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Feature icon={Stethoscope} title="Briefs your doctor" text="When a call is needed, it writes out exactly what to say, with the numbers and dates." />
            <Feature icon={PillBottle} title="Catches overlaps" text="Two products, one ingredient. It adds them up across every prescription." />
          </View>
        </Reveal>
        <Reveal style={{ paddingHorizontal: 20, marginTop: 10 }} delay={80}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Feature icon={ClipboardList} title="Chases the loose ends" text="A test that was billed but never reported. A follow-up that's due. It notices." />
            <Feature icon={History} title="Corrects itself" text="Tell it a number was wrong and it says what changed in its earlier answer." />
          </View>
        </Reveal>

        {/* ---------------------------------------------------------- families */}
        <Reveal style={{ marginHorizontal: 20, marginTop: 34 }}>
          <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", padding: 20 }]}>
            <Gradient from={lilac.deep} to={lilac.mist} angle="diagonal" glow="#ffffff" />
            <View style={{ flexDirection: "row", marginBottom: 14 }}>
              {faces.map((svg, i) => (
                <View key={i} style={{ marginLeft: i ? -12 : 0, width: 52, height: 52, borderRadius: 999, borderWidth: 3, borderColor: "#fff", overflow: "hidden", backgroundColor: "#fff" }}>
                  <SvgXml xml={svg} width={46} height={46} />
                </View>
              ))}
            </View>
            <Eyebrow>Made for families</Eyebrow>
            <Title>Mum&apos;s thyroid, your baby&apos;s jaundice, your own blood pressure</Title>
            <Body>Up to four people on one plan, each with a file of their own that never mixes with anyone else&apos;s. A new baby can even start life with the details of the pregnancy already on file.</Body>
            <View style={{ marginTop: 14, gap: 8 }}>
              <Tick text="Separate files, switched with one tap" />
              <Tick text="Age-aware answers, from day 1 of life to 80 and beyond" />
              <Tick text="Pregnancy tracked by scan dating, week by week" />
            </View>
          </View>
        </Reveal>

        {/* ------------------------------------------------------------- trust */}
        <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
          <Eyebrow>Your data</Eyebrow>
          <Title>Private by design, yours to take or delete</Title>
        </Reveal>
        <Reveal style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Trust icon={Lock} title="Encrypted" text="In transit and at rest" />
            <Trust icon={Download} title="Exportable" text="Everything, any time" />
            <Trust icon={Trash2} title="Deletable" text="Gone, for good" />
          </View>
        </Reveal>
        <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: surface.line, backgroundColor: "#fff", padding: 18 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
              What <Brand /> will never do
            </Text>
            <View style={{ marginTop: 12, gap: 10 }}>
              {NEVER.map((n) => (
                <View key={n} style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <X size={12} color={ink[500]} strokeWidth={2.6} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700] }}>{n}</Text>
                </View>
              ))}
            </View>
          </View>
        </Reveal>

        {/* --------------------------------------------------------- questions */}
        <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
          <Eyebrow>Good questions</Eyebrow>
          <Title>The ones people ask before they trust it</Title>
        </Reveal>
        <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
          <View style={[glassShadow, { borderRadius: 24, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim, overflow: "hidden" }]}>
            {FAQ.map((f, i) => (
              <Question key={f.q} q={f.q} a={f.a} first={i === 0} />
            ))}
          </View>
        </Reveal>

        {/* ---------------------------------------------------------------- CTA */}
        <Reveal style={{ marginHorizontal: 20, marginTop: 30 }}>
          <View style={{ borderRadius: 32, overflow: "hidden", padding: 22, alignItems: "center" }}>
            <Gradient from={brand[700]} to={brand[500]} angle="diagonal" glow={brand[400]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 29, letterSpacing: -0.6, color: "#fff", textAlign: "center" }}>
              Something on your mind?
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 6 }}>
              Tell <Brand onDark /> what&apos;s going on. It already knows the background.
            </Text>
            <Tap
              accessibilityRole="button"
              onPress={() => router.push("/ask")}
              style={{ marginTop: 16, height: 50, paddingHorizontal: 22, borderRadius: 999, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <MessageCircleHeart size={18} color={brand[700]} />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>Start a chat</Text>
            </Tap>
          </View>
        </Reveal>

        <Reveal style={{ alignItems: "center", marginTop: 24, gap: 4 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>
            <Brand ai size={13} /> · Version {APP_VERSION}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[300], textAlign: "center", paddingHorizontal: 40 }}>
            General health guidance, not a diagnosis. In an emergency, call 112.
          </Text>
        </Reveal>
      </RevealScroll>
    </View>
  );
}

// ------------------------------------------------------------------ content --

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ScanLine, title: "Add anything", text: "Snap a lab report, a prescription, a bill, even a medicine box. Or just type a reading: \"BP 128/82 this morning\"." },
  { icon: FileHeart, title: "It remembers", text: "Filed to the right person and date, with the numbers pulled out and lined up against last time." },
  { icon: MessageCircleHeart, title: "Tell it what's going on", text: "\"He's sleepy and gassy today.\" It reads that against his age, his history and his medicines." },
  { icon: CircleCheck, title: "Know what to do", text: "One clear level of urgency, what usually helps, and the exact words for the doctor if a call is needed." },
];

const LEVELS: { tier: "reassure" | "monitor" | "contact_today" | "go_now"; icon: LucideIcon; title: string; text: string }[] = [
  { tier: "reassure", icon: CircleCheck, title: "Fits the usual pattern", text: "What it is, why it happens, and what helps at home." },
  { tier: "monitor", icon: Eye, title: "Keep an eye on it", text: "The exact signs that would change the answer." },
  { tier: "contact_today", icon: PhoneCall, title: "Call the doctor today", text: "A ready-made script, with the numbers." },
  { tier: "go_now", icon: Siren, title: "Go now", text: "Where to go and who to call. No analysis to read past." },
];

const NEVER = [
  "Name a diagnosis, or decide what a result means for treatment",
  "Start, stop or change a medicine dose",
  "Answer an emergency with analysis instead of sending you to help",
  "Show one family member's records under another's name",
  "Sell your data, or share it outside your family",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is Cheeku a doctor?",
    a: "No. It is a health memory with good judgement about urgency. It uses general health knowledge to understand a symptom up to a point, reads it against your own records, and tells you how urgent it looks. Examining, diagnosing and treating stay with your doctor, and Cheeku makes that conversation better.",
  },
  {
    q: "Where do the answers come from?",
    a: "Your own memory first: the reports you added, the readings you mentioned and what you talked about before, each with its date. Symptoms are read with general health knowledge, against limits that fit the person's age or stage. Every answer shows what it read.",
  },
  {
    q: "What if I tell it something wrong?",
    a: "Correct it in the chat (\"sorry, his weight is 3.3, not 3.7\") and Cheeku replaces the old number and tells you which earlier answer it changed. You can also see, correct or forget every remembered reading on the Memory page.",
  },
  {
    q: "Can my family see each other's records?",
    a: "Everyone on a family plan lives in one account, but each person's file is separate. Answers about one person only ever use that person's records.",
  },
  {
    q: "Who can see my data?",
    a: "Only you, inside your own account. It isn't sold and isn't used for advertising. You can export everything or delete your account from the bottom of your Profile screen.",
  },
];

// -------------------------------------------------------------------- parts --

function Floating({ label, note, icon: Icon, style, delay }: { label: string; note: string; icon: LucideIcon; style: object; delay: number }) {
  return (
    <Drift delay={delay} style={[{ position: "absolute", zIndex: 3 }, style]}>
      <View style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 7, paddingLeft: 7, paddingRight: 11, borderRadius: 999, backgroundColor: "#fff" }]}>
        <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={ink[900]} />
        </View>
        <View>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>{label}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 10, color: ink[500] }}>{note}</Text>
        </View>
      </View>
    </Drift>
  );
}

function Step({ n, last, icon: Icon, title, text }: { n: number; last: boolean; icon: LucideIcon; title: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 14, marginTop: n === 1 ? 18 : 0 }}>
      <View style={{ alignItems: "center", width: 44 }}>
        <View style={[glassShadow, { width: 44, height: 44, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }]}>
          <Icon size={20} color={ink[900]} />
        </View>
        {last ? null : <View style={{ width: 2, flex: 1, minHeight: 24, marginVertical: 6, borderRadius: 1, backgroundColor: brand[100] }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8, color: brand[500] }}>STEP {n}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], marginTop: 2 }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700], marginTop: 3 }}>{text}</Text>
      </View>
    </View>
  );
}

const LEVEL_TONE = {
  reassure: { bg: semantic.safeBg, fg: semantic.safeText },
  monitor: { bg: semantic.cautionBg, fg: semantic.cautionText },
  contact_today: { bg: semantic.dangerBg, fg: semantic.dangerText },
  go_now: { bg: semantic.dangerStrong, fg: "#ffffff" },
} as const;

function Level({ tier, icon: Icon, title, text }: (typeof LEVELS)[number]) {
  const t = LEVEL_TONE[tier];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={t.fg} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 1 }}>{text}</Text>
      </View>
    </View>
  );
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <View style={[glassShadow, { flex: 1, borderRadius: 24, backgroundColor: "#fff", padding: 14, gap: 8 }]}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={ink[900]} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{text}</Text>
    </View>
  );
}

function Tick({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
      <HeartHandshake size={15} color={ink[900]} style={{ marginTop: 2 }} />
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: ink[900] }}>{text}</Text>
    </View>
  );
}

function Trust({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <View style={[glassShadow, { flex: 1, alignItems: "center", borderRadius: 24, backgroundColor: "#fff", paddingVertical: 16, paddingHorizontal: 8, gap: 6 }]}>
      <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={ink[900]} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], textAlign: "center" }}>{text}</Text>
    </View>
  );
}
