"use client";

import { AlertTriangle, CalendarCheck, Check, FileText, Pill, TrendingUp } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

import { Mascot } from "./mascot";
import { EASE, Words } from "./ui";
import { WaitlistForm } from "./waitlist-form";

/** A glass card that drifts with the pointer; `depth` sets how far. */
function Floater({ mx, my, depth, className, delay, children }: { mx: MotionValue<number>; my: MotionValue<number>; depth: number; className: string; delay: number; children: React.ReactNode }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div className={`absolute ${className}`} style={{ x, y }}>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.9, delay, ease: EASE }}
      >
        <div className="glass animate-float rounded-3xl p-4 shadow-[var(--shadow-float)]" style={{ animationDelay: `${-delay * 3}s` }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function TrendCard() {
  const still = useReducedMotion();
  return (
    <div className="w-[236px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-violet text-[12px] font-bold text-brand-700">P</span>
          <div>
            <p className="text-[12px] font-semibold leading-none">Papa · HbA1c</p>
            <p className="mt-1 text-[11px] leading-none text-ink-500">4 reports, 3 labs</p>
          </div>
        </div>
        <span className="rounded-full bg-caution-bg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-caution">Climbing</span>
      </div>
      <svg viewBox="0 0 220 74" className="mt-3 w-full" aria-hidden>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff6a2b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" x2="220" y1="42" y2="42" stroke="#9696ae" strokeDasharray="3 5" strokeWidth="1" />
        <text x="220" y="37" textAnchor="end" fontSize="8" fill="#9696ae">
          healthy range
        </text>
        <motion.path d="M4 60 C40 58 52 54 76 50 S120 40 146 30 S196 14 216 8 L216 74 L4 74 Z" fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9, duration: 0.8 }} />
        <motion.path
          d="M4 60 C40 58 52 54 76 50 S120 40 146 30 S196 14 216 8"
          fill="none"
          stroke="#ff6a2b"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={still ? undefined : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 1.1, duration: 1.4, ease: EASE }}
        />
        {[
          [4, 60],
          [76, 50],
          [146, 30],
          [216, 8],
        ].map(([cx, cy], i) => (
          <motion.circle key={i} cx={cx} cy={cy} r="3.5" fill="white" stroke="#ff6a2b" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2 + i * 0.3, type: "spring", bounce: 0.5 }} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-ink-300">
        <span>Sep &rsquo;25</span>
        <span>5.9</span>
        <span className="font-semibold text-loud-deep">6.8 now</span>
      </div>
    </div>
  );
}

