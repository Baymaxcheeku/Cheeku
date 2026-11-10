"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

import { joinWaitlist, type Audience } from "@/lib/waitlist";

import { EASE, Magnetic } from "./ui";

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "family", label: "My family" },
  { key: "business", label: "My company" },
  { key: "investor", label: "I invest" },
];

const DONE: Record<Audience, string> = {
  family: "You're on the list. We'll write when your family's invite is ready.",
  business: "Got it. One of the founders will write to you within two working days.",
  investor: "Thank you. A founder will send the deck and a time to talk.",
};

/**
 * The one form on the page. `audience` fixes who is signing up (the investor
 * and business sections); without it the person picks.
 */
export function WaitlistForm({ audience, source, cta = "Get early access", tone = "light", pick = false }: { audience?: Audience; source: string; cta?: string; tone?: "light" | "dark"; pick?: boolean }) {
  const id = useId();
  const [who, setWho] = useState<Audience>(audience ?? "family");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dark = tone === "dark";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setError(null);
    setState("busy");
    const r = await joinWaitlist(email, who, source);
    if (r.ok) {
      setSaved(r.saved);
      setState("done");
    } else {
      setError(r.message);
      setState("idle");
    }
  }

  return (
    <div className="w-full max-w-[520px]">
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <motion.div
            key="done"
            role="status"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`flex items-center gap-3 rounded-2xl p-4 ${dark ? "bg-white/10 text-white" : "glass text-ink"}`}
          >
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-loud text-ink"
            >
              <Check size={18} strokeWidth={3} />
            </motion.span>
            <p className="text-[15px] font-medium leading-snug">
              {DONE[who]}
              {!saved && <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${dark ? "bg-white/15" : "bg-lilac text-brand-700"}`}>Preview, not saved</span>}
            </p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
            {pick && !audience && (
              <div role="radiogroup" aria-label="Who is this for?" className={`mb-3 inline-flex rounded-full p-1 ${dark ? "bg-white/10" : "bg-white/70 ring-1 ring-line"}`}>
                {AUDIENCES.map((a) => {
                  const on = a.key === who;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setWho(a.key)}
                      className={`relative cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200 ${on ? (dark ? "text-ink" : "text-white") : dark ? "text-white/70 hover:text-white" : "text-ink-500 hover:text-ink"}`}
                    >
                      {on && <motion.span layoutId={`${id}-pill`} className={`absolute inset-0 rounded-full ${dark ? "bg-white" : "bg-brand-600"}`} transition={{ type: "spring", bounce: 0.2, duration: 0.45 }} />}
                      <span className="relative">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div
              className={`group flex items-center gap-2 rounded-full p-1.5 pl-5 transition-shadow duration-300 focus-within:ring-2 ${
                dark ? "bg-white/10 ring-1 ring-white/20 focus-within:ring-loud" : "bg-white shadow-[var(--shadow-float)] ring-1 ring-line focus-within:ring-brand-600"
              }`}
            >
              <label htmlFor={`${id}-email`} className="sr-only">
                Email address
              </label>
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={who === "family" ? "you@email.com" : "you@company.com"}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className={`w-0 min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none ${dark ? "text-white placeholder:text-white/45" : "text-ink placeholder:text-ink-300"}`}
              />
              <Magnetic strength={0.2}>
                <button
                  type="submit"
                  disabled={state === "busy"}
                  className="group/btn relative inline-flex h-12 cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-loud px-5 text-[15px] font-semibold text-ink shadow-[var(--shadow-loud)] transition-[transform,background-color] duration-150 ease-out hover:bg-[#ff7a40] active:scale-[0.97] disabled:cursor-wait"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-out group-hover/btn:translate-x-full" />
                  <span className="relative whitespace-nowrap">{cta}</span>
                  {state === "busy" ? <Loader2 size={17} className="relative animate-spin" /> : <ArrowRight size={17} className="relative transition-transform duration-200 ease-out group-hover/btn:translate-x-0.5" />}
                </button>
              </Magnetic>
            </div>
            <div aria-live="polite" className="min-h-[22px] pl-5 pt-2">
              {error && (
                <p id={`${id}-error`} className={`text-[13px] font-medium ${dark ? "text-[#ffb59a]" : "text-danger"}`}>
                  {error}
                </p>
              )}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
