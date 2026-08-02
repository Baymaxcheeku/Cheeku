"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronLeft, Lock } from "lucide-react";

import { StepBar } from "@/components/onboarding/chrome";
import { HeroFamily, HeroMeet, HeroMemory, PanelSky } from "@/components/onboarding/hero-stack";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { chooseJourney } from "@/lib/onboarding/actions";
import { JOURNEYS, type JourneyId } from "@/lib/onboarding/journeys";
import { PANELS } from "./panels";

const ease = [0.22, 1, 0.36, 1] as const;

export function WelcomeCarousel({ faces }: { faces: readonly string[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [journey, setJourney] = useState<JourneyId | null>(null);
  const [, start] = useTransition();

  const panel = PANELS[index];
  const isLast = index === PANELS.length - 1;
  if (!panel) return null;

  function next() {
    if (isLast) router.push("/sign-in");
    else setIndex((i) => i + 1);
  }

  function pick(id: JourneyId) {
    setJourney(id);
    // Fire-and-forget: the choice personalises later copy, so a slow network
    // must never sit between a tap and the next panel.
    start(() => void chooseJourney(id));
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Behind everything, including the step rail — the panel sits in a
          coloured room rather than on top of a coloured band. Suppressed on
          the grid panel, where six cards need a plain surface to read against. */}
      {panel.kind !== "journeys" ? <PanelSky /> : null}

      <StepBar current={index} total={PANELS.length} />

      <header className="relative flex h-11 shrink-0 items-center gap-3 px-5">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            aria-label="Previous"
            className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-700 shadow-e1 active:scale-90"
          >
            <ChevronLeft size={19} />
          </button>
        ) : null}
        <Link
          href="/sign-in"
          className="tappable ml-auto text-[14px] font-semibold text-ink-500 active:opacity-60"
        >
          Skip
        </Link>
      </header>

      {/*
       * One animated region covering hero AND copy, so a panel arrives as a
       * single thing. Animating them separately made the words land before the
       * picture they belonged to.
       */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease }}
            /*
             * Centred on the art panels, top-aligned on the grid.
             *
             * Pinned to the top, the three art panels left a void between the
             * body copy and the button that read as a page still loading. The
             * journeys panel is the opposite case: its grid needs every pixel
             * and has to start high.
             */
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              panel.kind !== "journeys" && "justify-center",
            )}
          >
            {/* The hero. `journeys` gets no floating art — the grid IS the
                content of that panel, and a picture above it would push the
                six options below the fold. */}
            {panel.kind !== "journeys" ? (
              <div className="relative h-[236px] shrink-0">
                {panel.kind === "meet" ? <HeroMeet /> : null}
                {panel.kind === "memory" ? <HeroMemory /> : null}
                {panel.kind === "family" ? <HeroFamily faces={faces} /> : null}
              </div>
            ) : null}

            {/*
             * `flex-1` only on the grid panel. Everywhere else the copy block
             * must size to its content — given `flex-1` it swallowed the
             * leftover height itself, so the parent's `justify-center` had
             * nothing left to distribute and the art stayed pinned to the top
             * above a void.
             */}
            <div
              className={cn(
                "flex flex-col px-5",
                panel.kind === "journeys" ? "min-h-0 flex-1 pt-3" : "shrink-0 pt-4",
              )}
            >
              <h1 className="text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-ink-900">
                {panel.lead}{" "}
                <span className="text-brand-600">{panel.accent}</span>
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-ink-500">{panel.body}</p>

              {panel.kind === "journeys" ? (
                <JourneyGrid selected={journey} onPick={pick} />
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="shrink-0 space-y-3 px-5 pb-3 pt-3">
        {index > 0 ? (
          <p className="flex items-center justify-center gap-2 text-[11.5px] text-ink-300">
            <Lock size={12} className="shrink-0" aria-hidden />
            Bank-level encryption. Only you and your family can access.
          </p>
        ) : null}

        <Button onClick={next} className="w-full">
          {panel.cta}
          <ArrowRight size={17} aria-hidden />
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
  );
}

/**
 * The six journeys, as a picker.
 *
 * Selectable rather than illustrative. A grid that only *described* the
 * audiences would be a poster; letting someone say "this is me" is the moment
 * the product stops being generic, and the answer is carried forward so later
 * screens can use their words. Nothing is required — the CTA advances with or
 * without a pick, because a stranger should never be made to classify their
 * own life before they are allowed to see the app.
 */
function JourneyGrid({
  selected,
  onPick,
}: {
  selected: JourneyId | null;
  onPick: (id: JourneyId) => void;
}) {
  return (
    <ul className="mt-4 grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {JOURNEYS.map(({ id, icon: Icon, label, problem, tint }) => {
        const active = selected === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onPick(id)}
              aria-pressed={active}
              className={cn(
                "tappable relative flex h-full w-full flex-col items-start gap-2 rounded-card border p-3 text-left active:scale-[0.97]",
                active
                  ? "border-brand-500 bg-brand-50 shadow-e1"
                  : "border-line bg-surface shadow-e1",
              )}
            >
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-tile", tint)}>
                <Icon size={17} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-tight text-ink-900">
                  {label}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-ink-500">{problem}</span>
              </span>

              {active ? (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="absolute right-2.5 top-2.5 grid h-5 w-5 place-items-center rounded-pill bg-brand-600 text-white"
                >
                  <Check size={12} strokeWidth={3} aria-hidden />
                </motion.span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