function RxCard() {
  const rows = [
    { name: "Telmisartan 40", ok: true },
    { name: "Metformin 500", ok: true },
    { name: "Ibuprofen 400", ok: false },
  ];
  return (
    <div className="w-[214px]">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white">
          <Pill size={14} />
        </span>
        <p className="text-[12px] font-semibold">Ma&apos;s prescription, checked</p>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r, i) => (
          <motion.li
            key={r.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 + i * 0.18, duration: 0.5, ease: EASE }}
            className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[12px] ${r.ok ? "bg-mist" : "bg-caution-bg"}`}
          >
            <span className="font-medium">{r.name}</span>
            {r.ok ? <Check size={14} className="text-safe" strokeWidth={3} /> : <AlertTriangle size={14} className="text-caution" />}
          </motion.li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] font-semibold leading-snug text-caution">1 question for her doctor</p>
    </div>
  );
}

function BookedCard() {
  return (
    <div className="flex w-[232px] items-center gap-3">
      <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-loud text-ink">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-loud" />
        <CalendarCheck size={18} className="relative" />
      </span>
      <div>
        <p className="text-[12px] font-semibold leading-tight">Home test booked</p>
        <p className="mt-0.5 text-[11px] leading-tight text-ink-500">Sat, 8:00 am · sample from home</p>
      </div>
    </div>
  );
}

function ChatCard() {
  return (
    <div className="w-[226px]">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/face.png" alt="" className="h-6 w-6 rounded-full bg-lilac" />
        <p className="text-[11px] font-semibold text-brand-700">Cheeku · 7:42 am</p>
      </div>
      <p className="mt-2 text-[13px] leading-snug">
        Papa&apos;s sugar has crept up across four reports. It&apos;s still early. A repeat test is due this month.{" "}
        <span className="font-semibold text-brand-700">Shall I book it?</span>
      </p>
    </div>
  );
}

function FiledChip() {
  return (
    <div className="flex items-center gap-2 pr-1">
      <FileText size={15} className="text-brand-600" />
      <p className="text-[12px] font-medium">
        Report read. <span className="text-ink-500">Filed under Papa.</span>
      </p>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const still = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 18, mass: 0.6 });
  const my = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.6 });
  const spotX = useMotionValue(50);
  const spotY = useMotionValue(30);
  const spot = useTransform([spotX, spotY], ([a, b]) => `radial-gradient(560px circle at ${a}% ${b}%, rgba(138,130,245,0.22), transparent 62%)`);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : -90]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);
  const orb = useTransform(scrollYProgress, [0, 1], [1, still ? 1 : 1.18]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative -mt-[68px] overflow-hidden pt-[68px]"
      onPointerMove={(e) => {
        if (still || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        rawX.set((nx - 0.5) * 2);
        rawY.set((ny - 0.5) * 2);
        spotX.set(nx * 100);
        spotY.set(ny * 100);
      }}
    >
      {/* Backdrop: lilac wash, faint grid, a light that follows the pointer. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-lilac via-mist to-canvas" />
      <div aria-hidden className="grid-fade absolute inset-0" />
      <motion.div aria-hidden className="absolute inset-0" style={{ background: spot }} />

      <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6 lg:pb-28 lg:pt-20 [&>*]:min-w-0">
        <motion.div style={{ y: lift, opacity: fade }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/15 bg-white/70 py-1 pl-1 pr-3 text-[13px] font-medium text-ink-700 backdrop-blur">
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Invite only</span>
              <span>Early access opens in small batches<span className="hidden sm:inline">, 2027</span></span>
            </span>
          </motion.div>

          <h1 className="display mt-6 text-[44px] sm:text-[64px] lg:text-[76px]">
            <Words text="India lives to 71." delay={0.1} />
            <br />
            <Words text="In good health," delay={0.3} />{" "}
            <span className="serif-accent whitespace-nowrap text-brand-600">
              <Words text="only till 60." delay={0.48} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
            className="mt-6 max-w-[540px] text-[18px] leading-[1.55] text-ink-700 sm:text-[19px]"
          >
            Those ten years aren&apos;t lost in hospitals. They&apos;re lost in the 90 days between doctor visits, when nobody is watching.{" "}
            <span className="font-semibold text-ink">Cheeku watches.</span> One health memory for your whole family that reads every report, checks every prescription and books the next step.
          </motion.p>

          <motion.div id="join" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.9, ease: EASE }} className="mt-8 scroll-mt-28">
            <WaitlistForm source="hero" pick />
            <p className="pl-5 text-[13px] text-ink-500">Built with ₹0 raised. Care partners live in 12,000+ pincodes. No spam, ever.</p>
          </motion.div>
        </motion.div>

        {/* The picture: Cheeku at the centre, the family's health moving around him. */}
        <motion.div style={{ scale: orb }} className="relative mx-auto h-[400px] w-full max-w-[560px] sm:h-[540px]">
          <div aria-hidden className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-violet to-violet-deep/60" />
            <div className="absolute -inset-[9%] rounded-full border border-brand-600/10" />
            <div className="absolute -inset-[20%] animate-spin-slow rounded-full border border-dashed border-brand-600/15" />
            <div className="absolute -inset-[20%] animate-spin-slow">
              <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-loud shadow-[0_0_0_6px_rgba(255,106,43,0.18)]" />
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
            className="absolute left-1/2 top-1/2 h-[62%] w-[52%] -translate-x-1/2 -translate-y-[40%]"
          >
            <Mascot pose="wave" still="idle-still" className="h-full w-full drop-shadow-[0_24px_30px_rgba(42,31,107,0.25)]" />
          </motion.div>

          <Floater mx={mx} my={my} depth={-26} delay={0.8} className="left-[-6%] top-[0%] hidden sm:block">
            <TrendCard />
          </Floater>
          <Floater mx={mx} my={my} depth={34} delay={1.0} className="right-[-7%] top-[6%] hidden sm:block">
            <RxCard />
          </Floater>
          <Floater mx={mx} my={my} depth={-40} delay={1.25} className="bottom-[9%] left-[-4%] hidden sm:block">
            <ChatCard />
          </Floater>
          <Floater mx={mx} my={my} depth={22} delay={1.45} className="bottom-[2%] right-[2%] hidden sm:block">
            <BookedCard />
          </Floater>

          {/* Phones: two cards only, held inside the frame. */}
          <Floater mx={mx} my={my} depth={0} delay={0.8} className="left-0 top-0 sm:hidden">
            <FiledChip />
          </Floater>
          <Floater mx={mx} my={my} depth={0} delay={1.1} className="bottom-0 right-0 sm:hidden">
            <BookedCard />
          </Floater>
        </motion.div>
      </div>
    </section>
  );
}
