"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Users } from "lucide-react";

import { Paywall } from "@/components/billing/paywall";
import { Dots, Headline, ReassuranceStrip } from "@/components/onboarding/chrome";
import { FamilyScene } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { dismissPlanStep } from "@/lib/auth/plan-step-actions";
import { formatPrice, PLANS } from "@/lib/billing/plans";

/**
 * A6 — family access, offered once, skippable.
 *
 * The skip is a plain secondary button rather than a faint text link. Making the
 * way out hard to find is the standard trick here and it is not one worth
 * copying in an app that holds someone's medical records — the trust cost is
 * permanent and the conversion gain is not.
 */
export function PlanStep() {
  const router = useRouter();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pending, start] = useTransition();

  function skip() {
    start(async () => {
      await dismissPlanStep();
      router.push("/home");
    });
  }

  const family = PLANS.family;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-11 items-center px-5">
        <span className="ml-auto text-[13px] font-medium text-ink-300">Last step</span>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-4">
        <div className="pt-1">
          <Headline lead="You're set up for" accent="your family" />
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
            Family access lets you keep records for everyone and switch between them. It&apos;s part
            of the Family plan.
          </p>
        </div>

        {/* Sized so the headline, the plan card and both buttons all clear the
            fold on a 852pt display — this screen must never need scrolling to
            find the way out of it. */}
        <FamilyScene className="mx-auto -my-2 w-[150px]" />

        <section className="rounded-card border-2 border-brand-500 bg-surface p-4 shadow-e1">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
              <Users size={20} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[17px] font-bold text-ink-900">{family.name}</span>
                <span className="rounded-pill bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                  {family.highlight}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-500">{family.tagline}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[20px] font-bold leading-none text-ink-900">
                {formatPrice(family.priceInPaise)}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-500">/{family.period}</p>
            </div>
          </div>

          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {family.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-[12.5px] text-ink-700">
                <Check size={14} className="mt-px shrink-0 text-safe" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-4 space-y-2.5">
          <Button type="button" className="w-full" onClick={() => setPaywallOpen(true)}>
            See plans
            <ArrowRight size={18} aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            className="w-full"
            onClick={skip}
            disabled={pending}
          >
            {pending ? "One moment…" : "Start free with just me"}
          </Button>
          <p className="text-center text-[11.5px] leading-snug text-ink-500">
            You can add family members later from your Profile.
          </p>
        </div>

        <div className="mt-auto space-y-3 pt-4">
          <ReassuranceStrip />
          <Dots current={4} total={5} />
        </div>
      </div>

      <Paywall
        open={paywallOpen}
        reason="onboarding"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          start(async () => {
            await dismissPlanStep();
            router.push("/home");
          });
        }}
      />
    </div>
  );
}
