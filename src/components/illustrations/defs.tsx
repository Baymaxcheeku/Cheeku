/*
 * Shared gradient and filter definitions for the app's illustrations.
 *
 * Rendered once, in the root layout, and referenced by id from every
 * illustration. The alternative — defining gradients inside each component —
 * needs a unique id per instance, which means either `useId` (and making every
 * illustration a client component for the sake of some artwork) or hand-passed
 * prefixes that eventually collide. One shared block avoids both.
 *
 * Why these are drawn rather than cropped from the design frames: a crop
 * carries the frame's own near-white backdrop, cannot be keyed out (the
 * backdrop and the mascot's white body are eight levels apart), and is fixed at
 * the resolution the mockup was exported at. Vector art has no backdrop to
 * remove, stays sharp at any density, and costs a few hundred bytes.
 */
export function IllustrationDefs() {
  return (
    <svg
      aria-hidden
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* The mascot's body: white, with the light coming from upper-left. */}
        <linearGradient id="bx-shell" x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#f7f7fc" />
          <stop offset="1" stopColor="#e4e4f2" />
        </linearGradient>

        {/* Same light, one step deeper, for limbs that sit behind the body. */}
        <linearGradient id="bx-shell-shade" x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#f2f2f9" />
          <stop offset="1" stopColor="#d9d9ec" />
        </linearGradient>

        {/* The lavender field the characters sit on. */}
        <linearGradient id="bx-field" x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#c9c4fb" />
          <stop offset="1" stopColor="#a89ff5" />
        </linearGradient>

        <linearGradient id="bx-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b63f8" />
          <stop offset="1" stopColor="#4b2fe0" />
        </linearGradient>

        <linearGradient id="bx-card" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f0fb" />
        </linearGradient>

        <linearGradient id="bx-safe" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4fd08a" />
          <stop offset="1" stopColor="#1d9c53" />
        </linearGradient>

        <linearGradient id="bx-warm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a6b" />
          <stop offset="1" stopColor="#f4553f" />
        </linearGradient>

        <linearGradient id="bx-paper" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eceafb" />
        </linearGradient>

        {/*
         * A soft contact shadow. `stdDeviation` is generous and the offset is
         * small, so shapes feel lifted off the page rather than outlined.
         */}
        <filter id="bx-lift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="9" floodColor="#3a2f8f" floodOpacity="0.16" />
        </filter>

        <filter id="bx-lift-sm" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#3a2f8f" floodOpacity="0.18" />
        </filter>
      </defs>
    </svg>
  );
}
