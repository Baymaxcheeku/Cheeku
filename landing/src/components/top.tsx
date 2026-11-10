"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useState } from "react";

import { EASE, Marquee, PauseButton, PillLink, usePause } from "./ui";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#for-you", label: "Who it's for" },
  { href: "#follow-through", label: "What it does" },
  { href: "#faq", label: "Questions" },
];

/** A floating pill: clear over the photograph, white once the page scrolls. */
export function Nav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setSolid(v > 80));
  const light = solid || open;

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className={`mx-auto max-w-[1180px] rounded-[28px] transition-[background-color,box-shadow,backdrop-filter] duration-300 ${light ? "glass-white" : ""}`}>
        <nav aria-label="Main" className="flex h-14 items-center justify-between pl-6 pr-2">
          <a href="#top" className={`font-[family-name:var(--font-display)] text-[26px] leading-none transition-colors duration-300 ${light ? "text-ink" : "text-white"}`} aria-label="Cheeku, back to top">
            Cheeku
          </a>
          <ul className="hidden items-center gap-8 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={`text-[14px] transition-colors duration-200 ${light ? "text-ink-2 hover:text-ink" : "text-white/85 hover:text-white"}`}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1">
            <a
              href="#join"
              className={`inline-flex h-10 items-center rounded-full px-5 text-[14px] font-medium transition-[background-color,color,transform] duration-200 ease-[var(--ease)] active:scale-[0.98] ${light ? "bg-ink text-white hover:bg-purple-700" : "bg-white text-ink hover:bg-purple-50"}`}
            >
              Join the waitlist
            </a>
            <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className={`grid h-10 w-10 cursor-pointer place-items-center rounded-full md:hidden ${light ? "text-ink" : "text-white"}`}>
              {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden px-3 md:hidden">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-3 py-3 text-[17px] text-ink active:bg-purple-50">
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="h-2" />
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

const LINE = [
  ["12,000+ pincodes", "Tests collected at home"],
  ["5,000+ doctors", "On video or at the clinic"],
  ["One file each", "For everyone in the family"],
  ["Every report", "Explained in simple words"],
];

export function Hero() {
  const still = useReducedMotion();
  const { paused, toggle } = usePause();
  return (
    <section id="top" className="relative flex h-svh min-h-[660px] flex-col justify-end overflow-hidden bg-purple-950 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/photos/hero.webp" alt="A woman showing her father something on her phone, at home in the evening" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[72%_center]" />
      {/* The left and the foot of the photograph are darkened so the words always read. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-purple-950/85 via-purple-950/35 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-purple-950/90 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: still ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
        className="relative mx-auto w-full max-w-[1180px] px-6 pb-10 sm:pb-14"
      >
        <h1 className="display max-w-[760px] text-[52px] sm:text-[76px] lg:text-[92px]">
          Between doctor visits, <em>your family has Cheeku</em>
        </h1>
        <p className="mt-5 max-w-[500px] text-[17px] leading-relaxed text-white/90 sm:text-[19px]">
          It reads every report and prescription, explains them in simple words, and gets the next test or doctor booked. For everyone at home.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PillLink href="#join" tone="loud">
            Join the waitlist
          </PillLink>
          <PillLink href="#film" tone="glass">
            Watch the film
          </PillLink>
        </div>
      </motion.div>

      <div className={`relative border-t border-white/15 ${paused ? "paused" : ""}`}>
        <div className="mx-auto flex max-w-[1180px] items-center gap-4 px-6 py-4">
          <PauseButton paused={paused} onToggle={toggle} label="the moving line" onDark />
          <Marquee label="What Cheeku covers" className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            {LINE.map(([a, b]) => (
              <p key={a} className="flex shrink-0 items-baseline gap-2.5 pr-14 text-[15px]">
                <span className="font-medium text-white">{a}</span>
                <span className="text-white/70">{b}</span>
              </p>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
