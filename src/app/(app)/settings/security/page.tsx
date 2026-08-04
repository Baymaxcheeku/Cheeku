import Link from "next/link";
import {
  ChevronRight,
  Lock,
  ScanFace,
  ServerCog,
  ShieldCheck,
  Sliders,
  UserCheck,
} from "lucide-react";

import { SettingsHeader } from "@/components/app/settings-header";
import { PressRow, TapToWiggle } from "@/components/ui/motion";
import { PrivacyScene } from "@/components/illustrations";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

/** Security & privacy — the J frame, rebuilt as real content rather than a decorative list. */
export default function SecurityPage() {
  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="Security & privacy" eyebrow="Your health data is safe with us" icon={ShieldCheck} />

      <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-surface p-4 shadow-e1">
        <TapToWiggle className="absolute -right-4 -top-2 w-[108px]">
          <PrivacyScene className="w-full" />
        </TapToWiggle>
        <div className="relative pr-[36%]">
          <h2 className="text-[19px] font-bold leading-tight text-ink-900">
            Your trust, <span className="text-brand-600">our top priority</span>
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
            We follow industry-leading security practices to keep your data private, secure and in
            your control.
          </p>
        </div>
      </section>

      <ChangePasswordForm />

      <InfoGroup
        title="How we protect your data"
        items={[
          {
            icon: ShieldCheck,
            title: "End-to-end encryption",
            body: "All your data is encrypted in transit and at rest using industry-standard encryption.",
          },
          {
            icon: ServerCog,
            title: "Secure infrastructure",
            body: "Trusted cloud infrastructure with monitoring, firewalls and threat detection.",
          },
          {
            icon: UserCheck,
            title: "Strict access control",
            body: "Your data is accessible only to authorised systems, scoped by row-level security.",
          },
          {
            icon: ScanFace,
            title: "Regular security audits",
            body: "We review our own access policies as new tables and features are added.",
          },
        ]}
      />

      <InfoGroup
        title="Your privacy, your control"
        items={[
          {
            icon: Lock,
            title: "You own your data",
            body: "Your health data belongs to you. We never sell your personal information.",
          },
          {
            icon: Sliders,
            title: "Data used only to help you",
            body: "We use your data only to provide and improve Baymax and its features.",
          },
        ]}
      />

      <Link
        href="/settings"
        className="tappable mx-5 mt-4 flex items-center gap-3 rounded-card bg-surface p-3.5 shadow-e1 active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
          <Sliders size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink-900">Manage your data</span>
          <span className="block text-[12px] text-ink-500">Export or delete everything, anytime</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
      </Link>

      <p className="mx-5 mt-4 text-center text-[11px] leading-snug text-ink-500">
        Your security and privacy are at the heart of everything we do.
        <br />
        Thank you for trusting Baymax.
      </p>
    </div>
  );
}

function InfoGroup({
  title,
  items,
}: {
  title: string;
  items: { icon: typeof ShieldCheck; title: string; body: string }[];
}) {
  return (
    <section className="mt-5 px-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-300">{title}</h2>
      <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
        {items.map((item, i) => (
          <PressRow key={item.title} index={i} className={i > 0 ? "border-t border-line" : undefined}>
            <div className="flex items-start gap-3 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
                <item.icon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink-900">{item.title}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">{item.body}</span>
              </span>
            </div>
          </PressRow>
        ))}
      </ul>
    </section>
  );
}
