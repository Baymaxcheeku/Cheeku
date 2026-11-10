"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { EASE, Heading, Reveal } from "./ui";
import { WaitlistForm } from "./waitlist-form";

const PROMISES = [
  ["It is not a doctor", "Cheeku explains and reminds. It does not diagnose and does not prescribe. Your doctor decides the treatment."],
  ["Danger means go now", "Chest pain, a newborn with fever, bleeding in pregnancy. Cheeku skips the chat and tells you to get help."],
  ["Nothing made up", "Every number it tells you comes from your own reports. Tap to see the original."],
];

const FAQ = [
  { q: "Is Cheeku a doctor?", a: "No. Cheeku helps you understand your family's reports and medicines, and books a real doctor when you need one. It never diagnoses, never prescribes, and never tells you to stop or change a medicine." },
  { q: "My parents are not good with apps. Will this work?", a: "Yes. You keep their file on your phone. Send their reports, see their medicines and book their tests from wherever you live." },
  { q: "What can I send?", a: "Lab reports, prescriptions, scans, discharge papers and bills. A photo or a PDF is fine, and you can share straight from WhatsApp." },
  { q: "Where do tests and doctors work?", a: "Our care partners cover more than 12,000 pincodes across 300+ cities, with home sample collection and doctors on video call." },
  { q: "What does it cost?", a: "Joining the waitlist is free. We will share plans before you are asked to pay anything." },
  { q: "When can I use it?", a: "We are opening in small batches from early 2027, so every family gets proper attention. People on the waitlist go first." },
];

export function Trust() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="Health is not the place to guess. So Cheeku doesn't.">
        Careful <em>by design</em>
      </Heading>
      <dl className="mt-14 grid gap-10 border-y border-hair py-10 md:grid-cols-3 md:gap-12">
        {PROMISES.map(([t, d], i) => (
          <Reveal key={t} delay={i * 0.06}>
            <dt className="display text-[28px]">{t}</dt>
            <dd className="mt-2 text-[16px] leading-relaxed text-ink-2">{d}</dd>
          </Reveal>
        ))}
      </dl>

      <ul className="mx-auto mt-14 max-w-[820px] divide-y divide-hair">
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <li key={f.q}>
              <button type="button" aria-expanded={on} aria-controls={`faq-${i}`} onClick={() => setOpen(on ? null : i)} className="flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left">
                <span className="text-[18px] font-medium sm:text-[19px]">{f.q}</span>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-[background-color,color,transform] duration-300 ease-[var(--ease)] ${on ? "rotate-45 bg-purple-600 text-white" : "bg-purple-50 text-purple-700"}`}>
                  <Plus size={16} strokeWidth={1.5} />
                </span>
              </button>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div id={`faq-${i}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
                    <p className="max-w-[640px] pb-6 text-[17px] leading-relaxed text-ink-2">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Closing() {
  return (
    <>
      <section id="join" className="relative overflow-hidden bg-purple-950 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/photos/parents.webp" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right opacity-60" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-purple-950 via-purple-950/80 to-purple-950/30" />
        <div className="relative mx-auto max-w-[1180px] px-6 py-28 sm:py-36">
          <h2 className="display max-w-[720px] text-[44px] sm:text-[68px]">
            Next time someone at home is unwell, <em>don&apos;t be alone with it</em>
          </h2>
          <p className="mt-5 max-w-[460px] text-[18px] leading-relaxed text-white/85">We are letting families in a few at a time. Join now and you go first.</p>
          <div className="mt-8">
            <WaitlistForm source="closing" onPurple />
            <p className="pl-1 text-[14px] text-white/70">Free to join. No spam.</p>
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-[1180px] px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <span className="font-[family-name:var(--font-display)] text-[26px] leading-none">Cheeku</span>
          <p className="max-w-[640px] text-[13px] leading-relaxed text-ink-3">
            Cheeku does not diagnose, prescribe or replace your doctor. In an emergency, call 112 or go to the nearest hospital. App screens show sample data and some bookings in them are previews. Photographs are illustrations, not real families.
          </p>
        </div>
        <p className="mt-6 text-[13px] text-ink-3">© 2026 Cheeku AI. Made in India</p>
      </footer>
    </>
  );
}
