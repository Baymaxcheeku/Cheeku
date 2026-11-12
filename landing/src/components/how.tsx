"use client";

import { Check, FileText, Loader2, Pill, ScanLine } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Img } from "./img";
import { Dots, Typed } from "./typed";
import { EASE, Heading, Reveal } from "./ui";
import { LocalFilm } from "./video";

/*
 * HOW IT WORKS, PLAYED OUT.
 *
 * Each card acts out its step once, when it scrolls into view, a beat after
 * the one before it, so the three read as one story: the report is read and
 * filed, Cheeku explains it, the test gets booked. With Reduce Motion on,
 * every card shows its finished state straight away.
 */

/*
 * Cards that come on screen together play one after another; a card that
 * scrolls in on its own (on a phone) starts straight away.
 */
const GAP_MS = 2200;
let nextStart = 0;

/** Runs a card's scene once it is on screen: returns the step it has reached. */
function useScene(steps: readonly number[]) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-15% 0px" });
  const still = useReducedMotion() ?? false;
  const [step, setStep] = useState(still ? steps.length : 0);
  useEffect(() => {
    if (!seen || still) {
      if (still) setStep(steps.length);
      return;
    }
    const now = Date.now();
    const start = Math.max(now, nextStart);
    nextStart = start + GAP_MS;
    let t = start - now;
    const ids = steps.map((ms, i) => {
      t += ms;
      return setTimeout(() => setStep(i + 1), t);
    });
    return () => ids.forEach(clearTimeout);
    // The steps are fixed per card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, still]);
  return { ref, step, still };
}

const card = "glass-white rounded-[20px]";

/* 1. Send it: a light passes over the page, the report is read, then filed under Papa. */
function SendScene() {
  // 0 waiting · 1 reading · 2 filed · 3 the second row arrives
  const { ref, step, still } = useScene([300, 1500, 700]);
  return (
    <div ref={ref} className="absolute inset-0">
      {!still && step === 1 && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,rgb(185_173_249/0.45),transparent)] mix-blend-screen"
          initial={{ top: "8%" }}
          animate={{ top: "62%" }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
        />
      )}
      <div className="absolute inset-x-3 bottom-3">
        <ul className={`${card} divide-y divide-hair px-4`}>
          <li className="flex items-center gap-3 py-3">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <AnimatePresence mode="wait" initial={false}>
                {step >= 2 ? (
                  <motion.span key="file" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                    <FileText size={16} strokeWidth={1.75} />
                  </motion.span>
                ) : (
                  <motion.span key="scan" exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <ScanLine size={16} strokeWidth={1.75} className={step === 1 ? "animate-pulse" : ""} />
                  </motion.span>
                )}
              </AnimatePresence>
              {step === 2 && <motion.span aria-hidden className="absolute inset-0 rounded-xl ring-2 ring-purple-300" initial={{ opacity: 0.9, scale: 1 }} animate={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.6, ease: EASE }} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] leading-tight text-ink-3">{step >= 2 ? "Just now" : step === 1 ? "Reading the report…" : "New photo"}</span>
              {step >= 2 ? (
                <span className="block text-[15px] font-medium leading-tight text-ink">
                  <Typed text="Blood report, filed under Papa" go speed={20} />
                </span>
              ) : (
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-purple-50">
                  <motion.span className="block h-full rounded-full bg-purple-500" initial={{ width: "0%" }} animate={{ width: step === 1 ? "100%" : "0%" }} transition={{ duration: step === 1 ? 1.4 : 0, ease: "easeInOut" }} />
                </span>
              )}
            </span>
            {step >= 2 && (
              <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 20, delay: 0.5 }} className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-purple-600 text-white">
                <Check size={12} strokeWidth={3} />
              </motion.span>
            )}
          </li>
          <AnimatePresence initial={false}>
            {step >= 3 && (
              <motion.li key="rx" className="flex items-center gap-3 overflow-hidden" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} transition={{ duration: 0.45, ease: EASE }}>
                <span className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
                    <Pill size={16} strokeWidth={1.75} />
                  </span>
                  <span>
                    <span className="block text-[12px] leading-tight text-ink-3">Yesterday</span>
                    <span className="block text-[15px] font-medium leading-tight text-ink">Prescription, filed under Ma</span>
                  </span>
                </span>
              </motion.li>
            )}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

