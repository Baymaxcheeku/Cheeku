"use client";

import { ArrowUpRight, BrainCircuit, CalendarCheck, Database, MessageSquareText } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { A16Z_URL } from "./chrome";
import { CountUp, EASE, Eyebrow, Reveal, Section, Tilt, Words } from "./ui";
import { WaitlistForm } from "./waitlist-form";

const WHY_NOW = [
  { n: 10, suffix: " yrs", title: "The longevity gap", body: "Life expectancy 70.8, healthy life 60.3. The over-60 population more than doubles by 2050.", src: "WHO, UNFPA" },
  { n: 79.7, d: 1, suffix: " cr", title: "The data rails", body: "ABHA health IDs already issued, and a consent law now in force. Records can finally move with the person.", src: "National Health Authority; DPDP Rules 2025" },
  { n: 23, suffix: " cr", title: "The AI moment", body: "People who ask ChatGPT a health question every week. It forgets every one of them.", src: "OpenAI, 2026" },
  { n: 7, prefix: "~", suffix: " paise", title: "The cost curve", body: "What one answer costs to serve today on small hosted models. A year ago this business did not work.", src: "Our unit costs, Nov 2026" },
  { n: 39.4, d: 1, suffix: "%", title: "The care gap", body: "Health spending paid from the family's own pocket, much of it on tests nobody reads twice.", src: "National Health Accounts 2021-22" },
  { n: 0, prefix: "₹", suffix: "", title: "The capital spent so far", body: "A full product, a fine-tuned model behind a safety router and a live care network, built before raising a rupee.", src: "Us" },
];

const NODES = [
  { icon: Database, label: "Family memory", sub: "consented, longitudinal", angle: -90 },
  { icon: MessageSquareText, label: "Answers about you", sub: "grounded in the record", angle: 0 },
  { icon: CalendarCheck, label: "Care booked", sub: "revenue, zero supply capex", angle: 90 },
  { icon: BrainCircuit, label: "India's own health model", sub: "trained on what no lab has", angle: 180 },
];

