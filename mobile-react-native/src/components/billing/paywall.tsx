import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Infinity as InfinityIcon,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import {
  DAILY_PASS_HOURS,
  formatPrice,
  FREE_CHAT_LIMIT,
  PLANS,
  PLAN_ORDER,
  type Plan,
  type Tier,
} from "@/lib/billing/plans";
import { subscribeDemo } from "@/lib/billing/subscribe";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/*
 * H1 / H2 — the paywall and its checkout, ported from the web build.
 *
 * Two things it must get right, both about not being sleazy.
 *
 * THE PENDING QUESTION SURVIVES. Someone hits the limit mid-thought. Losing
 * what they typed and making them retype it after paying is the moment a
 * paywall stops feeling like a plan and starts feeling like a toll booth. The
 * caller holds the question and sends it once the tier changes.
 *
 * NO CREDENTIALS ARE COLLECTED HERE, EVER. The web build drew its own UPI and
 * card chooser; this shows Razorpay as the single method instead, because
 * Razorpay is the gateway and UPI and cards are things it offers inside its own
 * sheet. Authorisation belongs there. A health app that types card numbers into
 * its own form has taken on a liability it has no reason to hold.
 *
 * THE PAYMENT IS NOT REAL YET. `subscribeDemo` grants the tier outright, gated
 * server-side. The button copy says the plan is being activated, never that
 * money moved.
 */

type Stage = "plans" | "checkout" | "done";

/**
 * Why the sheet opened. Changes the heading only — the plans offered are always
 * all three, because someone who came to add a family member may well decide
 * the Daily pass is what they actually wanted.
 */
export type Reason = "quota" | "upgrade" | "family" | "onboarding";

const REASON_COPY: Record<Reason, { eyebrow: string; title: string; body: string }> = {
  quota: {
    eyebrow: "Free limit reached",
    title: "You've used your free chats",
    body: `Free includes ${FREE_CHAT_LIMIT} chats a month. Pick a plan to keep the conversation going.`,
  },
  upgrade: {
    eyebrow: "Upgrade",
    title: "Unlock everything in Baymax",
    body: `Free includes ${FREE_CHAT_LIMIT} chats a month. Pick a plan to keep the conversation going.`,
  },
  family: {
    eyebrow: "Family access",
    title: "Add your loved ones",
    body: "The Family plan covers up to 4 members with shared records and insights.",
  },
  onboarding: {
    eyebrow: "You chose family",
    title: "Set up family access",
    body: "Family access needs a plan. You can also start free with just your own profile.",
  },
};

const PLAN_ICON: Record<string, LucideIcon> = {
  family: Users,
  solo: Sparkles,
  micro: CalendarClock,
};

