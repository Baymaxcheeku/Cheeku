"use client";

import { Check, Minus } from "lucide-react";
import { motion, useInView, useMotionValueEvent, useReducedMotion, useScroll, useSpring, type Variants } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EASE, Heading, Reveal } from "./ui";

type Level = 0 | 1 | 2; // doesn't, partly, does

const JOBS = ["Reads your reports", "Remembers the whole family", "Plans your week", "Reminds you first", "Checks it got done", "Books the care"];

/*
 * Kinds of product, not single companies: the names under each are examples
 * of the kind. The marks are our own reading of what each kind does today
 * (November 2026). Check them before every release; this is a claim about
 * other people's products.
 */
const OTHERS: { kind: string; examples: string; marks: Level[] }[] = [
  { kind: "Care booking apps", examples: "Practo, Apollo 24|7, Eka Care", marks: [1, 1, 0, 1, 0, 2] },
  { kind: "Watches and fitness apps", examples: "Smartwatches, rings, step and diet trackers", marks: [1, 0, 2, 2, 1, 0] },
  { kind: "AI chat", examples: "ChatGPT, Claude", marks: [1, 1, 0, 0, 0, 0] },
  { kind: "What most families use", examples: "Google, WhatsApp and a drawer", marks: [0, 0, 0, 0, 0, 0] },
];

/*
 * Three marks that cannot be mistaken for each other, on any background:
 * a solid tick for yes, the word for partly, a faint dash for no.
 */
function Mark({ level }: { level: Level }) {
  if (level === 2)
    return (
      <span role="img" aria-label="Does it" className="grid h-7 w-7 place-items-center rounded-full bg-purple-600 text-white">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  if (level === 1) return <span className="rounded-full border border-purple-300 px-2.5 py-0.5 text-[12px] font-medium text-purple-700">Partly</span>;
  return (
    <span role="img" aria-label="Doesn't" className="text-ink-3/50">
      <Minus size={18} strokeWidth={1.5} />
    </span>
  );
}

/** Cheeku's tick: an empty ring until the scroll reaches it, then it fills with a small spring. */
function Tick({ on, still }: { on: boolean; still: boolean }) {
  return (
    <span role="img" aria-label="Does it" className="relative grid h-9 w-9 place-items-center">
      <span aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed border-purple-200" />
      <motion.span
        aria-hidden
        className="absolute inset-0 grid place-items-center rounded-full bg-purple-600 text-white shadow-[0_8px_18px_-8px_rgb(74_42_222/0.8)]"
        initial={false}
        animate={on ? { scale: 1, opacity: 1, filter: "blur(0px)" } : { scale: still ? 1 : 0.4, opacity: 0, filter: "blur(4px)" }}
        transition={on ? { type: "spring", stiffness: 420, damping: 22 } : { duration: 0.15 }}
      >
        <Check size={17} strokeWidth={3} />
      </motion.span>
    </span>
  );
}

const COLS = "grid grid-cols-[minmax(220px,1.5fr)_repeat(6,minmax(0,1fr))] items-center gap-x-4";

function count(marks: Level[]) {
  return marks.filter((m) => m === 2).length;
}

const rowIn: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  shown: (i: number) => ({ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, delay: 0.1 + i * 0.09, ease: EASE } }),
};

/** A number that counts up to `to` once it is on screen. */
function CountUp({ to, still }: { to: number; still: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "-20% 0px" });
  const [n, setN] = useState(still ? to : 0);
  useEffect(() => {
    if (!seen || still) return;
    let k = 0;
    const id = setInterval(() => {
      k += 1;
      setN(k);
      if (k >= to) clearInterval(id);
    }, 140);
    return () => clearInterval(id);
  }, [seen, still, to]);
  return <span ref={ref} className="tabular-nums">{n}</span>;
}

/**
 * The authored moment: as the table scrolls up, Cheeku's six ticks fill one
 * by one and a lilac band runs behind its row. The other kinds of product
 * arrive beneath it. Hovering a column lights that job across every row.
 */
