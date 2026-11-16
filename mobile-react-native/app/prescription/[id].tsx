import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, CircleAlert, CircleCheck, CircleHelp, FileText, MessageCircle, Pill, RotateCcw, Share2, ShieldAlert, ShieldCheck, Stethoscope, Truck, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Share, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { Card, Section } from "@/components/records/detail/parts";
import { Gradient, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Reveal, RevealScroll } from "@/components/ui/reveal";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { Bone, Pulse } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { useRescore, useScorecard, type Scorecard } from "@/lib/rx/queries";
import { brand, hue, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The prescription scorecard (loop-reading-v2). Every medicine read down to
 * its salts, checked on ten standards against this person's own records.
 *
 * ORDER OF THE PAGE is the order of the questions someone has holding a new
 * prescription: is it all right for her (the verdict), what exactly is in it
 * (the medicines), why (the ten checks, each one open-able to the record it
 * rests on), what do I ask (the doctor's questions, ready to send), and can I
 * pay less (same salt). Ordering comes last, as the next step.
 *
 * COLOUR is health meaning only (PLAN.md rule 3): green clear, amber to sort,
 * red only for "ask before the first dose". The verdict never says "stop
 * taking"; everything that needs action is a question for the doctor.
 */

type Status = Scorecard["checks"][number]["status"];
const TONE: Record<Status, { icon: LucideIcon; fg: string; bg: string; word: string }> = {
  clear: { icon: CircleCheck, fg: semantic.safeText, bg: semantic.safeBg, word: "Clear" },
  act: { icon: CircleAlert, fg: semantic.attentionText, bg: semantic.attentionBg, word: "To sort" },
  stop: { icon: ShieldAlert, fg: semantic.dangerText, bg: semantic.dangerBg, word: "Ask first" },
  unknown: { icon: CircleHelp, fg: hue.slate.fg, bg: hue.slate.bg, word: "Couldn't check" },
};
const VERDICT_TONE: Record<Scorecard["verdict"]["tone"], Status> = { fits: "clear", sort: "act", stop: "stop", partial: "unknown" };

export default function PrescriptionScorecard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const q = useScorecard(id);
  const rescore = useRescore();
  const [busy, setBusy] = useState(false);
  const card = q.data;

  async function again() {
    if (!id || busy) return;
    setBusy(true);
    feel.tap();
    try {
      await rescore(id);
      feel.success();
    } catch {
      feel.warn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title="Prescription check"
        subtitle={card ? `For ${card.person}` : undefined}
        fallback="/records"
        right={
          card ? (
            <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Check again with the latest records" onPress={again} disabled={busy} hitSlop={6} style={[glassShadow, { width: 44, height: 44, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", opacity: busy ? 0.5 : 1 }]}>
              <RotateCcw size={18} color={ink[700]} />
            </Tap>
          ) : undefined
        }
      />
      {q.isPending ? (
        <Loading />
      ) : !card ? (
        <Problem message={q.error ? "I couldn't check this prescription just now." : "This prescription isn't in the file any more."} onRetry={q.error ? () => void q.refetch() : undefined} />
      ) : (
        <>
          <RevealScroll contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
            <Hero card={card} />
            <Medicines card={card} />
            <Checks card={card} onOpenRecord={(doc) => router.push({ pathname: "/records/[id]", params: { id: doc } })} />
            <Questions card={card} />
            <Prices card={card} />
            <Reveal style={{ marginTop: 18, flexDirection: "row", gap: 10, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: surface.line }}>
              <ShieldCheck size={16} color={ink[900]} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: ink[700] }}>
                A check, not a diagnosis. Read against {card.basis.records} records, {card.basis.labs} lab values and {card.basis.medicines} other {card.basis.medicines === 1 ? "medicine" : "medicines"} on file. Talk to the doctor before starting, stopping or switching anything.
              </Text>
            </Reveal>
          </RevealScroll>
          {/* Scroll edge: content fades under the floating bar instead of colliding with it. */}
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: insets.bottom + 110 }}>
            <Gradient from="rgba(250,250,254,0)" to={surface.canvas} angle="vertical" />
          </View>
          <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 14 }}>
            <Tap accessibilityRole="button" accessibilityLabel={`Ask Cheeku about ${card.person}'s prescription`} onPress={() => router.push("/ask")} style={[glassShadow, { width: 56, height: 56, borderRadius: 999, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }]} scale={0.96}>
              <MessageCircle size={22} color={ink[900]} />
            </Tap>
            <Tap accessibilityRole="button" onPress={() => router.push("/pharmacy" as never)} style={{ flex: 1, height: 56, borderRadius: 999, backgroundColor: ink[900], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }} scale={0.98}>
              <Truck size={18} color="#fff" />
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Order with home delivery</Text>
            </Tap>
          </View>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ hero -- */

