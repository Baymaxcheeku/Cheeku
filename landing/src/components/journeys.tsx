"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Phone } from "./phone";
import { EASE, Heading } from "./ui";

/*
 * The six families Cheeku is built for, the same six the app asks about on
 * the way in. Each tab swaps the photograph, the worry, and a real app screen.
 */
const JOURNEYS = [
  {
    id: "caregiver",
    tab: "Caring for parents",
    photo: "/photos/parents.webp",
    alt: "An elderly couple sharing a laugh on their verandah",
    title: "Know how they are, from wherever you are",
    body: "On the phone everything is “theek hai”. Cheeku shows you whether Ma took today’s tablets, and tells you when a test is overdue or a number keeps rising.",
    ask: "Did Papa get his sugar test done?",
    answer: "Not yet. It was due last week. I can book a home collection in Patna for Saturday morning.",
    screen: "/screens/parents.webp",
    screenAlt: "The family care screen: each person's doses today and anything that needs a call",
  },
  {
    id: "fertility",
    tab: "Trying for a baby",
    photo: "/photos/ttc.webp",
    alt: "A young couple sitting close together by a window in the morning",
    title: "Every test, in order. For both of you",
    body: "Month after month of tests, and a file nobody explains. Cheeku keeps both partners’ reports together and tells you what to ask at the next visit.",
    ask: "We’re trying for a baby. What should we do first?",
    answer: "I’ve read both your reports. Here are three things to raise with your doctor, in plain words.",
    screen: "/screens/ttc-a.webp",
    screenAlt: "Cheeku answering a couple who are trying for a baby, from both their reports",
    film: "https://www.youtube.com/watch?v=YHAdRiJ32Fo",
  },
  {
    id: "expecting",
    tab: "Expecting a baby",
    photo: "/photos/expecting.webp",
    alt: "A pregnant woman standing by a balcony door at sunset",
    title: "Is this normal? Is this safe for the baby?",
    body: "Every scan and test saved week by week, read for pregnancy and not for an average adult. A reminder when this trimester’s test is due.",
    ask: "Can I take this tablet now that I’m pregnant?",
    answer: "Your doctor prescribed it at week 12, and it is fine through pregnancy. Take it four hours apart from your thyroid tablet.",
    screen: "/screens/expecting.webp",
    screenAlt: "Cheeku's memory for a mother at week 12 of pregnancy",
  },
  {
    id: "new_parent",
    tab: "New parent",
    photo: "/photos/newparent.webp",
    alt: "A father holding his sleeping newborn at night",
    title: "It’s 2 am. The baby is hot. Do we go now?",
    body: "A clear answer: watch at home, call a doctor, or go now. The vaccine card kept safe, and a children’s doctor on video call when you need one.",
    ask: "Tara feels hot. The thermometer says 100.6",
    answer: "She is 7 weeks old, so don’t give any medicine before a doctor sees her. I can get a children’s doctor on a video call now.",
    screen: "/screens/parent-a.webp",
    screenAlt: "Cheeku helping a parent whose 7 week old baby has a fever",
  },
  {
    id: "optimiser",
    tab: "Getting healthier",
    photo: "/photos/fit.webp",
    alt: "A man pausing on an early morning walk in a park",
    title: "A checkup every year. This time, something changes",
    body: "Every checkup side by side, so you can see what moved. One small step a day for food, sleep and movement, and a retest to prove it worked.",
    ask: "What changed since my last checkup?",
    answer: "Your cholesterol is up a little, your vitamin D is still low. Here is one thing to do today.",
    screen: "/screens/fit.webp",
    screenAlt: "Today's plan in Cheeku, built from the person's own numbers",
  },
  {
    id: "other",
    tab: "Just keeping track",
    photo: "/photos/track.webp",
    alt: "A drawer overflowing with medical papers and medicine strips",
    title: "Where is that report?",
    body: "Send any report or prescription and it files itself, under the right person. Find anything in seconds. Share the whole file with a doctor in one tap.",
    ask: "Find Ma’s thyroid report from last year",
    answer: "Here it is, from September. Two values were outside the range. Want me to share it with her doctor?",
    screen: "/screens/track.webp",
    screenAlt: "A lab report read and filed by Cheeku",
  },
] as const;

export function Journeys() {
  const [i, setI] = useState(0);
  const j = JOURNEYS[i]!;
  return (
    <section id="for-you" className="bg-soft py-24 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Heading sub="A family's health is never one thing. Pick what yours looks like today.">
          Wherever your family <em>is right now</em>
        </Heading>

        <div role="tablist" aria-label="Pick your situation" className="-mx-6 mt-12 flex gap-2.5 overflow-x-auto px-6 pb-2 [scrollbar-width:none] lg:mx-0 lg:justify-center lg:px-0">
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
                className={`relative h-[104px] w-[150px] shrink-0 cursor-pointer overflow-hidden rounded-2xl text-left transition-[box-shadow,opacity] duration-200 ${on ? "opacity-100 shadow-[0_0_0_2px_var(--color-purple-600),var(--shadow-md)]" : "opacity-75 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.photo} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-[80%_center]" />
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-purple-950/90 via-purple-950/30 to-transparent" />
                <span className="absolute inset-x-3 bottom-2.5 text-[14px] font-medium leading-tight text-white">{x.tab}</span>
              </button>
            );
          })}
        </div>

        <div id="journey-panel" role="tabpanel" aria-labelledby={`tab-${j.id}`} className="relative mt-5 overflow-hidden rounded-[32px] bg-purple-950 text-white">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={j.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="relative grid lg:min-h-[600px] lg:grid-cols-[1fr_auto]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={j.photo} alt={j.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover object-right" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-purple-950/90 via-purple-950/55 to-purple-950/20" />

              <div className="relative flex flex-col justify-between gap-10 p-7 sm:p-12">
                <div>
                  <h3 className="display max-w-[520px] text-[36px] sm:text-[48px]">{j.title}</h3>
                  <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-white/85">{j.body}</p>
                  {"film" in j && (
                    <a href={j.film} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex h-11 items-center rounded-full bg-white px-5 text-[15px] font-medium text-ink transition-colors duration-200 hover:bg-purple-50">
                      Watch their story
                    </a>
                  )}
                </div>
                <div className="max-w-[440px] space-y-2.5">
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45, ease: EASE }} className="glass ml-auto w-fit max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 text-[15px]">
                    {j.ask}
                  </motion.p>
                  <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.45, ease: EASE }} className="w-fit max-w-[92%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 text-[15px] leading-snug text-ink">
                    {j.answer}
                  </motion.p>
                </div>
              </div>

              <div className="relative flex items-end justify-center px-8 pt-2 lg:pr-14 lg:pt-12">
                <Phone src={j.screen} alt={j.screenAlt} width={264} className="-mb-28" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mt-4 text-center text-[13px] text-ink-3">Conversations are examples. App screens show sample data.</p>
      </div>
    </section>
  );
}
