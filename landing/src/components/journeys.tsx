"use client";

import { Activity, Baby, Check, FolderOpen, HeartHandshake, PersonStanding, Sprout } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Phone } from "./phone";
import { EASE, Kicker, Reveal, Wrap } from "./ui";
import { Film } from "./video";

/*
 * The six families Cheeku is built for. The same six the app asks about on
 * the way in (mobile-react-native/src/lib/onboarding/journeys.ts), in the
 * words people use for themselves.
 */
const JOURNEYS = [
  {
    id: "fertility",
    icon: Sprout,
    label: "Trying for a baby",
    worry: "Every month the same wait. And a file full of tests nobody explains",
    points: ["Both partners' tests in one place, in order", "Each report explained in simple words", "What to ask the doctor at the next visit"],
    screen: "/screens/ttc-a.webp",
    alt: "Cheeku answering a couple who are trying for a baby, using both their reports",
    film: { id: "YHAdRiJ32Fo", title: "Trying for a baby, with Cheeku", caption: "Watch: trying for a baby" },
  },
  {
    id: "expecting",
    icon: HeartHandshake,
    label: "Expecting a baby",
    worry: "Is this normal? Is this safe for the baby?",
    points: ["Every scan and test saved, week by week", "Reports read for pregnancy, not for an average adult", "A reminder when this trimester's test is due"],
    screen: "/screens/expecting.webp",
    alt: "Cheeku's memory for a mother at week 12 of pregnancy, with her medicines and pending tests",
  },
  {
    id: "new_parent",
    icon: Baby,
    label: "New parent",
    worry: "It's 2 am. Baby is hot. Do we go now?",
    points: ["A clear answer: watch at home, call a doctor, or go now", "Vaccine card kept safe, next dose reminded", "A children's doctor on video call when you need one"],
    screen: "/screens/parent-a.webp",
    alt: "Cheeku helping a parent whose 7 week old baby has a fever, with a note ready for the doctor",
  },
  {
    id: "caregiver",
    icon: PersonStanding,
    label: "Caring for parents",
    worry: "On the phone, everything is “theek hai”",
    points: ["See if they took today's tablets", "An alert when a test is overdue or a number keeps rising", "A doctor or home test booked in their city, from yours"],
    screen: "/screens/parents.webp",
    alt: "The family care screen showing how each family member is doing today",
  },
  {
    id: "optimiser",
    icon: Activity,
    label: "Getting healthier",
    worry: "A full-body checkup every year. Nothing changes",
    points: ["Every checkup side by side, so you see what moved", "One small step a day for food, sleep and movement", "A retest reminder, to prove it worked"],
    screen: "/screens/fit.webp",
    alt: "Today's plan in Cheeku, built from the person's own sugar and heart numbers",
  },
  {
    id: "other",
    icon: FolderOpen,
    label: "Just keeping track",
    worry: "Where is that report?",
    points: ["Send any report or prescription. It files itself", "Find anything in seconds, for anyone at home", "Share the whole file with a doctor in one tap"],
    screen: "/screens/track.webp",
    alt: "A lab report read and filed by Cheeku, showing which values need a doctor's attention",
  },
] as const;

export function Journeys() {
  const [i, setI] = useState(0);
  const j = JOURNEYS[i]!;
  return (
    <div id="for-you" className="bg-soft">
      <Wrap className="py-20 sm:py-28">
        <Reveal className="max-w-[720px]">
          <Kicker>Who it&apos;s for</Kicker>
          <h2 className="h-section mt-3 text-[32px] sm:text-[48px]">Wherever your family is right now</h2>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr] lg:gap-8">
          <div role="tablist" aria-label="Pick your situation" aria-orientation="vertical" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:overflow-visible">
            {JOURNEYS.map((x, n) => {
              const on = n === i;
              return (
                <button
                  key={x.id}
                  role="tab"
                  type="button"
                  id={`tab-${x.id}`}
                  aria-selected={on}
                  aria-controls="journey-panel"
                  onClick={() => setI(n)}
                  className={`relative flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-[14px] px-4 text-left text-[16px] font-medium transition-colors duration-150 lg:h-14 lg:w-full ${on ? "text-white" : "text-ink-2 hover:bg-white hover:text-ink"}`}
                >
                  {on && <motion.span layoutId="journey-pill" className="absolute inset-0 rounded-[14px] bg-purple-600" transition={{ duration: 0.3, ease: EASE }} />}
                  <x.icon size={18} strokeWidth={1.5} className="relative shrink-0" />
                  <span className="relative whitespace-nowrap">{x.label}</span>
                </button>
              );
            })}
          </div>

          <div id="journey-panel" role="tabpanel" aria-labelledby={`tab-${j.id}`} className="overflow-hidden rounded-[28px] border border-hair bg-white shadow-[var(--shadow-md)]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={j.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="grid md:grid-cols-[1fr_auto]">
                <div className="flex flex-col justify-center p-6 sm:p-10">
                  <p className="text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[34px]">&ldquo;{j.worry}&rdquo;</p>
                  <ul className="mt-7 space-y-4">
                    {j.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[17px] leading-snug text-ink-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-purple-600 text-white">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  {"film" in j && (
                    <div className="mt-8 max-w-[440px]">
                      <Film id={j.film.id} title={j.film.title} caption={j.film.caption} compact />
                    </div>
                  )}
                </div>
                <div className="stage relative flex items-end justify-center overflow-hidden px-8 pt-10 md:w-[380px]">
                  <Phone src={j.screen} alt={j.alt} width={270} className="-mb-24" />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Wrap>
    </div>
  );
}
