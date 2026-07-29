"use client";

import { useState, useTransition } from "react";
import { Check, Crown, Sparkles, Users } from "lucide-react";

import { Paywall } from "@/components/billing/paywall";
import { cn } from "@/lib/cn";
import { cancelPlan } from "@/lib/billing/actions";
import { formatPrice, planFor, PLANS } from "@/lib/billing/plans";
import type { Entitlement } from "@/lib/billing/quota";

/**
 * The plan block on the Profile screen.
 *
 * On free it is the upsell from the frames — two plans side by side. On a paid
 * tier it becomes a receipt: what you are on, what it costs, and a way out.
 *
 * The cancel is real and immediate rather than a "contact us" link. A
 * subscription that is one tap to start and a support ticket to stop is a dark
 * pattern, and this one is attached to someone's medical records.
 */
export function PlanCard({ entitlement }: { entitlement: Entitlement }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();

  const plan = planFor(entitlement.tier);
  const paid = entitlement.tier === "solo" || entitlement.tier === "family";

  if (paid) {
    return (
      <section className="mx-5 mt-4 rounded-card bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-white/15">
            <Crown size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-bold">{plan.name}</p>
            <p className="mt-0.5 text-[12px] text-brand-100">
              {formatPrice(plan.priceInPaise)} / {plan.period} · Unlimited chats
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-white/20 px-2.5 py-1 text-[11px] font-semibold">
            Active
          </span>
        </div>

        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/15 pt-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-1.5 text-[11px] text-brand-100">
              <Check size={12} className="mt-0.5 shrink-0" aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        {confirmCancel ? (
          <div className="mt-3 rounded-tile bg-white/10 p-3">
            <p className="text-[12px] leading-snug">
              Cancelling returns you to {" "}
              <strong className="font-semibold">5 chats a month</strong>. Your records and documents
              are untouched.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="tappable h-10 flex-1 rounded-pill bg-white/15 text-[13px] font-semibold active:scale-[0.98]"
              >
                Keep my plan
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(async () => void (await cancelPlan()))}
                className="tappable h-10 flex-1 rounded-pill bg-white text-[13px] font-semibold text-brand-700 active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? "Cancelling…" : "Cancel plan"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="tappable mt-3 text-[12px] font-medium text-brand-100 underline underline-offset-2"
          >
            Cancel subscription
          </button>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="mx-5 mt-4 rounded-card border border-brand-200 bg-brand-50 p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
            <Crown size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-bold text-ink-900">Upgrade to unlock more</p>
            <p className="mt-0.5 text-[12px] leading-snug text-ink-500">
              Get family access and unlimited chats.
            </p>
          </div>
        </div>

        {/*
         * The usage line is the honest version of an upsell: it states where
         * they actually are rather than implying they are about to run out.
         */}
        {entitlement.limit !== null ? (
          <div className="mt-3 rounded-tile bg-surface p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-ink-700">Chats this month</span>
              <span className="text-[12px] font-semibold text-ink-900">
                {entitlement.chatsUsed} of {entitlement.limit}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-brand-100">
              <div
                className={cn(
                  "h-full rounded-pill transition-[width]",
                  entitlement.canChat ? "bg-brand-600" : "bg-danger",
                )}
                style={{
                  width: `${Math.min(100, (entitlement.chatsUsed / entitlement.limit) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <ul className="mt-3 grid grid-cols-2 gap-2">
          {[PLANS.solo, PLANS.family].map((p) => (
            <li key={p.tier} className="rounded-card bg-surface p-3">
              <span className="grid h-9 w-9 place-items-center rounded-tile bg-brand-50 text-brand-600">
                {p.tier === "family" ? <Users size={17} aria-hidden /> : <Sparkles size={17} aria-hidden />}
              </span>
              <p className="mt-2 text-[13px] font-semibold text-ink-900">{p.name}</p>
              <p className="mt-0.5">
                <span className="text-[17px] font-bold text-brand-700">
                  {formatPrice(p.priceInPaise)}
                </span>
                <span className="text-[11px] text-ink-500"> / {p.period}</span>
              </p>
              <button
                type="button"
                onClick={() => setPaywallOpen(true)}
                className="tappable mt-2 h-9 w-full rounded-pill border border-brand-200 bg-brand-50 text-[12px] font-semibold text-brand-700 active:scale-[0.98]"
              >
                Upgrade
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-2.5 text-center text-[11px] text-ink-500">
          Cancel anytime. Your health, your way.
        </p>
      </section>

      <Paywall
        open={paywallOpen}
        reason="upgrade"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => setPaywallOpen(false)}
      />
    </>
  );
}
