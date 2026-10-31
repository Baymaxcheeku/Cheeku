import { cn } from "@/lib/cn";
import { castFaces, faceDataUri } from "@/lib/profiles/avatar";

/*
 * Real faces for the "Who is this for?" choice.
 *
 * The generic figure-in-a-circle that was here read as a placeholder icon
 * rather than a person, which is a poor thing to put next to "It's for me".
 * These are the same generated avatars the family switcher uses, so the faces
 * someone sees while choosing are the same style they meet a screen later.
 *
 * The seeds are fixed strings, not profile ids — nobody has a profile yet at
 * this point in onboarding. They are chosen to give the single and the group
 * visibly different people.
 */

/** One face, for "It's for me". */
export function AvatarSolo({ className }: { className?: string }) {
  return (
    <div className={cn("relative shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
      <img
        src={faceDataUri("baymax-solo-portrait", "d1d4f9")}
        alt=""
        className="h-full w-full rounded-pill object-cover shadow-e1 ring-2 ring-white"
      />
      <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-pill bg-safe text-white shadow-e1">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

/*
 * Three overlapping faces for "It's for my family".
 *
 * Overlapped rather than in a row: a row of three reads as a list of options,
 * a cluster reads as a group — which is the actual difference between the two
 * choices on this screen.
 */
export function AvatarFamily({ className }: { className?: string }) {
  // The same illustrated cast used by FamilyScene and the locked Family slots,
  // so the "family" depicted in onboarding is the one depicted everywhere else.
  const faces = castFaces(3);

  /*
   * Explicit pixel sizes, not percentages. Percentages plus negative margins
   * made the cluster wider than its own box, and it ran under the option's
   * text — the overlap has to be computed against a known width.
   */
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className="flex h-full items-center">
        {faces.map((src, i) => (
          /*
           * Keyed on index, not a slice of the data URI: every generated SVG
           * closes with the same tags, so their base64 TAILS are identical —
           * `src.slice(-24)` produced three equal keys and React warned about
           * duplicates. The cast is a fixed-length, fixed-order array, so index
           * is stable here.
           */
          /* eslint-disable-next-line @next/next/no-img-element -- inline data URI */
          <img
            key={i}
            src={src}
            alt=""
            style={{ zIndex: faces.length - i }}
            className={cn(
              "rounded-pill object-cover shadow-e1 ring-2 ring-white",
              i === 0 ? "h-12 w-12" : "-ml-5 h-10 w-10",
            )}
          />
        ))}
      </div>
      <span className="absolute -bottom-0.5 right-0 grid h-6 w-6 place-items-center rounded-pill bg-brand-600 text-white shadow-e1">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  );
}