export function Paywall({
  open,
  onClose,
  onActivated,
  pendingQuestion,
  reason = "quota",
}: {
  open: boolean;
  onClose: () => void;
  onActivated: (tier: Tier) => void;
  /** Shown back to the reader so they can see it was not lost. */
  pendingQuestion?: string;
  reason?: Reason;
}) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>("plans");
  const [selected, setSelected] = useState<Plan>(PLANS.family);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setStage("plans");
    setSelected(PLANS.family);
    setError(null);
    setPending(false);
  }

  async function pay() {
    setError(null);
    setPending(true);
    try {
      const result = await subscribeDemo(selected.tier as Exclude<Tier, "free">);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStage("done");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => {
        reset();
        onClose();
      }}
    >
      <Pressable
        accessibilityLabel="Close"
        onPress={() => {
          reset();
          onClose();
        }}
        style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }}
      />
      <View
        className="rounded-t-sheet bg-canvas"
        style={{ maxHeight: "92%", paddingTop: 16, paddingBottom: insets.bottom + 12 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {stage === "plans" ? (
            <PlanChooser
              reason={reason}
              pendingQuestion={pendingQuestion}
              onSelect={(plan) => {
                setSelected(plan);
                setStage("checkout");
              }}
              onClose={() => {
                reset();
                onClose();
              }}
            />
          ) : stage === "checkout" ? (
            <Checkout
              plan={selected}
              pending={pending}
              error={error}
              onBack={() => setStage("plans")}
              onPay={() => void pay()}
            />
          ) : (
            <Success
              plan={selected}
              pendingQuestion={pendingQuestion}
              onDone={() => {
                const tier = selected.tier;
                reset();
                onActivated(tier);
              }}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* --------------------------------------------------------------- chooser --- */

function PlanChooser({
  reason,
  pendingQuestion,
  onSelect,
  onClose,
}: {
  reason: Reason;
  pendingQuestion?: string;
  onSelect: (plan: Plan) => void;
  onClose: () => void;
}) {
  const copy = REASON_COPY[reason];

  return (
    <View className="px-5">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1 pr-[24%]">
          <View className="flex-row">
            <View className="flex-row items-center gap-1.5 rounded-pill bg-brand-50 px-2.5 py-1">
              <Lock size={12} color={brand[700]} />
              <Text className="text-[11px] font-semibold text-brand-700">{copy.eyebrow}</Text>
            </View>
          </View>
          <Text className="mt-2 text-[22px] font-bold leading-[26px] tracking-tight text-ink-900">
            {copy.title}
          </Text>
          <Text className="mt-1.5 text-[13px] leading-[18px] text-ink-500">{copy.body}</Text>
          <View className="absolute -right-3 -top-2" pointerEvents="none">
            <MascotBust size={112} />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
          style={shadow.e1}
        >
          <X size={17} color={ink[500]} />
        </Pressable>
      </View>

      {/*
       * Showing the held question back is the entire point of holding it.
       * Without this the reader has to trust that it survived, and most will
       * just retype it.
       */}
      {pendingQuestion ? (
        <View
          className="mt-3 rounded-card bg-surface p-3"
          style={{ borderWidth: 1, borderColor: surface.line }}
        >
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Your question is saved
          </Text>
          <Text className="mt-1 text-[12px] italic leading-[17px] text-ink-700" numberOfLines={2}>
            &ldquo;{pendingQuestion}&rdquo;
          </Text>
        </View>
      ) : null}

      {/*
       * All three plans, always — Family, Solo, then the Daily pass. Features
       * are listed in full on the highlighted plan and collapsed to one line on
       * the others, because three expanded cards do not fit. Hiding the Daily
       * pass behind a "more options" tap would bury the cheapest way to say yes.
       */}
      <View className="mt-4 gap-2.5">
        {PLAN_ORDER.map((plan) => (
          <PlanOption key={plan.tier} plan={plan} onSelect={() => onSelect(plan)} />
        ))}
      </View>

      <View className="mt-3 flex-row items-center justify-center gap-2">
        <ShieldCheck size={13} color={brand[400]} />
        <Text className="text-[11px] text-ink-500">Cancel anytime. Your health, your way.</Text>
      </View>
    </View>
  );
}

function PlanOption({ plan, onSelect }: { plan: Plan; onSelect: () => void }) {
  const Icon = PLAN_ICON[plan.tier] ?? Sparkles;
  const featured = Boolean(plan.highlight);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${plan.name}, ${formatPrice(plan.priceInPaise)} per ${plan.period}. ${plan.tagline}`}
      onPress={onSelect}
      className="rounded-card bg-surface p-3.5"
      style={[shadow.e1, { borderWidth: 2, borderColor: featured ? brand[500] : surface.line }]}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-tile"
          style={{
            backgroundColor:
              plan.tier === "family"
                ? brand[50]
                : plan.tier === "solo"
                  ? semantic.safeBg
                  : semantic.cautionBg,
          }}
        >
          <Icon
            size={20}
            color={
              plan.tier === "family"
                ? brand[600]
                : plan.tier === "solo"
                  ? semantic.safe
                  : semantic.cautionText
            }
          />
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text className="text-[16px] font-bold text-ink-900">{plan.name}</Text>
            {plan.highlight ? (
              <View className="rounded-pill bg-brand-600 px-2 py-0.5">
                <Text className="text-[10px] font-bold text-white">{plan.highlight}</Text>
              </View>
            ) : null}
          </View>
          <Text className="mt-0.5 text-[12px] leading-[16px] text-ink-500">{plan.tagline}</Text>
        </View>

        <View className="items-end">
          <Text className="text-[19px] font-bold leading-none text-ink-900">
            {formatPrice(plan.priceInPaise)}
          </Text>
          <Text className="mt-0.5 text-[11px] text-ink-500">/{plan.period}</Text>
        </View>
      </View>

      {featured ? (
        <View className="mt-3 gap-1.5">
          {plan.features.map((feature) => (
            <View key={feature} className="flex-row items-start gap-2">
              <Check size={14} color={semantic.safe} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[12px] text-ink-700">{feature}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="mt-2.5 flex-row items-start gap-2">
          <Check size={13} color={semantic.safe} style={{ marginTop: 1 }} />
          <Text className="flex-1 text-[11.5px] leading-[16px] text-ink-500">
            {plan.tier === "micro"
              ? `Unlimited chats for ${DAILY_PASS_HOURS} hours, no renewal`
              : plan.features.slice(0, 2).join(" · ")}
          </Text>
        </View>
      )}

      <View
        className="mt-3 h-11 items-center justify-center rounded-pill"
        style={
          featured
            ? { backgroundColor: brand[600] }
            : { backgroundColor: brand[50], borderWidth: 1, borderColor: brand[200] }
        }
      >
        <Text
          className="text-[14px] font-semibold"
          style={{ color: featured ? "#fff" : brand[700] }}
        >
          Choose {plan.name}
        </Text>
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------- checkout --- */

/*
 * What Razorpay puts in front of the reader once its sheet opens. Listed so the
 * method card is recognisable, not as a chooser: picking between them happens
 * in Razorpay's own screen, which is the only place a PIN or a card number
 * should ever be typed.
 */
const RAZORPAY_METHODS = ["UPI", "Cards", "Net banking", "Wallets"];

function Checkout({
  plan,
  pending,
  error,
  onBack,
  onPay,
}: {
  plan: Plan;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onPay: () => void;
}) {
  const isDaily = plan.tier === "micro";
  const Icon = PLAN_ICON[plan.tier] ?? Sparkles;

  return (
    <View className="px-5">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to plans"
          onPress={onBack}
          hitSlop={8}
          className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
          style={shadow.e1}
        >
          <ArrowLeft size={17} color={ink[700]} />
        </Pressable>
        <View className="min-w-0 flex-1 items-center">
          <Text className="text-[17px] font-bold text-ink-900">Complete your subscription</Text>
          <View className="mt-0.5 flex-row items-center gap-1">
            <Lock size={11} color={ink[500]} />
            <Text className="text-[11px] text-ink-500">Secure and encrypted</Text>
          </View>
        </View>
        <View className="w-9" />
      </View>

      <View className="mt-4 rounded-card bg-brand-50 p-4">
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-tile bg-surface">
            <Icon size={20} color={brand[600]} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[17px] font-bold text-ink-900">{plan.name}</Text>
            <View className="mt-0.5 flex-row items-baseline">
              <Text className="text-[20px] font-bold text-brand-700">
                {formatPrice(plan.priceInPaise)}
              </Text>
              <Text className="text-[13px] text-ink-500"> / {plan.period}</Text>
            </View>
            {/* The Daily pass is a one-off, so promising a renewal — or a
                cancellation — would both be wrong. */}
            <Text className="mt-0.5 text-[11px] text-ink-500">
              {isDaily
                ? `One-time, expires after ${DAILY_PASS_HOURS} hours`
                : "Billed monthly, cancel anytime"}
            </Text>
          </View>
        </View>

        <View
          className="mt-3 flex-row flex-wrap gap-2 pt-3"
          style={{ borderTopWidth: 1, borderTopColor: brand[200] }}
        >
          {[
            {
              icon: InfinityIcon,
              label: isDaily ? `Unlimited for ${DAILY_PASS_HOURS}h` : "Unlimited Ask Baymax",
            },
            { icon: Zap, label: "Health insights" },
            { icon: ShieldCheck, label: "Unlimited storage" },
            { icon: Users, label: `${plan.seats} member${plan.seats === 1 ? "" : "s"}` },
          ].map(({ icon: FeatureIcon, label }) => (
            <View key={label} className="w-[47%] flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-pill bg-surface">
                <FeatureIcon size={14} color={brand[600]} />
              </View>
              <Text className="flex-1 text-[11px] font-medium text-ink-700">{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View
        className="mt-3 flex-row items-start gap-2 rounded-card px-3.5 py-3"
        style={{ backgroundColor: semantic.safeBg }}
      >
        <ShieldCheck size={15} color={semantic.safeText} style={{ marginTop: 1 }} />
        <Text className="flex-1 text-[12px] leading-[17px]" style={{ color: semantic.safeText }}>
          {isDaily
            ? `${formatPrice(plan.priceInPaise)} charged once. Nothing renews. The pass ends after ${DAILY_PASS_HOURS} hours.`
            : `${formatPrice(plan.priceInPaise)} will be charged every month on the date you subscribe.`}
        </Text>
      </View>

      <Text className="mt-4 text-[14px] font-semibold text-ink-900">Payment method</Text>

      {/*
       * One method, not a chooser. Razorpay IS the gateway; UPI, cards and net
       * banking are things it offers once its own sheet is open. Drawing a
       * UPI-versus-card radio here would be this app pretending to route a
       * payment it never touches.
       */}
      <View
        className="mt-2 rounded-card bg-surface p-3.5"
        style={{ borderWidth: 2, borderColor: brand[500] }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-tile bg-brand-50">
            <Text className="text-[10px] font-black tracking-tight text-brand-600">RZP</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold text-ink-900">Razorpay</Text>
            <Text className="mt-0.5 text-[12px] text-ink-500">
              Pay by UPI, card, net banking or wallet
            </Text>
          </View>
          <View
            className="h-5 w-5 items-center justify-center rounded-pill"
            style={{ borderWidth: 2, borderColor: brand[600] }}
          >
            <View className="h-2.5 w-2.5 rounded-pill" style={{ backgroundColor: brand[600] }} />
          </View>
        </View>

        <View
          className="mt-2.5 flex-row flex-wrap gap-1.5 pt-2.5"
          style={{ borderTopWidth: 1, borderTopColor: surface.line }}
        >
          {RAZORPAY_METHODS.map((label) => (
            <View
              key={label}
              className="rounded-tile bg-canvas px-2 py-1"
              style={{ borderWidth: 1, borderColor: surface.line }}
            >
              <Text className="text-[10px] font-bold text-ink-500">{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="mt-3 text-[13px] font-medium text-danger-text">
          {error}
        </Text>
      ) : null}

      <View className="mt-4 rounded-card bg-surface p-4" style={shadow.e1}>
        <View className="flex-row items-baseline justify-between">
          <Text className="text-[15px] font-semibold text-ink-900">Total</Text>
          <View className="flex-row items-baseline">
            <Text className="text-[20px] font-bold text-brand-700">
              {formatPrice(plan.priceInPaise)}
            </Text>
            <Text className="text-[12px] text-ink-500"> / {plan.period}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={onPay}
          className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-pill"
          style={{ backgroundColor: brand[600], opacity: pending ? 0.6 : 1 }}
        >
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Lock size={16} color="#fff" />
              <Text className="text-[16px] font-semibold text-white">Continue to Razorpay</Text>
            </>
          )}
        </Pressable>

        {/*
         * Two claims, both true and both kept true when the real provider is
         * wired in: authorisation happens in Razorpay's sheet, and this build
         * is not charging anybody. The second line goes when payment is real.
         */}
        <Text className="mt-2 text-center text-[11px] leading-[16px] text-ink-500">
          You&apos;ll confirm in Razorpay&apos;s secure screen. Baymax never sees your UPI PIN or
          card details.
        </Text>
        <Text className="mt-1.5 text-center text-[11px] font-medium text-ink-300">
          Preview build: no payment is taken and no money moves.
        </Text>
      </View>
    </View>
  );
}

/* --------------------------------------------------------------- success --- */

function Success({
  plan,
  pendingQuestion,
  onDone,
}: {
  plan: Plan;
  pendingQuestion?: string;
  onDone: () => void;
}) {
  return (
    <View className="px-5 pb-2">
      <View className="mt-4 items-center">
        <View
          className="h-16 w-16 items-center justify-center rounded-pill"
          style={{ backgroundColor: semantic.safeBg }}
        >
          <CheckCircle2 size={34} color={semantic.safe} />
        </View>
        <Text className="mt-3 text-[24px] font-bold tracking-tight text-ink-900">
          You&apos;re all set
        </Text>
        <Text className="mt-1.5 max-w-[280px] text-center text-[13px] leading-[18px] text-ink-500">
          {plan.name} is active.{" "}
          {plan.tier === "micro"
            ? `Unlimited chats for the next ${DAILY_PASS_HOURS} hours.`
            : `${formatPrice(plan.priceInPaise)} a month, cancel anytime from your profile.`}
        </Text>
      </View>

      <View className="mt-4 gap-2">
        {plan.features.map((feature) => (
          <View
            key={feature}
            className="flex-row items-center gap-2.5 rounded-card bg-surface p-3"
            style={shadow.e1}
          >
            <View
              className="h-7 w-7 items-center justify-center rounded-pill"
              style={{ backgroundColor: semantic.safeBg }}
            >
              <Check size={14} color={semantic.safe} />
            </View>
            <Text className="flex-1 text-[13px] text-ink-700">{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        className="mt-5 h-14 items-center justify-center rounded-pill"
        style={{ backgroundColor: brand[600] }}
      >
        <Text className="text-[16px] font-semibold text-white">
          {pendingQuestion ? "Send my question" : "Start using Baymax"}
        </Text>
      </Pressable>

      {pendingQuestion ? (
        <Text className="mt-2 text-center text-[11px] text-ink-500">
          Your question is still here. We&apos;ll send it now.
        </Text>
      ) : null}
    </View>
  );
}
