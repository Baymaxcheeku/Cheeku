"use client";

import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EASE, PauseButton, Reveal } from "./ui";

/*
 * Everything a family brings to Cheeku, as one ring.
 *
 * Six kinds of need sit on the ring, and the everyday things people ask
 * about sit around it. A small Cheeku dot keeps going round: wherever it is,
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
type Spot = { part: number; text: string; x: number; y: number; side: "left" | "right" | "center"; w: number };

function layout(): Spot[] {
  const spots: Spot[] = PARTS.flatMap((p, i) =>
    p.topics.map((t, j) => {
      const deg = mid(i) - 25 + (50 / (p.topics.length - 1)) * j;
      const o = j % 2 === 1 ? 150 : 70;
      const pos = at(deg, (R + o) * 1.2, R + o * 0.8);
      const c = Math.cos(rad(deg));
      const side: Spot["side"] = c > 0.25 ? "left" : c < -0.25 ? "right" : "center";
      return { part: i, text: t, x: pos.x, y: pos.y, side, w: t.length * 7.7 + 22 };
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

function useOrbit(enabled: boolean) {
  const angle = useMotionValue(mid(0));
  const [held, setHeld] = useState<number | null>(null);
  const [part, setPart] = useState(0);

  useMotionValueEvent(angle, "change", (v) => {
    const norm = (((v - START) % 360) + 360) % 360;
    setPart(Math.min(PARTS.length - 1, Math.floor(norm / SPAN)));
  });

  useEffect(() => {
    if (held !== null) {
      // Turn the short way round to the part that was picked.
      const now = angle.get();
      let to = mid(held);
      while (to - now > 180) to -= 360;
      while (now - to > 180) to += 360;
      const c = animate(angle, to, { duration: 0.6, ease: EASE });
      return () => c.stop();
    }
    if (!enabled) return;
    // About four seconds a part, one full turn in under half a minute.
    const from = angle.get();
    const c = animate(angle, from + 360, { duration: 26, ease: "linear", repeat: Infinity });
    return () => c.stop();
  }, [enabled, held, angle]);

  return { angle, part: held ?? part, held, setHeld };
}

export function CareRing() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion() ?? false;
  const inView = useInView(ref, { margin: "-20% 0px" });
  const [paused, setPaused] = useState(false);
  const { angle, part, held, setHeld } = useOrbit(inView && !paused && !still);

  // The ring closes as the section arrives.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 15%"] });
  const drawn = useSpring(useTransform(scrollYProgress, [0, 1], [still ? 1 : 0.04, 1]), { stiffness: 90, damping: 24 });

  const dot = useTransform(angle, (d) => at(d, R, R));
  const dotX = useTransform(dot, (p) => pct(p.x, W));
  const dotY = useTransform(dot, (p) => pct(p.y, H));

  const active = PARTS[part]!;

  return (
    <section ref={ref} id="care" aria-labelledby="care-title" className="relative overflow-hidden bg-white py-24 sm:py-28">
      {/* Wide screens: the ring, its six parts and everything around it. */}
      <div className="relative mx-auto hidden max-w-[1240px] px-5 lg:block">
        <div className="relative mx-auto aspect-[1200/900] w-full">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <radialGradient id="care-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f4f1ff" />
                <stop offset="70%" stopColor="#f8f6fd" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={R - 6} fill="url(#care-glow)" />
            {PARTS.map((p, i) => (
              <motion.path
                key={p.name}
                d={arc(i)}
                fill="none"
                stroke={p.stroke}
                strokeLinecap="round"
                style={{ pathLength: drawn }}
                animate={{ strokeWidth: part === i ? 11 : 6, opacity: part === i ? 1 : 0.5 }}
                transition={{ duration: 0.45, ease: EASE }}
              />
            ))}
          </svg>

          {/* The Cheeku dot going round. */}
          {!still && (
            <motion.span aria-hidden className="absolute z-10 -ml-[9px] -mt-[9px] size-[18px] rounded-full border-[3px] border-white bg-purple-600 shadow-[0_4px_14px_-2px_rgb(74_42_222/0.6)]" style={{ left: dotX, top: dotY }} />
          )}

          {/* Everything people bring, around the ring. */}
          <ul aria-label="What people ask Cheeku about" className="absolute inset-0">
            {TOPICS.map((t, n) => {
              const on = t.part === part;
              const shift = t.side === "left" ? "0%" : t.side === "right" ? "-100%" : "-50%";
              return (
                <motion.li
                  key={t.text}
                  className="absolute whitespace-nowrap"
                  style={{ left: pct(t.x, W), top: pct(t.y, H), x: shift, y: "-50%" }}
                  initial={still ? false : { opacity: 0, filter: "blur(6px)" }}
                  whileInView={{ opacity: 1, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-10% 0px" }}
                  transition={{ duration: 0.7, delay: 0.35 + Math.min(n * 0.018, 0.75), ease: EASE }}
                >
                  <span className={`inline-flex items-center gap-2 text-[15px] transition-colors duration-300 ${on ? "font-medium text-ink" : "text-ink-3"}`}>
                    <span aria-hidden className="size-1.5 rounded-full transition-transform duration-300" style={{ background: PARTS[t.part]!.stroke, transform: `scale(${on ? 1.4 : 0.8})` }} />
                    {t.text}
                  </span>
                </motion.li>
              );
            })}
          </ul>

          {/* The six parts, sitting on the ring. Hover or focus one to hold the dot there. */}
          <div role="group" aria-label="Kinds of care" className="absolute inset-0" onMouseLeave={() => setHeld(null)}>
            {PARTS.map((p, i) => {
              const pos = at(mid(i), R, R);
              const on = part === i;
              return (
                <button
                  key={p.name}
                  type="button"
                  aria-pressed={held === i}
                  onMouseEnter={() => setHeld(i)}
                  onFocus={() => setHeld(i)}
                  onBlur={() => setHeld(null)}
                  onClick={() => setHeld(held === i ? null : i)}
                  className="absolute z-20 cursor-pointer rounded-[14px] px-4 py-2 text-[17px] font-semibold tracking-[-0.01em] transition-[transform,box-shadow] duration-300 ease-[var(--ease)]"
                  style={{
                    left: pct(pos.x, W),
                    top: pct(pos.y, H),
                    background: p.pill,
                    color: p.ink,
                    boxShadow: on ? `0 10px 28px -10px ${p.stroke}, inset 0 0 0 1.5px ${p.stroke}` : `inset 0 0 0 1px ${p.stroke}66`,
                    transform: `translate(-50%, -50%) scale(${on ? 1.06 : 1})`,
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* The middle: the promise, and what Cheeku does in the part that is lit. */}
          <div className="absolute left-1/2 top-1/2 w-[400px] -translate-x-1/2 -translate-y-1/2 text-center">
            <Reveal>
              <h2 id="care-title" className="display text-[52px] text-ink">
                Whatever comes up, <em className="text-purple-700">for anyone at home</em>
              </h2>
            </Reveal>
            <div className="relative mt-5 h-[84px]">
              <motion.p
                key={part}
                aria-live="polite"
                initial={{ opacity: 0, y: still ? 0 : 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                className="text-[17px] leading-relaxed text-ink-2"
              >
                <span className="font-medium" style={{ color: active.ink }}>
                  {active.name}.
                </span>{" "}
                {active.line}
              </motion.p>
            </div>
          </div>

          {!still && (
            <div className="absolute bottom-0 right-0">
              <PauseButton paused={paused} onToggle={() => setPaused((v) => !v)} label="the turning ring" />
            </div>
          )}
        </div>
      </div>

      {/* Phones and tablets: the promise, the six parts as tabs, and what each covers. */}
      <MobileRing part={part} onPick={(i) => setHeld(i)} />
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
