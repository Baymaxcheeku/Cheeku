"use client";

import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EASE, Reveal } from "./ui";

/*
 * Everything a family brings to Cheeku, as one ring.
 *
 * Six kinds of need sit on the ring, and the everyday things people ask
 * about sit around it. On wide screens the section holds still while you
 * scroll, and each step of the scroll carries the Cheeku dot to the next
 * part (it dwells on each one, then glides on). Wherever it is,
 * that part of the ring lights up and the middle says what Cheeku does
 * there. Hover or tap a part to stop the dot on it.
 *
 * The ring itself draws as the section scrolls in: one place, closing.
 */

type Part = { name: string; line: string; stroke: string; pill: string; ink: string; topics: string[] };

const PARTS: Part[] = [
  {
    name: "Ask anytime",
    line: "A clear answer at any hour: watch at home, call a doctor, or go now.",
    stroke: "#f08ab2",
    pill: "#fdeaf1",
    ink: "#9d2357",
    topics: ["Fever at 2 am", "Cough and sore throat", "Cold, flu and COVID", "Rashes and itching", "Headaches", "Tummy trouble", "Back and joint pain"],
  },
  {
    name: "Long-term care",
    line: "Sugar, BP and thyroid followed report after report, with your watch's numbers alongside.",
    stroke: "#f5b24c",
    pill: "#fff2d9",
    ink: "#865000",
    topics: ["Sugar", "BP", "Thyroid", "Heart and cholesterol", "PCOS", "Weight", "Watch and phone data"],
  },
  {
    name: "Medicines",
    line: "Every tablet from every doctor, checked together for that person, then delivered home.",
    stroke: "#5fc58d",
    pill: "#e3f6ec",
    ink: "#0f6b43",
    topics: ["Every tablet checked", "Refill reminders", "Side effects", "Same salt, lower price", "Doses for everyone", "Delivered home", "Questions for the doctor"],
  },
  {
    name: "Tests and reports",
    line: "Reports read in simple words. The next test collected from home, the result filed itself.",
    stroke: "#64a3f0",
    pill: "#e8f1ff",
    ink: "#1a5fb4",
    topics: ["Reports explained", "Tests at home", "Yearly full checkup", "Women's health tests", "Men's health tests", "Vitamin and iron levels", "Screening tests on time"],
  },
  {
    name: "Doctors",
    line: "The right doctor on video or at the clinic, with a note so you never repeat your story.",
    stroke: "#4fbfcc",
    pill: "#e4f5f7",
    ink: "#116472",
    topics: ["Video or clinic visits", "The right specialist", "Second opinions", "A note before the visit", "Children's doctors", "Mental health support", "Dentist and eye care"],
  },
  {
    name: "Every stage of family",
    line: "From trying for a baby to looking after Papa, Cheeku changes as your family does.",
    stroke: "#8b7cf6",
    pill: "#efebff",
    ink: "#3b22c4",
    topics: ["Trying for a baby", "Pregnancy, week by week", "Baby's vaccines", "Growing kids", "Parents far away", "Fitness classes", "Health cover explained"],
  },
];

/* Geometry in the drawing's own units (W x H). Angles in degrees, 0 = right, clockwise. */
const W = 1200;
const H = 900;
const CX = W / 2;
const CY = H / 2;
const R = 268;
const SPAN = 360 / PARTS.length;
const START = -90 - SPAN / 2; // the first part is centred at the top
const GAP = 2.2;

const rad = (d: number) => (d * Math.PI) / 180;
const mid = (i: number) => START + SPAN * i + SPAN / 2;
/* Rounded, so the page drawn on the server and the one in the browser agree to the digit. */
const r2 = (v: number) => Math.round(v * 100) / 100;
const at = (deg: number, rx: number, ry: number) => ({ x: r2(CX + rx * Math.cos(rad(deg))), y: r2(CY + ry * Math.sin(rad(deg))) });

function arc(i: number) {
  const a = START + SPAN * i + GAP;
  const b = START + SPAN * (i + 1) - GAP;
  const p = at(a, R, R);
  const q = at(b, R, R);
  return `M ${p.x} ${p.y} A ${R} ${R} 0 0 1 ${q.x} ${q.y}`;
}

