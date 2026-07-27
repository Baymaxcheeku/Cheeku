"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, FileText, Loader2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";

import { MascotBust } from "@/components/illustrations";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { cn } from "@/lib/cn";
import { askBaymax, recordEscalation, type ChatTurn } from "@/lib/ai/actions";
import { detect, type SafetyResult } from "@/lib/safety/detect";

/*
 * E1 / E2 — Ask Baymax.
 *
 * The safety gate runs HERE, in the browser, before anything is sent. Rule 2
 * requires it to be deterministic and under 200ms, and a network round trip can
 * promise neither. It is the first statement in `send()` for the same reason
 * there is only one send path: a second way to reach the model would be a
 * second place to forget the gate.
 *
 * The answer is grounded in the active profile's records and cites them. The
 * frames answer these questions with a diagnosis and a drug dosage; that is not
 * reproduced, and the reasoning is recorded in PROGRESS.md.
 */

const STARTERS = [
  "What do my recent reports say?",
  "Has anything changed since last time?",
  "What is in my records?",
];

export function AskChat({
  initialQuestion,
  profileName,
}: {
  initialQuestion?: string;
  profileName: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    /*
     * THE GATE. Before the transcript, before the network, before anything.
     */
    const verdict = detect(text);
    if (verdict.status === "escalate") {
      setDraft("");
      setEscalation(verdict);
      // The question still enters the transcript, flagged. An escalation that
      // leaves no record is not auditable.
      void recordEscalation(text, conversationId).then((r) => {
        if (r.conversationId) setConversationId(r.conversationId);
      });
      return;
    }

    setDraft("");
    setError(null);
    // Captured before the closure: TypeScript's narrowing from the early
    // return above does not survive into an async callback.
    const status = verdict.status;
    start(async () => {
      const result = await askBaymax(text, conversationId, status);
      if (!result.ok) {
        setError(result.message);
        setDraft(text);
        return;
      }
      setConversationId(result.conversationId);
      setTurns((t) => [...t, result.user, result.assistant]);
    });
  }

  // A question carried in from Home's ask box, sent once on arrival.
  useEffect(() => {
    if (initialQuestion && !sentInitial.current) {
      sentInitial.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative overflow-hidden px-5 pt-3">
        <div className="relative pr-[34%]">
          <h1 className="flex items-center gap-1.5 text-[26px] font-bold leading-tight tracking-tight text-ink-900">
            Ask Baymax
            <Sparkles size={18} className="text-brand-500" aria-hidden />
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Answers from {profileName}&apos;s records
          </p>
        </div>
        <MascotBust className="pointer-events-none absolute -right-2 -top-1 w-[124px]" />
      </header>

      <p className="mx-5 mt-3 flex items-center gap-2.5 rounded-card bg-surface px-3.5 py-2.5 shadow-e1">
        <ShieldCheck size={16} className="shrink-0 text-brand-500" aria-hidden />
        <span className="text-[12px] leading-snug text-ink-500">
          <strong className="font-semibold text-ink-900">Private &amp; secure.</strong> Your health
          data is never shared.
        </span>
      </p>

      <div className="flex-1 px-5 py-4">
        {turns.length === 0 && !pending ? (
          <ul className="space-y-2">
            {STARTERS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => send(s)}
                  className="tappable w-full rounded-card border border-line bg-surface px-4 py-3 text-left text-[14px] text-ink-700 active:scale-[0.99]"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="space-y-3">
          {turns.map((turn) =>
            turn.role === "user" ? (
              <li key={turn.id} className="flex justify-end">
                <p className="max-w-[80%] rounded-card rounded-br-md bg-brand-600 px-4 py-2.5 text-[14px] leading-relaxed text-white">
                  {turn.content}
                </p>
              </li>
            ) : (
              <li key={turn.id} className="flex gap-2">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-50">
                  <Sparkles size={14} className="text-brand-600" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 rounded-card rounded-bl-md bg-surface p-3.5 shadow-e1">
                  {turn.content.split("\n\n").map((p, i) => (
                    <p key={i} className={cn("text-[14px] leading-relaxed text-ink-700", i > 0 && "mt-2")}>
                      {p}
                    </p>
                  ))}

                  {/*
                   * The frames put journal papers here. These are the reader's
                   * own documents, and each one opens — a citation that cannot
                   * be checked is decoration.
                   */}
                  {turn.citations.length > 0 ? (
                    <div className="mt-3 rounded-tile bg-canvas p-3">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                        From your records
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {turn.citations.map((c, i) => (
                          <li key={c.documentId}>
                            <Link
                              href={`/records/${c.documentId}`}
                              className="tappable flex items-center gap-2 text-[12px] font-medium text-brand-700 active:scale-[0.99]"
                            >
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-brand-600 text-[10px] font-bold text-white">
                                {i + 1}
                              </span>
                              <span className="truncate underline underline-offset-2">{c.label}</span>
                              <FileText size={13} className="shrink-0" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {!turn.grounded ? (
                    <p className="mt-3 flex items-start gap-2 rounded-tile bg-caution-bg px-3 py-2 text-[11px] leading-snug text-caution-text">
                      <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
                      Baymax only answers from your saved documents, so this one is outside what it
                      can see.
                    </p>
                  ) : null}

                  {turn.followUps.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {turn.followUps.map((chip) => (
                        <li key={chip}>
                          <button
                            type="button"
                            onClick={() => send(chip)}
                            className="tappable rounded-pill border border-line bg-canvas px-3 py-1.5 text-[11px] font-medium text-ink-700 active:scale-95"
                          >
                            {chip}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ),
          )}

          {pending ? (
            <li className="flex gap-2">
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-50">
                <Sparkles size={14} className="text-brand-600" aria-hidden />
              </span>
              <p className="flex items-center gap-2 rounded-card rounded-bl-md bg-surface px-4 py-3 text-[13px] text-ink-500 shadow-e1">
                <Loader2 size={14} className="animate-spin text-brand-500" aria-hidden />
                Reading your records…
              </p>
            </li>
          ) : null}
        </ul>

        <div ref={endRef} />
      </div>

      {error ? (
        <p role="alert" className="mx-5 mb-2 text-[13px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}

      <div className="sticky bottom-0 border-t border-line bg-canvas px-5 pb-2 pt-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2 rounded-pill border border-line bg-surface p-1.5 pl-4"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your reports…"
            aria-label="Ask Baymax a question"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={pending || !draft.trim()}
            className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand-600 text-white active:scale-90 disabled:opacity-40"
          >
            <ArrowUp size={17} aria-hidden />
          </button>
        </form>
        <p className="mt-1.5 text-center text-[11px] text-ink-300">
          Baymax gives helpful information, not medical advice.
        </p>
      </div>

      {escalation ? (
        <EmergencyEscalation result={escalation} onDismiss={() => setEscalation(null)} />
      ) : null}
    </div>
  );
}
