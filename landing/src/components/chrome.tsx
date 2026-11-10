"use client";

import Lenis from "lenis";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useState } from "react";

import { EASE, Magnetic } from "./ui";

export const A16Z_URL = "https://a16z.com/the-state-of-longevity/";

/** Inertia scrolling, off when the person has asked for less motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: { offset: -88 } });
    let raf = 0;
    const tick = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}

/** The thin strip above everything: the a16z thesis, and why it matters here. */
export function AnnouncementBar() {
  return (
    <a
      href={A16Z_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative z-50 flex min-h-10 items-center justify-center gap-2 overflow-hidden bg-brand-950 px-4 py-2 text-center text-[13px] leading-snug text-violet"
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-[1400ms] ease-out group-hover:translate-x-[400%]" />
      <span className="hidden shrink-0 rounded-full bg-loud px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-ink sm:inline">New thesis</span>
      <span>
        <span className="font-semibold text-white">a16z, The State of Longevity:</span> &ldquo;value will migrate to the companies that can figure out the action layer.&rdquo;{" "}
        <span className="whitespace-nowrap font-semibold text-white underline decoration-white/30 underline-offset-4 transition-colors group-hover:decoration-loud">
          We&apos;re building India&apos;s. Read it
          <ArrowUpRight size={14} className="ml-0.5 inline transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </span>
    </a>
  );
}

const LINKS = [
  { href: "#gap", label: "The 90 days" },
  { href: "#families", label: "For families" },
  { href: "#product", label: "How it works" },
  { href: "#business", label: "For employers" },
  { href: "#investors", label: "For investors" },
];

export function Nav() {
  const { scrollY, scrollYProgress } = useScroll();
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.3 });
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (v) => setStuck(v > 48));

  return (
    <header className="sticky top-0 z-40">
      <motion.div aria-hidden className="absolute inset-x-0 top-0 z-10 h-[2px] origin-left bg-loud" style={{ scaleX: bar }} />
      <div className="mx-auto max-w-[1240px] px-3 pt-3 sm:px-6">
        <nav
          aria-label="Main"
          className={`flex h-14 items-center justify-between rounded-full pl-4 pr-2 transition-[background-color,box-shadow,border-color] duration-300 ${
            stuck || open ? "glass" : "border border-transparent bg-transparent"
          }`}
        >
          <a href="#top" className="flex items-center gap-2.5" aria-label="Cheeku AI, back to top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/face.png" alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-lilac object-cover" />
            <span className="text-[17px] font-semibold tracking-tight">
              Cheeku <span className="text-brand-600">AI</span>
            </span>
            <span className="ml-1 hidden items-center gap-1.5 rounded-full bg-lilac px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-700 lg:inline-flex">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-loud opacity-70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-loud" />
              </span>
              In stealth
            </span>
          </a>
          <ul className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="group relative rounded-full px-3 py-2 text-[14px] font-medium text-ink-700 transition-colors duration-200 hover:text-ink">
                  {l.label}
                  <span className="absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-brand-600 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            <Magnetic strength={0.25}>
              <a
                href="#join"
                className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-brand-600 active:scale-[0.97]"
              >
                Get early access
              </a>
            </Magnetic>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition-transform duration-150 active:scale-95 md:hidden"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE }}
              className="glass mt-2 origin-top rounded-3xl p-2 md:hidden"
            >
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3 text-[16px] font-medium text-ink active:bg-lilac">
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
