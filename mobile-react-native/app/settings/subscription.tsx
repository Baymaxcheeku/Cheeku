import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  Crown,
  FileHeart,
  Infinity as InfinityIcon,
  MessageCircle,
  Minus,
  Pause,
  Play,
  ShieldCheck,
  UserRound,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Tap } from "@/components/ui/tap";
import { Sheet } from "@/components/ui/sheet";
import { Paywall } from "@/components/billing/paywall";
import { SettingsScreen } from "@/components/settings/chrome";
import { Body, Eyebrow, Questions, Title, type QA } from "@/components/settings/editorial";
import { Avatar } from "@/components/ui/avatar";
import { BRAND_ON_DARK, brandify } from "@/components/ui/brand";
import { Glass, Gradient, glassShadow } from "@/components/ui/glass";
import { Reveal } from "@/components/ui/reveal";
import { PillButton } from "@/components/ui/screen";
import {
  DAILY_PASS_HOURS,
  familySavingPercent,
  FREE_CHAT_LIMIT,
  FREE_PLAN,
  formatPrice,
  isUnlimited,
  perDayLabel,
  perSeatLabel,
  planFor,
  PLANS,
  seatsFor,
  type Plan,
  type Tier,
} from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { cancelSubscription, subscribeDemo } from "@/lib/billing/subscribe";
import { profileAccess, type ActiveProfile } from "@/lib/profiles/context";
import { joinNames, planChange, refreshRoster } from "@/lib/profiles/family";
import { brand, hue, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { DetailSkeleton } from "@/components/ui/skeleton";

/*
 * YOUR PLAN. Rebuilt 2026-10 as a page that sells by being straight with
 * people rather than by hiding things:
 *
 *   hero        the plan you're on, what's left today, who it covers, and
 *               the ONE next step that makes sense from where you are
 *   included    what this plan gives you, in plain words
 *   plans       swipeable cards, Family first; each says what it would do
 *               for you (Upgrade, Switch, Your plan)
 *   compare     the honest table. Every plan gets the same Cheeku; plans only
 *               differ in how many chats and how many people. Saying so is
 *               the point: urgency levels and emergency guidance are never
 *               a paid feature, and the table proves it
 *   daily       the no-commitment option, for one worrying night
 *   questions   billing, cancelling, what happens to paused people
 *   cancel      a plain link, never hidden
 *
 * Every change still goes through ChangeSheet, which reads out consequences in
 * names ("Amma and Ananya are paused") before anyone confirms. Upgrades go on
 * to checkout; downgrades happen in the sheet.
 *
 * COLOUR. Plan state is not health, so nothing here is green, amber or red
 * (PLAN.md rule 3). Paid plans get the deep violet hero, Free the light one.
 */

const RANK: Record<Tier, number> = { free: 0, micro: 1, solo: 1, family: 2 };

/** The swipeable cards, most useful first. */
const CARDS: Tier[] = ["family", "solo", "micro", "free"];

const ICON: Record<Tier, LucideIcon> = { free: UserRound, micro: Zap, solo: Crown, family: Users };

/**
 * The comparison. Rows that are the same everywhere are there on purpose:
 * they tell people what they will NOT lose by staying on Free.
 */
const COMPARE: { label: string; free: string | boolean; solo: string | boolean; family: string | boolean }[] = [
  { label: "Chats with Cheeku", free: `${FREE_CHAT_LIMIT} a day`, solo: "Unlimited", family: "Unlimited" },
  { label: "People covered", free: "1", solo: "1", family: "Up to 4" },
  { label: "Health file and report storage", free: true, solo: true, family: true },
  { label: "Readings tracked over time", free: true, solo: true, family: true },
  { label: "Urgency level on every answer", free: true, solo: true, family: true },
  { label: "Emergency guidance", free: true, solo: true, family: true },
  { label: "Separate file for each person", free: false, solo: false, family: true },
];

const BILLING_FAQ: QA[] = [
  {
    q: "Can I cancel any time?",
    a: "Yes. Tap Cancel plan at the bottom of this page. You keep what you paid for until the period ends, then you're on Free. No calls, no forms.",
  },
  {
    q: "What happens to my records if I downgrade?",
    a: `Nothing is deleted. Your health file, reports and chats stay exactly where they are. On Free you simply get ${FREE_CHAT_LIMIT} chats a day instead of unlimited.`,
  },
  {
    q: "What happens to family members if I leave Family?",
    a: "Anyone beyond your plan's limit is paused, not removed. Their files are kept safe, and they come back the moment you return to Family.",
  },
  {
    q: "How does the Daily Pass work?",
    a: `You pay once and get unlimited chats for ${DAILY_PASS_HOURS} hours. It ends by itself and never renews, so there's nothing to remember to cancel.`,
  },
  {
    q: "How can I pay?",
    a: "UPI, debit and credit cards, net banking and popular wallets, all through Razorpay. Cheeku never sees or stores your card details.",
  },
  {
    q: "Is emergency help ever behind the paywall?",
    a: "Never. If something you type sounds like an emergency, Cheeku tells you what to do right away, whatever plan you're on and however many chats you've used.",
  },
];

export default function Subscription() {
  const router = useRouter();
  const qc = useQueryClient();
  const [target, setTarget] = useState<Tier | null>(null);
  const [checkout, setCheckout] = useState<Exclude<Tier, "free"> | null>(null);

  const context = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const [entitlement, access] = await Promise.all([getEntitlement(), profileAccess()]);
      return { entitlement, access };
    },
  });

  if (context.isPending) {
    return (
      <SettingsScreen title="Your plan" eyebrow="What you get and who it covers" icon={Crown}>
        <View className="px-5">
          <DetailSkeleton hero={180} />
        </View>
      </SettingsScreen>
    );
  }

  const entitlement = context.data?.entitlement;
  if (!entitlement || !context.data) {
    return (
      <SettingsScreen title="Your plan" eyebrow="What you get and who it covers" icon={Crown}>
        <Text style={{ marginTop: 60, paddingHorizontal: 40, textAlign: "center", fontFamily: font.regular, fontSize: 15, color: ink[500] }}>
          We couldn&apos;t load your plan. Check your connection and try again.
        </Text>
      </SettingsScreen>
    );
  }

  const tier = entitlement.tier;
  const plan = planFor(tier);
  const members = context.data.access.all;
  const seats = seatsFor(tier);
  const covered = members.slice(0, seats);
  const paused = members.slice(seats).map((m) => m.name.split(" ")[0] ?? m.name);
  const paid = tier !== "free";

  function done() {
    setTarget(null);
    setCheckout(null);
    refreshRoster(qc);
  }

  // The one next step from where you are.
  const next: { label: string; icon: LucideIcon; go: () => void } =
    tier === "free"
      ? { label: "Go unlimited", icon: InfinityIcon, go: () => setTarget("solo") }
      : tier === "micro"
        ? { label: "Keep it going, monthly", icon: Crown, go: () => setTarget("solo") }
        : tier === "solo"
          ? { label: "Bring your family in", icon: Users, go: () => setTarget("family") }
          : { label: "Manage family", icon: Users, go: () => router.push("/family") };

  return (
    <SettingsScreen title="Your plan" eyebrow="What you get and who it covers" icon={Crown} bare>
      {/* -------------------------------------------------------- the hero -- */}
      <Reveal style={[glassShadow, { marginHorizontal: 20, marginTop: 4, borderRadius: 32, overflow: "hidden", padding: 20 }]}>
        {paid ? <Gradient from={brand[800]} to={brand[500]} glow={brand[400]} /> : <Gradient from={lilac.violet} to="#ffffff" glow="#ffffff" />}
        <Eyebrow color={paid ? BRAND_ON_DARK : brand[600]}>You&apos;re on</Eyebrow>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
          <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: paid ? "rgba(255,255,255,0.16)" : "#fff" }}>
            {(() => {
              const Icon = ICON[tier];
              return <Icon size={20} color={paid ? "#fff" : brand[600]} />;
            })()}
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.9, color: paid ? "#fff" : ink[900] }}>{plan.name}</Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: paid ? "rgba(255,255,255,0.82)" : ink[700], marginTop: 8 }}>{plan.tagline}</Text>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: paid ? "#fff" : ink[900], marginTop: 10 }}>
          {paid ? `${formatPrice(plan.priceInPaise)} a ${plan.period}` : "₹0, for as long as you like"}
          {paid && perDayLabel(plan) ? <Text style={{ fontFamily: font.regular, color: paid ? "rgba(255,255,255,0.7)" : ink[500] }}>{`  ·  ${perDayLabel(plan)}`}</Text> : null}
        </Text>

        {/* Usage. A meter on Free, a plain promise on paid plans. */}
        <View style={{ marginTop: 16, padding: 14, borderRadius: 24, backgroundColor: paid ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.85)" }}>
          {isUnlimited(tier) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <InfinityIcon size={18} color="#fff" />
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Unlimited chats{tier === "family" ? " for everyone" : ""}</Text>
            </View>
          ) : (
            <Meter left={entitlement.chatsRemaining ?? 0} />
          )}
          <View style={{ height: 1, backgroundColor: paid ? "rgba(255,255,255,0.14)" : surface.line, marginVertical: 12 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Faces members={covered} dark={paid} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: paid ? "#fff" : ink[900] }}>
              {seats === 1 ? "Covers just you" : `${covered.length} of ${seats} people covered`}
            </Text>
            {seats > 1 && covered.length < seats ? (
              <Text style={{ fontFamily: font.regular, fontSize: 13, color: paid ? "rgba(255,255,255,0.7)" : ink[500] }}>
                {seats - covered.length === 1 ? "1 seat free" : `${seats - covered.length} seats free`}
              </Text>
            ) : null}
          </View>
        </View>

        {tier === "micro" && entitlement.expiresAt ? <PassExpiry expiresAt={entitlement.expiresAt} /> : null}

        {paused.length > 0 ? (
          <View style={{ marginTop: 12, flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.85)" }}>
            <Pause size={15} color={brand[700]} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              {joinNames(paused)} {paused.length === 1 ? "is" : "are"} paused on this plan. Their files are safe and come back with Family.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={next.go}
          style={({ pressed }) => ({ marginTop: 16, height: 52, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: paid ? "#fff" : brand[600], opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] })}
        >
          <next.icon size={17} color={paid ? brand[700] : "#fff"} />
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: paid ? brand[700] : "#fff" }}>{next.label}</Text>
        </Pressable>
      </Reveal>

      {/* --------------------------------------------------- what you get -- */}
      <Reveal style={{ marginHorizontal: 20, marginTop: 16 }}>
        <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 18 }]}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Included in your plan</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {plan.features.map((f) => (
              <Perk key={f} text={f} />
            ))}
          </View>
        </View>
      </Reveal>

      {/* ------------------------------------------------------ the plans -- */}
      <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
        <Eyebrow>Plans</Eyebrow>
        <Title>Pick what fits your family</Title>
        <Body>Same Cheeku on every plan. You only choose how often you chat and how many people it looks after.</Body>
      </Reveal>
      <Reveal style={{ marginTop: 14 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + 12}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10, gap: 12 }}
        >
          {CARDS.map((t) => (
            <PlanCard key={t} plan={planFor(t)} current={t === tier} from={tier} onPress={() => setTarget(t)} />
          ))}
        </ScrollView>
      </Reveal>

      {/* ---------------------------------------------------- the compare -- */}
      <Reveal style={{ paddingHorizontal: 20, marginTop: 30 }}>
        <Eyebrow>Side by side</Eyebrow>
        <Title>No small print</Title>
        <Body>Safety is never a paid extra. Every plan gets urgency levels, emergency guidance and a health file that remembers.</Body>
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 14 }}>
        <Compare current={tier} />
      </Reveal>

      {/* ---------------------------------------------------- daily pass -- */}
      {tier !== "micro" ? (
        <Reveal style={{ marginHorizontal: 20, marginTop: 18 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setTarget("micro")}
            style={({ pressed }) => [glassShadow, { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 24, backgroundColor: pressed ? brand[100] : brand[50] }]}
          >
            <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Zap size={19} color={brand[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Just need tonight?</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
                Daily Pass, {formatPrice(PLANS.micro.priceInPaise)}. Unlimited for {DAILY_PASS_HOURS} hours, never renews.
              </Text>
            </View>
            <ChevronRight size={18} color={brand[600]} />
          </Pressable>
        </Reveal>
      ) : null}

      {/* ----------------------------------------------------- questions -- */}
      <Reveal style={{ paddingHorizontal: 20, marginTop: 34 }}>
        <Eyebrow>Billing</Eyebrow>
        <Title>Good to know</Title>
      </Reveal>
      <Reveal style={{ marginHorizontal: 20, marginTop: 12 }}>
        <Questions items={BILLING_FAQ} />
      </Reveal>

      {/* -------------------------------------------------------- footer -- */}
      <Reveal style={{ marginHorizontal: 20, marginTop: 24, gap: 10 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Assurance icon={ShieldCheck} text="Pay safely with Razorpay" />
          <Assurance icon={FileHeart} text="Nothing deleted on a change" />
        </View>
        {paid && tier !== "micro" ? (
          <Tap accessibilityRole="button" onPress={() => setTarget("free")} style={{ alignSelf: "center", paddingVertical: 14, paddingHorizontal: 20 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500], textDecorationLine: "underline" }}>Cancel plan</Text>
          </Tap>
        ) : null}
      </Reveal>

      <ChangeSheet
        from={tier}
        to={target}
        members={members}
        onClose={() => setTarget(null)}
        onCheckout={(t) => {
          setTarget(null);
          setCheckout(t);
        }}
        onDone={done}
      />

      <Paywall
        open={checkout !== null}
        reason={checkout === "family" ? "family" : "upgrade"}
        startAt={checkout ?? undefined}
        onClose={() => setCheckout(null)}
        onActivated={done}
      />
    </SettingsScreen>
  );
}

// -------------------------------------------------------------------- parts --

function Meter({ left }: { left: number }) {
  const used = Math.max(0, FREE_CHAT_LIMIT - left);
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <MessageCircle size={17} color={brand[600]} />
        <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
          {left} of {FREE_CHAT_LIMIT} chats left today
        </Text>
      </View>
      {/* Five segments rather than a bar: you can count them at a glance. */}
      <View style={{ flexDirection: "row", gap: 5, marginTop: 10 }}>
        {Array.from({ length: FREE_CHAT_LIMIT }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < used ? brand[100] : brand[500] }} />
        ))}
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 8 }}>A fresh {FREE_CHAT_LIMIT} every day. Emergency guidance never counts.</Text>
    </View>
  );
}

