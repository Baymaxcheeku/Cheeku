"use client";

import { useState, useTransition } from "react";
import { LogOut } from "lucide-react";

import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { signOutAction } from "@/lib/settings/actions";

/**
 * Sign out, with a confirm sheet.
 *
 * Signing out is reversible — the same credentials sign back in — so this
 * isn't guarded like the delete-account flow. But it interrupts whatever
 * someone was doing on a shared or borrowed device, and it's one accidental
 * tap on a row above "Delete all my data", so a second step is worth the cost.
 */
export function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      {/*
       * Neutral, not red.
       *
       * This row sits directly under "Delete all my data". Drawing both in the
       * danger palette put a reversible action and an irreversible one at the
       * same alarm level, which spends the warning colour on the one that does
       * not need it and quietly weakens it on the one that does. Signing out is
       * still confirmed below — it just no longer *looks* destructive.
       */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tappable flex w-full items-center gap-3.5 px-3.5 py-3 text-left active:bg-brand-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-canvas text-ink-500">
          <LogOut size={17} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-tight text-ink-900">
            Log out
          </span>
          <span className="mt-0.5 block text-[11.5px] text-ink-500">
            Sign out of your Cheeku AI account
          </span>
        </span>
      </button>

      {open ? (
        <Sheet
          onClose={() => setOpen(false)}
          label="Log out"
          className={cn("px-5", pending && "opacity-70")}
        >
          <div>
            <div className="mt-3 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-pill bg-brand-50 text-brand-600">
                <LogOut size={20} aria-hidden />
              </span>
              <h2 className="mt-3 text-[18px] font-bold text-ink-900">Log out of Cheeku AI?</h2>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] leading-snug text-ink-500">
                You&apos;ll need to sign in again to see your family&apos;s records.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="tappable h-12 flex-1 rounded-pill border border-line bg-surface text-[14px] font-semibold text-ink-700 active:scale-[0.98] disabled:opacity-60"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={() => start(() => signOutAction())}
                disabled={pending}
                className="tappable h-12 flex-1 rounded-pill bg-ink-900 text-[14px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}
