"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useRef, useState } from "react";

import { EASE } from "./ui";
import { Film } from "./video";
import { WaitlistForm } from "./waitlist-form";

const A16Z_URL = "https://a16z.com/the-state-of-longevity/";

/** One quiet line above the page. Delete this component to remove it. */
export function TopLine() {
  return (
    <a href={A16Z_URL} target="_blank" rel="noopener noreferrer" className="group flex min-h-9 items-center justify-center gap-1.5 bg-purple-950 px-4 py-2 text-center text-[13px] text-purple-200">
      <span>
        a16z says the next big health companies will be a &ldquo;healthcare home&rdquo;. <span className="font-medium text-white underline decoration-white/30 underline-offset-4 group-hover:decoration-white">We&apos;re building India&apos;s</span>
      </span>
      <ArrowUpRight size={14} strokeWidth={1.5} className="shrink-0 text-white" />
    </a>
  );
}

const LINKS = [
  { href: "#for-you", label: "Who it's for" },
  { href: "#how", label: "How it works" },
  { href: "#medicines", label: "Medicine check" },
  { href: "#trust", label: "Is it safe" },
  { href: "#faq", label: "Questions" },
];

export function Nav() {
  const { scrollY } = useScroll();
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setStuck(v > 24));

  return (
    <header className="sticky top-0 z-40">
      <div className={`transition-[background-color,border-color,backdrop-filter] duration-200 ${stuck || open ? "border-b border-hair bg-white/80 backdrop-blur-xl backdrop-saturate-150" : "border-b border-transparent"}`}>
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2" aria-label="Cheeku, back to top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/face.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full bg-purple-100" />
            <span className="text-[18px] font-semibold tracking-tight">Cheeku</span>
          </a>
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-[15px] text-ink-2 transition-colors duration-150 hover:text-ink">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1">
            <a href="#join" className="inline-flex h-9 items-center rounded-[10px] bg-ink px-3.5 text-[14px] font-medium text-white transition-[background-color,transform] duration-150 ease-[var(--ease)] hover:bg-purple-700 active:scale-[0.97]">
              Join the waitlist
            </a>
            <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 cursor-pointer place-items-center rounded-[10px] text-ink md:hidden">
              {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: EASE }} className="border-t border-hair px-3 py-2 md:hidden">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-[10px] px-3 py-3 text-[16px] text-ink active:bg-purple-50">
                    {l.label}
                  </a>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

const FACTS = ["Lab tests at home in 12,000+ pincodes", "5,000+ doctors and specialists", "One file for everyone at home"];

export function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  const still = useReducedMotion();
  const x = useMotionValue(30);
  const y = useMotionValue(0);
  // The light on the purple stage follows the pointer, like light on glass.
  const light = useMotionTemplate`radial-gradient(520px circle at ${x}% ${y}%, rgb(255 255 255 / 0.16), transparent 60%)`;

  return (
    <div id="top">
      <section className="mx-auto max-w-[1200px] px-5 pb-12 pt-14 text-center sm:px-8 sm:pb-14 sm:pt-20">
        <motion.div initial={{ opacity: 0, y: still ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <p className="text-[15px] font-medium text-purple-600">For Indian families · Opening in small batches</p>
          <h1 className="h-display mx-auto mt-5 max-w-[900px] text-[42px] sm:text-[64px] lg:text-[76px]">
            Stop googling your <span className="text-purple-600">family&apos;s health</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[18px] leading-[1.55] text-ink-2 sm:text-[20px]">
            Send Cheeku any report or prescription. It explains it in simple words, remembers it for each person at home, and books the next test or doctor.
          </p>
          <div id="join" className="mt-8 scroll-mt-28">
            <WaitlistForm source="hero" center />
            <p className="text-[14px] text-ink-3">Free to join. No spam.</p>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-[1280px] px-3 sm:px-6">
        <motion.div
          ref={stage}
          initial={{ opacity: 0, y: still ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
          onPointerMove={(e) => {
            if (still || e.pointerType !== "mouse" || !stage.current) return;
            const r = stage.current.getBoundingClientRect();
            x.set(((e.clientX - r.left) / r.width) * 100);
            y.set(((e.clientY - r.top) / r.height) * 100);
          }}
          className="stage relative overflow-hidden rounded-[28px] px-4 pb-8 pt-4 sm:rounded-[40px] sm:px-10 sm:pb-12 sm:pt-10"
        >
          <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: light }} />
          <div className="glass-dark relative mx-auto max-w-[980px] rounded-[26px] p-1.5 sm:rounded-[30px] sm:p-2.5">
            <Film id="mI4FmQt_8Qk" title="Cheeku in two minutes" caption="See Cheeku in two minutes" />
          </div>
          <ul className="relative mx-auto mt-6 flex max-w-[980px] flex-col items-center justify-center gap-x-8 gap-y-2 text-[15px] text-purple-100 sm:mt-8 sm:flex-row">
            {FACTS.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-loud" />
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      </section>
    </div>
  );
}


