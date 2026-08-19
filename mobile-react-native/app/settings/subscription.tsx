import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Crown,
  Infinity as InfinityIcon,
  MessageCircle,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Panel, SettingsScreen } from "@/components/settings/chrome";
import { Paywall } from "@/components/billing/paywall";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Meter } from "@/components/ui/motion";
import {
  DAILY_PASS_HOURS,
  formatPrice,
  FREE_CHAT_LIMIT,
  isUnlimited,
  planFor,
  seatsFor,
} from "@/lib/billing/plans";
import { getEntitlement } from "@/lib/billing/quota";
import { cancelSubscription } from "@/lib/billing/subscribe";
import { profileAccess } from "@/lib/profiles/context";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * Subscription. What you are on, what it covers, and how to leave.
 *
 * The settings hub's plan card answers "which plan"; this answers everything
 * after that. It exists mostly for the two questions a card cannot: when does
 * my Daily pass run out, and how do I stop paying.
 *
 * CANCELLING IS NOT BURIED. It is a labelled button on the screen named
 * Subscription, not three taps into Help. Stores require in-app cancellation
 * and DPDP expects consent to be withdrawable; making it hard would also be the
 * clearest possible signal that the app is not on the reader's side.
 */
export default function Subscription() {
  const queryClient = useQueryClient();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const context = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const [entitlement, access] = await Promise.all([getEntitlement(), profileAccess()]);
      return { entitlement, access };
    },
  });

  async function confirmCancel() {
    setBusy(true);
    try {
      const result = await cancelSubscription();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmOpen(false);
      await queryClient.invalidateQueries();
    } finally {
      setBusy(false);
    }
  }

  if (context.isPending) {
    return (
      <SettingsScreen title="Subscription" eyebrow="Your plan and what it covers" icon={Crown}>
        <View className="mt-16 items-center">
          <ActivityIndicator color={brand[600]} />
        </View>
      </SettingsScreen>
    );
  }

  const entitlement = context.data?.entitlement;
  if (!entitlement) {
    return (
      <SettingsScreen title="Subscription" eyebrow="Your plan and what it covers" icon={Crown}>
        <Text className="mt-16 px-10 text-center text-[15px] text-ink-500">
          We couldn&apos;t load your plan. Check your connection and try again.
        </Text>
      </SettingsScreen>
    );
  }

  const plan = planFor(entitlement.tier);
  const paid = entitlement.tier !== "free";
  const seats = seatsFor(entitlement.tier);
  const used = context.data?.access.all.length ?? 0;
  const isDaily = entitlement.tier === "micro";

  return (
    <SettingsScreen title="Subscription" eyebrow="Your plan and what it covers" icon={Crown}>
      <View className="mt-4">
        <Panel>
          <View className="flex-row items-start gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-tile bg-brand-50">
              <Crown size={20} color={brand[600]} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[18px] font-bold text-ink-900">{plan.name}</Text>
              <Text className="mt-0.5 text-[12.5px] text-ink-500">
                {paid
                  ? `${formatPrice(plan.priceInPaise)} / ${plan.period}`
                  : "No payment, no expiry"}
              </Text>
            </View>
          </View>

          {/*
           * The Daily pass is the one plan with a clock on it, and the only
           * honest thing to show is when it stops. A pass that quietly expires
           * mid-conversation with nothing having said when is the worst version
           * of this product.
           */}
          {isDaily ? <PassExpiry expiresAt={entitlement.expiresAt} /> : null}
        </Panel>
      </View>

      {/* ------------------------------------------------------ allowance -- */}
      <View className="mx-5 mt-4">
        <Panel>
          <View className="flex-row items-center gap-2.5">
            <MessageCircle size={16} color={brand[500]} />
            <Text className="flex-1 text-[13.5px] font-semibold text-ink-900">Ask Baymax</Text>
            {isUnlimited(entitlement.tier) ? (
              <View className="flex-row items-center gap-1">
                <InfinityIcon size={15} color={semantic.safe} />
                <Text className="text-[12.5px] font-semibold" style={{ color: semantic.safeText }}>
                  Unlimited
                </Text>
              </View>
            ) : (
              <Text className="text-[12.5px] text-ink-500">
                {entitlement.chatsRemaining} of {entitlement.limit} left
              </Text>
            )}
          </View>

          {!isUnlimited(entitlement.tier) ? (
            <View className="mt-2.5 gap-1.5">
              <Meter value={entitlement.chatsUsed} total={FREE_CHAT_LIMIT} />
              <Text className="text-[11.5px] text-ink-300">
                Resets on the 1st. Escalations and emergency turns are never counted.
              </Text>
            </View>
          ) : null}
        </Panel>
      </View>

      <View className="mx-5 mt-3">
        <Panel>
          <View className="flex-row items-center gap-2.5">
            <Users size={16} color={brand[500]} />
            <Text className="flex-1 text-[13.5px] font-semibold text-ink-900">Family members</Text>
            <Text className="text-[12.5px] text-ink-500">
              {Math.min(used, seats)} of {seats}
            </Text>
          </View>
          {used > seats ? (
            <Text className="mt-2 text-[11.5px] leading-[16px] text-ink-500">
              {used - seats} {used - seats === 1 ? "profile is" : "profiles are"} locked. Their
              records are safe and come back the moment you upgrade.
            </Text>
          ) : null}
        </Panel>
      </View>

      {/* --------------------------------------------------------- change -- */}
      <View className="mx-5 mt-6 gap-2.5">
        <Pressable
          accessibilityRole="button"
          onPress={() => setPaywallOpen(true)}
          className="h-13 items-center justify-center rounded-pill"
          style={{ height: 52, backgroundColor: brand[600] }}
        >
          <Text className="text-[15.5px] font-bold text-white">
            {paid ? "Change plan" : "See plans"}
          </Text>
        </Pressable>

        {paid ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setConfirmOpen(true)}
            className="h-13 items-center justify-center rounded-pill bg-surface"
            style={{ height: 52, borderWidth: 1, borderColor: surface.line, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? (
              <ActivityIndicator color={ink[500]} />
            ) : (
              <Text className="text-[15px] font-semibold text-ink-700">
                {isDaily ? "End Daily pass" : "Cancel subscription"}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text
          accessibilityRole="alert"
          className="mx-5 mt-3 text-[13px] font-medium text-danger-text"
        >
          {error}
        </Text>
      ) : null}

      <View className="mx-5 mt-5 flex-row items-start gap-2">
        <ShieldCheck size={14} color={ink[300]} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[11.5px] leading-[17px] text-ink-300">
          Cancelling never deletes anything. Your records, documents and conversations stay, and
          your family members are kept even while a plan does not cover them.
        </Text>
      </View>

      <ConfirmSheet
        open={confirmOpen}
        title={isDaily ? "End your Daily pass?" : `Cancel ${plan.name}?`}
        body={`You'll go back to the free plan: ${FREE_CHAT_LIMIT} chats a day and one profile.\n\nEvery record, document and conversation stays exactly where it is. Locked family members are kept, not deleted.`}
        confirmLabel={isDaily ? "End pass" : "Cancel plan"}
        cancelLabel="Keep my plan"
        destructive
        onConfirm={confirmCancel}
        onClose={() => setConfirmOpen(false)}
      />

      <Paywall
        open={paywallOpen}
        reason="upgrade"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          void queryClient.invalidateQueries();
        }}
      />
    </SettingsScreen>
  );
}

