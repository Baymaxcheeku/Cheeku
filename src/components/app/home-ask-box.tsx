"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

/**
 * The Ask Baymax entry on Home.
 *
 * It does not answer here — it carries the question into /ask, where the safety
 * gate runs before anything is sent. Answering inline would mean a second place
 * that has to remember to run the gate, and the one guarantee that must never
 * depend on a developer remembering is that one.
 */
export function HomeAskBox() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = value.trim();
    router.push(question ? `/ask?q=${encodeURIComponent(question)}` : "/ask");
  }

  return (
    <section className="relative mx-5 mt-5 overflow-hidden rounded-card bg-gradient-to-br from-brand-100 to-brand-50 p-4">
      {/* Art sits behind the text, so the heading keeps its own gutter. */}
      <Image
        src="/illustrations/home-ask.png"
        alt=""
        width={261}
        height={187}
        className="pointer-events-none absolute -right-2 top-0 h-[104px] w-auto object-contain"
      />

      <div className="relative pr-[34%]">
        <h2 className="flex items-center gap-1.5 text-[19px] font-bold text-ink-900">
          Ask Baymax
          <Sparkles size={16} className="text-brand-500" aria-hidden />
        </h2>
        <p className="mt-1 text-[12px] leading-snug text-ink-700">
          Get answers about your reports, medicines, and health.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="relative mt-3 flex items-center gap-2 rounded-pill bg-surface p-1.5 pl-4 shadow-e1"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask anything…"
          aria-label="Ask Baymax a question"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
        />
        <button
          type="submit"
          aria-label="Ask"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand-500 text-surface"
        >
          <ArrowUp size={17} aria-hidden />
        </button>
      </form>
    </section>
  );
}
