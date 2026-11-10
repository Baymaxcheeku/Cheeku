"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

export const EASE = [0.23, 1, 0.32, 1] as const;

/** Fade and rise into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, y = 24, className, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const still = useReducedMotion();
  return (
    <motion.div
      initial={still ? { opacity: 0 } : { opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** A headline that arrives one word at a time, each rising out of a mask. */
export function Words({ text, className, delay = 0, as: Tag = "span" }: { text: string; className?: string; delay?: number; as?: "span" | "h1" | "h2" | "p" }) {
  const still = useReducedMotion();
  const words = text.split(" ");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={still ? { opacity: 0 } : { y: "110%" }}
            whileInView={still ? { opacity: 1 } : { y: "0%" }}
            viewport={{ once: true, margin: "-60px 0px" }}
            transition={{ duration: 0.8, delay: delay + i * 0.045, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Pulls its child a little toward the pointer, and lets go with a spring. */
export function Magnetic({ children, strength = 0.28, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.4 });
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y, display: "inline-block" }}
      onPointerMove={(e) => {
        if (still || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** A card that leans toward the pointer and catches a soft highlight. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });
  const glare = useTransform([px, py], ([a, b]) => `radial-gradient(420px circle at ${(a as number) * 100}% ${(b as number) * 100}%, rgba(255,255,255,0.55), transparent 55%)`);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={still ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (still || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
      {!still && <motion.div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-70 mix-blend-soft-light" style={{ background: glare }} />}
    </motion.div>
  );
}

/** Counts up to a number when it first comes into view. */
export function CountUp({ to, decimals = 0, prefix = "", suffix = "", className }: { to: number; decimals?: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px 0px" });
  const still = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !seen) return;
    const show = (v: number) => {
      el.textContent = `${prefix}${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    };
    if (still) {
      show(to);
      return;
    }
    const controls = animate(0, to, { duration: 1.6, ease: EASE, onUpdate: show });
    return () => controls.stop();
  }, [seen, to, decimals, prefix, suffix, still]);
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}0{suffix}
    </span>
  );
}

export function Eyebrow({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "light" }) {
  return (
    <span
      className={
        tone === "brand"
          ? "inline-flex items-center gap-2 rounded-full border border-brand-600/15 bg-white/70 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-700"
          : "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-violet"
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-loud" />
      {children}
    </span>
  );
}

export function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}
