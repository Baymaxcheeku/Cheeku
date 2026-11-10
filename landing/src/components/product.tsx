"use client";

import { Activity, AlertTriangle, Apple, Brain, CalendarCheck, Check, FileText, FlaskConical, HeartPulse, Pill, ShieldCheck, Siren, Stethoscope } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { EASE, Eyebrow, Reveal, Section, Tilt, Words } from "./ui";

const STEPS = [
  {
    key: "remember",
    n: "01",
    verb: "It remembers.",
    body: "Every report, prescription and reading becomes one dated record per person, each fact tied to the page it came from. So the answer is about your father, not an average man.",
    points: ["Any lab report, read in about a minute", "Trends across labs, years and family members", "You can correct any fact, any time"],
  },
  {
    key: "decide",
    n: "02",
    verb: "It decides the next step.",
    body: "Rules signed by clinicians weigh the numbers and say what matters now, what can wait and what needs a doctor today. Every prescription is read down to the salt.",
    points: ["10 checks against published standards", "Four levels of urgency, in plain words", "Never says stop. Never rates the doctor."],
  },
  {
    key: "book",
    n: "03",
    verb: "It books the care.",
    body: "A home lab test, a doctor, a dietitian. One price, one slot, booked inside the chat. The result comes back to the same thread and files itself.",
    points: ["Care partners across 12,000+ pincodes", "Sample collected from home", "Every booking writes back to memory"],
  },
] as const;

function MemoryScreen() {
  const rows = [
    { icon: FlaskConical, t: "HbA1c 6.8%", s: "Thyrocare · 12 Oct", tone: "bg-caution-bg text-caution", tag: "Up" },
    { icon: Pill, t: "Telmisartan 40 mg", s: "Dr. Rao · since Mar", tone: "bg-safe-bg text-safe", tag: "Active" },
    { icon: HeartPulse, t: "BP 138 / 88", s: "Home reading · today", tone: "bg-mist text-ink-500", tag: "Logged" },
    { icon: FileText, t: "Lipid profile", s: "Due this month", tone: "bg-loud-wash text-loud-deep", tag: "Due" },
  ];
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-violet text-[15px] font-bold text-brand-700">P</span>
        <div>
          <p className="text-[15px] font-semibold leading-tight">Papa, 64</p>
          <p className="text-[12px] text-ink-500">23 records · 6 years</p>
        </div>
      </div>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-300">His timeline</p>
      <ul className="relative mt-3 space-y-2.5 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-line">
        {rows.map((r, i) => (
          <motion.li key={r.t} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.09, duration: 0.45, ease: EASE }} className="relative flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_1px_0_rgba(15,16,48,0.04)] ring-1 ring-line">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lilac text-brand-700">
              <r.icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">{r.t}</p>
              <p className="truncate text-[11px] text-ink-500">{r.s}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.tone}`}>{r.tag}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function DecideScreen() {
  const checks = ["Composition", "Banned combinations", "Fit for the condition", "Interactions", "Dose for age and kidneys", "Duplication", "Antibiotic use", "Elderly safety", "Monitoring tests", "Cost"];
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-300">Prescription check</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-[15px] font-semibold leading-tight">
          Ma&apos;s new prescription
          <span className="block text-[12px] font-normal text-ink-500">5 medicines · 3 doctors</span>
        </p>
        <p className="text-[34px] font-semibold leading-none tracking-tight">
          9<span className="text-[16px] text-ink-300">/10</span>
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-1.5">
        {checks.map((c, i) => {
          const flag = i === 3;
          return (
            <motion.li
              key={c}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.05, duration: 0.35, ease: EASE }}
              className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px] font-medium ${flag ? "bg-caution-bg text-caution" : "bg-white text-ink-700 ring-1 ring-line"}`}
            >
              {flag ? <AlertTriangle size={12} className="shrink-0" /> : <Check size={12} strokeWidth={3} className="shrink-0 text-safe" />}
              <span className="truncate">{c}</span>
            </motion.li>
          );
        })}
      </ul>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.45, ease: EASE }} className="mt-3 rounded-2xl bg-ink p-3.5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-loud">Ask her doctor</p>
        <p className="mt-1 text-[13px] leading-snug">&ldquo;She takes a blood pressure tablet. Is this painkiller safe with it?&rdquo;</p>
      </motion.div>
    </div>
  );
}

function BookScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2">
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-[13px] text-white">
          Yes, book Papa&apos;s test
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4, ease: EASE }} className="w-fit max-w-[88%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2 text-[13px] leading-snug ring-1 ring-line">
          Done. HbA1c and lipid profile, because his sugar has climbed across four reports.
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5, duration: 0.5, ease: EASE }} className="mt-3 rounded-3xl bg-white p-4 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-loud text-ink">
            <CalendarCheck size={18} />
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-tight">Home collection</p>
            <p className="text-[12px] text-ink-500">Sat, 8:00 to 9:00 am · Patna</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px]">
          <span className="text-ink-500">One price, paid in chat</span>
          <span className="rounded-full bg-safe-bg px-2 py-0.5 font-bold uppercase tracking-wide text-safe">Confirmed</span>
        </div>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.95 }} className="mt-3 flex items-center gap-2 text-[12px] text-ink-500">
        <FileText size={13} className="text-brand-600" /> The result will file itself under Papa.
      </motion.p>
    </div>
  );
}

const SCREENS = { remember: MemoryScreen, decide: DecideScreen, book: BookScreen } as const;

function Step({ step, onSeen }: { step: (typeof STEPS)[number]; onSeen: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (seen) onSeen();
  }, [seen, onSeen]);
  return (
    <div ref={ref} className="flex min-h-0 flex-col justify-center py-10 lg:min-h-[78vh]">
      <span className="text-[13px] font-semibold tracking-[0.14em] text-brand-600">{step.n}</span>
      <h3 className="display mt-3 text-[34px] sm:text-[46px]">{step.verb}</h3>
      <p className="mt-4 max-w-[470px] text-[18px] leading-relaxed text-ink-700">{step.body}</p>
      <ul className="mt-6 space-y-3">
        {step.points.map((pt) => (
          <li key={pt} className="flex items-start gap-3 text-[16px] text-ink">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
              <Check size={12} strokeWidth={3.5} />
            </span>
            {pt}
          </li>
        ))}
      </ul>
      {/* On phones the screen sits under its own step. */}
      <div className="mt-8 lg:hidden">
        <Phone k={step.key} />
      </div>
    </div>
  );
}

