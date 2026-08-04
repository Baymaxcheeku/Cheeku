"use client";

import { useState, useTransition } from "react";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  Infinity as InfinityIcon,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { MascotBust } from "@/components/illustrations";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { subscribe } from "@/lib/billing/actions";
import {
  DAILY_PASS_HOURS,
  formatPrice,
  FREE_CHAT_LIMIT,
  PLANS,
  PLAN_ORDER,
  type Plan,
  type Tier,
} from "@/lib/billing/plans";

/*
 * H1 / H2 — the paywall and the checkout sheet.
 *
 * Two things it must get right, both of which are about not being sleazy.
 *
 * THE PENDING QUESTION SURVIVES. Someone hits the limit mid-thought. Losing
 * what they typed and making them retype it after paying is the moment a
 * paywall stops feeling like a plan and starts feeling like a toll booth. The
 * question is held by the caller and sent automatically once the tier changes.
 *
 * NO CREDENTIALS ARE COLLECTED. The frames draw a UPI-and-card chooser and this
 * reproduces it, but choosing a method is as far as it goes: authorisation
 * belongs in the provider's own sheet. A health app that types card numbers
 * into its own form has taken on a liability it has no reason to hold. The
 * checkout button says what it is.
 */

type Stage = "plans" | "checkout" | "done";

/**
 * Why the sheet opened. Only changes the heading and the eyebrow — the plans
 * offered are always all three, because a reader who came here to add a family
 * member may well decide a Daily pass is what they actually want.
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
  const [stage, setStage] = useState<Stage>("plans");
  const [selected, setSelected] = useState<Plan>(PLANS.family);
  const [method, setMethod] = useState<"upi" | "card">("upi");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) return null;

  function pay() {
    setError(null);
    start(async () => {
      const result = await subscribe(selected.tier as Exclude<Tier, "free">);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStage("done");
    });
  }

  return (
    <Sheet onClose={onClose} label="Choose a plan">
      {stage === "plans" ? (
        <PlanChooser
          reason={reason}
          pendingQuestion={pendingQuestion}
          selected={selected}
          onSelect={(plan) => {
            setSelected(plan);
            setStage("checkout");
          }}
          onClose={onClose}
        />
      ) : stage === "checkout" ? (
        <Checkout
          plan={selected}
          method={method}
          setMethod={setMethod}
          pending={pending}
          error={error}
          onBack={() => setStage("plans")}
          onPay={pay}
        />
      ) : (
        <Success
          plan={selected}
          pendingQuestion={pendingQuestion}
          onDone={() => onActivated(selected.tier)}
        />
      )}
    </Sheet>
  );
}

/* --------------------------------------------------------------- chooser --- */

