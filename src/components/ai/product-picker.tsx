"use client";

import { X } from "lucide-react";

import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { PRODUCT_SCENARIOS } from "@/lib/ai/mock/scenarios";

const CATEGORY_LABEL: Record<string, string> = {
  beauty: "Beauty & skincare",
  food: "Food & drink",
  fitness: "Fitness",
};

/**
 * The camera button's sheet.
 *
 * There is no vision model behind this app, so it doesn't pretend to accept
 * any photo — it offers the fixed set of demo products honestly, framed as a
 * demo rather than disguised as general upload. See scenarios.ts for why.
 */
export function ProductPicker({
  onChoose,
  onClose,
}: {
  onChoose: (scenarioId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose} label="Try a product safety check" className="px-5">
      <div className="mt-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold text-ink-900">Try a product safety check</h2>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">
              A demo. Pick an item and Baymax will check its ingredients, generally and against your
              Health profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2.5">
          {PRODUCT_SCENARIOS.map((scenario) => (
            <li key={scenario.id}>
              <button
                type="button"
                onClick={() => onChoose(scenario.id)}
                className="tappable w-full rounded-card bg-surface p-3 text-left shadow-e1 active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
                <img
                  src={scenario.thumbnail}
                  alt=""
                  className="h-16 w-16 rounded-tile object-cover"
                />
                <span className="mt-2 block text-[12.5px] font-semibold leading-snug text-ink-900">
                  {scenario.title}
                </span>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-pill bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-600",
                  )}
                >
                  {CATEGORY_LABEL[scenario.category] ?? scenario.category}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-center text-[11px] text-ink-300">
          Real photo recognition isn&apos;t wired up in this build. These five are illustrative.
        </p>
      </div>
    </Sheet>
  );
}