/*
 * Topics fan out around their part on two rows, then a few rounds of gentle
 * pushing move any two labels that would touch apart, and keep every label
 * clear of the ring and inside the drawing. Worked out once, at load.
 */
type Spot = { part: number; text: string; x: number; y: number; side: "left" | "right" | "center"; w: number; far: boolean };

function layout(): Spot[] {
  const spots: Spot[] = PARTS.flatMap((p, i) =>
    p.topics.map((t, j) => {
      const deg = mid(i) - 25 + (50 / (p.topics.length - 1)) * j;
      const o = j % 2 === 1 ? 150 : 70;
      const pos = at(deg, (R + o) * 1.2, R + o * 0.8);
      const c = Math.cos(rad(deg));
      const side: Spot["side"] = c > 0.25 ? "left" : c < -0.25 ? "right" : "center";
      return { part: i, text: t, x: pos.x, y: pos.y, side, w: t.length * 7.7 + 22, far: j % 2 === 1 };
    }),
  );
  const box = (s: Spot) => {
    const l = s.side === "left" ? s.x : s.side === "right" ? s.x - s.w : s.x - s.w / 2;
    return { l, r: l + s.w, t: s.y - 16, b: s.y + 16 };
  };
  for (let round = 0; round < 300; round++) {
    for (let a = 0; a < spots.length; a++) {
      for (let b = a + 1; b < spots.length; b++) {
        const A = box(spots[a]!);
        const B = box(spots[b]!);
        const ox = Math.min(A.r, B.r) - Math.max(A.l, B.l);
        const oy = Math.min(A.b, B.b) - Math.max(A.t, B.t);
        if (ox <= 0 || oy <= 0) continue;
        const sa = spots[a]!;
        const sb = spots[b]!;
        if (oy < ox) {
          const d = (oy / 2 + 0.5) * (sa.y <= sb.y ? -1 : 1);
          sa.y += d;
          sb.y -= d;
        } else {
          const d = (ox / 2 + 0.5) * ((A.l + A.r) / 2 <= (B.l + B.r) / 2 ? -1 : 1);
          sa.x += d;
          sb.x -= d;
        }
      }
    }
    for (const s of spots) {
      // Out of the ring: the label's nearest edge stays well clear of it.
      const k = box(s);
      const nx = Math.max(k.l, Math.min(CX, k.r));
      const ny = Math.max(k.t, Math.min(CY, k.b));
      const dist = Math.hypot(nx - CX, ny - CY);
      if (dist < R + 34) {
        const f = (R + 34 - dist) / Math.max(dist, 1);
        s.x += (nx - CX) * f * 0.5;
        s.y += (ny - CY) * f * 0.5;
      }
      // Inside the drawing.
      const m = box(s);
      if (m.l < 4) s.x += 4 - m.l;
      if (m.r > W - 4) s.x -= m.r - (W - 4);
      s.y = Math.min(H - 18, Math.max(18, s.y));
    }
  }
  return spots.map((s) => ({ ...s, x: r2(s.x), y: r2(s.y) }));
}

const TOPICS = layout();

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/* How far the scroll travels per part while the section is pinned, in viewport heights. */
const PER_PART_VH = 60;

/** A step function with soft edges: dwell on each part, glide between them. */
function dwell(v: number): number {
  const i = Math.floor(v);
  const f = v - i;
  const e = f < 0.3 ? 0 : f > 0.7 ? 1 : (f - 0.3) / 0.4;
  return i + e * e * (3 - 2 * e);
}