function PlanChooser({
  reason,
  pendingQuestion,
  selected,
  onSelect,
  onClose,
}: {
  reason: Reason;
  pendingQuestion?: string;
  selected: Plan;
  onSelect: (plan: Plan) => void;
  onClose: () => void;
}) {
  const copy = REASON_COPY[reason];

  return (
    <div className="px-5">
      <div className="flex items-start gap-3">
        <div className="relative min-w-0 flex-1 pr-[26%]">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
            <Lock size={12} aria-hidden />
            {copy.eyebrow}
          </span>
          <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-ink-900">
            {copy.title}
          </h2>
          <p className="mt-1.5 text-[13px] leading-snug text-ink-500">{copy.body}</p>
          <MascotBust className="pointer-events-none absolute -right-4 -top-2 w-[112px]" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1 active:scale-90"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      {/*
       * Showing the held question back is the point of holding it. Without this
       * the reader has to trust that it survived, and most will just retype it.
       */}
      {pendingQuestion ? (
        <p className="mt-3 rounded-card border border-line bg-surface p-3 text-[12px] leading-snug text-ink-500">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-300">
            Your question is saved
          </span>
          <span className="line-clamp-2 italic text-ink-700">&ldquo;{pendingQuestion}&rdquo;</span>
        </p>
      ) : null}

      {/*
       * All three plans, always — Family, Solo, then the Daily pass. Three cards
       * only fit in a sheet if the two secondary ones stay compact, so features
       * are listed in full on the highlighted plan and collapsed to a single
       * line on the others. Hiding the Daily pass behind a "more options" tap
       * would bury the cheapest way to say yes.
       */}
      <ul className="mt-4 space-y-2.5">
        {PLAN_ORDER.map((plan) => (
          <li key={plan.tier}>
            <PlanOption
              plan={plan}
              selected={selected.tier === plan.tier}
              onSelect={() => onSelect(plan)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-ink-500">
        <ShieldCheck size={13} className="text-brand-400" aria-hidden />
        Cancel anytime. Your health, your way.
      </p>
    </div>
  );
}

const PLAN_ICON: Record<string, typeof Users> = {
  family: Users,
  solo: Sparkles,
  micro: CalendarClock,
};

function PlanOption({
  plan,
  selected,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = PLAN_ICON[plan.tier] ?? Sparkles;
  const featured = Boolean(plan.highlight);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "tappable w-full rounded-card border-2 bg-surface p-3.5 text-left shadow-e1 active:scale-[0.99]",
        featured ? "border-brand-500" : selected ? "border-brand-300" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-tile",
            plan.tier === "family"
              ? "bg-brand-50 text-brand-600"
              : plan.tier === "solo"
                ? "bg-safe-bg text-safe"
                : "bg-caution-bg text-caution-text",
          )}
        >
          <Icon size={20} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[16px] font-bold text-ink-900">{plan.name}</span>
            {plan.highlight ? (
              <span className="rounded-pill bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {plan.highlight}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{plan.tagline}</p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[19px] font-bold leading-none text-ink-900">
            {formatPrice(plan.priceInPaise)}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-500">/{plan.period}</p>
        </div>
      </div>

      {featured ? (
        <ul className="mt-3 space-y-1.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[12px] text-ink-700">
              <Check size={14} className="mt-px shrink-0 text-safe" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2.5 flex items-start gap-2 text-[11.5px] leading-snug text-ink-500">
          <Check size={13} className="mt-px shrink-0 text-safe" aria-hidden />
          {plan.tier === "micro"
            ? `Unlimited chats for ${DAILY_PASS_HOURS} hours · no renewal`
            : plan.features.slice(0, 2).join(" · ")}
        </p>
      )}

      <span
        className={cn(
          "mt-3 flex h-11 items-center justify-center rounded-pill text-[14px] font-semibold",
          featured
            ? "bg-gradient-to-b from-brand-600 to-brand-800 text-white"
            : "border border-brand-200 bg-brand-50 text-brand-700",
        )}
      >
        Choose {plan.name}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------- checkout --- */

const UPI_APPS = ["GPay", "PhonePe", "Paytm", "BHIM"];
const CARD_NETWORKS = ["VISA", "Mastercard", "RuPay", "Amex"];

function Checkout({
  plan,
  method,
  setMethod,
  pending,
  error,
  onBack,
  onPay,
}: {
  plan: Plan;
  method: "upi" | "card";
  setMethod: (m: "upi" | "card") => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onPay: () => void;
}) {
  const isDaily = plan.tier === "micro";

  return (
    <div className="px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to plans"
          className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-700 shadow-e1 active:scale-90"
        >
          <ArrowLeft size={17} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="text-[17px] font-bold text-ink-900">Complete your subscription</h2>
          <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-ink-500">
            <Lock size={11} aria-hidden />
            Secure &amp; encrypted
          </p>
        </div>
        <span className="w-9 shrink-0" aria-hidden />
      </div>

      <section className="mt-4 rounded-card bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
            {(() => {
              const Icon = PLAN_ICON[plan.tier] ?? Sparkles;
              return <Icon size={20} aria-hidden />;
            })()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold text-ink-900">{plan.name}</p>
            <p className="mt-0.5">
              <span className="text-[20px] font-bold text-brand-700">
                {formatPrice(plan.priceInPaise)}
              </span>
              <span className="text-[13px] text-ink-500"> / {plan.period}</span>
            </p>
            {/* The Daily pass is a one-off, so promising a renewal — or a
                cancellation — would both be wrong. */}
            <p className="mt-0.5 text-[11px] text-ink-500">
              {isDaily
                ? `One-time · expires after ${DAILY_PASS_HOURS} hours`
                : "Billed monthly · Cancel anytime"}
            </p>
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-2 border-t border-brand-200/60 pt-3">
          {[
            {
              icon: InfinityIcon,
              label: isDaily ? `Unlimited for ${DAILY_PASS_HOURS}h` : "Unlimited Ask Baymax",
            },
            { icon: Zap, label: "Health insights" },
            { icon: ShieldCheck, label: "Unlimited storage" },
            { icon: Users, label: `${plan.seats} member${plan.seats === 1 ? "" : "s"}` },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[11px] font-medium text-ink-700">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-surface text-brand-600">
                <Icon size={14} aria-hidden />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-3 flex items-start gap-2 rounded-card bg-safe-bg px-3.5 py-3 text-[12px] leading-snug text-safe-text">
        <ShieldCheck size={15} className="mt-px shrink-0" aria-hidden />
        {isDaily
          ? `${formatPrice(plan.priceInPaise)} charged once. Nothing renews. The pass simply ends after ${DAILY_PASS_HOURS} hours.`
          : `${formatPrice(plan.priceInPaise)} will be charged every month on the date you subscribe.`}
      </p>

      <h3 className="mt-4 text-[14px] font-semibold text-ink-900">Choose payment method</h3>
      <div className="mt-2 space-y-2">
        <MethodCard
          selected={method === "upi"}
          onSelect={() => setMethod("upi")}
          title="UPI"
          body="Pay securely using any UPI app"
          badge="Recommended"
          logos={UPI_APPS}
        />
        <MethodCard
          selected={method === "card"}
          onSelect={() => setMethod("card")}
          title="Debit / Credit Card"
          body="Visa, Mastercard, RuPay and more"
          icon={<CreditCard size={18} aria-hidden />}
          logos={CARD_NETWORKS}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}

      <div className="mt-4 rounded-card bg-surface p-4 shadow-e1">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-ink-900">Total</span>
          <span>
            <span className="text-[20px] font-bold text-brand-700">
              {formatPrice(plan.priceInPaise)}
            </span>
            <span className="text-[12px] text-ink-500"> / {plan.period}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onPay}
          disabled={pending}
          className="tappable mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[16px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
        >
          <Lock size={16} aria-hidden />
          {pending
            ? "Opening your payment app…"
            : `Pay ${formatPrice(plan.priceInPaise)} / ${plan.period}`}
        </button>

        {/*
         * Said plainly, because it is true and because it is the reassuring
         * thing: Baymax never sees the credential. When a real provider is
         * wired in, this stays accurate — authorisation happens in their sheet.
         */}
        <p className="mt-2 text-center text-[11px] leading-snug text-ink-500">
          You&apos;ll confirm in your own {method === "upi" ? "UPI app" : "bank's"} secure screen.
          Baymax never sees your {method === "upi" ? "UPI PIN" : "card details"}.
        </p>
      </div>
    </div>
  );
}

function MethodCard({
  selected,
  onSelect,
  title,
  body,
  badge,
  icon,
  logos,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  badge?: string;
  icon?: React.ReactNode;
  logos: readonly string[];
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={cn(
        "tappable w-full rounded-card border-2 bg-surface p-3.5 text-left active:scale-[0.99]",
        selected ? "border-brand-500" : "border-line",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
          {icon ?? <span className="text-[11px] font-black tracking-tight">UPI</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink-900">{title}</span>
            {badge ? (
              <span className="rounded-pill bg-safe-bg px-2 py-0.5 text-[10px] font-semibold text-safe-text">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-ink-500">{body}</span>
        </span>
        <span
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-pill border-2",
            selected ? "border-brand-600" : "border-line",
          )}
          aria-hidden
        >
          {selected ? <span className="h-2.5 w-2.5 rounded-pill bg-brand-600" /> : null}
        </span>
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
        {logos.map((logo) => (
          <li
            key={logo}
            className="rounded-tile border border-line bg-canvas px-2 py-1 text-[10px] font-bold text-ink-500"
          >
            {logo}
          </li>
        ))}
      </ul>
    </button>
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
    <div className="px-5 pb-2">
      <div className="mt-4 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-pill bg-safe-bg text-safe">
          <CheckCircle2 size={34} aria-hidden />
        </span>
        <h2 className="mt-3 text-[24px] font-bold tracking-tight text-ink-900">You&apos;re all set</h2>
        <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-snug text-ink-500">
          {plan.name} is active.{" "}
          {plan.tier === "micro"
            ? `Unlimited chats for the next ${DAILY_PASS_HOURS} hours.`
            : `${formatPrice(plan.priceInPaise)} a month, cancel anytime from your profile.`}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-center gap-2.5 rounded-card bg-surface p-3 text-[13px] text-ink-700 shadow-e1"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-safe-bg text-safe">
              <Check size={14} aria-hidden />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onDone}
        className="tappable mt-5 h-14 w-full rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[16px] font-semibold text-white active:scale-[0.98]"
      >
        {pendingQuestion ? "Send my question" : "Start using Baymax"}
      </button>

      {pendingQuestion ? (
        <p className="mt-2 text-center text-[11px] text-ink-500">
          Your question is still here. We&apos;ll send it now.
        </p>
      ) : null}
    </div>
  );
}
