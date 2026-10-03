import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Infinity as InfinityIcon,
  Lock,
  ShieldCheck,
  UserRound,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StaggerItem } from "@/components/ui/motion";
import {
  DAILY_PASS_HOURS,
  familySavingPercent,
  formatPrice,
  FREE_CHAT_LIMIT,
  perDayLabel,
  PLANS,
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
    body: `Free gives you ${FREE_CHAT_LIMIT} chats a day. A plan removes the ceiling.`,
  },
  upgrade: {
    eyebrow: "Upgrade",
    title: "Unlock everything in Cheeku AI",
    body: `Free gives you ${FREE_CHAT_LIMIT} chats a day. A plan removes the ceiling.`,
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
  solo: UserRound,
  micro: CalendarClock,
};

export function Paywall({
  open,
  onClose,
  onActivated,
  pendingQuestion,
  reason = "quota",
  startAt,
}: {
  open: boolean;
  onClose: () => void;
  onActivated: (tier: Tier) => void;
  /**
   * Skip the chooser and open straight at checkout for this plan. Used when
   * the reader already chose on the plan screen; making them choose twice
   * is how a two-tap upgrade becomes a five-tap one.
   */
  startAt?: Exclude<Tier, "free">;
  /** Shown back to the reader so they can see it was not lost. */
  pendingQuestion?: string;
  reason?: Reason;
}) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Stage>("plans");
  const [selected, setSelected] = useState<Plan>(PLANS.family);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open && startAt) {
      setSelected(PLANS[startAt]);
      setStage("checkout");
    }
  }, [open, startAt]);

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

/*
 * ┌─ THE SECOND PASS: MINIMAL, AND WHY THAT IS THE COMMERCIAL CHOICE ────────┐
 * │                                                                          │
 * │ The first rebuild took the right STRUCTURE from the reference paywalls   │
 * │ and the wrong surface: three bordered cards in a row, each with its own  │
 * │ shadow, badge, divider and radio, sitting under three coloured icon      │
 * │ tiles and above a fourth bordered card. Every element shouted, so the    │
 * │ price — the only thing being decided — shouted no louder than the rest.  │
 * │                                                                          │
 * │ Premium is not more decoration, it is fewer objects. So: ONE container   │
 * │ for the plans, hairlines instead of borders between them, no shadows at  │
 * │ all, no coloured tiles, and colour spent in exactly two places — the     │
 * │ selected row and the button. Everything else is ink on white.            │
 * │                                                                          │
 * │ Full-width rows rather than three columns, because a row can hold the    │
 * │ price and what it buys on one line at a readable size, and a 100pt       │
 * │ column cannot. Comparison gets easier as the objects get quieter.        │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** Cheapest first: a list of prices that opens on the dearest reads as a trap. */
const ROW_ORDER: readonly Plan[] = [PLANS.micro, PLANS.solo, PLANS.family];

