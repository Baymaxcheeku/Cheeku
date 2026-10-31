import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";

/**
 * The header shared by every screen under /settings/*.
 *
 * Matches the J-series frames: a round back button, a centered title, and a
 * one-line eyebrow with a small icon. Centering the title only reads right
 * when the back button and its mirror have equal width, so both sides reserve
 * the same 40px slot rather than the back button hugging the left edge.
 */
export function SettingsHeader({
  title,
  eyebrow,
  icon: Icon,
  back = "/settings",
}: {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  back?: string;
}) {
  return (
    <header className="flex items-center gap-2 px-5 pt-3">
      <Link
        href={back}
        aria-label="Back"
        className="tappable grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-brand-50 text-ink-700 active:scale-90"
      >
        <ArrowLeft size={18} aria-hidden />
      </Link>
      <div className="flex-1 text-center">
        <h1 className="text-[19px] font-bold text-ink-900">{title}</h1>
        <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[12px] font-medium text-brand-600">
          <Icon size={13} aria-hidden />
          {eyebrow}
        </p>
      </div>
      <span className="h-10 w-10 shrink-0" aria-hidden />
    </header>
  );
}
