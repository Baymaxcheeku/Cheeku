"use client";

import { Pause, Play } from "lucide-react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useState, type ReactNode } from "react";

export const EASE = [0.16, 1, 0.3, 1] as const;

/** A short fade and rise, once, when it scrolls into view. */
export function Reveal({ children, delay = 0, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: still ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A centred section heading: serif, with the italic part passed as `em`. */
export function Heading({ children, sub, onDark = false, align = "center" }: { children: ReactNode; sub?: ReactNode; onDark?: boolean; align?: "center" | "left" }) {
  return (
    <Reveal className={align === "center" ? "mx-auto max-w-[760px] text-center" : "max-w-[640px]"}>
      <h2 className={`display text-[40px] sm:text-[56px] ${onDark ? "text-white" : "text-ink"}`}>{children}</h2>
      {sub && <p className={`mt-4 text-[17px] leading-relaxed sm:text-[18px] ${align === "center" ? "mx-auto max-w-[520px]" : "max-w-[520px]"} ${onDark ? "text-purple-200" : "text-ink-2"}`}>{sub}</p>}
    </Reveal>
  );
}

export function PillLink({ href, children, tone }: { href: string; children: ReactNode; tone: "loud" | "white" | "glass" | "ink" | "outline" }) {
  const tones = {
    loud: "bg-loud text-ink hover:bg-loud-hover",
    white: "bg-white text-ink hover:bg-purple-50",
    glass: "glass text-white hover:bg-white/25",
    ink: "bg-purple-600 text-white hover:bg-purple-700",
    outline: "border border-ink/25 text-ink hover:border-ink/60",
  } as const;
  return (
    <a href={href} className={`inline-flex h-[52px] items-center rounded-full px-7 text-[16px] font-medium transition-[background-color,border-color,transform] duration-200 ease-[var(--ease)] active:scale-[0.98] ${tones[tone]}`}>
      {children}
    </a>
  );
}

/**
 * A row that slides sideways forever, with a visible way to stop it. The
 * content is rendered twice so the loop has no seam; the second copy is
 * hidden from screen readers.
 */
export function Marquee({ children, label, reverse = false, className = "" }: { children: ReactNode; label: string; reverse?: boolean; className?: string }) {
  return (
    <div className={`flex overflow-hidden ${className}`} role="group" aria-label={label}>
      <div className={`flex shrink-0 ${reverse ? "animate-slide-back" : "animate-slide"}`}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PauseButton({ paused, onToggle, label, onDark = false }: { paused: boolean; onToggle: () => void; label: string; onDark?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={paused}
      aria-label={paused ? `Play ${label}` : `Pause ${label}`}
      className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors duration-200 ${onDark ? "glass text-white hover:bg-white/25" : "border border-hair bg-white text-ink-2 hover:text-ink"}`}
    >
      {paused ? <Play size={14} fill="currentColor" strokeWidth={0} /> : <Pause size={14} fill="currentColor" strokeWidth={0} />}
    </button>
  );
}

export function usePause() {
  const [paused, setPaused] = useState(false);
  return { paused, toggle: () => setPaused((p) => !p) };
}

export function Soon() {
  return <span className="inline-flex h-6 items-center rounded-full bg-purple-100 px-2.5 text-[12px] font-medium text-purple-700">Coming soon</span>;
}
