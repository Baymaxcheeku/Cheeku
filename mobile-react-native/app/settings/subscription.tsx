import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  Crown,
  Infinity as InfinityIcon,
  MessageCircle,
  Pause,
  Play,
  ShieldCheck,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Paywall } from "@/components/billing/paywall";
import { SettingsScreen } from "@/components/settings/chrome";
import { Glass, Gradient, glass, glassShadow } from "@/components/ui/glass";
import { PillButton } from "@/components/ui/screen";
import {
  DAILY_PASS_HOURS,
  FREE_CHAT_LIMIT,
  FREE_PLAN,
  formatPrice,
  isUnlimited,
  planFor,
  PLANS,
  seatsFor,
  type Plan,
  type Tier,
} from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { cancelSubscription, subscribeDemo } from "@/lib/billing/subscribe";
import { profileAccess } from "@/lib/profiles/context";
import { joinNames, planChange, refreshRoster } from "@/lib/profiles/family";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Your plan: what you have, what each other plan would do to YOUR family, and
 * one clear way to move between them.
 *
 * THE THREE STARTING POINTS
 *
 *   Free    hero says "5 chats a day, just you"; Solo and Family are upgrades.
 *   Solo    hero says "unlimited, just you"; Family is the upgrade, Free is a
 *           downgrade that costs chats.
 *   Family  hero shows seats; Solo and Free are downgrades that PAUSE named
 *           people. Paused, never deleted, and the sheet says so by name.
 *
 * Every change goes through one sheet that reads out the consequences in
 * names and numbers before anyone confirms ("Amma and Ananya are paused",
 * "Amma and Ananya come back"). Upgrades continue to checkout; downgrades
 * happen here. Cancelling stays a labelled button, not a maze: stores
 * require it in-app and it is the clearest sign the app is on the reader's
 * side.
 *
 * COLOUR. Plan state is not health, so nothing here is green, amber or red
 * (PLAN.md rule 3). The old screen drew "Unlimited" in the healthy green and
 * the Daily pass countdown in caution amber; both are violet now.
 */

const ORDER: Tier[] = ["free", "solo", "family"];
const RANK: Record<Tier, number> = { free: 0, micro: 1, solo: 1, family: 2 };