/** The clear share of the ten, always in green: the arc counts what passed, the verdict says the rest. */
function ScoreRing({ clear, size = 92 }: { clear: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View accessibilityLabel={`${clear} of 10 checks clear`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.85)" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={semantic.safe} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - clear / 10)} />
      </Svg>
      <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -1, color: ink[900] }}>
        {clear}
        <Text style={{ fontFamily: font.medium, fontSize: 13, letterSpacing: 0, color: ink[500] }}>/10</Text>
      </Text>
    </View>
  );
}

function Hero({ card }: { card: Scorecard }) {
  const status = VERDICT_TONE[card.verdict.tone];
  const t = TONE[status];
  const counts = (["clear", "act", "stop", "unknown"] as Status[]).filter((s) => (s === "act" ? card.score.act : s === "stop" ? card.score.stop : s === "unknown" ? card.score.unknown : card.score.clear) > 0);
  const n = (s: Status) => (s === "act" ? card.score.act : s === "stop" ? card.score.stop : s === "unknown" ? card.score.unknown : card.score.clear);
  return (
    <Reveal style={[glassShadow, { marginTop: 6, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
      <Gradient from={t.bg} to="#ffffff" glow="#ffffff" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ScoreRing clear={card.score.clear} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.fg }}>Checked on 10 standards</Text>
          <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.5, color: ink[900], marginTop: 4 }}>{card.verdict.title}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 20, color: ink[700], marginTop: 12 }}>{card.verdict.line}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {counts.map((s) => {
          const x = TONE[s];
          return (
            <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.9)" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s === "clear" ? semantic.safe : x.fg }} />
              <Text style={{ fontFamily: font.semibold, fontSize: 12, color: ink[900] }}>
                {n(s)} {x.word.toLowerCase()}
              </Text>
            </View>
          );
        })}
      </View>
      {card.doctor ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(15,16,48,0.06)" }}>
          <Stethoscope size={14} color={ink[500]} />
          <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>Prescribed by {card.doctor}</Text>
        </View>
      ) : null}
    </Reveal>
  );
}

/* ------------------------------------------------------------- medicines -- */

function StatusPill({ status }: { status: Status }) {
  const t = TONE[status];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 999, backgroundColor: t.bg }}>
      <t.icon size={12} color={t.fg} />
      <Text style={{ fontFamily: font.semibold, fontSize: 11, color: t.fg }}>{t.word}</Text>
    </View>
  );
}

function Medicines({ card }: { card: Scorecard }) {
  return (
    <Section title={card.medicines.length === 1 ? "The medicine" : `${card.medicines.length} medicines`}>
      <Card padded={false}>
        {card.medicines.map((m, i) => (
          <View key={m.name + i} style={{ flexDirection: "row", gap: 12, padding: 14, borderTopWidth: i ? 1 : 0, borderTopColor: glass.rim }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: hue.rose.bg, alignItems: "center", justifyContent: "center" }}>
              <Pill size={19} color={hue.rose.fg} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{m.name}</Text>
                <StatusPill status={m.status} />
              </View>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
                {m.resolved ? m.salts.map((s) => `${s.name}${s.strength ? ` ${s.strength}` : ""}`).join(" + ") : "Not in my medicine list yet"}
              </Text>
              {m.how ? <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginTop: 3 }}>{m.how}</Text> : null}
            </View>
          </View>
        ))}
      </Card>
    </Section>
  );
}

