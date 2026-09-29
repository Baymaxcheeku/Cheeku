"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, CalendarClock, ChevronRight, PartyPopper } from "lucide-react";

import { Sheet } from "@/components/ui/sheet";
import type { HomeNotification } from "@/lib/notifications/derive";

/**
 * The Home bell, wired to something real.
 *
 * Every row here is a flagged record, opened via {@link deriveNotifications}
 * from the profile's own data — there is nothing generic in this tray, so
 * there is nothing to show when there is nothing to say (see the empty state
 * below rather than a placeholder list).
 */
export function NotificationsBell({ notifications }: { notifications: HomeNotification[] }) {
  const [open, setOpen] = useState(false);
  const count = notifications.length;

  return (
    <>
      <button
        type="button"
        aria-label={count > 0 ? `Notifications, ${count} to review` : "Notifications"}
        onClick={() => setOpen(true)}
        className="tappable relative grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1 active:scale-90"
      >
        <Bell size={19} aria-hidden />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-pill bg-danger px-1 text-[9px] font-bold leading-none text-white"
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <Sheet onClose={() => setOpen(false)} label="Notifications" className="px-5">
          <div className="mt-2 flex items-start justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-ink-900">Notifications</h2>
              <p className="mt-0.5 text-[13px] text-ink-500">
                {count > 0 ? "Records worth a look" : "Nothing needs your attention"}
              </p>
            </div>
          </div>

          {count > 0 ? (
            <ul className="mt-4 overflow-hidden rounded-card bg-surface shadow-e1">
              {notifications.map((note, i) => (
                <li key={note.id} className={i > 0 ? "border-t border-line" : undefined}>
                  <Link
                    href={note.href}
                    onClick={() => setOpen(false)}
                    className="tappable flex items-center gap-3 p-3.5 active:scale-[0.99]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-danger-bg text-danger">
                      <CalendarClock size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-900">
                        {note.title}
                      </span>
                      <span className="block truncate text-[12px] text-ink-500">{note.body}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-300">{note.time}</span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-ink-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex flex-col items-center rounded-card bg-surface px-6 py-10 text-center shadow-e1">
              <span className="grid h-12 w-12 place-items-center rounded-pill bg-safe-bg text-safe">
                <PartyPopper size={22} aria-hidden />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink-900">You&apos;re all caught up</p>
              <p className="mt-1 max-w-[220px] text-[12px] leading-snug text-ink-500">
                Cheeku will let you know here if a new record needs a look.
              </p>
            </div>
          )}
        </Sheet>
      ) : null}
    </>
  );
}
