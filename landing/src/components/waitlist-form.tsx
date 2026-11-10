"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

import { joinWaitlist } from "@/lib/waitlist";

import { EASE } from "./ui";

/** The one form on the page: an email, a button, and an honest result. */
export function WaitlistForm({ source, onPurple = false, center = false }: { source: string; onPurple?: boolean; center?: boolean }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy") return;
    setError(null);
    setState("busy");
    const r = await joinWaitlist(email, "family", source);
    if (r.ok) {
      setSaved(r.saved);
      setState("done");
    } else {
      setError(r.message);
      setState("idle");
    }
  }

  return (
    <div className={`w-full max-w-[480px] ${center ? "mx-auto" : ""}`}>
      <AnimatePresence mode="wait" initial={false}>
        {state === "done" ? (
          <motion.div
            key="done"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={`flex h-14 items-center gap-3 rounded-full px-5 ${onPurple ? "glass text-white" : "bg-purple-50 text-ink"}`}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-loud text-ink">
              <Check size={16} strokeWidth={2.5} />
            </span>
            <p className="text-[15px] font-medium">
              You&apos;re on the list. We&apos;ll email your invite
              {!saved && <span className={`ml-2 text-[13px] font-normal ${onPurple ? "text-white/70" : "text-ink-3"}`}>(preview, not saved)</span>}
            </p>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div
              className={`flex h-14 items-center gap-2 rounded-full p-1.5 pl-6 transition-shadow duration-200 focus-within:ring-2 ${
                onPurple ? "bg-white focus-within:ring-loud" : "bg-white shadow-[var(--shadow-md)] ring-1 ring-hair focus-within:ring-purple-600"
              }`}
            >
              <label htmlFor={`${id}-email`} className="sr-only">
                Your email
              </label>
              <input
                id={`${id}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                className="w-0 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="submit"
                disabled={state === "busy"}
                className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-loud px-4 text-[15px] font-medium text-ink transition-[background-color,transform] duration-150 ease-[var(--ease)] hover:bg-loud-hover active:scale-[0.97] disabled:cursor-wait sm:px-5"
              >
                Join the waitlist
                {state === "busy" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} strokeWidth={2} />}
              </button>
            </div>
            <p id={`${id}-error`} aria-live="polite" className={`min-h-5 pt-2 text-[13px] font-medium ${center ? "text-center" : "pl-1"} ${onPurple ? "text-[#ffc7b0]" : "text-[#c0261c]"}`}>
              {error}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