function Faces({ members, dark }: { members: readonly ActiveProfile[]; dark: boolean }) {
  const shown = members.slice(0, 4);
  return (
    <View style={{ flexDirection: "row" }}>
      {shown.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -9, borderRadius: 999, borderWidth: 2, borderColor: dark ? brand[700] : "#fff" }}>
          <Avatar svg={m.avatar} photo={m.photo} image={m.avatarImage} background={m.avatarBackground} size={28} />
        </View>
      ))}
    </View>
  );
}

function Perk({ text, dark = false }: { text: string; dark?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View style={{ width: 20, height: 20, borderRadius: 999, marginTop: 1, alignItems: "center", justifyContent: "center", backgroundColor: dark ? "rgba(255,255,255,0.18)" : brand[50] }}>
        <Check size={12} color={dark ? "#fff" : brand[600]} strokeWidth={3} />
      </View>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: dark ? "#fff" : ink[700] }}>{text}</Text>
    </View>
  );
}

function Assurance({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: surface.line }}>
      <Icon size={16} color={brand[600]} />
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: ink[700] }}>{text}</Text>
    </View>
  );
}

const CARD_W = 268;

function PlanCard({ plan, current, from, onPress }: { plan: Plan; current: boolean; from: Tier; onPress: () => void }) {
  const up = RANK[plan.tier] > RANK[from] || (from === "free" && plan.tier !== "free") || (from === "micro" && plan.tier === "solo");
  const label = current ? "Your plan" : up ? `Choose ${plan.name.replace(" Plan", "")}` : `Switch to ${plan.name.replace(" Plan", "")}`;
  const featured = plan.tier === "family";
  const Icon = ICON[plan.tier];
  const perDay = perDayLabel(plan);
  const perSeat = perSeatLabel(plan);
  const fg = featured ? "#fff" : ink[900];
  const soft = featured ? "rgba(255,255,255,0.75)" : ink[500];
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: current, selected: current }}
      disabled={current}
      onPress={onPress}
      style={[glassShadow, {
        width: CARD_W,
        padding: 18,
        borderRadius: 32,
        overflow: "hidden",
        backgroundColor: featured ? brand[700] : "#fff",
        borderWidth: current ? 2 : 0,
        borderColor: featured ? BRAND_ON_DARK : brand[500],
      }]}
      scale={0.98}
    >
      {featured ? <Gradient from={brand[800]} to={brand[500]} glow={brand[400]} /> : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: featured ? "rgba(255,255,255,0.16)" : brand[50] }}>
          <Icon size={19} color={featured ? "#fff" : brand[600]} />
        </View>
        {featured ? (
          <View style={{ paddingHorizontal: 10, height: 24, borderRadius: 999, justifyContent: "center", backgroundColor: "#fff" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>Most popular · save {familySavingPercent()}%</Text>
          </View>
        ) : current ? (
          <View style={{ paddingHorizontal: 10, height: 24, borderRadius: 999, justifyContent: "center", backgroundColor: brand[50] }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>Current</Text>
          </View>
        ) : null}
      </View>

      <Text style={{ fontFamily: font.semibold, fontSize: 20, color: fg, marginTop: 14 }}>{plan.name}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: soft, marginTop: 2 }}>{plan.tagline}</Text>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 14 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 34, letterSpacing: -1, color: fg }}>{plan.priceInPaise === 0 ? "₹0" : formatPrice(plan.priceInPaise)}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: soft, marginBottom: 6 }}>{plan.priceInPaise === 0 ? "forever" : `/ ${plan.period}`}</Text>
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 13, color: soft, minHeight: 17 }}>
        {[perDay, perSeat].filter(Boolean).join("  ·  ") || (plan.tier === "micro" ? "One payment, no renewal" : "No card needed")}
      </Text>

      <View style={{ height: 1, backgroundColor: featured ? "rgba(255,255,255,0.18)" : surface.line, marginVertical: 14 }} />
      <View style={{ gap: 9, flex: 1 }}>
        {plan.features.map((f) => (
          <Perk key={f} text={f} dark={featured} />
        ))}
      </View>

      <View
        style={{
          marginTop: 16,
          height: 46,
          borderRadius: 999,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          backgroundColor: current ? (featured ? "rgba(255,255,255,0.16)" : brand[50]) : featured ? "#fff" : up ? brand[600] : hue.slate.bg,
        }}
      >
        {current ? <Check size={15} color={featured ? "#fff" : brand[700]} strokeWidth={2.8} /> : up ? <ArrowUpRight size={16} color={featured ? brand[700] : "#fff"} /> : <ArrowDownRight size={16} color={ink[700]} />}
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: current ? (featured ? "#fff" : brand[700]) : featured ? brand[700] : up ? "#fff" : ink[700] }}>{label}</Text>
      </View>
    </Tap>
  );
}

