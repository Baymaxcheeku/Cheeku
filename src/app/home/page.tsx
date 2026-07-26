import Link from "next/link";

/** Placeholder for B1 Home, which is built in Phase 5. Onboarding exits here. */
export default function HomePlaceholderPage() {
  return (
    <main className="flex min-h-app flex-col justify-center px-5 text-center">
      <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink-900">You&apos;re all set</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
        Onboarding is complete. The home screen, records and Ask Baymax arrive in the next build
        phases.
      </p>
      <Link href="/" className="mt-6 text-[14px] font-semibold text-brand-600">
        Restart the flow
      </Link>
    </main>
  );
}
