"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Camera, Stethoscope } from "lucide-react";

import { MascotBust } from "@/components/illustrations";
import { cn } from "@/lib/cn";

/*
 * Three prompts, not a generic hint list — each names the moment this card
 * actually exists for: a worried result, a product safety check, an
 * unfamiliar medicine. Rotating in real questions did more to sell "this
 * remembers your history" than any copy could.
 */
const PROMPTS = [
  "Is this safe during pregnancy?",
  "What does my last report mean?",
  "Explain this medicine to me",
] as const;

/**
 * The Ask Baymax entry on Home.
 *
 * It does not answer here — it carries the question into /ask, where the safety
 * gate runs before anything is sent. Answering inline would mean a second place
 * that has to remember to run the gate, and the one guarantee that must never
 * depend on a developer remembering is that one.
 *
 * Given the most space and the first scroll-stop after the insight card: for
 * an anxious or pregnant user this box — not the record list — is the reason
 * they opened the app.
 */
export function HomeAskBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    router.push(question ? `/ask?q=${encodeURIComponent(question)}` : "/ask");
  }

  function ask(prompt: string) {
    router.push(`/ask?q=${encodeURIComponent(prompt)}`);
  }

  /*
   * Carries the typed question along, so photographing a product mid-thought
   * ("is this cream safe—") does not throw away what was already typed.
   */
  function openUpload() {
    const question = value.trim();
    const params = new URLSearchParams({ upload: "1" });
    if (question) params.set("q", question);
    router.push(`/ask?${params.toString()}`);
  }

  return (
    <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-gradient-to-br from-brand-100 via-brand-50 to-brand-100 p-5 shadow-e1">
      {/* Ambient glow, behind the mascot, breathing — "alive and listening". */}
      <div
        aria-hidden
        className="glow-pulse pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-pill bg-brand-300/50 blur-2xl"
      />
      <MascotBust className="pointer-events-none absolute -right-3 top-0 w-[148px]" />

      <div className="relative pr-[36%]">
        <h2 className="flex items-center gap-1.5 text-[21px] font-bold text-ink-900">
          Ask Baymax
          <Stethoscope size={17} className="text-brand-500" aria-hidden />
        </h2>
        <p className="mt-1.5 text-[13px] leading-snug text-ink-700">
          Hi, I&apos;m Baymax, your personalised healthcare companion.
        </p>
      </div>

      <form
        onSubmit={submit}
        className={cn(
          "relative mt-4 flex items-center gap-2 overflow-hidden rounded-pill bg-surface p-1.5 pl-4 shadow-e1 ring-1 ring-transparent transition-shadow",
          focused && "ring-brand-300",
        )}
      >
        {/* One-time light sweep, so the box reads as inviting on arrival
            without becoming a permanent distraction. */}
        <span
          aria-hidden
          className="sheen-once pointer-events-none absolute inset-y-0 left-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/70 to-transparent"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask anything…"
          aria-label="Ask Baymax a question"
          className="relative min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 outline-none placeholder:text-ink-300"
        />
        <button
          type="button"
          aria-label="Upload a photo to ask about"
          onClick={openUpload}
          className="tappable relative grid h-9 w-9 shrink-0 place-items-center rounded-pill text-brand-600 active:scale-90"
        >
          <Camera size={18} aria-hidden />
        </button>
        <button
          type="submit"
          aria-label="Ask"
          className="tappable relative grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-brand-500 text-surface active:scale-90"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
      </form>

      <ul className="relative mt-3 flex flex-wrap gap-1.5">
        {PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => ask(prompt)}
              className="tappable rounded-pill bg-surface/80 px-3 py-1.5 text-[12px] font-medium text-brand-700 shadow-e1 active:scale-95"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
