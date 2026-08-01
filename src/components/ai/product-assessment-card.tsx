import { Check, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

import { cn } from "@/lib/cn";
import type { ProductAssessment, SafetyLevel } from "@/lib/ai/mock/scenarios";

const VERDICT_COPY: Record<SafetyLevel, string> = {
  safe: "Safe",
  caution: "Use with care",
  avoid: "Avoid",
};

const VERDICT_TONE: Record<SafetyLevel, { icon: typeof ShieldCheck; text: string; bg: string; ring: string }> = {
  safe: { icon: ShieldCheck, text: "text-safe-text", bg: "bg-safe-bg", ring: "ring-safe/20" },
  caution: { icon: ShieldAlert, text: "text-caution-text", bg: "bg-caution-bg", ring: "ring-caution/25" },
  avoid: { icon: ShieldX, text: "text-danger-text", bg: "bg-danger-bg", ring: "ring-danger/25" },
};

const DOT: Record<SafetyLevel, string> = {
  safe: "bg-safe",
  caution: "bg-caution",
  avoid: "bg-danger",
};

/**
 * The rich reply to a product-scenario question — an ingredient-safety
 * verdict, not a diagnosis. Semantic colour carries the verdict severity here
 * deliberately: this is exactly the kind of judgement the colour rule exists
 * for, same as a lab value's severity dot elsewhere in the app.
 */
export function ProductAssessmentCard({ assessment }: { assessment: ProductAssessment }) {
  const tone = VERDICT_TONE[assessment.verdict];
  const Icon = tone.icon;

  return (
    <div className="min-w-0 space-y-3">
      <section className={cn("rounded-card p-3.5 ring-1", tone.bg, tone.ring)}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Overall safety</p>
        <div className="mt-1.5 flex items-start gap-3">
          <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-surface", tone.text)}>
            <Icon size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className={cn("text-[17px] font-bold", tone.text)}>{VERDICT_COPY[assessment.verdict]}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug text-ink-700">{assessment.verdictNote}</p>
          </div>
        </div>

        {assessment.personas.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {assessment.personas.map((persona) => {
              const personaTone = VERDICT_TONE[persona.status];
              return (
                <div key={persona.key} className="rounded-tile bg-surface p-2.5">
                  <p className="text-[12px] font-semibold text-ink-900">{persona.label}</p>
                  <p className={cn("mt-0.5 text-[11px] font-medium", personaTone.text)}>
                    {VERDICT_COPY[persona.status]}
                  </p>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[12px] font-bold text-ink-900">Ingredient breakdown</p>
          <div className="flex items-center gap-2.5 text-[10px] font-medium text-ink-500">
            <Legend color={DOT.safe} label="Safe" />
            <Legend color={DOT.caution} label="Use with care" />
            <Legend color={DOT.avoid} label="Avoid" />
          </div>
        </div>

        <ul className="mt-2 overflow-hidden rounded-card border border-line bg-surface">
          {assessment.ingredients.map((ingredient, i) => (
            <li
              key={ingredient.name}
              className={cn("flex items-start gap-2.5 p-2.5", i > 0 && "border-t border-line")}
            >
              <span
                className={cn(
                  "mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-pill text-white",
                  DOT[ingredient.status],
                )}
                aria-hidden
              >
                {ingredient.status === "safe" ? <Check size={10} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold text-ink-900">{ingredient.name}</span>
                <span className="block text-[11px] text-ink-500">{ingredient.note}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-[11px] font-semibold",
                  VERDICT_TONE[ingredient.status].text,
                )}
              >
                {VERDICT_COPY[ingredient.status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {assessment.personalNote ? (
        <p className="flex items-start gap-2 rounded-tile bg-brand-50 px-3 py-2.5 text-[11.5px] leading-snug text-ink-700">
          <span className="mt-0.5 shrink-0 font-semibold text-brand-700">For you —</span>
          {assessment.personalNote}
        </p>
      ) : null}

      <p className="text-[10.5px] leading-snug text-ink-300">{assessment.disclaimer}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-1.5 w-1.5 rounded-pill", color)} aria-hidden />
      {label}
    </span>
  );
}
