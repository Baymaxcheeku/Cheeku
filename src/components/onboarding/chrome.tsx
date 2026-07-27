import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";

import { cn } from "@/lib/cn";

export function OnboardingHeader({
  back,
  action,
}: {
  back?: string;
  action?: { label: string; href: string };
}) {
  return (
    <header className="flex h-11 items-center gap-3 px-5">
      {back ? (
        <Link
          href={back}
          aria-label="Go back"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-ink-700 hover:bg-brand-50"
        >
          <ChevronLeft size={20} />
        </Link>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="ml-auto text-[15px] font-medium text-brand-500 hover:text-brand-700"
        >
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}

/**
 * The lock-icon line that appears on nearly every onboarding frame. Trust is a
 * recurring visual element in this design, not a one-off.
 */
export function ReassuranceStrip({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 rounded-tile bg-brand-50 px-4 py-3 text-center text-[12px] leading-snug text-ink-500">
      <Lock size={13} className="shrink-0 text-brand-400" aria-hidden />
      {children ?? "Bank-level encryption. Only you and your family can access."}
    </p>
  );
}

export function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 rounded-pill transition-all duration-300 ease-[var(--ease-settle)]",
            i === current ? "w-5 bg-brand-600" : "w-1.5 bg-brand-200",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Onboarding headline: bold sans with the emphasis line in violet. The written
 * spec asked for a serif moment here; the frames contain no serif anywhere, and
 * the frames win.
 */
export function Headline({ lead, accent }: { lead: string; accent: React.ReactNode }) {
  return (
    <h1 className="text-[27px] font-bold leading-[1.2] tracking-[-0.02em] text-ink-900">
      {lead}
      <br />
      <span className="text-brand-600">{accent}</span>
    </h1>
  );
}