function Compare({ current }: { current: Tier }) {
  const cols: { tier: "free" | "solo" | "family"; name: string }[] = [
    { tier: "free", name: "Free" },
    { tier: "solo", name: "Solo" },
    { tier: "family", name: "Family" },
  ];
  return (
    <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", overflow: "hidden" }]}>
      <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingVertical: 12, backgroundColor: brand[50] }}>
        <View style={{ flex: 1.5 }} />
        {cols.map((c) => (
          <Text key={c.tier} style={{ flex: 1, textAlign: "center", fontFamily: font.semibold, fontSize: 13, color: c.tier === current ? brand[700] : ink[900] }}>
            {c.name}
          </Text>
        ))}
      </View>
      {COMPARE.map((row, i) => (
        <View key={row.label} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: surface.line }}>
          <Text style={{ flex: 1.5, fontFamily: font.medium, fontSize: 13, lineHeight: 17, color: ink[700], paddingRight: 6 }}>{brandify(row.label)}</Text>
          {cols.map((c) => {
            const v = row[c.tier];
            return (
              <View key={c.tier} style={{ flex: 1, alignItems: "center" }}>
                {v === true ? (
                  <View style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: brand[50], alignItems: "center", justifyContent: "center" }}>
                    <Check size={13} color={brand[600]} strokeWidth={3} />
                  </View>
                ) : v === false ? (
                  <Minus size={15} color={ink[300]} />
                ) : (
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[900], textAlign: "center" }}>{v}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * The one sheet every plan change goes through. Consequences in names and
 * numbers, then one button.
 */
function ChangeSheet({
  from,
  to,
  members,
  onClose,
  onCheckout,
  onDone,
}: {
  from: Tier;
  to: Tier | null;
  members: readonly { name: string }[];
  onClose: () => void;
  onCheckout: (tier: Exclude<Tier, "free">) => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!to) return <Modal visible={false} transparent />;

  const target = to === "free" ? FREE_PLAN : PLANS[to];
  const firsts = members.map((m) => ({ name: m.name.split(" ")[0] ?? m.name }));
  const change = planChange(firsts, from, to);
  // Anything that starts a new purchase goes through checkout: a move up, any
  // move off Free or off a Daily pass, and buying a Daily pass. Only a step
  // down between subscriptions (Family to Solo) or to Free happens here.
  const upgrade =
    to !== "free" && (RANK[to] > RANK[from] || from === "free" || from === "micro" || to === "micro");
  const toFree = to === "free";

  const lines: { icon: LucideIcon; text: string; tone: "good" | "note" }[] = [];
  if (isUnlimited(to) && !isUnlimited(from)) lines.push({ icon: InfinityIcon, text: "Unlimited chats with Cheeku", tone: "good" });
  if (!isUnlimited(to) && isUnlimited(from)) lines.push({ icon: MessageCircle, text: `Chats drop to ${FREE_CHAT_LIMIT} a day`, tone: "note" });
  if (change.unpause.length) lines.push({ icon: Play, text: `${joinNames(change.unpause)} ${change.unpause.length === 1 ? "comes" : "come"} back, files and all`, tone: "good" });
  if (to === "family" && change.seatsAfter > members.length) {
    const room = change.seatsAfter - members.length;
    lines.push({ icon: Users, text: `Room for ${room} more ${room === 1 ? "person" : "people"}`, tone: "good" });
  }
  if (change.pause.length) lines.push({ icon: Pause, text: `${joinNames(change.pause)} ${change.pause.length === 1 ? "is" : "are"} paused. Nothing is deleted.`, tone: "note" });
  if (to === "micro") lines.push({ icon: CalendarClock, text: `Ends by itself after ${DAILY_PASS_HOURS} hours`, tone: "note" });
  if (lines.length === 0) lines.push({ icon: Check, text: "Your records and chats stay exactly as they are", tone: "good" });

  async function confirm() {
    if (!to) return;
    setError(null);
    if (to !== "free" && upgrade) {
      onCheckout(to);
      return;
    }
    setBusy(true);
    const result = toFree ? await cancelSubscription() : await subscribeDemo(to);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onDone();
  }

  const title = upgrade
    ? `Move up to ${target.name}`
    : toFree
      ? "Move to the Free plan?"
      : `Switch to ${target.name}?`;

  return (
    <Sheet open={true} onClose={onClose} label="Close">
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: surface.canvas, paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 14 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700], marginTop: 16 }}>
          {target.priceInPaise === 0 ? "₹0" : `${formatPrice(target.priceInPaise)}/${target.period}`}
        </Text>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 2 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 4 }}>Here&apos;s what changes for you.</Text>

        <Glass strong className="mt-4 gap-3 rounded-xl p-4">
          {lines.map((l) => (
            <View key={l.text} className="flex-row items-start gap-3">
              <View style={{ width: 30, height: 30, borderRadius: 12, backgroundColor: l.tone === "good" ? brand[50] : hue.slate.bg, alignItems: "center", justifyContent: "center" }}>
                <l.icon size={15} color={l.tone === "good" ? brand[600] : ink[700]} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 20, color: ink[900], marginTop: 4 }}>{l.text}</Text>
            </View>
          ))}
        </Glass>

        {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>{error}</Text> : null}

        <PillButton loading={busy} onPress={() => void confirm()} style={{ marginTop: 18 }}>
          {upgrade ? "Continue to payment" : toFree ? "Move to Free" : `Switch to ${target.name}`}
        </PillButton>
        <Tap accessibilityRole="button" onPress={onClose} style={{ height: 46, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>{upgrade ? "Not now" : "Keep my plan"}</Text>
        </Tap>
      </View>
    </Sheet>
  );
}

/**
 * How long the Daily pass has left. Rounded DOWN to the hour: a countdown
 * must never run out earlier than it said.
 */
function PassExpiry({ expiresAt }: { expiresAt: string }) {
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.floor(msLeft / 3_600_000);
  const label = msLeft <= 0 ? "This pass has ended" : hours >= 1 ? `${hours} ${hours === 1 ? "hour" : "hours"} left` : "Less than an hour left";
  return (
    <View style={{ marginTop: 12, flexDirection: "row", gap: 8, alignItems: "center", padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)" }}>
      <CalendarClock size={15} color={brand[700]} />
      <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
        {label}. It doesn&apos;t renew.
      </Text>
    </View>
  );
}
