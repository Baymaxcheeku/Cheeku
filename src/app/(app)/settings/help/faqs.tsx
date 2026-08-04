"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "Is my health data shared with anyone?",
    a: "No. Baymax never sells your data and never shares it outside your family. Only you can access your family's health information.",
  },
  {
    q: "Can Baymax diagnose or prescribe anything?",
    a: "No. Baymax explains what's in your own records and never invents a diagnosis, a dosage or a treatment. For medical decisions, always talk to a doctor.",
  },
  {
    q: "What happens if I switch to a paid plan?",
    a: "Solo unlocks unlimited Ask Baymax chats for one profile. Family adds up to four members and shared insights. You can cancel anytime from your Profile screen.",
  },
  {
    q: "How do I delete my account?",
    a: "Open Profile → Security & privacy → Manage your data, or scroll to the bottom of your Profile screen. Deleting removes every record, file and message. It cannot be undone.",
  },
] as const;

export function Faqs() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="mt-5 px-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">FAQs</h2>
      <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
        {FAQS.map((faq, i) => {
          const expanded = open === i;
          return (
            <li key={faq.q} className={i > 0 ? "border-t border-line" : undefined}>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="tappable flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink-900">
                  {faq.q}
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "shrink-0 text-ink-300 transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {expanded ? (
                <p className="px-3.5 pb-3.5 text-[12.5px] leading-relaxed text-ink-500">{faq.a}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