export function Compare() {
  const still = useReducedMotion() ?? false;
  const table = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: table, offset: ["start 85%", "start 25%"] });
  const band = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  const [lit, setLit] = useState(still ? JOBS.length : 0);
  const [col, setCol] = useState<number | null>(null);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!still) setLit(Math.min(JOBS.length, Math.floor(v * (JOBS.length + 0.6))));
  });

  const cell = (i: number) => `flex h-12 items-center justify-center rounded-xl transition-colors duration-200 ${col === i ? "bg-purple-50" : ""}`;

  return (
    <section className="bg-soft py-28 sm:py-36">
      <div className="mx-auto max-w-[1180px] px-6">
        <Heading sub="Plenty of apps do one part. Looking after a family between doctor visits takes all six.">
          <em>Your family&apos;s whole health story</em> in one app
        </Heading>

        {/* Wide screens */}
        <div ref={table} className="mx-auto mt-20 hidden max-w-[1080px] lg:block" role="table" aria-label="What Cheeku does, compared with other kinds of health product" onMouseLeave={() => setCol(null)}>
          <div role="row" className={`${COLS} px-8 pb-6`}>
            <span role="columnheader" className="sr-only">
              Product
            </span>
            <span aria-hidden />
            {JOBS.map((j, i) => (
              <motion.span
                key={j}
                role="columnheader"
                onMouseEnter={() => setCol(i)}
                initial={still ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                className={`cursor-default text-center text-[14px] font-medium leading-snug transition-colors duration-200 ${col === i ? "text-purple-700" : "text-ink-2"}`}
              >
                {j}
              </motion.span>
            ))}
          </div>

          <div role="row" className={`${COLS} relative overflow-hidden rounded-[24px] bg-white px-8 py-8 shadow-[var(--shadow-md)] ring-1 ring-purple-200`}>
            <motion.span aria-hidden className="absolute inset-y-0 left-0 w-full origin-left bg-[linear-gradient(90deg,var(--color-purple-50),rgb(244_241_255/0.4))]" style={{ scaleX: still ? 1 : band }} />
            <div role="rowheader" className="relative">
              <p className="font-[family-name:var(--font-display)] text-[34px] leading-none text-purple-700">Cheeku</p>
              <p className="mt-2 text-[14px] text-ink-2">
                <span className="font-medium tabular-nums text-ink">{lit} of 6</span>, for everyone at home
              </p>
            </div>
            {JOBS.map((j, i) => (
              <div key={j} role="cell" className={`relative ${cell(i)}`} onMouseEnter={() => setCol(i)}>
                <Tick on={i < lit} still={still} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            {OTHERS.map((r, n) => (
              <motion.div
                key={r.kind}
                role="row"
                custom={n}
                variants={rowIn}
                initial={still ? false : "hidden"}
                whileInView="shown"
                viewport={{ once: true, margin: "-8% 0px" }}
                className={`${COLS} group rounded-[20px] border-b border-hair px-8 py-5 transition-colors duration-200 last:border-b-0 hover:bg-white/70`}
              >
                <div role="rowheader">
                  <p className="text-[17px] font-medium text-ink">{r.kind}</p>
                  <p className="mt-1 text-[14px] text-ink-3">{r.examples}</p>
                </div>
                {r.marks.map((m, i) => (
                  <div key={i} role="cell" className={cell(i)} onMouseEnter={() => setCol(i)}>
                    <Mark level={m} />
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Phones and tablets: one card each, the six jobs as a list */}
        <div className="mt-14 space-y-4 lg:hidden">
          <Reveal className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-md)] ring-1 ring-purple-200">
            <div className="flex items-baseline justify-between">
              <p className="font-[family-name:var(--font-display)] text-[32px] leading-none text-purple-700">Cheeku</p>
              <p className="text-[14px] font-medium text-purple-700">
                <CountUp to={6} still={still} /> of 6
              </p>
            </div>
            <ul className="mt-5 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              {JOBS.map((j, i) => (
                <motion.li
                  key={j}
                  className="flex items-center gap-3 text-[16px] text-ink"
                  initial={still ? false : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.12, ease: EASE }}
                >
                  <Mark level={2} />
                  {j}
                </motion.li>
              ))}
            </ul>
          </Reveal>
          {OTHERS.map((r, n) => (
            <motion.div
              key={r.kind}
              custom={n}
              variants={rowIn}
              initial={still ? false : "hidden"}
              whileInView="shown"
              viewport={{ once: true, margin: "-8% 0px" }}
              className="rounded-[24px] border border-hair bg-white/60 p-6"
            >
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[18px] font-medium text-ink">{r.kind}</p>
                <p className="shrink-0 text-[14px] text-ink-3">{count(r.marks)} of 6</p>
              </div>
              <p className="mt-0.5 text-[14px] text-ink-3">{r.examples}</p>
              {r.marks.some((m) => m > 0) && (
                <ul className="mt-5 space-y-3">
                  {JOBS.map((j, i) =>
                    r.marks[i] === 0 ? null : (
                      <li key={j} className="flex items-center gap-3 text-[15px] text-ink">
                        <span className="flex w-[58px] shrink-0 justify-center">
                          <Mark level={r.marks[i]!} />
                        </span>
                        {j}
                      </li>
                    ),
                  )}
                </ul>
              )}
              <p className="mt-5 border-t border-hair pt-4 text-[14px] leading-relaxed text-ink-3">
                <span className="font-medium text-ink-2">Doesn&apos;t: </span>
                {JOBS.filter((_, i) => r.marks[i] === 0)
                  .map((j) => j.toLowerCase())
                  .join(", ")}
              </p>
            </motion.div>
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-[640px] text-center">
          <p className="display text-[30px] sm:text-[38px]">
            The part nobody else does:{" "}
            <em className="relative inline-block">
              checking it actually happened
              <motion.span
                aria-hidden
                className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-loud"
                initial={still ? false : { scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
              />
            </em>
          </p>
          <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-relaxed text-ink-3">
            Our own reading of what each kind of product does today, November 2026. The names are examples and belong to their owners; none of them is connected with Cheeku.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