const PERKS: Record<Tier, string[]> = {
  free: [`${FREE_CHAT_LIMIT} chats with Cheeku a day`, "Your own health file", "Unlimited report storage"],
  micro: [`Unlimited chats for ${DAILY_PASS_HOURS} hours`, "No subscription, no renewal"],
  solo: ["Unlimited chats, day and night", "Your own health file", "Priority support"],
  family: ["Up to 4 people, one plan", "Unlimited chats for everyone", "Separate files that never mix"],
};

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
        <View className="mt-16 items-center">
          <ActivityIndicator color={brand[600]} />
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
  const reachable = Math.min(members.length, seats);
  const paused = members.slice(seats).map((m) => m.name.split(" ")[0] ?? m.name);

  function done() {
    setTarget(null);
    setCheckout(null);
    refreshRoster(qc);
  }

  return (
    <SettingsScreen title="Your plan" eyebrow="What you get and who it covers" icon={Crown}>
      {/* -------------------------------------------------------- the hero -- */}
      <View style={[glassShadow, { marginHorizontal: 20, marginTop: 16, borderRadius: 30, overflow: "hidden", padding: 18 }]}>
        <Gradient from={tier === "family" ? "#dcd2ff" : tier === "free" ? "#eef0f7" : "#e6e0ff"} to="#ffffff" glow="#ffffff" />
        <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[700] }}>You&apos;re on</Text>
        <View className="mt-1 flex-row items-end justify-between">
          <Text style={{ fontFamily: font.semibold, fontSize: 28, letterSpacing: -0.8, color: ink[900] }}>{plan.name}</Text>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[700], marginBottom: 4 }}>
            {tier === "free" ? "₹0" : `${formatPrice(plan.priceInPaise)}/${plan.period}`}
          </Text>
        </View>

        <View className="mt-4 flex-row gap-2.5">
          <Stat
            icon={isUnlimited(tier) ? InfinityIcon : MessageCircle}
            label="Chats"
            value={isUnlimited(tier) ? "Unlimited" : `${entitlement.chatsRemaining ?? 0} of ${FREE_CHAT_LIMIT} left today`}
          />
          <Stat icon={Users} label="People" value={seats === 1 ? "Just you" : `${reachable} of ${seats}`} />
        </View>

        {tier === "micro" && entitlement.expiresAt ? <PassExpiry expiresAt={entitlement.expiresAt} /> : null}

        {paused.length > 0 ? (
          <View style={{ marginTop: 12, flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.75)" }}>
            <Pause size={15} color={brand[700]} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>
              {joinNames(paused)} {paused.length === 1 ? "is" : "are"} paused on this plan. Their records are safe and come back with Family.
            </Text>
          </View>
        ) : null}
      </View>

      {tier === "family" ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/family")}
          style={({ pressed }) => [glassShadow, { marginHorizontal: 20, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
        >
          <Users size={18} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Manage family</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{seats - reachable === 1 ? "1 seat free" : `${seats - reachable} seats free`}</Text>
          <ChevronRight size={18} color={ink[300]} />
        </Pressable>
      ) : null}

      {/* ------------------------------------------------------ the plans -- */}
      <Text style={{ paddingHorizontal: 20, marginTop: 26, fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>
        All plans
      </Text>
      <View style={{ marginHorizontal: 20, marginTop: 10, gap: 10 }}>
        {ORDER.map((t) => (
          <PlanCard key={t} plan={t === "free" ? FREE_PLAN : PLANS[t as Exclude<Tier, "free">]} current={t === tier} from={tier} onPress={() => setTarget(t)} />
        ))}
        {tier !== "micro" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setTarget("micro")}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: pressed ? "#ece8ff" : brand[50] })}
          >
            <Zap size={16} color={brand[600]} />
            <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13.5, color: ink[700] }}>
              Only need today?{" "}
              <Text style={{ fontFamily: font.semibold, color: brand[700] }}>Daily pass, {formatPrice(PLANS.micro.priceInPaise)}</Text>
            </Text>
            <ChevronRight size={16} color={brand[600]} />
          </Pressable>
        ) : null}
      </View>

      <View className="mx-5 mt-6 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500] }}>
          Changing or cancelling never deletes anything. Records, chats and family members stay, even while a plan doesn&apos;t cover them.
        </Text>
      </View>

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

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.8)" }}>
      <View className="flex-row items-center gap-1.5">
        <Icon size={14} color={brand[600]} />
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: ink[500] }}>{label}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[900], marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function PlanCard({ plan, current, from, onPress }: { plan: Plan; current: boolean; from: Tier; onPress: () => void }) {
  const up = RANK[plan.tier] > RANK[from] || (from === "micro" && plan.tier === "solo");
  const label = current ? "Your plan" : up ? "Upgrade" : "Switch";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: current }}
      disabled={current}
      onPress={onPress}
      style={({ pressed }) => [current ? null : glassShadow, {
        padding: 16,
        borderRadius: 24,
        backgroundColor: current ? "rgba(241,240,254,0.9)" : pressed ? "#fff" : glass.fillStrong,
        borderWidth: current ? 2 : 1,
        borderColor: current ? brand[500] : glass.rim,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      }]}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{plan.name}</Text>
          {plan.tier === "family" && !current ? (
            <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 999, justifyContent: "center", backgroundColor: brand[600] }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: "#fff" }}>Best for families</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
          {plan.priceInPaise === 0 ? "₹0" : `${formatPrice(plan.priceInPaise)}`}
          <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500] }}>{plan.priceInPaise === 0 ? "" : `/${plan.period}`}</Text>
        </Text>
      </View>
      <View style={{ marginTop: 10, gap: 6 }}>
        {PERKS[plan.tier].map((perk) => (
          <View key={perk} className="flex-row items-center gap-2">
            <Check size={14} color={brand[600]} strokeWidth={2.6} />
            <Text style={{ fontFamily: font.regular, fontSize: 13.5, color: ink[700] }}>{perk}</Text>
          </View>
        ))}
      </View>
      <View className="mt-3 flex-row items-center justify-end gap-1">
        {current ? <Check size={14} color={brand[700]} strokeWidth={2.8} /> : up ? <ArrowUpRight size={15} color={brand[700]} /> : <ArrowDownRight size={15} color={ink[500]} />}
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: current || up ? brand[700] : ink[500] }}>{label}</Text>
      </View>
    </Pressable>
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
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.38)" }} />
      <View style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: "#fafafe", paddingHorizontal: 22, paddingTop: 10, paddingBottom: insets.bottom + 14 }}>
        <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(15,16,48,0.12)" }} />
        <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: brand[700], marginTop: 16 }}>
          {target.priceInPaise === 0 ? "₹0" : `${formatPrice(target.priceInPaise)}/${target.period}`}
        </Text>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.6, color: ink[900], marginTop: 2 }}>
          {title}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500], marginTop: 4 }}>Here&apos;s what changes for you.</Text>

        <Glass strong className="mt-4 gap-3 rounded-[22px] p-4">
          {lines.map((l) => (
            <View key={l.text} className="flex-row items-start gap-3">
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: l.tone === "good" ? brand[50] : "#eef0f5", alignItems: "center", justifyContent: "center" }}>
                <l.icon size={15} color={l.tone === "good" ? brand[600] : ink[700]} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14.5, lineHeight: 20, color: ink[900], marginTop: 4 }}>{l.text}</Text>
            </View>
          ))}
        </Glass>

        {error ? <Text accessibilityRole="alert" style={{ fontFamily: font.medium, fontSize: 13, color: "#c00a1c", marginTop: 10 }}>{error}</Text> : null}

        <PillButton tone={upgrade ? "brand" : "dark"} loading={busy} onPress={() => void confirm()} style={{ marginTop: 18 }}>
          {upgrade ? "Continue to payment" : toFree ? "Move to Free" : `Switch to ${target.name}`}
        </PillButton>
        <Pressable accessibilityRole="button" onPress={onClose} style={{ height: 46, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[500] }}>{upgrade ? "Not now" : "Keep my plan"}</Text>
        </Pressable>
      </View>
    </Modal>
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
