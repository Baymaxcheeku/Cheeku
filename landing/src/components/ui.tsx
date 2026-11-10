"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** A short fade and rise, once, when it scrolls into view. */
export function Reveal({ children, delay = 0, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: still ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px 0px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Wrap({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}

/** The small line above a section heading. Sentence case, no tracking. */
export function Kicker({ children, onPurple = false }: { children: ReactNode; onPurple?: boolean }) {
  return <p className={`text-[15px] font-medium ${onPurple ? "text-purple-200" : "text-purple-600"}`}>{children}</p>;
}

/**
 * The signature: whose health this is. The app files everything under a
 * person, so the page talks about people too.
 */
export function PersonTag({ who, onPurple = false }: { who: string; onPurple?: boolean }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 self-start rounded-full pl-1 pr-2.5 text-[12px] font-medium ${onPurple ? "bg-white/15 text-white" : "bg-purple-50 text-purple-700"}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-semibold ${onPurple ? "bg-white text-purple-700" : "bg-purple-600 text-white"}`}>{who[0]}</span>
      {who}
    </span>
  );
}
