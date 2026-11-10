"use client";

import { Building2, HeartHandshake, ShieldCheck, TrendingDown, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { CountUp, EASE, Eyebrow, Reveal, Section, Words } from "./ui";
import { WaitlistForm } from "./waitlist-form";

const SIDES = {
  employer: {
    icon: Building2,
    tab: "Employers",
    title: "You pay for cover that starts working in the ICU.",
    body: "Group insurance does nothing until an employee's parent is already in hospital. By then it's a claim, a leave request and a distracted team. Cheeku works on the thousand quiet days before that.",
    points: [
      ["A benefit families use at home", "Not another portal. Parents, partners and children are covered on the same seat."],
      ["Nothing to roll out", "No clinics, no hardware, no HR workflows. Care is fulfilled by partners already live in 12,000+ pincodes."],
      ["You see the shape, never the person", "Anonymous, consented, cohort-level numbers. No employer ever sees an individual's health."],
    ],
    metricA: { n: 78, suffix: "%", label: "of families opened it this week" },
    metricB: { n: 412, suffix: "", label: "overdue tests booked this quarter" },
    bars: [38, 46, 52, 61, 67, 74, 78],
    barLabel: "Families active each week",
  },
  insurer: {
    icon: ShieldCheck,
    tab: "Insurers",
    title: "You price risk once a year. It moves every day.",
    body: "Underwriting sees a form and a single medical. The real risk lives in years of reports, prescriptions and follow-ups nobody has joined up. With each family's consent, Cheeku does.",
    points: [
      ["A longitudinal signal, not a snapshot", "Dated, coded values per person across labs and years, each tied to its source."],
      ["Fewer surprises at claim time", "Open loops closed early: the overdue test booked, the rising number seen."],
      ["Consent is the product", "Every share is explicit, logged and revocable by the family."],
    ],
    metricA: { n: 64, suffix: "%", label: "of rising readings acted on within 30 days" },
    metricB: { n: 9, suffix: " in 10", label: "follow-up tests completed on time" },
    bars: [22, 31, 37, 45, 51, 58, 64],
    barLabel: "Rising readings acted on",
  },
} as const;

type Side = keyof typeof SIDES;

export function BusinessSection() {
  const [side, setSide] = useState<Side>("employer");
  const s = SIDES[side];
  return (
    <Section id="business" className="py-24 sm:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[720px]">
          <Eyebrow>For employers and insurers</Eyebrow>
          <h2 className="display mt-5 text-[36px] sm:text-[52px]">
            <Words text="Health cover pays for the worst day." /> <span className="serif-accent text-brand-600"><Words text="We work on every day before it." delay={0.3} /></span>
          </h2>
        </div>
        <div role="tablist" aria-label="Who are you?" className="inline-flex rounded-full bg-white p-1 ring-1 ring-line">
          {(Object.keys(SIDES) as Side[]).map((k) => {
            const on = k === side;
            const Icon = SIDES[k].icon;
            return (
              <button key={k} role="tab" type="button" aria-selected={on} onClick={() => setSide(k)} className={`relative flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors duration-200 ${on ? "text-white" : "text-ink-500 hover:text-ink"}`}>
                {on && <motion.span layoutId="biz-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.18, duration: 0.5 }} />}
                <Icon size={16} className="relative" />
                <span className="relative">{SIDES[k].tab}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={side} initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: EASE }}>
            <h3 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">{s.title}</h3>
            <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-ink-700">{s.body}</p>
            <ul className="mt-8 space-y-5">
              {s.points.map(([t, d]) => (
                <li key={t} className="flex gap-4">
                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lilac text-brand-700">
                    <HeartHandshake size={16} />
                  </span>
                  <div>
                    <p className="text-[17px] font-semibold">{t}</p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink-700">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* The dashboard: what a buyer sees. Numbers are illustrative. */}
        <Reveal className="relative">
          <div aria-hidden className="absolute -inset-4 rounded-[40px] bg-gradient-to-br from-violet to-lilac blur-xl" />
          <div className="relative overflow-hidden rounded-[32px] border border-white bg-white shadow-[var(--shadow-float)]">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink text-white">
                  <Users size={15} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold leading-tight">{side === "employer" ? "Team health, this quarter" : "Book health, this quarter"}</p>
                  <p className="text-[11px] text-ink-500">Anonymous · consented · cohort of 2,400 families</p>
                </div>
              </div>
              <span className="rounded-full bg-lilac px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-700">Illustrative</span>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={side} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[s.metricA, s.metricB].map((m) => (
                    <div key={m.label} className="rounded-3xl bg-mist p-5">
                      <CountUp to={m.n} suffix={m.suffix} className="text-[36px] font-semibold leading-none tracking-tight" />
                      <p className="mt-2 text-[13px] leading-snug text-ink-700">{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-3xl border border-line p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold">{s.barLabel}</p>
                    <span className="flex items-center gap-1 text-[12px] font-semibold text-safe">
                      <TrendingDown size={14} className="rotate-180 -scale-x-100" /> rising
                    </span>
                  </div>
                  <div className="mt-5 flex h-28 items-end gap-2.5" aria-hidden>
                    {s.bars.map((h, i) => (
                      <motion.div
                        key={i}
                        className={`flex-1 rounded-t-xl ${i === s.bars.length - 1 ? "bg-loud" : "bg-violet-deep"}`}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.1 + i * 0.07, ease: EASE }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-ink-300">
                    <span>Week 1</span>
                    <span>Week 7</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>

      <Reveal className="mt-12 flex flex-col items-start gap-4 rounded-[32px] border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="text-[20px] font-semibold tracking-tight">We&apos;re choosing a small number of launch partners.</p>
          <p className="mt-1 text-[15px] text-ink-700">A pilot with one team or one book, shaped with you. Leave a work email and a founder will write back.</p>
        </div>
        <WaitlistForm audience="business" source="business" cta="Start a pilot" />
      </Reveal>
    </Section>
  );
}
