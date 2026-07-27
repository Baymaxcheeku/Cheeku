"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { FolderClosed, House, Plus, Sparkles, User, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean };

/*
 * `match` rather than equality: /records/[id] and /timeline are both the
 * Documents section, and a tab that unhighlights when you open a record makes
 * the app feel like it lost your place.
 */
const TABS: readonly Tab[] = [
  { href: "/home", label: "Home", icon: House, match: (p) => p === "/home" },
  {
    href: "/records",
    label: "Documents",
    icon: FolderClosed,
    match: (p) => p.startsWith("/records") || p.startsWith("/timeline"),
  },
  { href: "/ask", label: "Ask Baymax", icon: Sparkles, match: (p) => p.startsWith("/ask") },
  { href: "/settings", label: "Profile", icon: User, match: (p) => p.startsWith("/settings") },
];

/**
 * The app's primary navigation, per the frames: four tabs with a raised `+`
 * straddling the middle.
 *
 * The `+` is a link, not a button with an onClick. It is the app's main write
 * action, so it should be openable in a new tab, focusable, and above all
 * functional before hydration — a FAB that does nothing until JavaScript
 * arrives is the worst control on the screen to have that property.
 */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-20 mt-auto border-t border-line bg-surface/95 backdrop-blur"
    >
      <ul className="flex items-stretch justify-around pb-[var(--safe-bottom)] pt-1.5">
        {TABS.map((tab, index) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Fragment key={tab.href}>
              {/* The FAB sits between tabs 2 and 3, so it is emitted mid-list
                  rather than positioned absolutely over the bar. Absolute
                  positioning would let it overlap a tab's tap target. */}
              {index === 2 ? <FabSlot /> : null}
              <li className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tappable flex h-full flex-col items-center gap-1 rounded-tile px-1 pb-1.5 pt-1 text-[10px] font-medium active:scale-95",
                    active ? "text-brand-600" : "text-ink-500 hover:text-ink-700",
                  )}
                >
                  <Icon size={22} strokeWidth={active ? 2.4 : 1.9} aria-hidden />
                  {tab.label}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ul>
    </nav>
  );
}

/*
 * The raised circle. It overlaps the bar's top edge, so it needs a negative
 * margin and a width that reserves its own space in the flex row.
 */
function FabSlot() {
  return (
    <li className="flex w-[76px] shrink-0 justify-center">
      <Link
        href="/scan"
        aria-label="Add a document"
        className="tappable -mt-6 grid h-14 w-14 place-items-center rounded-pill bg-brand-600 text-surface shadow-e2 hover:bg-brand-700 active:scale-90"
      >
        <Plus size={26} strokeWidth={2.5} aria-hidden />
      </Link>
    </li>
  );
}