function Flywheel() {
  const still = useReducedMotion();
  const R = 178;
  return (
    <div className="relative mx-auto aspect-square w-[78%] max-w-[440px] sm:w-full">
      <svg viewBox="-220 -220 440 440" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle r={R} fill="none" stroke="rgba(227,220,255,0.18)" strokeWidth="1.5" />
        <motion.circle
          r={R}
          fill="none"
          stroke="#ff6a2b"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="90 852"
          animate={still ? undefined : { rotate: 360 }}
          transition={{ duration: 9, ease: "linear", repeat: Infinity }}
          style={{ transformOrigin: "0px 0px" }}
        />
        <circle r={R - 46} fill="none" stroke="rgba(227,220,255,0.1)" strokeDasharray="2 8" />
      </svg>
      <div className="absolute left-1/2 top-1/2 w-[40%] -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="serif-accent text-[19px] leading-tight text-white sm:text-[25px]">Every answer and booking writes back.</p>
        <p className="mt-2 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-violet/70 sm:block">The loop compounds</p>
      </div>
      {NODES.map((n, i) => {
        const rad = (n.angle * Math.PI) / 180;
        const x = 50 + ((Math.cos(rad) * R) / 440) * 100;
        const y = 50 + ((Math.sin(rad) * R) / 440) * 100;
        return (
          <motion.div
            key={n.label}
            className="absolute w-[112px] -translate-x-1/2 -translate-y-1/2 sm:w-[148px]"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px 0px" }}
            transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: EASE }}
          >
            <div className="rounded-2xl border border-white/15 bg-brand-900/90 p-3 text-center backdrop-blur transition-colors duration-300 hover:border-loud/60">
              <span className="mx-auto grid h-8 w-8 place-items-center rounded-xl bg-white/10 text-loud">
                <n.icon size={16} />
              </span>
              <p className="mt-2 text-[13px] font-semibold leading-tight text-white">{n.label}</p>
              <p className="mt-0.5 hidden text-[11px] leading-tight text-violet/70 sm:block">{n.sub}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function InvestorSection() {
  return (
    <div id="investors" className="relative overflow-hidden bg-brand-950 text-white">
      <div aria-hidden className="absolute -left-40 top-0 h-[520px] w-[520px] rounded-full bg-brand-600/30 blur-[120px]" />
      <div aria-hidden className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-loud/10 blur-[120px]" />
      <Section className="py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <Eyebrow tone="light">For investors</Eyebrow>
            <h2 className="display mt-5 text-[38px] sm:text-[60px]">
              <Words text="The healthcare home" /> <span className="serif-accent text-loud"><Words text="for 140 crore people." delay={0.2} /></span>
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-violet">
                AI made health answers nearly free. So the value moves to whoever holds the memory and takes the action. In India nobody is paid to do that: clinics earn on visits, pharmacies on medicines, hospitals on beds. We earn by keeping a family well between them.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <a href={A16Z_URL} target="_blank" rel="noopener noreferrer" className="group block rounded-[28px] border border-white/15 bg-white/[0.06] p-7 backdrop-blur transition-colors duration-300 hover:border-loud/60 hover:bg-white/[0.09]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-loud">a16z · The State of Longevity · 3 Nov 2026</p>
              <blockquote className="serif-accent mt-4 text-[24px] leading-snug text-white sm:text-[28px]">
                &ldquo;The race is to become the first place a consumer turns to when they need something done for their health.&rdquo;
              </blockquote>
              <p className="mt-4 text-[15px] leading-relaxed text-violet">
                Their survey: half of people would pay for one app that holds their records, labs and wearable data and books their care. That is the product we have already built, for the country that needs it most.
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-white">
                Read the thesis
                <ArrowUpRight size={16} className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
              <p className="mt-3 text-[11px] text-violet/50">Quoted from a16z&apos;s public report. a16z is not an investor in or affiliated with Cheeku AI.</p>
            </a>
          </Reveal>
        </div>

        <div className="mt-20">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-violet/70">Why now: six curves crossed at once</p>
          </Reveal>
          <div className="mt-6 grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_NOW.map((w, i) => (
              <Reveal key={w.title} delay={i * 0.05} className="group bg-brand-950 p-7 transition-colors duration-300 hover:bg-brand-900">
                <CountUp to={w.n} decimals={w.d ?? 0} prefix={w.prefix ?? ""} suffix={w.suffix} className="display text-[44px] text-white transition-colors duration-300 group-hover:text-loud" />
                <p className="mt-3 text-[17px] font-semibold">{w.title}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-violet">{w.body}</p>
                <p className="mt-3 text-[11px] text-violet/50">{w.src}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-24 grid items-center gap-12 lg:grid-cols-2">
          <Flywheel />
          <div>
            <Reveal>
              <h3 className="display text-[32px] sm:text-[44px]">
                A memory that compounds <span className="serif-accent text-loud">is a moat that compounds.</span>
              </h3>
            </Reveal>
            <ul className="mt-8 space-y-6">
              {[
                ["Data nobody else has", "Consented, longitudinal family records, mapped to Indian labs, brands and salts. Every day of use widens the lead."],
                ["Our own weights, earned", "A health model for India that becomes the default only when it beats frontier models on India-specific evaluations."],
                ["Revenue without supply", "Care is fulfilled by partners already live across 12,000+ pincodes. We built none of it and book all of it."],
                ["The endgame", "The risk layer insurers and employers price on, with the family's consent."],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 0.07} className="flex gap-4">
                  <span className="mt-1 text-[13px] font-semibold tabular-nums text-loud">0{i + 1}</span>
                  <div>
                    <p className="text-[18px] font-semibold">{t}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-violet">{d}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        <Reveal className="mt-24">
          <Tilt max={3} className="relative overflow-hidden rounded-[32px] border border-white/15 bg-gradient-to-br from-brand-900 to-brand-950 p-8 sm:p-12">
            <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] [&>*]:min-w-0">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-loud">Seed round, opening soon</p>
                <p className="display mt-4 text-[30px] sm:text-[40px]">The product is built. The round is to launch it.</p>
                <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-violet">
                  Three founders who have shipped clinical-grade AI on real patient samples, launched care lines at Practo, scaled healthcare payments at Pine Labs and trained computer vision for an Instagram feature. We share the deck one conversation at a time.
                </p>
              </div>
              <div>
                <WaitlistForm audience="investor" source="investors" cta="Request the deck" tone="dark" />
                <p className="pl-5 text-[13px] text-violet/60">Work email, please. A founder replies personally.</p>
              </div>
            </div>
          </Tilt>
        </Reveal>
      </Section>
    </div>
  );
}
