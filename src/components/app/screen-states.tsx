"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";

import { MascotBust } from "@/components/illustrations";

/*
 * The states every screen needs and none of them had.
 *
 * Until now an unhandled throw anywhere in this app showed Next's default
 * error page: a bare stack trace on a white background. On a screen that was
 * showing someone's medical records a moment earlier, that reads as "your data
 * is gone", which is both frightening and false.
 *
 * Two rules here:
 *
 * NEVER SHOW THE ERROR TEXT. A database error can carry column names, ids, and
 * occasionally a fragment of a row. The message goes to the console for a
 * developer; the reader gets a sentence they can act on.
 *
 * ALWAYS OFFER A WAY OUT. Retry, and a route back to somewhere that works. A
 * dead end with no controls is how someone ends up force-quitting an app that
 * was one tap from recovering.
 */

export function ScreenError({
  reset,
  title = "Something went wrong",
  body = "That didn't load. Your records are safe. This is a problem on our side, not with your data.",
}: {
  reset?: () => void;
  title?: string;
  body?: string;
}) {
  return (
    <main className="flex min-h-app flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-pill bg-danger-bg text-danger">
        <TriangleAlert size={30} aria-hidden />
      </span>
      <h1 className="mt-4 text-[22px] font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink-500">{body}</p>

      <div className="mt-6 flex w-full max-w-[280px] flex-col gap-2">
        {reset ? (
          <button
            type="button"
            onClick={reset}
            className="tappable flex h-12 items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[15px] font-semibold text-white active:scale-[0.98]"
          >
            <RefreshCw size={16} aria-hidden />
            Try again
          </button>
        ) : null}
        <Link
          href="/home"
          className="tappable flex h-12 items-center justify-center rounded-pill border border-line bg-surface text-[15px] font-semibold text-ink-700 active:scale-[0.98]"
        >
          Go to Home
        </Link>
      </div>
    </main>
  );
}

/**
 * The offline banner.
 *
 * Sits above the tab bar rather than replacing the screen: cached records are
 * still readable offline and blanking them would remove the only thing the app
 * can still usefully do. It says what will not work instead.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Read once on mount rather than during render — navigator is not available
    // on the server, and seeding state from it would hydrate mismatched.
    setOffline(!navigator.onLine);
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky bottom-0 z-10 flex items-center gap-2.5 border-t border-caution/30 bg-caution-bg px-5 py-2.5"
    >
      <CloudOff size={16} className="shrink-0 text-caution-text" aria-hidden />
      <p className="text-[12px] leading-snug text-caution-text">
        <strong className="font-semibold">You&apos;re offline.</strong> Saved records still open.
        Uploads and Ask Cheeku need a connection.
      </p>
    </div>
  );
}

/** The shimmer used by every loading.tsx. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-tile bg-line/60 ${className}`} />;
}

/** A generic list-shaped loading state. */
export function ListSkeleton({ rows = 4, header = true }: { rows?: number; header?: boolean }) {
  return (
    <div className="flex min-h-app flex-col px-5 pt-4" aria-busy aria-label="Loading">
      {header ? (
        <>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-4 h-10 w-full" />
        </>
      ) : null}
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}

/** 404. Kept warm rather than blunt — a wrong link is not the reader's fault. */
export function ScreenNotFound({
  title = "We couldn't find that",
  body = "The page or record you're looking for doesn't exist, or it isn't yours to open.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <main className="flex min-h-app flex-1 flex-col items-center justify-center px-8 text-center">
      <MascotBust className="w-[150px]" />
      <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ink-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-[300px] text-[14px] leading-relaxed text-ink-500">{body}</p>
      <Link
        href="/records"
        className="tappable mt-6 flex h-12 w-full max-w-[280px] items-center justify-center rounded-pill bg-gradient-to-b from-brand-600 to-brand-800 text-[15px] font-semibold text-white active:scale-[0.98]"
      >
        Back to my records
      </Link>
    </main>
  );
}