/** What every paid tier unlocks, as outcomes. Three, because four is a list. */
const UNLOCKS: readonly string[] = [
  "Ask as much as you need, at any hour",
  "Answers that name the record they came from",
  "A separate file for everyone you look after",
];

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
  /*
   * Family is pre-selected as the recommendation. It is a highlight, not a
   * trap: every plan sits in the same row at the same size with its price in
   * the same position, and switching costs one tap.
   */
  const [selected, setSelected] = useState<Plan>(PLANS.family);

  return (
    <View className="px-6">
      {/* A grabber, and the close control as far from the CTA as it can be. */}
      <View className="flex-row items-start">
        <View className="min-w-0 flex-1">
          <Text className="text-[11px] font-bold uppercase text-ink-300" style={{ letterSpacing: 1.4 }}>
            {copy.eyebrow}
          </Text>
          {/*
           * 29pt with negative tracking. Large type reads loose at the default,
           * and the tightening is what separates a headline from a label — it
           * is the cheapest premium signal in typography and costs no space.
           */}
          <Text
            className="mt-2.5 text-[29px] font-bold leading-[33px] text-ink-900"
            style={{ letterSpacing: -0.8 }}
          >
            {copy.title}
          </Text>
          <Text className="mt-2 text-[13.5px] leading-[19px] text-ink-500">{copy.body}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
          hitSlop={10}
          className="-mr-1 h-8 w-8 items-center justify-center rounded-pill"
        >
          <X size={18} color={ink[300]} />
        </Pressable>
      </View>

      {/*
       * The held question. Kept from the first pass because it is the one
       * persuasive device here that persuades by being true — your words are
       * still there — and quietened to a rule and a line of italic.
       */}
      {pendingQuestion ? (
        <View
          className="mt-5 border-l-2 pl-3"
          style={{ borderLeftColor: brand[200] }}
        >
          <Text className="text-[10.5px] font-bold uppercase text-ink-300" style={{ letterSpacing: 1 }}>
            Held for you
          </Text>
          <Text className="mt-1 text-[13px] italic leading-[18px] text-ink-700" numberOfLines={2}>
            &ldquo;{pendingQuestion}&rdquo;
          </Text>
        </View>
      ) : null}

      {/* Value before price. Ticks in ink, not a colour: three green marks
          would spend the semantic palette on a sales list. */}
      <View className="mt-6 gap-2.5">
        {UNLOCKS.map((line, i) => (
          <StaggerItem key={line} index={i}>
            <View className="flex-row items-start gap-2.5">
              <Check size={15} color={brand[600]} strokeWidth={2.5} style={{ marginTop: 1 }} />
              <Text className="flex-1 text-[13.5px] leading-[19px] text-ink-900">{line}</Text>
            </View>
          </StaggerItem>
        ))}
      </View>

      {/* ----------------------------------------------------------- plans -- */}
      {/* One container, hairlines between. Three separate cards is three
          objects to compare before you compare the prices inside them. */}
      <View
        className="mt-6 overflow-hidden rounded-card"
        style={{ borderWidth: 1, borderColor: surface.line, backgroundColor: surface.base }}
      >
        {ROW_ORDER.map((plan, i) => (
          <PlanRow
            key={plan.tier}
            plan={plan}
            selected={selected.tier === plan.tier}
            first={i === 0}
            onSelect={() => setSelected(plan)}
          />
        ))}
      </View>

      <NextSteps plan={selected} />

      <View className="mt-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Continue with ${selected.name}, ${formatPrice(selected.priceInPaise)} per ${selected.period}`}
          onPress={() => onSelect(selected)}
          className="h-[54px] items-center justify-center rounded-pill"
          style={{ backgroundColor: brand[600] }}
        >
          <Text className="text-[16px] font-bold text-white">Continue</Text>
        </Pressable>

        <Text className="mt-3 text-center text-[11.5px] text-ink-300">
          {selected.tier === "micro"
            ? `One payment of ${formatPrice(selected.priceInPaise)}. Nothing renews.`
            : `${formatPrice(selected.priceInPaise)} a ${selected.period}. Cancel any time.`}
        </Text>

        {/*
         * The decline is a plain sentence at the bottom, in the same weight as
         * everything else. "I don't want it" and "No thanks, I'll stay
         * unhealthy" are the same control written to shame; on a health app
         * that is indefensible, whatever it does to conversion.
         */}
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          hitSlop={10}
          className="mt-2 items-center py-3"
        >
          <Text className="text-[13.5px] font-semibold text-ink-500">Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * One plan as a full-width row.
 *
 * The price is right-aligned in a fixed position down the column, so the three
 * numbers line up and the eye can compare them without reading a word. The
 * recommendation is a small ink label, not a coloured badge: a plan that has
 * to shout is a plan the reader is being pushed towards.
 */
function PlanRow({
  plan,
  selected,
  first,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  first: boolean;
  onSelect: () => void;
}) {
  const perDay = perDayLabel(plan);
  const saving = plan.tier === "family" ? familySavingPercent() : null;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${plan.name}, ${formatPrice(plan.priceInPaise)} per ${plan.period}${
        perDay ? `, ${perDay}` : ""
      }${saving ? `, ${saving} percent less than separate plans` : ""}`}
      onPress={onSelect}
      className="flex-row items-center gap-3 px-4 py-3.5"
      style={{
        backgroundColor: selected ? brand[50] : surface.base,
        ...(first ? null : { borderTopWidth: 1, borderTopColor: surface.line }),
      }}
    >
      {/* The radio leads. It is the thing being set, and a control on the left
          is read before the price on the right rather than after it. */}
      <View
        className="h-[22px] w-[22px] items-center justify-center rounded-pill"
        style={{
          borderWidth: selected ? 0 : 1.5,
          borderColor: ink[300],
          backgroundColor: selected ? brand[600] : "transparent",
        }}
      >
        {selected ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
      </View>

      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-[15px] font-semibold text-ink-900">
            {plan.name.replace(" Plan", "")}
          </Text>
          {saving ? (
            <Text className="text-[10.5px] font-bold uppercase" style={{ color: brand[600], letterSpacing: 0.6 }}>
              Save {saving}%
            </Text>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[11.5px] text-ink-500">
          {plan.seats > 1 ? `Up to ${plan.seats} people` : "One person"}
          {perDay ? ` · ${perDay}` : ` · ${DAILY_PASS_HOURS} hours`}
        </Text>
      </View>

      <View className="items-end">
        {/* Tabular figures so ₹29, ₹99 and ₹249 align on the decimal column
            rather than drifting with the width of each glyph. */}
        <Text
          className="text-[17px] font-bold text-ink-900"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatPrice(plan.priceInPaise)}
        </Text>
        <Text className="text-[11px] text-ink-300">per {plan.period}</Text>
      </View>
    </Pressable>
  );
}

/**
 * What the tap does, in three lines.
 *
 * The reference paywalls run this as a vertical timeline with icons and a
 * connector. That was right for a trial, where three separate future events
 * genuinely happen. We have two — it unlocks, and it renews or it ends — so it
 * is three lines of text with a rule above them. A timeline drawn around two
 * events is decoration pretending to be information.
 */
function NextSteps({ plan }: { plan: Plan }) {
  const isDaily = plan.tier === "micro";

  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);
  const renewalDate = renews.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  });

  const lines: readonly [string, string][] = isDaily
    ? [
        ["Today", `Everything unlocks for ${DAILY_PASS_HOURS} hours`],
        [`In ${DAILY_PASS_HOURS} hours`, "The pass ends by itself"],
        ["Never", "Nothing renews, nothing is charged again"],
      ]
    : [
        ["Today", `No chat limit${plan.seats > 1 ? `, up to ${plan.seats} people` : ""}`],
        [renewalDate, `${formatPrice(plan.priceInPaise)} again, then monthly`],
        ["Any time", "Cancel in Settings. Records are never deleted"],
      ];

  return (
    <View className="mt-5 gap-2 pt-4" style={{ borderTopWidth: 1, borderTopColor: surface.line }}>
      {lines.map(([when, what]) => (
        <View key={when} className="flex-row items-baseline gap-3">
          <Text className="w-[84px] text-[12px] font-semibold text-ink-900">{when}</Text>
          <Text className="min-w-0 flex-1 text-[12px] leading-[17px] text-ink-500">{what}</Text>
        </View>
      ))}
    </View>
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
  const Icon = PLAN_ICON[plan.tier] ?? UserRound;

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
              label: isDaily ? `Unlimited for ${DAILY_PASS_HOURS}h` : "Unlimited Ask Cheeku",
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
          You&apos;ll confirm in Razorpay&apos;s secure screen. Cheeku never sees your UPI PIN or
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
          {pendingQuestion ? "Send my question" : "Start using Cheeku AI"}
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