/**
 * How long the Daily pass has left.
 *
 * Rounded DOWN to the hour, and never below "less than an hour". Rounding up
 * would tell someone they have two hours when they have sixty-one minutes, and
 * the one thing a countdown must not do is run out earlier than it said.
 */
function PassExpiry({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;

  const msLeft = new Date(expiresAt).getTime() - Date.now();
  const elapsed = msLeft <= 0;
  const hours = Math.floor(msLeft / (60 * 60 * 1000));

  const label = elapsed
    ? "This pass has ended"
    : hours >= 1
      ? `${hours} ${hours === 1 ? "hour" : "hours"} left`
      : "Less than an hour left";

  return (
    <View
      className="mt-3 flex-row items-center gap-2.5 rounded-tile px-3.5 py-3"
      style={{ backgroundColor: elapsed ? surface.line : semantic.cautionBg }}
    >
      <CalendarClock size={16} color={elapsed ? ink[500] : semantic.cautionText} />
      <View className="min-w-0 flex-1">
        <Text
          className="text-[13px] font-semibold"
          style={{ color: elapsed ? ink[700] : semantic.cautionText }}
        >
          {label}
        </Text>
        <Text className="mt-0.5 text-[11.5px] text-ink-500">
          {elapsed
            ? `A Daily pass runs for ${DAILY_PASS_HOURS} hours and does not renew.`
            : `Ends ${new Date(expiresAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}. It does not renew.`}
        </Text>
      </View>
    </View>
  );
}
