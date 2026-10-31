"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUp,
  Camera,
  FileText,
  History,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";

import { Paywall } from "@/components/billing/paywall";
import { MascotBust } from "@/components/illustrations";
import { EmergencyEscalation } from "@/components/safety/emergency-escalation";
import { ProductAssessmentCard } from "@/components/ai/product-assessment-card";
import { ProductPicker } from "@/components/ai/product-picker";
import { cn } from "@/lib/cn";
import { askAboutProduct, askCheeku, recordEscalation, type ChatTurn } from "@/lib/ai/actions";
import { FREE_CHAT_LIMIT } from "@/lib/billing/plans";
import { detect, type SafetyResult } from "@/lib/safety/detect";

/*
 * E1 / E2 — Ask Cheeku.
 *
 * The safety gate runs HERE, in the browser, before anything is sent. Rule 2
 * requires it to be deterministic and under 200ms, and a network round trip can
 * promise neither. It is the first statement in `send()` for the same reason
 * there is only one send path: a second way to reach the model would be a
 * second place to forget the gate.
 *
 * Three kinds of answer can come back (see answer.ts): grounded in the active
 * profile's own records and cited, general information on a known health
 * topic (optionally folding in something the reader's own Health profile
 * already says), or silent when neither applies. The product-photo path
 * (`sendProduct`) is a fourth, separate shape — a fixed demo scenario rather
 * than free text, so it skips the gate entirely; see scenarios.ts.
 *
 * The frames answer these questions with a diagnosis and a drug dosage; that
 * is not reproduced in any of the four paths, and the reasoning is recorded in
 * PROGRESS.md.
 */

const STARTERS = [
  { text: "What do my recent reports say?", icon: FileText },
  { text: "Has anything changed since last time?", icon: History },
  { text: "Is running safe during pregnancy?", icon: Activity },
] as const;