export function CareRing() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion() ?? false;
  const [held, setHeld] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(0);
  const heldRef = useRef<number | null>(null);
  heldRef.current = held;

  // While pinned: 0 at the first part, 1 at the last, with a beat at each end.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const travel = useTransform(scrollYProgress, [0.05, 0.92], [0, PARTS.length - 1], { clamp: true });
  const smooth = useSpring(useTransform(travel, dwell), { stiffness: 140, damping: 28 });
  const angle = useTransform(smooth, (v) => mid(0) + v * SPAN);
  useMotionValueEvent(travel, "change", (v) => setScrolled(Math.min(PARTS.length - 1, Math.max(0, Math.round(v)))));

  // The ring closes as the section arrives, and the stage tilts up to face you.
  const { scrollYProgress: arrive } = useScroll({ target: ref, offset: ["start 95%", "start start"] });
  const drawn = useSpring(useTransform(arrive, [0, 1], [still ? 1 : 0.04, 1]), { stiffness: 90, damping: 24 });
  const tilt = useTransform(arrive, [0, 1], [still ? 0 : 16, 0]);
  const leave = useTransform(scrollYProgress, [0.94, 1], [0, still ? 0 : -6]);
  const rotateX = useTransform([tilt, leave] as const, ([a, b]: number[]) => a! + b!);
  const lift = useTransform(arrive, [0, 1], [still ? 1 : 0.92, 1]);

  // Two depths of labels drift at different speeds, so the ring has a near and a far.
  const nearY = useTransform(scrollYProgress, [0, 1], [still ? 0 : 6, still ? 0 : -6]);
  const farY = useTransform(scrollYProgress, [0, 1], [still ? 0 : 16, still ? 0 : -16]);

  // The dot follows the scroll, unless a part is being hovered: then it goes there.
  const dotAngle = useMotionValue(mid(0));
  useMotionValueEvent(angle, "change", (v) => {
    if (heldRef.current === null) dotAngle.set(v);
  });
  useEffect(() => {
    const c = animate(dotAngle, held === null ? angle.get() : mid(held), { duration: 0.5, ease: EASE });
    return () => c.stop();
  }, [held, angle, dotAngle]);
  const trail = useSpring(dotAngle, { stiffness: 60, damping: 18 });
  const dotX = useTransform(dotAngle, (d) => pct(at(d, R, R).x, W));
  const dotY = useTransform(dotAngle, (d) => pct(at(d, R, R).y, H));
  const trailX = useTransform(trail, (d) => pct(at(d, R, R).x, W));
  const trailY = useTransform(trail, (d) => pct(at(d, R, R).y, H));

  const part = held ?? scrolled;
  const active = PARTS[part]!;

  /** Scrolls the page to the point where part `i` is in focus. */
  function goTo(i: number) {
    const el = ref.current;
    if (!el || still) return setHeld(i);
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * (0.05 + (0.87 * i) / (PARTS.length - 1)), behavior: "smooth" });
  }

  return (
    <section
      ref={ref}
      id="care"
      aria-labelledby="care-title"
      className="relative bg-white py-24 sm:py-28 lg:py-0"
      style={{ ["--care-h" as string]: still ? "auto" : `${PARTS.length * PER_PART_VH + 100}vh` }}
    >
      <div className="lg:h-[var(--care-h)]">
        {/* Wide screens: pinned while the scroll walks the ring. */}
        <div className="relative hidden overflow-hidden lg:sticky lg:top-[68px] lg:flex lg:h-[calc(100svh-68px)] lg:items-center lg:justify-center" style={{ perspective: 1600 }}>
          {/* A soft light in the active part's colour, behind everything. */}
          <motion.div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" animate={{ backgroundColor: active.pill }} transition={{ duration: 0.8, ease: EASE }} />

          <motion.div
            className="relative aspect-[1200/900]"
            style={{ width: "min(1200px, calc(100vw - 40px), calc((100svh - 108px) * 1.3333))", rotateX, scale: lift, containerType: "inline-size" }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
              <defs>
                <radialGradient id="care-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="70%" stopColor="#faf9ff" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <filter id="care-soft" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="10" />
                </filter>
              </defs>
              <circle cx={CX} cy={CY} r={R - 6} fill="url(#care-glow)" />
              {/* The lit part glows a little beneath its own line. */}
              <AnimatePresence>
                <motion.path key={part} d={arc(part)} fill="none" stroke={active.stroke} strokeLinecap="round" strokeWidth={30} filter="url(#care-soft)" initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
              </AnimatePresence>
              {PARTS.map((p, i) => (
                <motion.path
                  key={p.name}
                  d={arc(i)}
                  fill="none"
                  stroke={p.stroke}
                  strokeLinecap="round"
                  style={{ pathLength: drawn }}
                  animate={{ strokeWidth: part === i ? 12 : 5, opacity: part === i ? 1 : 0.4 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              ))}
            </svg>

            {/* The Cheeku dot, with a faint trail that lags behind it. */}
            {!still && (
              <>
                <motion.span aria-hidden className="absolute z-10 -ml-[7px] -mt-[7px] size-[14px] rounded-full bg-purple-300/60 blur-[2px]" style={{ left: trailX, top: trailY }} />
                <motion.span aria-hidden className="absolute z-10 -ml-[10px] -mt-[10px] size-[20px] rounded-full border-[3px] border-white bg-purple-600 shadow-[0_6px_18px_-2px_rgb(74_42_222/0.65)]" style={{ left: dotX, top: dotY }} />
              </>
            )}

            {/* Everything people bring, around the ring: near and far rows, the lit part in focus. */}
            <ul aria-label="What people ask Cheeku about" className="absolute inset-0">
              {TOPICS.map((t, n) => {
                const on = t.part === part;
                const shift = t.side === "left" ? "0%" : t.side === "right" ? "-100%" : "-50%";
                return (
                  <motion.li key={t.text} className="absolute whitespace-nowrap" style={{ left: pct(t.x, W), top: pct(t.y, H), x: shift, translateY: "-50%", y: t.far ? farY : nearY }}>
                    <motion.span
                      className={`inline-flex items-center gap-[0.55em] text-[max(12px,1.25cqw)] ${on ? "font-medium text-ink" : "text-ink-3"}`}
                      initial={still ? false : { opacity: 0, filter: "blur(6px)" }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      animate={{ opacity: on ? 1 : t.far ? 0.42 : 0.6, scale: on ? 1.03 : t.far ? 0.95 : 0.98, filter: on || still ? "blur(0px)" : t.far ? "blur(1.4px)" : "blur(0.6px)" }}
                      transition={{ duration: 0.5, delay: on ? Math.min(n % 7, 6) * 0.03 : 0, ease: EASE }}
                    >
                      <span aria-hidden className="size-1.5 rounded-full transition-transform duration-300" style={{ background: PARTS[t.part]!.stroke, transform: `scale(${on ? 1.5 : 0.8})` }} />
                      {t.text}
                    </motion.span>
                  </motion.li>
                );
              })}
            </ul>

            {/* The six parts, sitting on the ring. Hover to hold the dot there, click to scroll to it. */}
            <div role="group" aria-label="Kinds of care" className="absolute inset-0" onMouseLeave={() => setHeld(null)}>
              {PARTS.map((p, i) => {
                const pos = at(mid(i), R, R);
                const on = part === i;
                return (
                  <button
                    key={p.name}
                    type="button"
                    aria-pressed={on}
                    onMouseEnter={() => setHeld(i)}
                    onFocus={() => setHeld(i)}
                    onBlur={() => setHeld(null)}
                    onClick={() => {
                      setHeld(null);
                      goTo(i);
                    }}
                    className="absolute z-20 cursor-pointer whitespace-nowrap rounded-[0.85em] px-[0.95em] py-[0.45em] text-[max(13px,1.42cqw)] font-semibold tracking-[-0.01em] transition-[transform,box-shadow] duration-300 ease-[var(--ease)]"
                    style={{
                      left: pct(pos.x, W),
                      top: pct(pos.y, H),
                      background: p.pill,
                      color: p.ink,
                      boxShadow: on ? `0 14px 30px -12px ${p.stroke}, inset 0 0 0 1.5px ${p.stroke}` : `inset 0 0 0 1px ${p.stroke}66`,
                      transform: `translate(-50%, -50%) scale(${on ? 1.08 : 0.97})`,
                    }}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* The middle: the promise, what Cheeku does in the lit part, and where you are. */}
            <div className="absolute left-1/2 top-1/2 w-[34%] -translate-x-1/2 -translate-y-1/2 text-center">
              <Reveal>
                <h2 id="care-title" className="display text-[max(30px,4.3cqw)] text-ink">
                  Whatever comes up, <em className="text-purple-700">for anyone at home</em>
                </h2>
              </Reveal>
              <div className="relative mt-5 h-[84px]">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={part}
                    aria-live="polite"
                    initial={{ opacity: 0, y: still ? 0 : 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: still ? 0 : -8, filter: "blur(6px)" }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="text-[max(14px,1.42cqw)] leading-relaxed text-ink-2"
                  >
                    <span className="font-medium" style={{ color: active.ink }}>
                      {active.name}.
                    </span>{" "}
                    {active.line}
                  </motion.p>
                </AnimatePresence>
              </div>
              {/* Where you are in the six: a short bar for each, the lit one long and coloured. */}
              <div aria-hidden className="mt-4 flex items-center justify-center gap-1.5">
                {PARTS.map((p, i) => (
                  <motion.span key={p.name} className="h-1.5 rounded-full" animate={{ width: i === part ? 26 : 6, backgroundColor: i === part ? p.stroke : "#e4e1f0" }} transition={{ duration: 0.4, ease: EASE }} />
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Phones and tablets: the promise, the six parts as tabs, and what each covers. */}
        <MobileRing part={part} onPick={(i) => setHeld(i)} />
      </div>
    </section>
  );
}

function MobileRing({ part, onPick }: { part: number; onPick: (i: number) => void }) {
  const p = PARTS[part]!;
  return (
    <div className="mx-auto max-w-[680px] px-6 lg:hidden">
      <Reveal className="text-center">
        <h2 className="display text-[40px] text-ink sm:text-[52px]">
          Whatever comes up, <em className="text-purple-700">for anyone at home</em>
        </h2>
      </Reveal>

      <div className="relative mx-auto mt-10 aspect-square w-full max-w-[300px]">
        <svg viewBox="0 0 300 300" className="h-full w-full" aria-hidden>
          {PARTS.map((q, i) => {
            const a = START + SPAN * i + 3;
            const b = START + SPAN * (i + 1) - 3;
            const r = 130;
            const s = { x: r2(150 + r * Math.cos(rad(a))), y: r2(150 + r * Math.sin(rad(a))) };
            const e = { x: r2(150 + r * Math.cos(rad(b))), y: r2(150 + r * Math.sin(rad(b))) };
            return (
              <motion.path
                key={q.name}
                d={`M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`}
                fill="none"
                stroke={q.stroke}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                animate={{ strokeWidth: part === i ? 12 : 6, opacity: part === i ? 1 : 0.45 }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
              />
            );
          })}
        </svg>
        <motion.p key={part} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="absolute inset-0 grid place-items-center px-14 text-center font-[family-name:var(--font-display)] text-[30px] leading-tight" style={{ color: p.ink }}>
          {p.name}
        </motion.p>
      </div>

      <div role="tablist" aria-label="Kinds of care" className="mt-8 flex flex-wrap justify-center gap-2">
        {PARTS.map((q, i) => (
          <button
            key={q.name}
            role="tab"
            type="button"
            aria-selected={part === i}
            onClick={() => onPick(i)}
            className="h-10 cursor-pointer rounded-full px-4 text-[14px] font-medium transition-[box-shadow,background-color] duration-200"
            style={{ background: part === i ? q.pill : "#fff", color: part === i ? q.ink : "var(--color-ink-2)", boxShadow: `inset 0 0 0 ${part === i ? 1.5 : 1}px ${part === i ? q.stroke : "var(--color-hair)"}` }}
          >
            {q.name}
          </button>
        ))}
      </div>

      <motion.div key={part} role="tabpanel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mt-6 text-center">
        <p className="mx-auto max-w-[460px] text-[16px] leading-relaxed text-ink-2">{p.line}</p>
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {p.topics.map((t) => (
            <li key={t} className="rounded-full bg-soft px-3.5 py-2 text-[14px] text-ink">
              {t}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
