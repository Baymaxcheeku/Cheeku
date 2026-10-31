"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { Dots, Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { chooseAudience } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";

type Audience = "me" | "family";

const OPTIONS: readonly {
  value: Audience;
  title: string;
  body: string;
  badge: { icon: LucideIcon; label: string };
  /** Rendered by the server page, which owns avatar generation. */
  art: "solo" | "family";
}[] = [
  {
    value: "me",
    title: "It's for me",
    body: "Manage and track my own health records.",
    badge: { icon: ShieldCheck, label: "Private. Secure. Just for you" },
    art: "solo",
  },
  {
    value: "family",
    title: "It's for my family",
    body: "Manage health for my loved ones.",
    badge: { icon: Users, label: "Add and manage family members easily" },
    art: "family",
  },
];

/**
 * A4 — audience choice. Personalisation only; it does not gate any feature.
 *
 * The artwork arrives as props rather than being imported here: generating the
 * avatars needs `Buffer`, which is a server concern, and pulling the avatar
 * library into this bundle to draw two faces would be a poor trade.
 */
export function WhoForm({ solo, family }: { solo: React.ReactNode; family: React.ReactNode }) {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("me");
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await chooseAudience(formData);
      if (outcome.ok) router.push(outcome.redirectTo);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingHeader back="/sign-in" action={{ label: "Skip", href: "/profile" }} />

      <form onSubmit={submit} className="flex flex-1 flex-col px-5 pb-6">
        <Headline lead="Who is" accent="this for?" />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Choose an option to personalize your experience. You can add more members later.
        </p>

        {/*
         * The radio moves out of the text column and into the card's own top
         * right corner. Inside the text column it was competing with the title
         * for the same baseline via `ml-auto`, which is why the two cards never
         * lined up with each other — the marker's position depended on how long
         * the title happened to be.
         *
         * The art sits in a fixed-width column for the same reason: the solo
         * portrait and the three-face cluster are different widths, so letting
         * them size themselves left the two titles starting at different x.
         */}
        <fieldset className="mt-5 flex-1 space-y-3">
          <legend className="sr-only">Who is this for?</legend>
          {OPTIONS.map((option) => {
            const selected = audience === option.value;
            const Badge = option.badge.icon;
            return (
              <label
                key={option.value}
                className={cn(
                  "tappable relative flex cursor-pointer items-start gap-3.5 rounded-card border-2 p-3.5 pr-11",
                  selected
                    ? "border-brand-500 bg-brand-50/60 shadow-e1"
                    : "border-line bg-surface hover:border-brand-200",
                )}
              >
                <input
                  type="radio"
                  name="audience"
                  value={option.value}
                  checked={selected}
                  onChange={() => setAudience(option.value)}
                  className="sr-only"
                />

                <span
                  className={cn(
                    "absolute right-3.5 top-3.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-pill border-2 transition-colors",
                    selected ? "border-brand-600 bg-brand-600" : "border-brand-200 bg-surface",
                  )}
                  aria-hidden
                >
                  {selected ? <Check size={13} className="text-white" strokeWidth={3} /> : null}
                </span>

                <span className="grid w-[92px] shrink-0 place-items-center">
                  {option.art === "solo" ? solo : family}
                </span>

                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="block text-[15.5px] font-bold leading-tight text-ink-900">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-ink-500">
                    {option.body}
                  </span>
                  <span
                    className={cn(
                      "mt-2.5 flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                      selected ? "bg-surface text-brand-700" : "bg-brand-50 text-brand-700",
                    )}
                  >
                    <Badge size={12} className="shrink-0" aria-hidden />
                    {option.badge.label}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="mt-5 space-y-4">
          <ReassuranceStrip>Bank-level encryption. Only you and your family can access.</ReassuranceStrip>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "One moment…" : "Continue"}
            <ArrowRight size={18} aria-hidden />
          </Button>
          <Dots current={2} total={5} />
        </div>
      </form>
    </div>
  );
}
