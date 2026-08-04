"use client";

import { motion } from "framer-motion";
import { Check, FileText, Quote, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";

import { MascotBust } from "@/components/illustrations";
import { cn } from "@/lib/cn";

/*
 * The hero for each welcome panel.
 *
 * The reference boards all share one device and it is not an illustration: real
 * product surfaces, tilted and layered, floating over a coloured sky. It works
 * because it shows the thing rather than a metaphor for the thing — a reader
 * sees the actual card they will get, at a glance, before any copy is read.
 *
 * So these are built from the app's own components' vocabulary — the same
 * radii, shadows, tints and type sizes as the real screens — rather than from
 * generic shapes. Each panel gets a DIFFERENT composition on purpose; four
 * panels with one hero shape and swapped copy is a slideshow, not a story.
 */

/**
 * The ambient sky, rendered ONCE at page level rather than per hero.
 *
 * Inside each hero it inherited that hero's box, so on a vertically centred
 * panel the gradient started a third of the way down the screen with a hard
 * horizontal edge above it — the exact "second object" artefact the
 * illustration pass removed from the mascot. Bleeding from the very top, under
 * the status bar and the step rail, is also what the reference boards do: the
 * colour is the room the panel sits in, not a panel of its own.
 */
export function PanelSky() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[62%]">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-100 via-brand-50/70 to-transparent" />
      <div className="glow-pulse absolute left-1/2 top-16 h-56 w-56 -translate-x-1/2 rounded-pill bg-brand-300/40 blur-3xl" />
    </div>
  );
}

const FLOAT = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
} as const;

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Panel 1 — the mascot, introducing itself.
 *
 * Composed exactly like {@link HeroFamily}: subject centred and large at the
 * top, one badge floating clear of it, one pill beneath. An earlier version
 * had two tilted cards crossing the character at chest height, which buried
 * the one thing this panel exists to show — the face. Nothing overlaps it now.
 */
export function HeroMeet() {
  return (
    <div className="relative h-full w-full">
      <motion.div
        {...FLOAT}
        transition={{ duration: 0.5, ease }}
        className="absolute left-1/2 top-0 w-[172px] -translate-x-1/2"
      >
        <MascotBust className="w-full" />
      </motion.div>

      <motion.span
        {...FLOAT}
        transition={{ duration: 0.5, delay: 0.22, ease }}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1.5 text-[10px] font-bold text-brand-700 shadow-e2"
      >
        <FileText size={11} aria-hidden />
        Never forgets
      </motion.span>

      <motion.div
        {...FLOAT}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        className="absolute bottom-2 left-1/2 flex w-[248px] -translate-x-1/2 items-center gap-2.5 rounded-pill bg-surface px-3.5 py-2.5 shadow-e2"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-brand-600 text-white">
          <Stethoscope size={15} aria-hidden />
        </span>
        <span className="min-w-0 text-[11px] leading-snug text-ink-700">
          &ldquo;Your iron is low. Here&apos;s what changed.&rdquo;
        </span>
      </motion.div>
    </div>
  );
}

/**
 * Panel 3 — the memory layer, shown as a chain.
 *
 * A document, the value read out of it, and an answer that cites it back. The
 * point of the product is that the third card knows about the first, so the
 * three are drawn connected rather than merely stacked.
 */
export function HeroMemory() {
  return (
    <div className="relative h-full w-full">
      <motion.div
        {...FLOAT}
        transition={{ duration: 0.45, ease }}
        className="absolute left-2 top-3 w-[168px] -rotate-3 rounded-tile bg-surface p-3 shadow-e2"
      >
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-tile bg-[#f3e9fd] text-[#7b3fd4]">
            <FileText size={13} aria-hidden />
          </span>
          <span className="text-[11px] font-semibold text-ink-900">Anomaly scan</span>
        </div>
        <div className="mt-2 space-y-1.5" aria-hidden>
          <span className="block h-1.5 w-full rounded-pill bg-line" />
          <span className="block h-1.5 w-3/4 rounded-pill bg-line" />
        </div>
      </motion.div>

      <motion.div
        {...FLOAT}
        transition={{ duration: 0.45, delay: 0.12, ease }}
        className="absolute right-2 top-[86px] flex w-[150px] rotate-3 items-center gap-2 rounded-tile bg-surface p-2.5 shadow-e2"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-safe-bg text-safe">
          <Check size={13} strokeWidth={3} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-bold text-ink-900">148 bpm</span>
          <span className="block text-[9.5px] text-ink-500">Range 110–160</span>
        </span>
      </motion.div>

      <motion.div
        {...FLOAT}
        transition={{ duration: 0.45, delay: 0.24, ease }}
        className="absolute bottom-1 left-1/2 w-[210px] -translate-x-1/2 rounded-tile bg-brand-600 p-3 shadow-e2"
      >
        <Quote size={12} className="text-brand-200" aria-hidden />
        <p className="mt-1 text-[11.5px] leading-snug text-white">
          Baby&apos;s heart rate was normal at your 20-week scan.
        </p>
        <p className="mt-1.5 flex items-center gap-1 text-[9.5px] font-semibold text-brand-200">
          <FileText size={9} aria-hidden />
          From your records
        </p>
      </motion.div>
    </div>
  );
}

/** Panel 4 — the family, and the promise wrapped around it. */
export function HeroFamily({ faces }: { faces: readonly string[] }) {
  return (
    <div className="relative h-full w-full">
      <motion.div
        {...FLOAT}
        transition={{ duration: 0.5, ease }}
        className="absolute left-1/2 top-8 flex -translate-x-1/2 items-end"
      >
        {faces.slice(0, 3).map((src, i) => (
          <motion.span
            key={i}
            {...FLOAT}
            transition={{ duration: 0.45, delay: 0.08 * i, ease }}
            className={cn("relative", i > 0 && "-ml-5")}
            style={{ zIndex: faces.length - i }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
            <img
              src={src}
              alt=""
              className={cn(
                "rounded-pill bg-surface object-cover shadow-e2 ring-[3px] ring-white",
                i === 1 ? "h-[76px] w-[76px]" : "h-[62px] w-[62px]",
              )}
            />
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        {...FLOAT}
        transition={{ duration: 0.5, delay: 0.22, ease }}
        className="absolute bottom-2 left-1/2 flex w-[236px] -translate-x-1/2 items-center gap-2.5 rounded-pill bg-surface px-3.5 py-2.5 shadow-e2"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-brand-50 text-brand-600">
          <ShieldCheck size={16} aria-hidden />
        </span>
        <span className="min-w-0 text-[11px] leading-snug text-ink-700">
          <strong className="font-semibold text-ink-900">Private by default.</strong> Never sold,
          never shared.
        </span>
      </motion.div>

      <motion.span
        {...FLOAT}
        transition={{ duration: 0.5, delay: 0.3, ease }}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-pill bg-surface px-2.5 py-1.5 text-[10px] font-bold text-brand-700 shadow-e2"
      >
        <Sparkles size={11} aria-hidden />
        Up to 4 people
      </motion.span>
    </div>
  );
}
