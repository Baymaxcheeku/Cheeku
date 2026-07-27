import Link from "next/link";
import { ArrowRight, FolderClosed, Plus } from "lucide-react";

/**
 * Placeholder for B1 Home, which is built in Phase 5.
 *
 * No longer a dead end: onboarding exits here, and now that the records screens
 * exist there is somewhere real to go. A "you're all set" screen whose only
 * link restarts onboarding invites people to do exactly that.
 */
export default function HomePlaceholderPage() {
  return (
    <main className="flex flex-1 flex-col justify-center px-5 py-10 text-center">
      <h1 className="text-[24px] font-bold tracking-[-0.02em] text-ink-900">You&apos;re all set</h1>
      <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink-500">
        The full home screen and Ask Baymax arrive in the next phase. Your records are ready now.
      </p>

      <div className="mt-6 space-y-2.5 text-left">
        <Link href="/records" className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-e1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
            <FolderClosed size={19} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink-900">My Records</span>
            <span className="block text-[12px] text-ink-500">Browse and filter your documents</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-ink-300" aria-hidden />
        </Link>

        <Link href="/scan" className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-e1">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
            <Plus size={19} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink-900">Add a document</span>
            <span className="block text-[12px] text-ink-500">Baymax will read and organise it</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-ink-300" aria-hidden />
        </Link>
      </div>
    </main>
  );
}