/* 2. Understand it: Cheeku reads, then explains, and marks the words that matter. */
function UnderstandScene() {
  // 0 waiting · 1 reading (dots) · 2 typing · 3 underline
  const { ref, step, still } = useScene([200, 1100, 2600]);
  const lead = "Her sugar is ";
  const mark = "a little higher";
  const rest = " than last year. Not urgent. Worth asking her doctor at the next visit.";
  return (
    <div ref={ref} className="absolute inset-x-3 bottom-3">
      <div className={`${card} p-4`}>
        <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-purple-600 text-[9px] font-semibold text-white">C</span>
          About Ma&apos;s report
        </p>
        <div className="relative mt-1 min-h-[63px] text-[15px] leading-snug text-ink">
          {step <= 1 ? (
            <span className="block pt-1">{step === 1 ? <Dots /> : null}</span>
          ) : step === 2 && !still ? (
            <Typed text={lead + mark + rest} go speed={24} />
          ) : (
            <p>
              {lead}
              <span className="relative isolate inline-block">
                {mark}
                <motion.span aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[0.45em] origin-left rounded-sm bg-[#ffd9c4]" initial={{ scaleX: still ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, ease: EASE }} />
              </span>
              {rest}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* 3. Get it done: the button is pressed, it books, and the test lands on Saturday. */
function DoneScene() {
  // 0 button · 1 pressed · 2 booking · 3 booked
  const { ref, step } = useScene([500, 260, 1100]);
  return (
    <div ref={ref} className="absolute inset-x-3 bottom-3">
      <AnimatePresence mode="wait" initial={false}>
        {step < 3 ? (
          <motion.div
            key="book"
            className={`${card} flex items-center justify-between gap-3 p-3 pl-4`}
            exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
          >
            <span>
              <span className="block text-[12px] leading-tight text-ink-3">Fasting sugar test, at home</span>
              <span className="block text-[15px] font-medium leading-tight text-ink">Saturday, 8 to 9 am</span>
            </span>
            <motion.span
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-medium text-white"
              animate={{ scale: step === 1 ? 0.94 : 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 24 }}
            >
              {step >= 2 ? <Loader2 size={15} className="animate-spin" /> : null}
              {step >= 2 ? "Booking" : "Book"}
            </motion.span>
          </motion.div>
        ) : (
          <motion.div key="done" className={`${card} flex items-center gap-3 p-4`} initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.35, ease: EASE }}>
            <span className="relative grid h-10 w-10 shrink-0 place-items-center">
              <motion.span aria-hidden className="absolute inset-0 rounded-full bg-loud/40" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 0.8, ease: EASE }} />
              <motion.span className="relative grid h-10 w-10 place-items-center rounded-full bg-loud text-ink" initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 16 }}>
                <Check size={18} strokeWidth={2.5} />
              </motion.span>
            </span>
            <span>
              <span className="block text-[15px] font-medium leading-tight text-ink">Home test booked</span>
              <span className="block text-[13px] leading-tight text-ink-3">
                <Typed text="Saturday, 8 to 9 am · collector assigned" go speed={18} />
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STEPS = [
  {
    title: "Send it",
    body: "A photo, a PDF, or share it straight from WhatsApp. Reports, prescriptions, scans and bills.",
    photo: "/photos/send.webp",
    alt: "Hands photographing a printed lab report on a dining table",
    pos: "object-center",
    Scene: SendScene,
  },
  {
    title: "Understand it",
    body: "Cheeku tells you what it means for that person, in plain words, and what changed since last time.",
    photo: "/photos/understand.webp",
    alt: "A grandmother smiling as she reads a sheet of paper by a sunny window",
    pos: "object-top",
    Scene: UnderstandScene,
  },
  {
    title: "Get it done",
    body: "Need a test or a doctor? Book it in the app. The sample is collected from home and the result files itself.",
    photo: "/photos/act.webp",
    alt: "A lab technician with a sample kit greeting a woman at her front door",
    pos: "object-top",
    Scene: DoneScene,
  },
];

export function How() {
  return (
    <section id="how" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="No learning curve. If you can forward a WhatsApp message, you can use Cheeku.">
        How it <em>works</em>
      </Heading>
      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-5">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <li className="group list-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                <div className="absolute inset-0 transition-transform duration-700 ease-[var(--ease)] group-hover:scale-[1.03]">
                  <Img src={s.photo} alt={s.alt} position={s.pos} />
                </div>
                <s.Scene />
              </div>
              <h3 className="display mt-6 text-center text-[30px]">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-[320px] text-center text-[16px] leading-relaxed text-ink-2">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/** The product film, where the hero's second button lands. */
export function FilmSection() {
  return (
    <section id="film" className="bg-soft">
      <div className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
        <Heading sub="Everything Cheeku does for one family, start to finish.">
          See it in <em>two minutes</em>
        </Heading>
        <Reveal className="mx-auto mt-12 max-w-[1040px] rounded-[32px] bg-white p-2 shadow-[var(--shadow-lg)] sm:p-3">
          <LocalFilm src="/video/cheeku-film.mp4" poster="/video/cheeku-film-poster.webp" title="Cheeku, in two minutes" />
        </Reveal>
      </div>
    </section>
  );
}
