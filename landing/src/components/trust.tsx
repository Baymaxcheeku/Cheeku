"use client";

import { Lock, Plus, ShieldCheck, Siren, Stethoscope } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { EASE, Kicker, Reveal, Wrap } from "./ui";

const PROMISES = [
  { icon: Stethoscope, title: "It is not a doctor", body: "Cheeku explains and reminds. It does not diagnose and does not prescribe. Your doctor decides the treatment." },
  { icon: Siren, title: "Danger means go now", body: "Chest pain, a newborn with fever, bleeding in pregnancy. Cheeku skips the chat and tells you to get help." },
  { icon: ShieldCheck, title: "Nothing made up", body: "Every number it tells you comes from your own reports. Tap to see the original." },
  { icon: Lock, title: "Your reports stay yours", body: "Nothing is shared without your yes. Delete anything, any time." },
];

export function Trust() {
  return (
    <Wrap id="trust" className="py-20 sm:py-28">
      <Reveal className="max-w-[720px]">
        <Kicker>Is it safe</Kicker>
        <h2 className="h-section mt-3 text-[32px] sm:text-[48px]">Health is not the place to guess. So Cheeku doesn&apos;t</h2>
      </Reveal>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {PROMISES.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.05}>
            <li className="flex h-full list-none gap-4 rounded-[20px] border border-hair bg-white p-6 shadow-[var(--shadow-sm)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-purple-50 text-purple-600">
                <p.icon size={18} strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em]">{p.title}</h3>
                <p className="mt-1.5 text-[16px] leading-relaxed text-ink-2">{p.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </Wrap>
  );
}

const FAQ = [
  { q: "Is Cheeku a doctor?", a: "No. Cheeku helps you understand your family's reports and medicines, and books a real doctor when you need one. It never diagnoses and never prescribes." },
  { q: "My parents are not good with apps. Will this work?", a: "You can keep their file on your phone. Send their reports, see their medicines and book their tests from wherever you live." },
  { q: "What can I send?", a: "Lab reports, prescriptions, scans, discharge papers and bills. A photo or a PDF is fine, and you can share straight from WhatsApp." },
  { q: "Where do tests and doctors work?", a: "Our care partners cover more than 12,000 pincodes across 300+ cities, with home sample collection and doctors on video call." },
  { q: "What does it cost?", a: "Joining the waitlist is free. We will share plans before you are asked to pay anything." },
  { q: "When can I use it?", a: "We are opening in small batches from early 2027, so every family gets proper attention. People on the waitlist go first." },
];

export function Questions() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div id="faq" className="bg-soft">
      <Wrap className="py-20 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-[360px_1fr] lg:gap-16">
          <Reveal>
            <Kicker>Questions</Kicker>
            <h2 className="h-section mt-3 text-[32px] sm:text-[44px]">What families ask us first</h2>
          </Reveal>
          <ul className="divide-y divide-hair border-y border-hair">
            {FAQ.map((f, i) => {
              const on = open === i;
              return (
                <li key={f.q}>
                  <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setOpen(on ? null : i)} className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left">
                    <span className="text-[18px] font-medium tracking-[-0.01em] sm:text-[20px]">{f.q}</span>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-200 ease-[var(--ease)] ${on ? "rotate-45 bg-purple-600 text-white" : "bg-white text-ink-2"}`}>
                      <Plus size={16} strokeWidth={1.5} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.div id={`faq-${i}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                        <p className="max-w-[640px] pb-6 text-[17px] leading-relaxed text-ink-2">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </Wrap>
    </div>
  );
}
