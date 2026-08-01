import Link from "next/link";
import { BookOpen, CircleHelp, Clock, Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { MascotBust } from "@/components/illustrations";
import { SUPPORT_EMAIL, SUPPORT_RESPONSE } from "@/lib/app-meta";
import { Faqs } from "./faqs";
import { HelpSupportTools } from "./report-issue";

export const dynamic = "force-static";

/**
 * Help & Support — the J frame, with the one thing the frame could not have:
 * a Report-an-issue button that files a real ticket.
 *
 * Every row here goes somewhere. The frame lists "Help center" as a link to an
 * article library that does not exist; rather than draw a dead row, that slot
 * points at About Baymax and the FAQs, which are the documentation this build
 * actually has.
 */
export default function HelpPage() {
  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Help & support" eyebrow="We're here to help" icon={CircleHelp} />

      <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-gradient-to-br from-brand-50 via-surface to-brand-50 p-4 ring-1 ring-brand-100">
        <MascotBust className="pointer-events-none absolute -right-3 -top-3 w-[108px]" />
        <div className="relative pr-[32%]">
          <h2 className="text-[19px] font-bold leading-tight text-ink-900">
            How can we <span className="text-brand-600">help you</span> today?
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-600">
            Tell us what&apos;s going on and we&apos;ll get back to you as soon as we can.
          </p>
        </div>
      </section>

      {/* Topic tiles + the report form. One client component: they share a sheet. */}
      <HelpSupportTools />

      <Faqs />

      <section className="mx-5 mt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">
          Other ways we can help
        </h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <li className="border-b border-line">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="tappable flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
                <Mail size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink-900">Email support</span>
                <span className="block truncate text-[12px] text-ink-500">{SUPPORT_EMAIL}</span>
              </span>
            </a>
          </li>
          <li className="border-b border-line">
            <Link
              href="/settings/about"
              className="tappable flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-safe-bg text-safe-text">
                <BookOpen size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink-900">
                  How Baymax works
                </span>
                <span className="block text-[12px] text-ink-500">
                  What it does, and what it never does
                </span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/ask"
              className="tappable flex w-full items-center gap-3 p-3.5 text-left active:scale-[0.99]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
                <MessageCircle size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink-900">Ask Baymax</span>
                <span className="block text-[12px] text-ink-500">
                  Questions about your own records
                </span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mx-5 mt-4 flex items-start gap-3 rounded-card bg-brand-50 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-surface text-brand-600">
          <Clock size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink-900">We&apos;re here for you</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-500">
            Our support team typically replies within {SUPPORT_RESPONSE}. Urgent medical questions
            belong with your doctor, not with us.
          </p>
        </div>
      </section>

      <p className="mx-5 mt-4 flex items-start gap-2 text-[11px] leading-snug text-ink-500">
        <ShieldCheck size={14} className="mt-px shrink-0 text-ink-300" aria-hidden />
        <span>
          Support tickets never include your health records — only what you write. Thank you for
          being part of Baymax.
        </span>
      </p>
    </div>
  );
}
