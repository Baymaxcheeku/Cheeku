"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Dots, Headline, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { FamilyScene, HeroScene, InsightsScene, PrivacyScene } from "@/components/illustrations";
import { PANELS } from "./panels";

/* One scene per panel. Drawn, so they stay sharp and carry no backdrop. */
const SCENES = {
  hero: HeroScene,
  privacy: PrivacyScene,
  insights: InsightsScene,
  family: FamilyScene,
} as const;

/** A2 — value carousel. Four panels, skippable, before any account exists. */
export default function WelcomePage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const panel = PANELS[index];
  const isLast = index === PANELS.length - 1;

  if (!panel) return null;
  const Scene = SCENES[panel.scene];

  function next() {
    if (isLast) router.push("/sign-in");
    else setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-11 items-center gap-3 px-5">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            aria-label="Previous"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-ink-700 hover:bg-brand-50"
          >
            <ChevronLeft size={20} />
          </button>
        ) : null}
        <Link
          href="/sign-in"
          className="ml-auto text-[15px] font-medium text-brand-500 hover:text-brand-700"
        >
          Skip
        </Link>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-3">
        <div className="pt-2">
          <Headline lead={panel.lead} accent={panel.accent} />
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{panel.body}</p>
        </div>

        {/*
         * `flex-1` with a low floor rather than a tall fixed box: panels 1 and 2
         * are mostly art and let it grow, panels 3 and 4 carry a chip grid or a
         * feature list and need it to give way so the CTA stays above the fold.
         */}
        {/*
         * The art is allowed to run nearly full-bleed. Capped at 320px it sat
         * marooned in the middle of a 852pt screen on the two art-only panels —
         * the panel read as unfinished rather than spacious.
         */}
        <div className="mt-2 flex min-h-[100px] flex-1 items-center justify-center">
          <Scene className="h-full max-h-[340px] w-full max-w-[420px] object-contain" />
        </div>

        {panel.chips ? (
          <ul className="mt-3 grid grid-cols-4 gap-2">
            {panel.chips.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-tile border border-line bg-surface px-1 py-3 text-center"
              >
                <Icon size={16} className="text-brand-500" aria-hidden />
                <span className="text-[10px] font-medium leading-tight text-ink-700">{label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {panel.features ? (
          <ul className="mt-3 space-y-2">
            {panel.features.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex items-center gap-3 rounded-tile border border-line bg-surface px-3 py-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50">
                  <Icon size={17} className="text-brand-600" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
                  <span className="block text-[12px] leading-snug text-ink-500">{body}</span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-ink-300" aria-hidden />
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 space-y-3">
          {index > 0 ? <ReassuranceStrip /> : null}
          <Dots current={index} total={PANELS.length} />
          <Button onClick={next} className="w-full">
            {panel.cta}
          </Button>
          {index === 0 ? (
            <p className="text-center text-[13px] text-ink-500">
              Already have an account?{" "}
              <Link href="/sign-in" className="font-semibold text-brand-600">
                Log in
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