/* ---------------------------------------------------------------- checks -- */

function Checks({ card, onOpenRecord }: { card: Scorecard; onOpenRecord: (documentId: string) => void }) {
  // Open the ones that need a word, so the reason is on screen without a tap.
  const [open, setOpen] = useState<Set<string>>(() => new Set(card.checks.filter((c) => c.status === "stop").map((c) => c.id)));
  return (
    <Section title="The 10 checks" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>Tap one to see why</Text>}>
      <Card padded={false}>
        {card.checks.map((c, i) => (
          <CheckRow
            key={c.id}
            check={c}
            first={i === 0}
            open={open.has(c.id)}
            onToggle={() => {
              feel.tick();
              setOpen((s) => {
                const n = new Set(s);
                if (n.has(c.id)) n.delete(c.id);
                else n.add(c.id);
                return n;
              });
            }}
            onOpenRecord={onOpenRecord}
          />
        ))}
      </Card>
    </Section>
  );
}

function CheckRow({ check, first, open, onToggle, onOpenRecord }: { check: Scorecard["checks"][number]; first: boolean; open: boolean; onToggle: () => void; onOpenRecord: (id: string) => void }) {
  const still = useReducedMotion();
  const t = TONE[check.status];
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: withSpring(open ? "180deg" : "0deg", { damping: 26, stiffness: 300 }) }] }), [open]);
  const findings = check.findings.length ? check.findings : [{ medicine: "", status: check.status, text: check.line }];
  return (
    <Animated.View layout={still ? undefined : LinearTransition.springify().damping(26).stiffness(260)} style={{ borderTopWidth: first ? 0 : 1, borderTopColor: glass.rim }}>
      <Tap accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${check.n}. ${check.title}. ${t.word}. ${check.line}`} onPress={onToggle} scale={0.99} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 14 }}>
        <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: t.bg, alignItems: "center", justifyContent: "center" }}>
          <t.icon size={16} color={t.fg} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: check.status === "clear" ? ink[900] : t.fg }}>{check.title}</Text>
          <Text numberOfLines={open ? undefined : 2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], marginTop: 1 }}>
            {check.line}
          </Text>
        </View>
        <Animated.View style={chevron}>
          <ChevronDown size={18} color={ink[300]} />
        </Animated.View>
      </Tap>
      {open ? (
        <Animated.View entering={still ? undefined : FadeIn.duration(180)} style={{ paddingLeft: 58, paddingRight: 14, paddingBottom: 14, gap: 10 }}>
          {findings.map((f, i) => {
            const ft = TONE[f.status];
            return (
              <View key={i} style={{ padding: 12, borderRadius: 12, backgroundColor: f.status === "clear" ? "rgba(15,16,48,0.035)" : ft.bg }}>
                {f.medicine ? <Text style={{ fontFamily: font.semibold, fontSize: 12, color: f.status === "clear" ? ink[700] : ft.fg }}>{f.medicine}</Text> : null}
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[900], marginTop: f.medicine ? 2 : 0 }}>{f.text}</Text>
                {f.source ? (
                  f.source.documentId ? (
                    <Tap accessibilityRole="link" accessibilityLabel={`Open ${f.source.label}`} onPress={() => onOpenRecord(String(f.source?.documentId))} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, alignSelf: "flex-start" }}>
                      <FileText size={12} color={ink[900]} />
                      <Text style={{ fontFamily: font.medium, fontSize: 12, color: brand[600] }}>{f.source.label}</Text>
                    </Tap>
                  ) : (
                    <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500], marginTop: 6 }}>From {f.source.label.charAt(0).toLowerCase() + f.source.label.slice(1)}</Text>
                  )
                ) : null}
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/* ------------------------------------------------------------- questions -- */

function Questions({ card }: { card: Scorecard }) {
  if (!card.questions.length) return null;
  const who = card.doctor ?? "the doctor";
  const text = [`Questions about ${card.person}'s prescription${card.doctor ? ` from ${card.doctor}` : ""}:`, ...card.questions.map((q, i) => `${i + 1}. ${q}`)].join("\n");
  return (
    <Section title={`Ask ${who}`}>
      <View style={[glassShadow, { borderRadius: 24, overflow: "hidden", padding: 16 }]}>
        <Gradient from={brand[50]} to="#ffffff" />
        <View style={{ gap: 12 }}>
          {card.questions.map((q, i) => (
            <View key={q} style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>{i + 1}</Text>
              </View>
              <Text selectable style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 20, color: ink[900] }}>{q}</Text>
            </View>
          ))}
        </View>
        <Tap accessibilityRole="button" onPress={() => void Share.share({ message: text }).catch(() => undefined)} style={{ marginTop: 16, height: 46, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1.5, borderColor: brand[200], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }} scale={0.98}>
          <Share2 size={16} color={brand[700]} />
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>Send the questions</Text>
        </Tap>
      </View>
    </Section>
  );
}

