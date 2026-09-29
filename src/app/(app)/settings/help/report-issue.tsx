"use client";

import { useState, useTransition } from "react";
import {
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FilePenLine,
  Heart,
  Lightbulb,
  Send,
  Sparkles,
  TriangleAlert,
  UserCircle,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { SUPPORT_RESPONSE } from "@/lib/app-meta";
import { submitSupportTicket, type SettingsResult } from "@/lib/settings/actions";

const CATEGORIES = [
  ["bug", "Report a bug"],
  ["not_working", "App not working"],
  ["billing", "Subscription & billing"],
  ["account", "Account help"],
  ["feature", "Feature request"],
  ["other", "Something else"],
] as const;

type Category = (typeof CATEGORIES)[number][0];

/** The four tiles from the frame, each opening the form on its own category. */
const TOPICS: readonly {
  category: Category;
  icon: typeof Bug;
  tint: string;
  title: string;
  body: string;
}[] = [
  {
    category: "bug",
    icon: Bug,
    tint: "bg-brand-50 text-brand-600",
    title: "Report a bug",
    body: "Something isn't working right?",
  },
  {
    category: "not_working",
    icon: TriangleAlert,
    tint: "bg-caution-bg text-caution-text",
    title: "App not working",
    body: "Crashes, errors or loading issues?",
  },
  {
    category: "billing",
    icon: CreditCard,
    tint: "bg-safe-bg text-safe-text",
    title: "Subscription & billing",
    body: "Plans, payments or refunds?",
  },
  {
    category: "account",
    icon: UserCircle,
    tint: "bg-brand-50 text-brand-600",
    title: "Account help",
    body: "Login, profile or other support?",
  },
];

/**
 * The interactive half of Help & Support: the four topic tiles, the
 * report-a-problem panel, and the form itself.
 *
 * All of it lives in one component because the tiles and the panel open the
 * same sheet with different preselected categories — splitting them would mean
 * lifting that state somewhere it doesn't belong, or setting state during a
 * render, which is how a "tapped once, opened twice" bug gets in.
 *
 * The form writes a real row (see `submitSupportTicket`). The frame's version
 * of this button went nowhere, which is the one thing a support form must never
 * do.
 */
export function HelpSupportTools() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("bug");
  const [result, setOutcome] = useState<Extract<SettingsResult, { ok: false }> | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openWith(next: Category) {
    setCategory(next);
    setOutcome(null);
    setSentId(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setOutcome(null);
    setSentId(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOutcome(null);
    const formData = new FormData(event.currentTarget);
    formData.set("category", category);
    start(async () => {
      const outcome = await submitSupportTicket(formData);
      if (outcome.ok) setSentId(outcome.ticketId ?? "sent");
      else setOutcome(outcome);
    });
  }

  return (
    <>
      <section className="mt-5 px-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Top help topics
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.category}
              type="button"
              onClick={() => openWith(topic.category)}
              className="tappable rounded-card bg-surface p-3.5 text-left shadow-e1 active:scale-[0.98]"
            >
              <span className={cn("grid h-9 w-9 place-items-center rounded-tile", topic.tint)}>
                <topic.icon size={17} aria-hidden />
              </span>
              <span className="mt-2 block text-[13px] font-semibold leading-tight text-ink-900">
                {topic.title}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">
                {topic.body}
              </span>
              <ChevronRight size={14} className="mt-1.5 text-ink-300" aria-hidden />
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Report a bug or problem
        </h2>

        <div className="mt-2 rounded-card bg-brand-50 p-4 ring-1 ring-brand-100">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
              <FilePenLine size={19} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink-900">Let us know what went wrong</p>
              <p className="mt-0.5 text-[12px] leading-snug text-ink-500">
                Help us improve Cheeku AI by sharing as much detail as you can.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openWith("bug")}
            className="tappable mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[14px] font-semibold text-white active:scale-[0.98]"
          >
            <Send size={15} aria-hidden />
            Report an issue
          </button>

          <ul className="mt-3 grid grid-cols-3 gap-2 border-t border-brand-200/60 pt-3">
            {[
              { icon: Zap, title: "Quick & easy", body: "A few simple steps" },
              { icon: Sparkles, title: "Faster fixes", body: "Detail helps us" },
              { icon: Heart, title: "We care", body: "Feedback shapes it" },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="text-center">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-pill bg-surface text-brand-600">
                  <Icon size={14} aria-hidden />
                </span>
                <span className="mt-1 block text-[10.5px] font-semibold leading-tight text-ink-900">
                  {title}
                </span>
                <span className="block text-[9.5px] leading-tight text-ink-500">{body}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => openWith("feature")}
          className="tappable mt-2 flex w-full items-center gap-3 rounded-card bg-surface p-3.5 text-left shadow-e1 active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
            <Lightbulb size={18} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink-900">Feature request</span>
            <span className="block text-[12px] text-ink-500">
              Have an idea? We&apos;d love to hear it
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
        </button>
      </section>

      {open ? (
        <Sheet onClose={close} label="Report an issue" className="px-5">
          {sentId ? (
            <div className="mt-3 pb-2 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-pill bg-safe-bg text-safe">
                <CheckCircle2 size={32} aria-hidden />
              </span>
              <h2 className="mt-3 text-[20px] font-bold tracking-tight text-ink-900">
                Thanks, we&apos;ve got it
              </h2>
              <p className="mx-auto mt-1.5 max-w-[290px] text-[13px] leading-snug text-ink-500">
                Our team typically replies within {SUPPORT_RESPONSE}, at the email on your account.
              </p>
              {sentId !== "sent" ? (
                <p className="mx-auto mt-3 w-fit rounded-pill bg-canvas px-3 py-1.5 font-mono text-[11px] text-ink-500">
                  Ref {sentId.slice(0, 8)}
                </p>
              ) : null}
              <Button type="button" size="md" className="mt-5 w-full" onClick={close}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-2 pb-2">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-bold text-ink-900">Report an issue</h2>
                  <p className="text-[12px] text-ink-500">
                    No health data is attached. Only what you write here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1 active:scale-90"
                >
                  <X size={17} aria-hidden />
                </button>
              </div>

              <fieldset className="mt-4">
                <legend className="mb-1.5 text-[13px] font-medium text-ink-700">
                  What&apos;s this about?
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      aria-pressed={category === value}
                      className={cn(
                        "tappable rounded-pill border px-3 py-1.5 text-[12px] font-medium active:scale-95",
                        category === value
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-line bg-surface text-ink-700",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="mt-4 space-y-3.5">
                <Field
                  name="subject"
                  label="Title"
                  placeholder="e.g. Upload fails on large PDFs"
                  error={result?.fieldErrors?.subject}
                  required
                />
                <div>
                  <label htmlFor="body" className="mb-1.5 block text-[13px] font-medium text-ink-700">
                    What happened?
                  </label>
                  <textarea
                    id="body"
                    name="body"
                    rows={5}
                    placeholder="What you were doing, what you expected, and what happened instead."
                    className="w-full rounded-tile border border-line bg-surface p-3 text-[14px] text-ink-900 outline-none focus:border-brand-500"
                    required
                  />
                  {result?.fieldErrors?.body ? (
                    <p role="alert" className="mt-1 text-[13px] text-danger">
                      {result.fieldErrors.body}
                    </p>
                  ) : null}
                </div>
              </div>

              {result && !result.fieldErrors ? (
                <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
                  {result.message}
                </p>
              ) : null}

              <p className="mt-3 flex items-start gap-2 rounded-tile bg-canvas px-3 py-2.5 text-[11px] leading-snug text-ink-500">
                <Clock size={13} className="mt-px shrink-0 text-brand-400" aria-hidden />
                We usually reply within {SUPPORT_RESPONSE}. Your app version is attached
                automatically.
              </p>

              <Button type="submit" size="md" className="mt-4 w-full" disabled={pending}>
                <Send size={15} aria-hidden />
                {pending ? "Sending…" : "Send report"}
              </Button>
            </form>
          )}
        </Sheet>
      ) : null}
    </>
  );
}
