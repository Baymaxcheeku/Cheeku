"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { chooseAudience } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";

type Audience = "me" | "family";

const OPTIONS: readonly {
  value: Audience;
  title: string;
  body: string;
  badge: { icon: LucideIcon; label: string };
  illustration: string;
}[] = [
  {
    value: "me",
    title: "It's for me",
    body: "Manage and track my own health records.",
    badge: { icon: ShieldCheck, label: "Private. Secure. Just for you" },
    illustration: "/illustrations/who-me.png",
  },
  {
    value: "family",
    title: "It's for my family",
    body: "Manage health for my loved ones.",
    badge: { icon: Users, label: "Add and manage family members easily" },
    illustration: "/illustrations/who-family.png",
  },
];

/** A4 — audience choice. Personalisation only; it does not gate any feature. */
export default function WhoPage() {
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

        <fieldset
          className="mt-5 flex-1 space-y-3"
          // The legend repeats the headline for anyone who reaches the group
          // without having read the visual heading above it.
        >
          <legend className="sr-only">Who is this for?</legend>
          {OPTIONS.map((option) => {
            const selected = audience === option.value;
            const Badge = option.badge.icon;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-card border-2 bg-surface p-3 transition-colors duration-150",
                  selected ? "border-brand-500 bg-brand-50/60" : "border-line",
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
                <Image
                  src={option.illustration}
                  alt=""
                  width={96}
                  height={96}
                  className="h-[92px] w-[84px] shrink-0 object-contain"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink-900">{option.title}</span>
                    <span
                      className={cn(
                        "ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-pill border-2",
                        selected ? "border-brand-600" : "border-brand-200",
                      )}
                      aria-hidden
                    >
                      {selected ? <span className="h-2.5 w-2.5 rounded-pill bg-brand-600" /> : null}
                    </span>
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-ink-500">
                    {option.body}
                  </span>
                  <span className="mt-2 flex items-center gap-1.5 rounded-pill bg-brand-50 px-2.5 py-1.5 text-[11px] font-medium text-brand-700">
                    <Badge size={12} aria-hidden />
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
        </div>
      </form>
    </div>
  );
}
