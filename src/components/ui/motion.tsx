"use client";

import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/cn";

/*
 * Motion for the About page.
 *
 * ONE authored moment, not an entrance on every section. A page where each
 * block fades up as it crosses the fold reads as a template with a scroll
 * plugin bolted on, and by the third repeat the reader has stopped seeing it.
 *
 * The moment here is the spiral: the search noise never stops drifting, and the
 * cited answer lands once and then holds perfectly still. That contrast IS the
 * page's argument, so it is the thing that gets the motion budget. Everything
 * else is press feedback and a single settle-in.
 *
 * `useReducedMotion` is honoured explicitly. The stylesheet's reduced-motion
 * block collapses CSS animation, but Framer drives these from JavaScript and
 * would sail straight past it.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/** A soft continuous drift. Different phase per item so they never sync up. */
export function Drift({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={still ? false : { opacity: 0, y: 10, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.45, delay, ease }}
    >
      <motion.div
        animate={
          still
            ? undefined
            : {
                y: [0, -3.5, 0],
                rotate: [0, -0.6, 0.6, 0],
              }
        }
        transition={{
          duration: 5 + delay * 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/**
 * The answer. Arrives last, with weight, and then does not move again.
 *
 * The stillness is the point: it is the only element in the composition that
 * is not drifting, which is what makes it read as the thing you can hold on to.
 */
export function Settle({
  children,
  className,
  delay = 0.5,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={still ? false : { opacity: 0, y: 18, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay }}
    >
      {children}
    </motion.div>
  );
}

/** A pulse ring behind the avatar: still being searched for, still unresolved. */
export function PulseRing() {
  const still = useReducedMotion();
  if (still) return null;
  return (
    <>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute rounded-pill border-2 border-brand-300"
          style={{ width: 72, height: 72 }}
          animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut", delay: i * 1.3 }}
        />
      ))}
    </>
  );
}

/**
 * Staggered settle-in for one list, used once on the page.
 *
 * `once: true` so scrolling back up does not replay it. A reveal that fires
 * every time the reader passes it turns a page into a toy.
 */
export function StaggerList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.ul
      className={className}
      initial={still ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.06 } } }}
    >
      {children}
    </motion.ul>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.li
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
      }}
    >
      {children}
    </motion.li>
  );
}

/**
 * The trait icons, popping in on a spring.
 *
 * Small and quick. Four icons arriving with a bit of bounce is the page's one
 * concession to playfulness in a block that is otherwise a spec strip.
 */
export function PopIn({
  children,
  index,
  className,
}: {
  children: React.ReactNode;
  index: number;
  className?: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.li
      className={className}
      initial={still ? false : { opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ type: "spring", stiffness: 480, damping: 16, delay: index * 0.07 }}
      whileTap={still ? undefined : { scale: 0.88 }}
    >
      {children}
    </motion.li>
  );
}

/**
 * Tap the mascot and it reacts.
 *
 * An easter egg with a real job: it is the first thing on the page, and a
 * character that answers a poke establishes "this thing is friendly" faster
 * than the paragraph beside it can.
 */
export function TapToWiggle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileTap={still ? undefined : { rotate: [0, -7, 6, -4, 0], scale: 1.06 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A press-responsive row for settings lists.
 *
 * Every row on these screens was a static rectangle: tapping one gave no
 * acknowledgement until the next page rendered, which on a slow segment reads
 * as a dead control. This dips and lifts under the thumb.
 */
export function PressRow({
  children,
  className,
  index = 0,
}: {
  children: React.ReactNode;
  className?: string;
  index?: number;
}) {
  const still = useReducedMotion();
  return (
    <motion.li
      className={className}
      initial={still ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.34, delay: Math.min(index, 6) * 0.045, ease }}
      whileTap={still ? undefined : { scale: 0.985 }}
    >
      {children}
    </motion.li>
  );
}

/**
 * A count-up meter.
 *
 * Used for profile completeness. The number is real: it counts fields the
 * reader has actually filled, and the bar fills to match. Animating it is the
 * point — a bar that is simply *there* states a fact, a bar that fills says
 * "you moved this", which is the only honest way to make a form feel like
 * progress rather than paperwork.
 */
export function Meter({
  value,
  total,
  label,
  hint,
}: {
  value: number;
  total: number;
  label: string;
  hint?: string;
}) {
  const still = useReducedMotion();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const complete = value >= total;
  return (
    <div className="rounded-card bg-surface p-3.5 shadow-e1">
      <div className="flex items-baseline justify-between">
        <span className="text-[12.5px] font-semibold text-ink-900">{label}</span>
        <motion.span
          key={value}
          initial={still ? false : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
          className={cn(
            "text-[12.5px] font-bold",
            complete ? "text-safe-text" : "text-brand-600",
          )}
        >
          {value} of {total}
        </motion.span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-brand-100">
        <motion.div
          className={cn("h-full rounded-pill", complete ? "bg-safe" : "bg-brand-600")}
          initial={still ? false : { width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          style={still ? { width: `${pct}%` } : undefined}
        />
      </div>
      {hint ? <p className="mt-1.5 text-[11px] leading-snug text-ink-500">{hint}</p> : null}
    </div>
  );
}

/**
 * The notification switch, with a knob that overshoots slightly.
 *
 * A toggle is the one control on these screens someone will flip repeatedly,
 * so it is worth the spring: a knob that slides linearly feels like a form
 * field, one that arrives with a little weight feels like a switch.
 */
export function SpringSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  const still = useReducedMotion();
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      whileTap={still ? undefined : { scale: 0.92 }}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-pill transition-colors",
        checked ? "bg-brand-600" : "bg-line",
      )}
      style={{ touchAction: "manipulation" }}
    >
      {/*
       * `left-0` is load-bearing. Without an explicit left the knob is placed
       * at its static position, which the button's centred text-align pushed
       * to the right edge; Framer's `x` then translated from there and the
       * knob ended up 46px into a 48px track, i.e. invisible in the "on"
       * state. Pinning the origin makes the transform mean what it says.
       */}
      <motion.span
        className="absolute left-0 top-0.5 h-6 w-6 rounded-pill bg-white shadow-e1"
        animate={{ x: checked ? 22 : 2 }}
        transition={
          still ? { duration: 0 } : { type: "spring", stiffness: 620, damping: 30, mass: 0.6 }
        }
      />
    </motion.button>
  );
}

/**
 * A success flourish for a save button.
 *
 * Replaces a line of text that appeared below the fold on a long form, where
 * the reader had already looked away by the time it rendered. Confirmation
 * belongs on the control that was pressed.
 */
export function SaveFlash({ show, children }: { show: boolean; children: React.ReactNode }) {
  const still = useReducedMotion();
  return (
    <motion.div
      animate={still || !show ? { scale: 1 } : { scale: [1, 1.03, 1] }}
      transition={{ duration: 0.4, ease }}
    >
      {children}
    </motion.div>
  );
}
