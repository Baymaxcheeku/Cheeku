"use client";

import { Activity, ArrowRight, Baby, CalendarCheck, ChevronDown, FileText, FolderOpen, HeartHandshake, Languages, Menu, MessageCircle, PersonStanding, Pill, Sprout, Users, X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Img } from "./img";
import { Dots, Typed } from "./typed";
import { EASE, Marquee, PauseButton, usePause } from "./ui";

type Item = { icon: LucideIcon; title: string; line: string; href: string; tint: string };

/* Everything Cheeku does, as the menu lists it. Each goes to its place on this page. */
const DOES: Item[] = [
  { icon: FileText, title: "Reports explained", line: "In simple words, for that person", href: "#follow-through", tint: "bg-[#e8f1ff] text-[#1a5fb4]" },
  { icon: Pill, title: "Medicine check", line: "Every tablet, looked at together", href: "#follow-through", tint: "bg-[#fff0e3] text-[#b4560a]" },
  { icon: Users, title: "Family file", line: "One for each person at home", href: "#family", tint: "bg-purple-100 text-purple-700" },
  { icon: CalendarCheck, title: "Tests and doctors", line: "Booked, collected from home", href: "#follow-through", tint: "bg-[#e4f6ee] text-[#12754a]" },
  { icon: Activity, title: "Daily plan", line: "One small step, every day", href: "#follow-through", tint: "bg-[#fdeaf1] text-[#b0285f]" },
  { icon: MessageCircle, title: "Ask Cheeku", line: "By chat or by voice", href: "#ask", tint: "bg-purple-600 text-white" },
  { icon: Languages, title: "Your language", line: "Hindi, Hinglish, English and more", href: "#ask", tint: "bg-[#f3ecff] text-[#6b3fd4]" },
  { icon: HeartHandshake, title: "Family care", line: "Know how everyone is doing", href: "#for-you", tint: "bg-[#e6f5f7] text-[#136a78]" },
];

const FOR: Item[] = [
  { icon: PersonStanding, title: "Caring for parents", line: "Even from another city", href: "#for-you", tint: "bg-purple-100 text-purple-700" },
  { icon: Sprout, title: "Trying for a baby", line: "Every test, for both of you", href: "#for-you", tint: "bg-[#e4f6ee] text-[#12754a]" },
  { icon: HeartHandshake, title: "Expecting a baby", line: "Week by week", href: "#for-you", tint: "bg-[#fdeaf1] text-[#b0285f]" },
  { icon: Baby, title: "New parent", line: "Fevers, vaccines, 2 am questions", href: "#for-you", tint: "bg-[#fff0e3] text-[#b4560a]" },
  { icon: Activity, title: "Getting healthier", line: "See what actually changed", href: "#for-you", tint: "bg-[#e8f1ff] text-[#1a5fb4]" },
  { icon: FolderOpen, title: "Just keeping track", line: "Find any report in seconds", href: "#for-you", tint: "bg-[#f3ecff] text-[#6b3fd4]" },
];

const MENUS = [
  { id: "does", label: "What Cheeku does", items: DOES },
  { id: "for", label: "Who it's for", items: FOR },
] as const;

