"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

import { useWarm } from "./img";
import { Phone } from "./phone";
import { Heading, Soon } from "./ui";

/*
 * Everything Cheeku does after a question, in the order a family meets it:
 * before the visit, after it, and every day in between. Each card is a real
 * app screen with sample data. The panel colours are the care ring's, so a
 * card about medicines is the same green as Medicines on the ring.
 */
type Card = { title: string; body: string; screen: string; alt: string; tint: string };

const CARDS: Card[] = [
  {
    title: "Before the visit, a note the doctor reads first",
    body: "A few questions, then one short note: what's wrong, since when, what you've tried, and the recent reports. Nobody repeats their story.",
    screen: "/screens/consult.webp",
    alt: "Cheeku asking a few questions before a doctor's appointment, to write a note for the doctor",
    tint: "#e4f5f7",
  },
  {
    title: "Reports, explained for that person",
    body: "What it means, what changed since last time, and what needs a doctor. In simple words, not lab language.",
    screen: "/screens/track.webp",
    alt: "An annual check-up read by Cheeku, showing which values need a doctor",
    tint: "#e8f1ff",
  },
  {
    title: "Tablets from three doctors, checked together",
    body: "Each doctor sees only their own prescription. Cheeku checks all of them for that person on ten standards, and tells you what to ask.",
    screen: "/screens/meds-a.webp",
    alt: "A prescription checked on ten standards for one person, with two things to sort",
    tint: "#e3f6ec",
  },
  {
    title: "Medicines delivered home",
    body: "Order the checked prescription for home delivery. The same salt at a lower price is there if you want it.",
    screen: "/screens/meds-order.webp",
    alt: "A prescription that passed all ten checks, with a button to order it for home delivery",
    tint: "#e3f6ec",
  },
  {
    title: "The next test, collected from home",
    body: "Booked in a tap, a collector at your door, and the report files itself under the right person when it's ready.",
    screen: "/screens/lab.webp",
    alt: "A home sample collection tracked from booking to report ready",
    tint: "#e8f1ff",
  },
  {
    title: "Every dose, for everyone",
    body: "Morning and night tablets for the whole family, ticked off as they're taken. Refills counted before they run out.",
    screen: "/screens/medicines.webp",
    alt: "Today's medicines by time of day, with refills counted",
    tint: "#e3f6ec",
  },
  {
    title: "One small step, every day",
    body: "A plan built from that person's own numbers. Today's tablets, one change to a meal, a walk. Nothing you can't do.",
    screen: "/screens/fit.webp",
    alt: "Cheeku's home screen with today's one step and the action plan",
    tint: "#fdeaf1",
  },
  {
    title: "Your watch and phone, read with your reports",
    body: "Steps, sleep, heart rate and workouts from Apple Health and Health Connect, Strava runs included. One summary a day, never minute by minute.",
    screen: "/screens/wearables.webp",
    alt: "A week of steps, sleep and heart rate from a watch, with sample data",
    tint: "#fff2d9",
  },
  {
    title: "A class picked for your numbers",
    body: "Gyms, yoga and studios near you, chosen from that person's health profile. One class at a time, no membership.",
    screen: "/screens/fitness.webp",
    alt: "Fitness classes near home, picked for someone on a sugar plan",
    tint: "#efebff",
  },
  {
    title: "One file for each person",
    body: "Every report, prescription and scan, kept under the right name for years. Find any of it in seconds.",
    screen: "/screens/health-file.webp",
    alt: "A family member's health file with their records, values and what's coming up",
    tint: "#efebff",
  },
  {
    title: "Know how everyone is doing",
    body: "Each person's doses today and anything that needs a call, even from another city.",
    screen: "/screens/parents.webp",
    alt: "The family care screen: each person's doses today and anything that needs a call",
    tint: "#efebff",
  },
  {
    title: "Your family's cover, in plain words",
    body: "Every policy in one place, what's left of the cover, and what it includes. Read from the policy you saved.",
    screen: "/screens/insurance.webp",
    alt: "The family's health insurance policy with the cover left this year",
    tint: "#fff2d9",
  },
];

const SOON = [
  ["Fitbit and Pixel Watch", "Straight from your Google account, for iPhone families"],
  ["Scan a meal or a label", "A plate of food or an ingredient list, explained for you"],
  ["Compare health cover", "Family insurance plans, side by side, in plain words"],
];

const STEP = 12;

/**
 * One card of the stack. As later cards arrive on top, this one settles back
 * a touch and its phone dims, so the pile reads as depth, not as a column of
 * identical edges.
 */
function StackCard({ c, i, progress, still }: { c: Card; i: number; progress: MotionValue<number>; still: boolean }) {
  const n = CARDS.length;
  const from = (i + 1) / (n + 1);
  const scale = useTransform(progress, [from, 1], [1, still ? 1 : 1 - (n - i) * 0.006]);
  const shade = useTransform(progress, [from, Math.min(1, from + 1 / (n + 1))], [0, still ? 0 : 0.03]);
  return (
    <motion.article
      className="sticky mb-6 grid origin-top overflow-hidden rounded-[32px] border border-hair bg-white shadow-[var(--shadow-md)] md:grid-cols-[1fr_420px]"
      style={{ top: `${96 + i * STEP}px`, scale }}
    >
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <h3 className="display max-w-[460px] text-[34px] sm:text-[44px]">{c.title}</h3>
        <p className="mt-4 max-w-[420px] text-[17px] leading-relaxed text-ink-2">{c.body}</p>
      </div>
      <div className="relative flex h-[340px] items-start justify-center overflow-hidden pt-10 md:h-[400px]" style={{ background: c.tint }}>
        <Phone src={c.screen} alt={c.alt} width={250} />
      </div>
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 bg-ink" style={{ opacity: shade }} />
    </motion.article>
  );
}

export function FollowThrough() {
  useWarm(CARDS.map((c) => c.screen));
  const ref = useRef<HTMLDivElement>(null);
  const still = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  return (
    <section id="follow-through" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="Before the visit, after it, and every day in between. An answer is not the end: Cheeku stays with it until the thing is done.">
        This is how <em>Cheeku follows through</em>
      </Heading>
      <div ref={ref} className="mt-14">
        {CARDS.map((c, i) => (
          <StackCard key={c.title} c={c} i={i} progress={scrollYProgress} still={still} />
        ))}
        <article className="sticky mb-6 overflow-hidden rounded-[32px] border border-purple-200 bg-purple-50 p-8 shadow-[var(--shadow-md)] sm:p-12" style={{ top: `${96 + CARDS.length * STEP}px` }}>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="display text-[34px] sm:text-[44px]">And next</h3>
            <Soon />
          </div>
          <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-3">
            {SOON.map(([t, d]) => (
              <li key={t} className="border-t border-purple-200 pt-5">
                <p className="text-[19px] font-medium">{t}</p>
                <p className="mt-1 text-[16px] leading-relaxed text-ink-2">{d}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>
      <p className="mt-4 text-center text-[13px] text-ink-3">App screens show sample data. Some bookings are still in preview.</p>
    </section>
  );
}