export function AskChat({
  initialQuestion,
  autoOpenPicker = false,
  profileName,
}: {
  initialQuestion?: string;
  /** Set when Home's camera button sent someone here to photograph something. */
  autoOpenPicker?: boolean;
  profileName: string;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [escalation, setEscalation] = useState<SafetyResult | null>(null);
  /*
   * The question that hit the quota wall. Held here rather than cleared, so it
   * can be sent the moment the plan activates — losing what someone typed and
   * making them retype it after paying is what turns a paywall into a toll
   * booth. `sendRef` lets the paywall's callback reach the current `send`
   * without making `send` a dependency of its own definition.
   */
  const [blockedQuestion, setBlockedQuestion] = useState<string | null>(null);
  /*
   * Sticky, unlike `blockedQuestion`. Closing the tray without subscribing
   * clears the held question but must NOT clear this — otherwise the composer
   * looks fully functional again while every send is still refused, and the
   * reader has no way back to the plans except by hitting the wall a second
   * time. The card stays until a plan actually activates.
   */
  const [limitReached, setLimitReached] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, start] = useTransition();

  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, pending]);

  // Runs once: a later re-render (e.g. closing the picker) must not reopen it.
  useEffect(() => {
    if (autoOpenPicker) setPickerOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await askCheeku(text, conversationId, status);
      if (!result.ok) {
        if (result.quota) {
          // Not an error — hold the question, show the card, open the plans.
          setBlockedQuestion(text);
          setLimitReached(true);
          setTrayOpen(true);
          return;
        }
        setError(result.message);
        setDraft(text);
        return;
      }
      setConversationId(result.conversationId);
      setTurns((t) => [...t, result.user, result.assistant]);
    });
  }

  /*
   * The photo-scenario path. No safety gate runs here — the question text is
   * fixed, server-side copy chosen for the scenario, not something a reader
   * typed, so there is nothing for the gate to have caught.
   */
  function sendProduct(scenarioId: string) {
    if (pending) return;
    setPickerOpen(false);
    setError(null);
    start(async () => {
      const result = await askAboutProduct(scenarioId, conversationId, "clear");
      if (!result.ok) {
        if (result.quota) {
          /*
           * Same treatment as a text question. There is no held question to
           * resend here — the scenario is picked, not typed — so the tray gets
           * no `pendingQuestion` and the reader lands back on the picker rather
           * than being told to go find the Profile tab.
           */
          setLimitReached(true);
          setTrayOpen(true);
          return;
        }
        setError(result.message);
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
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-brand-100 px-5 pb-5 pt-3">
        <div
          aria-hidden
          className="glow-pulse pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-pill bg-brand-300/50 blur-2xl"
        />
        <div className="relative pr-[34%]">
          <h1 className="flex items-center gap-1.5 text-[26px] font-bold leading-tight tracking-tight text-ink-900">
            Ask Cheeku
            <Stethoscope size={18} className="text-brand-500" aria-hidden />
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-700">
            {profileName}&apos;s records, plus general health topics
          </p>
        </div>
        <MascotBust className="pointer-events-none absolute -right-3 -top-1 w-[136px]" />

        <p className="relative mt-4 flex items-center gap-2.5 rounded-pill bg-surface px-3.5 py-2.5 shadow-e1">
          <ShieldCheck size={16} className="shrink-0 text-brand-500" aria-hidden />
          <span className="text-[12px] leading-snug text-ink-500">
            <strong className="font-semibold text-ink-900">Private &amp; secure.</strong> Your health
            data is never shared.
          </span>
        </p>
      </header>

      <div className="flex-1 px-5 py-4">
        {turns.length === 0 && !pending ? (
          <ul className="grid grid-cols-1 gap-2">
            {STARTERS.map(({ text, icon: Icon }) => (
              <li key={text}>
                <button
                  type="button"
                  onClick={() => send(text)}
                  className="tappable flex w-full items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 text-left shadow-e1 active:scale-[0.99]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand-50 text-brand-600">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="text-[14px] font-medium text-ink-700">{text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="space-y-3">
          <AnimatePresence initial={false}>
          {turns.map((turn) =>
            turn.role === "user" ? (
              <motion.li
                key={turn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] space-y-1.5">
                  {turn.attachment ? (
                    <div className="ml-auto w-fit rounded-card rounded-br-md bg-brand-50 p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
                      <img
                        src={turn.attachment.thumbnail}
                        alt={turn.attachment.title}
                        className="h-20 w-20 rounded-tile object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="rounded-card rounded-br-md bg-brand-600 px-4 py-2.5 text-[14px] leading-relaxed text-white">
                    {turn.content}
                  </p>
                </div>
              </motion.li>
            ) : (
              <motion.li
                key={turn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-2"
              >
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-50">
                  <Stethoscope size={14} className="text-brand-600" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 rounded-card rounded-bl-md bg-surface p-3.5 shadow-e1">
                  {turn.assessment ? (
                    <ProductAssessmentCard assessment={turn.assessment} />
                  ) : (
                    <>
                      {turn.content.split("\n\n").map((p, i) => (
                        <p
                          key={i}
                          className={cn("text-[14px] leading-relaxed text-ink-700", i > 0 && "mt-2")}
                        >
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

                      {turn.kind === "silent" ? (
                        <p className="mt-3 flex items-start gap-2 rounded-tile bg-caution-bg px-3 py-2 text-[11px] leading-snug text-caution-text">
                          <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
                          Cheeku only answers from your saved documents or general topics it knows, and
                          this one is outside both.
                        </p>
                      ) : turn.kind === "general" ? (
                        <p className="mt-3 flex items-start gap-2 rounded-tile bg-brand-50 px-3 py-2 text-[11px] leading-snug text-brand-700">
                          <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
                          General information, not read from any of your saved documents.
                        </p>
                      ) : null}
                    </>
                  )}

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
              </motion.li>
            ),
          )}

          {pending ? (
            <motion.li
              key="pending"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2"
            >
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-50">
                <Stethoscope size={14} className="text-brand-600" aria-hidden />
              </span>
              <p className="flex items-center gap-2 rounded-card rounded-bl-md bg-surface px-4 py-3 text-[13px] text-ink-500 shadow-e1">
                <Loader2 size={14} className="animate-spin text-brand-500" aria-hidden />
                Thinking…
              </p>
            </motion.li>
          ) : null}
          </AnimatePresence>

          {/*
           * The wall, in the transcript rather than only in a modal. A sheet
           * that has been dismissed leaves no trace of why the composer stopped
           * working; this stays put, explains it once, and is the way back to
           * the plans.
           */}
          {limitReached ? (
            <li>
              <LimitCard
                pendingQuestion={blockedQuestion}
                onOpen={() => setTrayOpen(true)}
              />
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
          className="flex items-center gap-2 rounded-pill bg-surface p-1.5 pl-4 shadow-e1 ring-1 ring-transparent transition-shadow focus-within:ring-brand-300"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your reports…"
            aria-label="Ask Cheeku a question"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300"
          />
          <button
            type="button"
            aria-label="Check a product's safety"
            disabled={pending}
            onClick={() => setPickerOpen(true)}
            className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill text-ink-500 active:scale-90 disabled:opacity-40"
          >
            <Camera size={18} aria-hidden />
          </button>
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
          Cheeku gives helpful information, not medical advice.
        </p>
      </div>

      {escalation ? (
        <EmergencyEscalation result={escalation} onDismiss={() => setEscalation(null)} />
      ) : null}

      {pickerOpen ? (
        <ProductPicker onChoose={sendProduct} onClose={() => setPickerOpen(false)} />
      ) : null}

      <Paywall
        open={trayOpen}
        reason="quota"
        pendingQuestion={blockedQuestion ?? undefined}
        onClose={() => {
          // Closing without paying returns the question to the composer rather
          // than discarding it. `limitReached` deliberately survives.
          if (blockedQuestion) setDraft(blockedQuestion);
          setBlockedQuestion(null);
          setTrayOpen(false);
        }}
        onActivated={() => {
          const question = blockedQuestion;
          setBlockedQuestion(null);
          setTrayOpen(false);
          setLimitReached(false);
          if (question) send(question);
        }}
      />
    </div>
  );
}

/**
 * The in-chat limit notice. Mirrors the frame's copy, and shows the held
 * question back so it is visibly not lost.
 */
function LimitCard({
  pendingQuestion,
  onOpen,
}: {
  pendingQuestion: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-brand-200 bg-brand-50 p-4">
      <MascotBust className="pointer-events-none absolute -right-4 -top-3 w-[92px] opacity-90" />

      <div className="relative pr-[24%]">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-700">
          <Lock size={11} aria-hidden />
          Free limit reached
        </span>
        <h2 className="mt-2 text-[17px] font-bold leading-tight text-ink-900">
          You&apos;ve reached your free chat limit
        </h2>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-500">
          Free users get {FREE_CHAT_LIMIT} chats a month. Pick a plan to keep the conversation going
          including a ₹29 day pass.
        </p>
      </div>

      {pendingQuestion ? (
        <p className="relative mt-3 rounded-tile border border-brand-200 bg-surface p-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-300">
            Your question is saved
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[12px] italic text-ink-700">
            &ldquo;{pendingQuestion}&rdquo;
          </span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        className="tappable relative mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[14px] font-semibold text-white active:scale-[0.98]"
      >
        <Sparkles size={15} aria-hidden />
        See plans
      </button>
    </div>
  );
}