function Tile({ item, onGo }: { item: Item; onGo: () => void }) {
  return (
    <a href={item.href} onClick={onGo} className="group flex items-center gap-3.5 rounded-2xl p-2.5 transition-colors duration-150 hover:bg-soft">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${item.tint}`}>
        <item.icon size={20} strokeWidth={1.75} />
      </span>
      <span>
        <span className="block text-[15px] font-medium leading-tight text-ink">{item.title}</span>
        <span className="block text-[14px] leading-tight text-ink-3">{item.line}</span>
      </span>
    </a>
  );
}

/** White bar, two drop-down menus, one button. The menus open on click and on hover. */
export function Nav() {
  const { scrollY } = useScroll();
  const [raised, setRaised] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  useMotionValueEvent(scrollY, "change", (v) => setRaised(v > 8));

  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    const click = (e: MouseEvent) => bar.current && !bar.current.contains(e.target as Node) && setMenu(null);
    window.addEventListener("keydown", key);
    window.addEventListener("mousedown", click);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("mousedown", click);
    };
  }, [menu]);

  const open = (id: string) => {
    if (closing.current) clearTimeout(closing.current);
    setMenu(id);
  };
  const closeSoon = () => {
    closing.current = setTimeout(() => setMenu(null), 160);
  };
  const active = MENUS.find((m) => m.id === menu);

  return (
    <header className="sticky top-0 z-40">
      <div ref={bar} className={`relative bg-white/90 backdrop-blur-xl transition-shadow duration-200 ${raised || menu ? "shadow-[0_1px_0_var(--color-hair)]" : ""}`}>
        <nav aria-label="Main" className="mx-auto flex h-[68px] max-w-[1240px] items-center gap-8 px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[30px] leading-none text-ink" aria-label="Cheeku, back to top">
            <img src="/brand/cheeku-mark-flat.svg" alt="" width={34} height={34} className="size-[34px]" />
            Cheeku
          </a>
          <ul className="hidden items-center gap-1 lg:flex" onMouseLeave={closeSoon}>
            {MENUS.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-expanded={menu === m.id}
                  aria-controls={`menu-${m.id}`}
                  onClick={() => setMenu(menu === m.id ? null : m.id)}
                  onMouseEnter={() => open(m.id)}
                  className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[15px] font-medium transition-colors duration-150 ${menu === m.id ? "bg-soft text-ink" : "text-ink-2 hover:text-ink"}`}
                >
                  {m.label}
                  <ChevronDown size={15} strokeWidth={2} className={`transition-transform duration-200 ease-[var(--ease)] ${menu === m.id ? "rotate-180" : ""}`} />
                </button>
              </li>
            ))}
            <li>
              <a href="#faq" className="flex h-10 items-center rounded-full px-4 text-[15px] font-medium text-ink-2 transition-colors duration-150 hover:text-ink">
                Questions
              </a>
            </li>
          </ul>
          <div className="ml-auto flex items-center gap-1">
            <a href="#join" className="inline-flex h-11 items-center rounded-full bg-purple-600 px-5 text-[15px] font-medium text-white transition-[background-color,transform] duration-200 ease-[var(--ease)] hover:bg-purple-700 active:scale-[0.98]">
              Join the waitlist
            </a>
            <button type="button" aria-label={mobile ? "Close menu" : "Open menu"} aria-expanded={mobile} onClick={() => setMobile((v) => !v)} className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink lg:hidden">
              {mobile ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {active && (
            <motion.div
              id={`menu-${active.id}`}
              key={active.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: EASE }}
              onMouseEnter={() => open(active.id)}
              onMouseLeave={closeSoon}
              className="absolute inset-x-0 top-full hidden px-5 lg:block"
            >
              <div className="mx-auto grid max-w-[980px] grid-cols-[1fr_300px] gap-5 rounded-[28px] border border-hair bg-white p-4 shadow-[var(--shadow-lg)]">
                <div>
                  <ul className="grid grid-cols-2 gap-1">
                    {active.items.map((it) => (
                      <li key={it.title}>
                        <Tile item={it} onGo={() => setMenu(null)} />
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-6 border-t border-hair px-2.5 pt-4 text-[14px] text-ink-2">
                    <a href="#how" onClick={() => setMenu(null)} className="hover:text-ink">How it works</a>
                    <a href="#faq" onClick={() => setMenu(null)} className="hover:text-ink">Is it safe</a>
                    <a href="#film" onClick={() => setMenu(null)} className="hover:text-ink">Watch the film</a>
                  </div>
                </div>
                <a href="#ask" onClick={() => setMenu(null)} className="group flex flex-col overflow-hidden rounded-[20px] bg-soft">
                  <span className="relative block aspect-[16/10]">
                    <Img src="/video/cheeku-film-poster.webp" alt="" />
                  </span>
                  <span className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <span className="text-[15px] leading-snug text-ink-2">Ask about anyone in the family. Cheeku answers from their own reports, by chat or by voice.</span>
                    <span className="flex items-center gap-1.5 text-[15px] font-medium text-purple-700">
                      Ask Cheeku <ArrowRight size={16} strokeWidth={2} className="transition-transform duration-200 ease-[var(--ease)] group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mobile && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden border-t border-hair lg:hidden">
              <div className="max-h-[calc(100svh-68px)] overflow-y-auto px-3 py-3">
                {MENUS.map((m) => (
                  <div key={m.id} className="mb-3">
                    <p className="px-2.5 pb-1 text-[13px] font-medium text-ink-3">{m.label}</p>
                    <ul>
                      {m.items.map((it) => (
                        <li key={it.title}>
                          <Tile item={it} onGo={() => setMobile(false)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </motion.div>
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

/** The small exchange in the corner of the hero: one question, one answer, and where it came from. */
function HeroChat() {
  const [stage, setStage] = useState<"ask" | "think" | "answer">("ask");
  useEffect(() => {
    if (stage !== "think") return;
    const id = setTimeout(() => setStage("answer"), 800);
    return () => clearTimeout(id);
  }, [stage]);
  return (
    <div className="w-full max-w-[340px] space-y-2.5">
      <p className="ml-auto w-fit max-w-[88%] rounded-[20px] rounded-br-md bg-purple-600 px-4 py-2.5 text-[15px] leading-snug text-white shadow-[var(--shadow-md)]">
        <Typed text="Is Papa's sugar okay this time?" go speed={34} onDone={() => setStage((s) => (s === "ask" ? "think" : s))} />
      </p>
      <div className={`rounded-[20px] rounded-bl-md bg-white p-4 shadow-[var(--shadow-lg)] transition-opacity duration-300 ${stage === "ask" ? "opacity-0" : "opacity-100"}`}>
        <p className="text-[12px] font-medium text-ink-3">Cheeku · read 3 of Papa&apos;s reports</p>
        <p className="mt-1.5 text-[15px] leading-snug text-ink">{stage === "answer" ? <Typed text="A little higher than in March. Not urgent, but worth showing his doctor. Shall I book a home test for Saturday?" go speed={16} /> : <Dots />}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1 text-[12px] text-ink-2">
          <FileText size={13} strokeWidth={1.75} /> Blood report · 12 Oct
        </p>
      </div>
    </div>
  );
}

export function Hero() {
  const still = useReducedMotion();
  const { paused, toggle } = usePause();
  return (
    <div id="top">
      <section className="mx-auto max-w-[1400px] px-3 sm:px-5">
        <div className="relative flex flex-col lg:min-h-[620px] overflow-hidden rounded-[28px] bg-white ring-1 ring-hair sm:rounded-[36px] lg:ring-0 lg:h-[calc(100svh-96px)] lg:max-h-[820px]">
          {/* Wide screens: the photograph fills the card and the words sit on its bright wall. */}
          <div className="absolute inset-0 hidden lg:block">
            <Img src="/photos/hero.webp" alt="A young couple laughing with their little daughter and her grandmother on a sofa at home" priority position="object-right" />
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_right,white_0%,rgb(255_255_255/0.9)_26%,transparent_50%)]" />
          </div>
          {/* Phones: the photograph first, the words underneath on white. Nothing is written over a face. */}
          <div className="relative h-[300px] sm:h-[420px] lg:hidden">
            <Img src="/photos/hero.webp" alt="A young couple laughing with their little daughter and her grandmother on a sofa at home" priority position="object-[82%_center]" />
          </div>

          <a href="#join" className="relative ml-auto mr-4 mt-4 hidden items-center gap-3 rounded-2xl bg-white py-2 pl-2 pr-4 shadow-[var(--shadow-md)] transition-transform duration-200 ease-[var(--ease)] hover:-translate-y-0.5 sm:mr-6 sm:mt-6 lg:flex">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-loud font-[family-name:var(--font-display)] text-[20px] text-ink">C</span>
            <span>
              <span className="block text-[14px] font-medium leading-tight text-ink">Opening in small batches</span>
              <span className="flex items-center gap-1 text-[13px] leading-tight text-purple-700">
                Hold your family&apos;s place <ArrowRight size={13} strokeWidth={2} />
              </span>
            </span>
          </a>

          <div className="relative mt-auto grid items-end gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-14 lg:pt-10">
            <motion.div initial={{ opacity: 0, y: still ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
              <h1 className="display max-w-[560px] text-[46px] text-ink sm:text-[64px] lg:text-[76px]">
                You look after everyone. <em className="text-purple-700">Cheeku looks after it with you</em>
              </h1>
              <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]">
                Papa&apos;s reports. Ma&apos;s tablets. The baby&apos;s fever at 2 am. Cheeku keeps it all in one place, explains it in simple words, and gets the next test or doctor booked.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#join" className="inline-flex h-[54px] items-center rounded-full bg-loud px-7 text-[16px] font-medium text-ink shadow-[0_10px_24px_-10px_rgb(255_106_43/0.7)] transition-[background-color,transform] duration-200 ease-[var(--ease)] hover:bg-loud-hover active:scale-[0.98]">
                  Join the waitlist
                </a>
                <a href="#film" className="inline-flex h-[54px] items-center rounded-full bg-white px-7 text-[16px] font-medium text-ink shadow-[var(--shadow-sm)] ring-1 ring-hair transition-[background-color,transform] duration-200 ease-[var(--ease)] hover:bg-soft active:scale-[0.98]">
                  See how it works
                </a>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: still ? 0 : 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }} className="hidden lg:block">
              <HeroChat />
            </motion.div>
          </div>
        </div>
      </section>

      <div className={`mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-5 sm:px-8 ${paused ? "paused" : ""}`}>
        <PauseButton paused={paused} onToggle={toggle} label="the moving line" />
        <Marquee label="What Cheeku covers" className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          {LINE.map(([a, b]) => (
            <p key={a} className="flex shrink-0 items-baseline gap-2.5 pr-14 text-[15px]">
              <span className="font-medium text-ink">{a}</span>
              <span className="text-ink-3">{b}</span>
            </p>
          ))}
        </Marquee>
      </div>
    </div>
  );
}
