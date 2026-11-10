"use client";

import { ArrowRight, MessageCircle, MapPin, Moon, Pill } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { EASE, Eyebrow, Reveal, Section, Words } from "./ui";

type Chat = { from: string; text: string; side: "l" | "r"; muted?: boolean };

const PAINS: { key: string; icon: typeof Pill; tab: string; title: string; body: string; chats: Chat[]; fixTitle: string; fix: string; chip: string }[] = [
  {
    key: "manager",
    icon: MessageCircle,
    tab: "You run the family's health",
    title: "Everyone's health lives in your WhatsApp.",
    body: "You're the son or daughter who keeps the reports. Papa's are with three labs, Ma's are photos of photos, and the one you need is always forty scrolls up.",
    chats: [
      { from: "Papa", text: "Report aa gaya. PDF bheja hai", side: "l" },
      { from: "Family group", text: "Good morning ji. Forwarded many times", side: "l", muted: true },
      { from: "You", text: "Which lab was the last one from?", side: "r" },
      { from: "Ma", text: "Doctor asked for the old report. Do you have it?", side: "l" },
    ],
    fixTitle: "One memory, per person",
    fix: "Forward the PDF once. Cheeku reads it, files it under the right person and remembers every value with its date and source.",
    chip: "4 reports, 3 labs, 1 timeline",
  },
  {
    key: "distance",
    icon: MapPin,
    tab: "Your parents live far away",
    title: "You hear about their health when it goes wrong.",
    body: "You're in Bengaluru. They're in Patna. On the phone everything is “theek hai”. The first real news is usually a hospital.",
    chats: [
      { from: "You", text: "BP check kiya?", side: "r" },
      { from: "Ma", text: "Haan haan, sab theek hai", side: "l" },
      { from: "You", text: "Kitna tha?", side: "r" },
      { from: "Ma", text: "Yaad nahi. Thoda zyada tha shayad", side: "l" },
    ],
    fixTitle: "You know before it's an emergency",
    fix: "Cheeku notices Ma's blood pressure rising three weeks in a row, tells you in plain words and books the doctor in her city.",
    chip: "Up 3 weeks in a row · doctor booked",
  },
  {
    key: "rx",
    icon: Pill,
    tab: "Too many medicines",
    title: "Five medicines. Three doctors. Zero cross-checks.",
    body: "Each doctor sees their own prescription. Nobody sees all of them together, so nobody has checked whether they clash.",
    chats: [
      { from: "Cardiologist", text: "Rx: 2 tablets, morning", side: "l" },
      { from: "Diabetologist", text: "Rx: 2 tablets, after food", side: "l" },
      { from: "GP", text: "Rx: painkiller, as needed", side: "l" },
      { from: "You", text: "Is it okay to take all of these together?", side: "r" },
    ],
    fixTitle: "Every prescription, checked",
    fix: "Read down to the salt, then checked against 10 published standards for this person's age, kidneys and other medicines. You get the questions to ask the doctor.",
    chip: "10 checks · 1 question for the doctor",
  },
  {
    key: "night",
    icon: Moon,
    tab: "It's 2 am",
    title: "Google says it could be anything.",
    body: "A fever in a child, a pain that's new, a number on a report. The internet answers for an average person. You need an answer about yours.",
    chats: [
      { from: "Search", text: "child fever 3 days when to worry", side: "r" },
      { from: "Result 1", text: "Usually nothing to worry about", side: "l", muted: true },
      { from: "Result 2", text: "Could be a sign of something serious", side: "l", muted: true },
      { from: "Result 7", text: "12 causes doctors don't tell you", side: "l", muted: true },
    ],
    fixTitle: "An answer about your family",
    fix: "Cheeku answers from your family's own records, in plain words, and says clearly when it's a wait, a call tomorrow or a go-now.",
    chip: "Answered from her records, not the internet",
  },
];

export function FamiliesSection() {
  const [i, setI] = useState(0);
  const p = PAINS[i]!;
  return (
    <div id="families" className="relative bg-gradient-to-b from-canvas via-mist to-canvas">
      <Section className="py-24 sm:py-32">
        <div className="max-w-[760px]">
          <Eyebrow>For families</Eyebrow>
          <h2 className="display mt-5 text-[36px] sm:text-[52px]">
            <Words text="If one of these is you," /> <span className="serif-accent text-brand-600"><Words text="we built this for you." delay={0.25} /></span>
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div role="tablist" aria-label="Which one sounds like you?" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {PAINS.map((x, n) => {
              const on = n === i;
              const Icon = x.icon;
              return (
                <button
                  key={x.key}
                  role="tab"
                  type="button"
                  aria-selected={on}
                  onClick={() => setI(n)}
                  className={`group relative flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl px-4 py-4 text-left transition-colors duration-200 lg:w-full ${on ? "text-white" : "bg-white/70 text-ink hover:bg-white"}`}
                >
                  {on && <motion.span layoutId="pain-tab" className="absolute inset-0 rounded-2xl bg-ink shadow-[var(--shadow-float)]" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />}
                  <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${on ? "bg-loud text-ink" : "bg-lilac text-brand-700"}`}>
                    <Icon size={18} />
                  </span>
                  <span className="relative whitespace-nowrap text-[15px] font-semibold lg:whitespace-normal">{x.tab}</span>
                  <ArrowRight size={16} className={`relative ml-auto hidden transition-all duration-200 lg:block ${on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"}`} />
                </button>
              );
            })}
          </div>

          <div role="tabpanel" className="overflow-hidden rounded-[32px] border border-line bg-white shadow-[var(--shadow-card)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={p.key}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.32, ease: EASE }}
                className="grid md:grid-cols-2"
              >
                <div className="p-7 sm:p-9">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-300">Today</p>
                  <h3 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{p.title}</h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-700">{p.body}</p>
                  <ul className="mt-6 space-y-2" aria-label="How it goes today">
                    {p.chats.map((c, n) => (
                      <motion.li
                        key={n}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.12 + n * 0.09, duration: 0.4, ease: EASE }}
                        className={`flex ${c.side === "r" ? "justify-end" : "justify-start"}`}
                      >
                        <span className={`max-w-[86%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${c.side === "r" ? "rounded-br-md bg-lilac text-ink" : c.muted ? "rounded-bl-md bg-mist text-ink-300" : "rounded-bl-md bg-mist text-ink-700"}`}>
                          <span className="mb-0.5 block text-[11px] font-semibold text-ink-300">{c.from}</span>
                          {c.text}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="relative overflow-hidden bg-gradient-to-br from-lilac to-violet p-7 sm:p-9">
                  <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/40 blur-2xl" />
                  <p className="relative text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-700">With Cheeku</p>
                  <h3 className="relative mt-3 text-[26px] font-semibold leading-tight tracking-tight sm:text-[30px]">{p.fixTitle}</h3>
                  <p className="relative mt-3 text-[16px] leading-relaxed text-ink-700">{p.fix}</p>
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
                    className="glass relative mt-7 flex items-center gap-3 rounded-2xl p-4"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/mascot/face.png" alt="" className="h-10 w-10 rounded-full bg-white" />
                    <div>
                      <p className="text-[12px] font-semibold text-brand-700">Cheeku</p>
                      <p className="text-[14px] font-semibold leading-snug">{p.chip}</p>
                    </div>
                    <span className="relative ml-auto flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loud opacity-70" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-loud" />
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <Reveal className="mt-8 text-center text-[15px] text-ink-500">Built for the whole family on one plan: parents, partner, children, and the baby on the way.</Reveal>
      </Section>
    </div>
  );
}
