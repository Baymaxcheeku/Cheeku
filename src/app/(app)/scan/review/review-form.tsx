"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CircleHelp, Pencil, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";

import { FileChip } from "@/components/records/chrome";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
// From extract-types, not extract: the extractor pulls in node:crypto, which
// cannot be bundled for the browser.
import {
  LOW_CONFIDENCE,
  type ExtractedField,
  type ExtractedValue,
} from "@/lib/ai/mock/extract-types";
import { confirmExtraction } from "@/lib/records/upload";

/*
 * C2 — the last point at which a misread number is cheap to fix.
 *
 * The colour ruling matters more here than anywhere else in the app. Extraction
 * confidence is NOT rendered on the green/amber/red scale: those three hues mean
 * health severity throughout Cheeku, and reusing them for "how well did the OCR
 * read this word" would teach people that red means danger in one card and a
 * blurry scan in the next.
 *
 * So confidence is neutral grey, with a single amber "Check this" for the fields
 * that fall below the threshold. Two meanings, two visual languages.
 */

type Props = {
  documentId: string;
  title: string;
  fileLabel: string;
  mimeType: string;
  eventDate: string | null;
  facility: string | null;
  confidence: number;
  fields: ExtractedField[];
  values: ExtractedValue[];
};

export function ReviewForm(props: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const all = [...props.fields, ...props.values];
  const needsCheck = all.filter((f) => f.confidence < LOW_CONFIDENCE);
  const pct = Math.round(props.confidence * 100);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("documentId", props.documentId);
    start(async () => {
      const result = await confirmExtraction(formData);
      if (result.ok) router.push(`/records/${props.documentId}`);
      else setMessage(result.message);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col px-5 pb-4 pt-3">
      <header className="flex items-center gap-3">
        <h1 className="flex-1 text-[17px] font-bold text-ink-900">Review extracted information</h1>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-600">
          <CircleHelp size={15} aria-hidden />
          Help
        </span>
      </header>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-500">
        We&apos;ve read your document. Check the details below before saving.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-card bg-surface p-3 shadow-e1">
        <FileChip mimeType={props.mimeType} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink-900">
            {props.fileLabel}
          </span>
          <span className="block text-[12px] text-ink-500">Uploaded just now</span>
        </span>
      </div>

      {/* ----------------------------------------------------- confidence --- */}
      <section className="mt-3 rounded-card bg-surface p-4 shadow-e1">
        <div className="flex items-center gap-3">
          <ConfidenceRing pct={pct} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-ink-900">Extraction confidence</h2>
            <p className="mt-1 text-[12px] leading-snug text-ink-500">
              {needsCheck.length === 0
                ? "Everything read clearly. Have a quick look, then save."
                : `${needsCheck.length} field${needsCheck.length === 1 ? "" : "s"} came out unclear. Please check ${needsCheck.length === 1 ? "it" : "them"} before saving.`}
            </p>
          </div>
        </div>
      </section>

      {needsCheck.length > 0 ? (
        <p className="mt-3 flex items-start gap-2 rounded-tile bg-caution-bg px-3.5 py-2.5 text-[12px] leading-snug text-caution-text">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Some fields need a second look.</strong> They are
            marked below. Correct anything that does not match your document.
          </span>
        </p>
      ) : null}

      {/* --------------------------------------------------------- fields --- */}
      <h2 className="mt-4 text-[14px] font-semibold text-ink-900">Extracted information</h2>
      <div className="mt-2 space-y-2">
        <EditableRow
          name="title"
          label="Report name"
          defaultValue={props.title}
          confidence={1}
        />
        <EditableRow
          name="eventDate"
          label="Date of test"
          type="date"
          defaultValue={props.eventDate ?? ""}
          confidence={props.fields.find((f) => f.key === "eventDate")?.confidence ?? 1}
        />
        <EditableRow
          name="facility"
          label="Lab name"
          defaultValue={props.facility ?? ""}
          confidence={props.fields.find((f) => f.key === "facility")?.confidence ?? 1}
        />
      </div>

      {/* --------------------------------------------------------- values --- */}
      {props.values.length > 0 ? (
        <>
          <h2 className="mt-4 text-[14px] font-semibold text-ink-900">Test results</h2>
          <div className="mt-2 space-y-2">
            {props.values.map((value) => (
              <EditableRow
                key={value.key}
                name={`value_${value.key}`}
                label={value.label}
                defaultValue={value.value}
                suffix={value.unit}
                hint={value.refRange ? `Range ${value.refRange}` : undefined}
                confidence={value.confidence}
              />
            ))}
          </div>
        </>
      ) : null}

      {message ? (
        <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
          {message}
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5 text-[11px] leading-snug text-ink-500">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
        Cheeku never interprets your results. What you confirm here is stored exactly as you enter
        it.
      </p>

      {/*
       * Pinned, like A5's. This form is long by nature — one row per extracted
       * value — and the whole screen exists to get to one of these two buttons.
       */}
      <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-line bg-canvas px-5 pb-3 pt-3">
        {/* Re-scan is the narrower of the two: it is the escape hatch, and the
            primary action should not be the one that wraps onto two lines. */}
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 px-4"
          onClick={() => router.push("/scan")}
          disabled={pending}
        >
          <RotateCcw size={16} aria-hidden />
          Re-scan
        </Button>
        <Button type="submit" className="flex-1 whitespace-nowrap" disabled={pending}>
          {pending ? "Saving…" : "Confirm & Save"}
        </Button>
      </div>
    </form>
  );
}

/*
 * Confidence rendered in neutral type. No green, no red — see the note at the
 * top of the file. The only accent is amber, and only for "check this".
 */
function ConfidenceRing({ pct }: { pct: number }) {
  const R = 26;
  const circumference = 2 * Math.PI * R;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={R} stroke="var(--line)" strokeWidth="6" fill="none" />
        <circle
          cx="32"
          cy="32"
          r={R}
          stroke="var(--ink-500)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[15px] font-bold text-ink-900">
        {pct}%
      </span>
    </div>
  );
}

function EditableRow({
  name,
  label,
  defaultValue,
  confidence,
  suffix,
  hint,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string;
  confidence: number;
  suffix?: string | null;
  hint?: string;
  type?: string;
}) {
  const unclear = confidence < LOW_CONFIDENCE;

  return (
    <div
      className={cn(
        "rounded-card border bg-surface p-3",
        unclear ? "border-caution" : "border-line",
      )}
    >
      <div className="flex items-center gap-2">
        <label htmlFor={name} className="flex-1 text-[12px] font-medium text-ink-500">
          {label}
        </label>
        {unclear ? (
          <span className="flex shrink-0 items-center gap-1 rounded-pill bg-caution-bg px-2 py-0.5 text-[10px] font-semibold text-caution-text">
            <TriangleAlert size={11} aria-hidden />
            Check this
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium text-ink-300">
            {Math.round(confidence * 100)}% sure
          </span>
        )}
        <Pencil size={13} className="shrink-0 text-ink-300" aria-hidden />
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink-900 outline-none focus:underline"
        />
        {suffix ? <span className="shrink-0 text-[12px] text-ink-500">{suffix}</span> : null}
      </div>

      {hint ? <p className="mt-0.5 text-[11px] text-ink-300">{hint}</p> : null}
    </div>
  );
}
