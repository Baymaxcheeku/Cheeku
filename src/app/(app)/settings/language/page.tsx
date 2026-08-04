import { Check, Globe } from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { PopIn, PressRow } from "@/components/ui/motion";

export const dynamic = "force-static";

const COMING_SOON = [
  ["हिंदी", "Hindi"],
  ["বাংলা", "Bengali"],
  ["मराठी", "Marathi"],
  ["தமிழ்", "Tamil"],
  ["తెలుగు", "Telugu"],
  ["ગુજરાતી", "Gujarati"],
  ["ಕನ್ನಡ", "Kannada"],
  ["മലയാളം", "Malayalam"],
  ["ਪੰਜਾਬੀ", "Punjabi"],
  ["ଓଡ଼ିଆ", "Odia"],
  ["অসমীয়া", "Assamese"],
] as const;

/**
 * Language — English only in V1, per the frame. Every other language is shown
 * rather than hidden: someone deciding whether Baymax will work for their
 * family should see the roadmap, not an empty list.
 */
export default function LanguagePage() {
  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Language" eyebrow="Choose your preferred language" icon={Globe} />

      <section className="mx-5 mt-4 rounded-card bg-surface p-4 shadow-e1">
        <h2 className="text-[17px] font-bold leading-tight text-ink-900">
          Your language, <span className="text-brand-600">your experience</span>
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
          We&apos;re working hard to bring Baymax to more languages.
        </p>
      </section>

      <section className="mt-5 px-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Available now
        </h2>
        <ul className="mt-2">
        <PopIn index={0} className="flex items-center gap-3 rounded-card border-2 border-brand-500 bg-brand-50 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-[12px] font-bold text-brand-600">
            EN
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold text-ink-900">English</span>
            <span className="block text-[12px] font-medium text-brand-600">Default language</span>
          </span>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-brand-600 text-surface">
            <Check size={14} aria-hidden />
          </span>
        </PopIn>
        </ul>
      </section>

      <section className="mt-5 px-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Coming soon
        </h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          {COMING_SOON.map(([native, name], i) => (
            <PressRow key={name} index={i} className={i > 0 ? "border-t border-line" : undefined}>
              <div className="flex items-center gap-3 p-3 opacity-70">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-brand-50 text-[13px] font-semibold text-brand-600">
                  {native.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink-900">{native}</span>
                  <span className="block text-[12px] text-ink-500">{name}</span>
                </span>
                <span className="shrink-0 rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
                  Coming soon
                </span>
              </div>
            </PressRow>
          ))}
        </ul>
      </section>

      <p className="mx-5 mt-4 flex items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3 text-[12px] leading-snug text-ink-500">
        <Globe size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
        We&apos;re constantly adding more languages to make Baymax accessible for everyone.
      </p>
    </div>
  );
}