/* ---------------------------------------------------------------- prices -- */

function Prices({ card }: { card: Scorecard }) {
  const withSaving = card.medicines.filter((m) => m.alternatives.some((a) => a.save));
  if (!withSaving.length) return null;
  return (
    <Section title="Same salt, lower price">
      <View style={{ gap: 12 }}>
        {withSaving.map((m) => (
          <Card key={m.name} padded={false}>
            {m.alternatives.map((a, i) => (
              <View key={a.name} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: i ? 1 : 0, borderTopColor: glass.rim }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: a.prescribed ? brand[50] : hue.teal.bg, alignItems: "center", justifyContent: "center" }}>
                  {a.prescribed ? <Pill size={16} color={ink[900]} /> : <CircleCheck size={16} color={hue.teal.fg} />}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={2} style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900] }}>{a.name}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{a.note}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {a.price !== null ? <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>₹{a.price}</Text> : null}
                  {a.save ? <Text style={{ fontFamily: font.semibold, fontSize: 11, color: hue.teal.fg, marginTop: 1 }}>{a.save}% less</Text> : null}
                </View>
              </View>
            ))}
          </Card>
        ))}
        <Text style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500], paddingHorizontal: 4 }}>
          Indicative prices for {withSaving[0]?.alternatives[0]?.per ?? "a strip"}; your pharmacy confirms. Ask the doctor before switching brands.
        </Text>
      </View>
    </Section>
  );
}

/* ---------------------------------------------------------------- states -- */

function Loading() {
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 6, gap: 14 }} accessibilityLabel="Checking the prescription">
      <Pulse>
        <View style={{ borderRadius: 32, padding: 20, backgroundColor: "rgba(255,255,255,0.7)", flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Bone w={92} h={92} r={46} tint />
          <View style={{ flex: 1, gap: 8 }}>
            <Bone w="60%" h={10} />
            <Bone w="90%" h={20} />
            <Bone w="70%" h={20} />
          </View>
        </View>
      </Pulse>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500], textAlign: "center" }}>Reading every salt against the records…</Text>
      <Pulse>
        <View style={{ borderRadius: 24, padding: 16, gap: 14, backgroundColor: "rgba(255,255,255,0.7)" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Bone w={32} h={32} r={16} />
              <View style={{ flex: 1, gap: 6 }}>
                <Bone w="50%" h={12} />
                <Bone w="85%" h={10} />
              </View>
            </View>
          ))}
        </View>
      </Pulse>
    </View>
  );
}

function Problem({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={{ paddingHorizontal: 32, marginTop: 60, alignItems: "center", gap: 14 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900], textAlign: "center" }}>{message}</Text>
      {onRetry ? (
        <Tap accessibilityRole="button" onPress={onRetry} style={{ height: 46, paddingHorizontal: 22, borderRadius: 999, backgroundColor: ink[900], alignItems: "center", justifyContent: "center" }} scale={0.98}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Try again</Text>
        </Tap>
      ) : null}
    </View>
  );
}