function Phone({ k }: { k: keyof typeof SCREENS }) {
  const Screen = SCREENS[k];
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <div className="rounded-[44px] bg-ink p-2.5 shadow-[0_40px_80px_-30px_rgba(20,19,107,0.55)]">
        <div className="relative h-[560px] overflow-hidden rounded-[36px] bg-gradient-to-b from-lilac to-canvas">
          <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
          <div className="h-full px-4 pb-5 pt-14">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={k} className="h-full" initial={{ opacity: 0, y: 16, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -12, filter: "blur(4px)" }} transition={{ duration: 0.3, ease: EASE }}>
                <Screen />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductSection() {
  const [active, setActive] = useState<keyof typeof SCREENS>("remember");
  return (
    <div id="product">
      <Section className="pt-24 sm:pt-32">
        <div className="max-w-[760px]">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="display mt-5 text-[36px] sm:text-[52px]">
            <Words text="A chatbot answers." /> <span className="serif-accent text-brand-600"><Words text="Cheeku follows through." delay={0.2} /></span>
          </h2>
          <Reveal delay={0.15}>
            <p className="mt-5 text-[18px] leading-relaxed text-ink-700">Chat is only how you talk to it. The next right step, done, is the product.</p>
          </Reveal>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {STEPS.map((s) => (
              <Step key={s.key} step={s} onSeen={() => setActive(s.key)} />
            ))}
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-screen items-center justify-center">
              <div aria-hidden className="absolute h-[440px] w-[440px] rounded-full bg-gradient-to-b from-violet to-lilac blur-2xl" />
              <div className="relative">
                <Phone k={active} />
                <div className="absolute -right-10 top-10 flex flex-col gap-2">
                  {STEPS.map((s) => (
                    <span key={s.key} className={`h-8 w-1.5 rounded-full transition-colors duration-300 ${s.key === active ? "bg-loud" : "bg-violet-deep"}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const JOBS = [
  { icon: Activity, title: "Know your numbers", body: "Any report read in a minute. Trends by body system, not by PDF.", when: "Every report", span: "sm:col-span-2" },
  { icon: Pill, title: "Check your medicines", body: "Every prescription scored on 10 published checks.", when: "Every new prescription", span: "" },
  { icon: Apple, title: "Eat for your body", body: "Indian meals in real portions, fitted to your numbers.", when: "Every meal", span: "" },
  { icon: Brain, title: "Move and sleep well", body: "Steps, strength and sleep, read from your phone.", when: "Every day", span: "" },
  { icon: Stethoscope, title: "Book care on time", body: "Home tests, doctors and dietitians, booked in chat when they're due.", when: "When it's due", span: "" },
];

export function DailySection() {
  return (
    <Section className="py-24 sm:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[640px]">
          <Eyebrow>A daily companion</Eyebrow>
          <h2 className="display mt-5 text-[36px] sm:text-[52px]">
            <Words text="Five small jobs." /> <span className="serif-accent text-brand-600"><Words text="Ten years back." delay={0.2} /></span>
          </h2>
        </div>
        <Reveal className="max-w-[360px] text-[16px] leading-relaxed text-ink-700">One nudge each morning. A 60-second review on Sunday. A retest every quarter that shows what moved.</Reveal>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {JOBS.map((j, i) => (
          <Reveal key={j.title} delay={i * 0.06} className={j.span}>
            <Tilt className="group relative h-full overflow-hidden rounded-[28px] border border-line bg-white p-7 shadow-[var(--shadow-card)] transition-colors duration-300 hover:border-brand-400/50">
              <div aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lilac transition-transform duration-500 ease-out group-hover:scale-[1.6]" />
              <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white transition-colors duration-300 group-hover:bg-loud group-hover:text-ink">
                <j.icon size={22} />
              </span>
              <h3 className="relative mt-6 text-[22px] font-semibold tracking-tight">{j.title}</h3>
              <p className="relative mt-2 max-w-[360px] text-[16px] leading-relaxed text-ink-700">{j.body}</p>
              <p className="relative mt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-600">{j.when}</p>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const TIERS = [
  { label: "Go now", body: "Straight to a doctor or emergency care. The model is skipped entirely.", cls: "bg-danger-bg text-danger", icon: Siren },
  { label: "See a doctor today", body: "Booked in chat, with your records attached.", cls: "bg-loud-wash text-loud-deep", icon: Stethoscope },
  { label: "Ask your doctor", body: "The exact questions to take to your next visit.", cls: "bg-caution-bg text-caution", icon: AlertTriangle },
  { label: "Safe to manage at home", body: "What to do, and what would change that.", cls: "bg-safe-bg text-safe", icon: ShieldCheck },
];

const PROMISES = [
  ["Never diagnoses. Never prescribes.", "It explains, checks and books. Doctors decide treatment."],
  ["Never invents a number.", "Every value it states was read from your own records, with the source one tap away."],
  ["Danger skips the AI.", "Red flags are caught by fixed rules before any model runs."],
  ["Your family, your data.", "Nothing is shared without consent, in line with India's data protection rules. Correct or delete anything."],
] as const;

export function SafetySection() {
  return (
    <div className="overflow-x-clip bg-gradient-to-b from-canvas via-lilac/60 to-canvas">
      <Section className="py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Eyebrow>Safe by design</Eyebrow>
            <h2 className="display mt-5 text-[36px] sm:text-[52px]">
              <Words text="Rules decide." /> <span className="serif-accent text-brand-600"><Words text="The model only explains." delay={0.2} /></span>
            </h2>
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-[480px] text-[18px] leading-relaxed text-ink-700">
                Health is the one place an AI must not improvise. So the decisions come from rules that clinicians have signed, and the model&apos;s only job is to put them in words your family understands.
              </p>
            </Reveal>
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              {PROMISES.map(([t, d], i) => (
                <Reveal key={t} delay={0.1 + i * 0.06}>
                  <dt className="flex items-center gap-2 text-[16px] font-semibold">
                    <ShieldCheck size={18} className="shrink-0 text-brand-600" />
                    {t}
                  </dt>
                  <dd className="mt-1.5 pl-[26px] text-[15px] leading-relaxed text-ink-700">{d}</dd>
                </Reveal>
              ))}
            </dl>
          </div>
          <div className="relative">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">Four levels of urgency, always in plain words</p>
            <ul className="mt-4 space-y-3">
              {TIERS.map((t, i) => (
                <motion.li
                  key={t.label}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px 0px" }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                  whileHover={{ x: -6 }}
                  className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-[var(--shadow-card)]"
                  style={{ marginLeft: `${i * 4}%` }}
                >
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${t.cls}`}>
                    <t.icon size={22} />
                  </span>
                  <div>
                    <p className="text-[17px] font-semibold tracking-tight">{t.label}</p>
                    <p className="text-[14px] leading-snug text-ink-700">{t.body}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}
