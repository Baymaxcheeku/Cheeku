"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

import { A16Z_URL } from "./chrome";
import { Mascot } from "./mascot";
import { Reveal, Section, Words } from "./ui";
import { WaitlistForm } from "./waitlist-form";

export function FinalCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const rise = useTransform(scrollYProgress, [0, 1], [80, 0]);
  const grow = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  return (
    <div ref={ref} className="relative overflow-hidden bg-gradient-to-b from-canvas via-lilac to-violet">
      <div aria-hidden className="grid-fade absolute inset-0" />
      <Section className="pb-10 pt-24 text-center sm:pt-32">
        <motion.div style={{ y: rise, scale: grow }} className="mx-auto h-[190px] w-[150px]">
          <Mascot pose="cheer" still="cheer-still" className="h-full w-full drop-shadow-[0_20px_24px_rgba(42,31,107,0.22)]" />
        </motion.div>
        <h2 className="display mx-auto mt-6 max-w-[820px] text-[42px] sm:text-[72px]">
          <Words text="Give your family" /> <span className="serif-accent text-brand-600"><Words text="those ten years back." delay={0.2} /></span>
        </h2>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-[520px] text-[18px] leading-relaxed text-ink-700">
            We&apos;re letting families in a few at a time so every one of them gets it right. Join the list and we&apos;ll hold your place.
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-8 flex flex-col items-center">
          <WaitlistForm source="footer" pick />
        </Reveal>
      </Section>

      <footer className="relative mx-auto max-w-[1200px] px-5 pb-10 pt-16 sm:px-8">
        <div className="flex flex-col gap-8 border-t border-brand-600/15 pt-8 md:flex-row md:justify-between">
          <div className="max-w-[420px]">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mascot/face.png" alt="" className="h-8 w-8 rounded-full bg-white" />
              <span className="text-[17px] font-semibold tracking-tight">
                Cheeku <span className="text-brand-600">AI</span>
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-700">
              Cheeku does not diagnose, prescribe or replace your doctor. It helps you understand your family&apos;s records and take the next step. In an emergency, call your local emergency number.
            </p>
          </div>
          <div className="max-w-[560px] text-[12px] leading-relaxed text-ink-500">
            <p className="font-semibold text-ink-700">Sources</p>
            <p className="mt-1">
              WHO life expectancy and healthy life expectancy estimates for India (2019). ICMR-INDIAB, Lancet Diabetes &amp; Endocrinology (2023). UNFPA India Ageing Report (2023). National Health Accounts (2021-22). National Health Authority, ABHA. OpenAI.{" "}
              <a href={A16Z_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                a16z, The State of Longevity (2026)
              </a>
              . 1 crore is 10 million. Product screens are illustrations with sample data.
            </p>
          </div>
        </div>
        <p className="mt-8 text-[12px] text-ink-500">© 2026 Cheeku AI. Made in India, for India.</p>
      </footer>
    </div>
  );
}
