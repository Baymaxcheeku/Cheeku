"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { PillLink } from "./ui";

const KEPT = [
  "Papa’s sugar report", "Ma’s BP tablets", "Tara’s vaccine card", "The thyroid test, 2024", "Dadi’s eye check-up", "Your last full checkup",
  "The scan at week 12", "Papa’s heart doctor", "Ma’s knee X-ray", "The fever in March", "Your allergy to dust", "Iron tablets, since June",
  "The test due this month", "Last year’s cholesterol", "The baby’s weight", "Dr. Rao’s advice", "Ma’s morning dose", "The discharge papers",
  "Papa’s walking, daily", "Your sleep this week", "The dentist, in May", "Tara’s next vaccine", "The bill from the lab", "What the doctor said",
];

/*
 * The one authored moment. The page holds still while a wheel of everything
 * Cheeku remembers turns past, driven by the scroll.
 */
export function Memory() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const turn = useTransform(scrollYProgress, [0, 1], [38, -112]);
  const step = 360 / KEPT.length;

  return (
    <section ref={ref} className="relative bg-purple-100" style={{ height: still ? "auto" : "220vh" }}>
      <div className={`${still ? "relative py-24" : "sticky top-0 h-screen"} flex items-center overflow-hidden`}>
        {/* A soft purple light where the wheel's centre sits, off the left edge. */}
        <div aria-hidden className="absolute left-0 top-1/2 h-[140vh] w-[70vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-purple-600),rgb(138_130_245/0.55)_45%,transparent_72%)]" />

        {!still && (
          <motion.div aria-hidden className="absolute left-0 top-1/2 hidden h-0 w-0 md:block" style={{ rotate: turn }}>
            {KEPT.map((k, n) => (
              <span
                key={k}
                className="absolute left-0 top-0 origin-left whitespace-nowrap font-[family-name:var(--font-display)] text-[26px] leading-none text-purple-950/80"
                style={{ transform: `translateY(-50%) rotate(${n * step}deg) translateX(min(34vw, 470px))` }}
              >
                {k}
              </span>
            ))}
          </motion.div>
        )}

        <div className="relative mx-auto w-full max-w-[1180px] px-6">
          <div className="md:ml-auto md:max-w-[520px]">
            <h2 className="display text-[40px] text-ink sm:text-[56px]">
              Nothing about your family <em>gets forgotten</em>
            </h2>
            <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">
              Every report, tablet and doctor&apos;s word, kept under the right person, for years. Your family&apos;s records are yours. Nothing is shared without your yes, and you can delete anything, any time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PillLink href="#join" tone="ink">
                Join the waitlist
              </PillLink>
              <PillLink href="#faq" tone="outline">
                Is it safe?
              </PillLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
