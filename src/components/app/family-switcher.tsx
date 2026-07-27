"use client";

import { useTransition } from "react";
import { Users } from "lucide-react";

import { cn } from "@/lib/cn";
import { switchProfile } from "@/lib/profiles/actions";
import type { ActiveProfile } from "@/lib/profiles/context";

/*
 * B2 — the family switcher.
 *
 * The frames give each member a coloured ring. That colour is decorative
 * identity, deliberately drawn from the brand ramp and NOT from the semantic
 * palette: a green ring around a face must not be read as "this person is
 * healthy". Severity owns green/amber/red everywhere in this app, and a ring is
 * not a health claim.
 */

/*
 * Ring colours, assigned by position so a family stays visually stable.
 *
 * Six distinct hues rather than six shades of the brand purple: in a family
 * where three names begin with the same letter, the ring is the only thing
 * telling the avatars apart, and near-identical purples make it useless.
 *
 * None of them is green, amber or red. Those three mean health severity, and a
 * green ring around a face would read as a verdict on that person.
 */
const RINGS = [
  "#6C4EF6", // brand violet
  "#0E9BD1", // cyan
  "#D6459B", // magenta
  "#3F5BD9", // indigo
  "#7A5AF8", // light violet
  "#5B6B8C", // slate
] as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

export function FamilySwitcher({
  profiles,
  activeId,
}: {
  profiles: readonly ActiveProfile[];
  activeId: string;
}) {
  const [pending, start] = useTransition();

  if (profiles.length === 0) return null;

  return (
    <div
      role="radiogroup"
      aria-label="Family member"
      className={cn(
        "flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        pending && "opacity-60",
      )}
    >
      {profiles.map((profile, i) => {
        const active = profile.id === activeId;
        const ring = RINGS[i % RINGS.length] ?? RINGS[0];

        const avatar = (
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-pill bg-surface text-[15px] font-bold ring-2 ring-offset-2 ring-offset-canvas"
            style={{
              color: ring,
              // Tailwind cannot generate a class from a runtime value, and the
              // colour has to survive an arbitrary number of family members.
              ["--tw-ring-color" as string]: ring,
            }}
            aria-hidden
          >
            {initials(profile.name)}
          </span>
        );

        /*
         * The selected member expands into a labelled pill, as in the frame,
         * rather than only tinting. On a row of same-initial avatars a tint is
         * far too quiet a signal for "whose health am I looking at" — which is
         * the single most important thing this screen has to get across.
         */
        if (active) {
          return (
            <span
              key={profile.id}
              role="radio"
              aria-checked
              className="flex shrink-0 items-center gap-2.5 rounded-card bg-brand-50 py-1.5 pl-1.5 pr-4"
            >
              {avatar}
              <span className="min-w-0">
                <span className="block max-w-[110px] truncate text-[14px] font-semibold text-ink-900">
                  {profile.name}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {profile.isPrimary ? "Me" : (profile.relationship ?? "Family")}
                </span>
              </span>
              <span className="h-2 w-2 shrink-0 rounded-pill bg-brand-600" aria-hidden />
            </span>
          );
        }

        return (
          <button
            key={profile.id}
            type="button"
            role="radio"
            aria-checked={false}
            disabled={pending}
            onClick={() => start(() => void switchProfile(profile.id))}
            className="flex shrink-0 flex-col items-center gap-1.5 rounded-tile px-1 py-1"
          >
            {avatar}
            <span className="max-w-[64px] truncate text-[11px] text-ink-500">{profile.name}</span>
          </button>
        );
      })}

      {/*
       * "All" in the frame is a filter across the family. It is not built: every
       * screen behind it is scoped to one member by design, and a combined view
       * is the one place where one person's results could appear under another's
       * name. It ships disabled rather than half-right.
       */}
      <span
        title="Viewing the whole family at once arrives in a later phase"
        className="flex shrink-0 flex-col items-center gap-1.5 px-1 py-1 opacity-45"
      >
        <span className="grid h-12 w-12 place-items-center rounded-pill border border-dashed border-line bg-surface text-ink-300">
          <Users size={18} aria-hidden />
        </span>
        <span className="text-[11px] text-ink-500">All</span>
      </span>
    </div>
  );
}
