"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";

import { CountUp, EASE, Eyebrow, Reveal, Section, Words } from "./ui";

const PROOF = [
  "Built end to end with ₹0 raised",
  "Care partners live in 12,000+ pincodes",
  "300+ cities",
  "5,000+ consultants",
  "Lab tests and medicines at home",
  "Used by our own family for 12 months",
  "A fine-tuned health model behind a safety router",
  "Clinician-signed rules",
];

export function ProofMarquee() {
  const row = [...PROOF, ...PROOF];
  return (
    <div className="relative border-y border-line bg-white/60 py-4" aria-label="What is already built">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-canvas to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-canvas to-transparent" />
      <div className="flex overflow-hidden">
        <ul className="flex shrink-0 animate-marquee items-center gap-10 pr-10 hover:[animation-play-state:paused]">
          {row.map((p, i) => (
            <li key={i} aria-hidden={i >= PROOF.length} className="flex shrink-0 items-center gap-10 text-[14px] font-medium text-ink-700">
              <span>{p}</span>
              <span className="h-1 w-1 rounded-full bg-brand-400" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const BEATS = [
  { day: 0, when: "Day 0 · 11:40 am", title: "The consult.", body: "A few minutes with the doctor. You walk out with a prescription you can't read and a list of tests you don't understand.", tag: "The only moment anyone is watching" },
  { day: 3, when: "Day 3 · 2:07 am", title: "A cough that won't settle.", body: "Forty tabs open. Each one says something different. One of them says cancer. Nobody to ask until morning.", tag: "Alone with Google" },
  { day: 17, when: "Day 17 · 6:15 pm", title: "Papa's report lands on WhatsApp.", body: "A PDF between a forward and a good-morning message. His sugar is higher than last year. Nobody opens it.", tag: "The trend nobody saw" },
  { day: 41, when: "Day 41 · 9:30 am", title: "Five medicines. Three doctors.", body: "A heart doctor, a diabetes doctor, a GP. None has seen the others' lists. Nobody has checked if they clash.", tag: "The prescription nobody checked" },
  { day: 68, when: "Day 68 · any time", title: "The follow-up test was due last week.", body: "It was on a slip of paper. The slip is in a drawer. The test was never booked.", tag: "The loop left open" },
  { day: 90, when: "Day 90 · 11:40 am", title: "The next visit.", body: "The doctor asks what changed. You try to remember. The few minutes begin again.", tag: "Back to the start" },
];

/** The 90 days, scrubbed by scroll: the page holds still while the days run. */
export function GapSection() {
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  const [day, setDay] = useState(0);
  // Each beat gets an equal share of the scroll: the days run to it quickly,
  // then it holds while it is read. (Days 0 and 3 sit close together on the
  // track; an even day-per-pixel scroll would skip straight past one.)
  const dayAt = (v: number) => {
    const p = Math.min(0.9999, Math.max(0, (v - 0.03) / 0.9));
    const slot = p * BEATS.length;
    const i = Math.floor(slot);
    const travel = Math.min(1, (slot - i) / 0.35);
    const from = i === 0 ? 0 : BEATS[i - 1]!.day;
    const to = BEATS[i]!.day;
    return { i: travel >= 1 || i === 0 ? i : i - 1, day: from + (to - from) * travel };
  };
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const at = dayAt(v);
    setDay(Math.round(at.day));
    setActive(at.i);
  });
  const fill = useTransform(scrollYProgress, (v) => `${(dayAt(v).day / 90) * 100}%`);
  // The 2 am beat: the pinned screen goes a shade darker while it holds.
  const dim = useTransform(scrollYProgress, (v) => {
    const slot = Math.min(0.9999, Math.max(0, (v - 0.03) / 0.9)) * BEATS.length;
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    return Math.min(clamp((slot - 1.1) / 0.25), clamp((2.1 - slot) / 0.25));
  });
  const beat = BEATS[active]!;

  return (
    <div id="gap" ref={ref} className="relative" style={{ height: still ? "auto" : "460vh" }}>
      <div className={`${still ? "relative" : "sticky top-0 h-screen"} flex flex-col justify-center overflow-hidden`}>
        {/* The 2 am beat: the page itself goes dim. */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 bg-brand-950/[0.06]" style={{ opacity: dim }} />
        <Section className="py-6 sm:py-16">
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <Eyebrow>The gap nobody owns</Eyebrow>
              <h2 className="display mt-4 max-w-[720px] text-[30px] sm:mt-5 sm:text-[52px]">
                <Words text="A few minutes with a doctor." />
                <br />
                <span className="serif-accent text-brand-600">
                  <Words text="Then 90 days on your own." delay={0.2} />
                </span>
              </h2>
            </div>
            <div className="flex items-baseline gap-2" aria-hidden>
              <span className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">Day</span>
              <span className="display text-[52px] leading-none text-ink sm:text-[104px]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {String(day).padStart(2, "0")}
              </span>
              <span className="text-[20px] font-medium text-ink-300">/ 90</span>
            </div>
          </div>

          {/* The track */}
          <div className="relative mt-4 h-14 sm:mt-10" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-violet" />
            <motion.div className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-500 to-loud" style={{ width: fill }} />
            {BEATS.map((b, i) => (
              <div key={b.day} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(b.day / 90) * 100}%` }}>
                <span
                  className={`block rounded-full border-2 transition-all duration-300 ease-out ${
                    i <= active ? "h-4 w-4 border-white bg-loud shadow-[0_0_0_5px_rgba(255,106,43,0.2)]" : "h-3 w-3 border-white bg-violet-deep"
                  }`}
                />
                <span className={`absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold transition-colors duration-300 ${i === 1 ? "hidden sm:block" : ""} ${i === active ? "text-ink" : "text-ink-300"}`}>{b.day}</span>
              </div>
            ))}
            <motion.div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: fill }}>
              <span className="block h-7 w-7 rounded-full border-[3px] border-white bg-ink shadow-[var(--shadow-card)]" />
            </motion.div>
          </div>

          {/* The beat */}
          <div className="mt-4 grid gap-6 sm:mt-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative min-h-[230px]">
              {still ? (
                <ul className="space-y-6">
                  {BEATS.map((b) => (
                    <li key={b.day}>
                      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-600">{b.when}</p>
                      <p className="mt-1 text-[22px] font-semibold tracking-tight">{b.title}</p>
                      <p className="mt-1 max-w-[520px] text-[16px] leading-relaxed text-ink-700">{b.body}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <motion.div key={active} initial={{ opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.45, ease: EASE }}>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-brand-600">{beat.when}</p>
                  <p className="mt-3 text-[26px] font-semibold leading-tight tracking-tight sm:text-[40px]">{beat.title}</p>
                  <p className="mt-3 max-w-[540px] text-[17px] leading-relaxed text-ink-700 sm:mt-4 sm:text-[18px]">{beat.body}</p>
                  <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-loud-wash px-3 py-1.5 text-[13px] font-semibold text-loud-deep">
                    <span className="h-1.5 w-1.5 rounded-full bg-loud" />
                    {beat.tag}
                  </span>
                </motion.div>
              )}
            </div>
            <div className="hidden items-end lg:flex">
              <p className="rounded-3xl border border-line bg-white/70 p-6 text-[17px] leading-relaxed text-ink-700">
                India got very good at the moment of care: find a doctor, book a test, get medicines by evening.{" "}
                <span className="font-semibold text-ink">Nobody owns everything around that moment.</span> That is where the ten years are lost.
              </p>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

const STATS = [
  { n: 23.7, d: 1, suffix: " cr", label: "adults are diabetic or prediabetic", src: "ICMR-INDIAB, 2023" },
  { n: 31.5, d: 1, suffix: " cr", label: "live with high blood pressure, most unaware", src: "ICMR-INDIAB, 2023" },
  { n: 39.4, d: 1, suffix: "%", label: "of health spending comes from the family's own pocket", src: "National Health Accounts, 2021-22" },
  { n: 34.7, d: 1, suffix: " cr", label: "Indians will be over 60 by 2050", src: "UNFPA India Ageing Report, 2023" },
];

export function HealthspanSection() {
  return (
    <Section className="py-24 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <Eyebrow>The lost decade</Eyebrow>
          <h2 className="display mt-5 text-[36px] sm:text-[52px]">
            <Words text="Indians are living longer." /> <span className="serif-accent text-brand-600"><Words text="Not healthier." delay={0.2} /></span>
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-[460px] text-[18px] leading-relaxed text-ink-700">
              The last ten years are spent managing diabetes, blood pressure, a heart, a kidney, a parent who slowly stops being independent. It doesn&apos;t arrive suddenly. It builds for a decade in numbers a routine blood test can already see.
            </p>
            <p className="mt-4 max-w-[460px] text-[18px] font-semibold leading-relaxed text-ink">Families already pay for those tests. Nobody reads them over time.</p>
          </Reveal>
        </div>

        <Reveal className="rounded-[32px] border border-line bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="space-y-6">
            <Bar label="Years lived" value="70.8" width="100%" tone="ink" delay={0} />
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[14px] font-medium text-ink-500">Years in good health</span>
                <span className="text-[22px] font-semibold tracking-tight">60.3</span>
              </div>
              <div className="relative flex h-12 overflow-hidden rounded-2xl bg-mist">
                <motion.div className="h-full rounded-l-2xl bg-brand-600" initial={{ width: 0 }} whileInView={{ width: "85.2%" }} viewport={{ once: true, margin: "-80px 0px" }} transition={{ duration: 1.3, delay: 0.25, ease: EASE }} />
                <motion.div
                  className="hatch relative grid h-full flex-1 place-items-center bg-loud"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-80px 0px" }}
                  transition={{ duration: 0.5, delay: 1.5 }}
                >
                  <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-ink sm:text-[12px]">10 yrs unwell</span>
                </motion.div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-ink-300">WHO estimates for India: life expectancy and healthy life expectancy, 2019.</p>

          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-line">
            {STATS.map((s) => (
              <div key={s.label} className="group bg-white p-5 transition-colors duration-300 hover:bg-mist">
                <CountUp to={s.n} decimals={s.d} suffix={s.suffix} className="text-[30px] font-semibold tracking-tight text-ink sm:text-[36px]" />
                <p className="mt-1 text-[14px] leading-snug text-ink-700">{s.label}</p>
                <p className="mt-2 text-[11px] text-ink-300">{s.src}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

function Bar({ label, value, width, delay }: { label: string; value: string; width: string; tone: "ink"; delay: number }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[14px] font-medium text-ink-500">{label}</span>
        <span className="text-[22px] font-semibold tracking-tight">{value}</span>
      </div>
      <div className="h-12 overflow-hidden rounded-2xl bg-mist">
        <motion.div className="h-full rounded-2xl bg-ink" initial={{ width: 0 }} whileInView={{ width }} viewport={{ once: true, margin: "-80px 0px" }} transition={{ duration: 1.3, delay, ease: EASE }} />
      </div>
    </div>
  );
}
