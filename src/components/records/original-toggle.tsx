"use client";

import { useState } from "react";
import { ExternalLink, FileSearch } from "lucide-react";

/**
 * The "structured / original" escape hatch on D2.
 *
 * Extraction is a guess. Everything above this on the screen is Cheeku's
 * reading of the document, and a medical record UI that only ever shows the
 * machine's interpretation — with no route back to what the lab actually
 * printed — is asking to be trusted further than it has earned. This is that
 * route.
 *
 * The signed URL is minted server-side and lasts 60 seconds, so it opens in a
 * new tab rather than being embedded: an <iframe> that silently 403s once the
 * link expires looks like the document was lost.
 */
export function OriginalToggle({
  url,
  rawText,
  fileLabel,
  confidence,
}: {
  url: string | null;
  rawText: string | null;
  fileLabel: string;
  confidence: number | null;
}) {
  const [showText, setShowText] = useState(false);

  return (
    <section className="mt-4 rounded-card border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-canvas text-ink-500">
          <FileSearch size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-ink-900">Original document</span>
          <span className="block text-[11px] text-ink-500">
            {/*
             * Confidence is stated as a plain number in neutral type, never as a
             * green/amber/red pill. Those three colours mean health severity
             * everywhere else in the app, and one palette must not carry two
             * meanings.
             */}
            {confidence !== null
              ? `Read with ${Math.round(confidence * 100)}% confidence`
              : "Check anything that looks wrong"}
          </span>
        </span>
      </div>

      <div className="mt-2.5 flex gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-pill border border-brand-200 bg-brand-50 text-[12px] font-semibold text-brand-700"
          >
            <ExternalLink size={14} aria-hidden />
            View original
          </a>
        ) : (
          <span
            title="The original file could not be reached"
            className="inline-flex h-9 flex-1 items-center justify-center rounded-pill border border-line text-[12px] font-medium text-ink-300"
          >
            Original unavailable
          </span>
        )}

        {rawText ? (
          <button
            type="button"
            onClick={() => setShowText((v) => !v)}
            aria-expanded={showText}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-pill border border-line text-[12px] font-semibold text-ink-700"
          >
            {showText ? "Hide text" : "Show text"}
          </button>
        ) : null}
      </div>

      {showText && rawText ? (
        <pre className="mt-2.5 max-h-56 overflow-auto whitespace-pre-wrap rounded-tile bg-canvas p-3 text-[11px] leading-relaxed text-ink-700">
          {rawText}
        </pre>
      ) : null}

      <p className="sr-only">Original file for {fileLabel}</p>
    </section>
  );
}
