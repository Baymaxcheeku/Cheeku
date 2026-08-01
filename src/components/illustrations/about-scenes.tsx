import { cn } from "@/lib/cn";

/*
 * Artwork for the About screen.
 *
 * Drawn here rather than cropped from the mockups, per the standing rule. The
 * reference frame uses a photographic-style illustration of a worried person at
 * a laptop surrounded by floating search results; that composition is what these
 * reproduce, in the app's own vector language and using the same shading
 * primitives as the mascot (a soft field, a lifted card, a two-stop shadow).
 */

type ArtProps = { className?: string };

/**
 * The anxiety spiral: a figure at a laptop, search fragments circling.
 *
 * The face is deliberately drawn rather than generated. This is the one person
 * in the app who is *not* a family member — she is the reader's own experience
 * of 2am symptom-searching — and giving her a `micah` avatar would file her
 * alongside profiles she has nothing to do with.
 */
export function AnxietyScene({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 260 190"
      className={cn("h-auto w-full", className)}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id="ax-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f2fd" />
          <stop offset="1" stopColor="#e4e0f8" />
        </linearGradient>
        <linearGradient id="ax-lap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfcbee" />
          <stop offset="1" stopColor="#aca4e2" />
        </linearGradient>
        <linearGradient id="ax-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7d6df2" />
          <stop offset="1" stopColor="#5b4ef0" />
        </linearGradient>
        <filter id="ax-lift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2a2560" floodOpacity="0.13" />
        </filter>
      </defs>

      {/* Soft field behind everything. */}
      <ellipse cx="132" cy="112" rx="106" ry="72" fill="#eeebfb" opacity="0.85" />

      {/* Floating search fragments — the "what does this mean" chorus. */}
      <g filter="url(#ax-lift)">
        <rect x="6" y="18" width="72" height="30" rx="9" fill="#fff" />
        <rect x="16" y="27" width="44" height="4" rx="2" fill="#d9d5f2" />
        <rect x="16" y="36" width="30" height="4" rx="2" fill="#e8e5f8" />
      </g>
      <g filter="url(#ax-lift)">
        <rect x="176" y="8" width="78" height="32" rx="9" fill="#fff" />
        <rect x="187" y="18" width="50" height="4" rx="2" fill="#d9d5f2" />
        <rect x="187" y="27" width="34" height="4" rx="2" fill="#e8e5f8" />
      </g>
      <g filter="url(#ax-lift)">
        <rect x="196" y="56" width="60" height="26" rx="8" fill="#fff" />
        <rect x="205" y="65" width="38" height="4" rx="2" fill="#d9d5f2" />
        <rect x="205" y="73" width="24" height="4" rx="2" fill="#e8e5f8" />
      </g>

      {/*
       * A scribble of worry. Three overlapping loops rather than one, because a
       * single closed curve just reads as a stray ellipse — the tangle only says
       * "noise in the head" if the line visibly crosses itself.
       */}
      <g stroke="#b9b2f7" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M104 46 q-8 -12 4 -16 q12 -4 14 8 q2 12 -12 10 q-14 -2 -8 -14 q6 -12 20 -6" />
        <path d="M126 30 q10 -8 16 2 q6 10 -6 12 q-12 2 -12 -8" />
        <path d="M112 24 q6 -10 18 -6" />
      </g>

      {/* Desk. */}
      <rect x="42" y="150" width="180" height="10" rx="5" fill="url(#ax-desk)" />

      {/* Figure: torso, then head, then the arm resting against her cheek. */}
      <g filter="url(#ax-lift)">
        <path d="M92 150 q4 -40 38 -40 q34 0 38 40 z" fill="#8b7bf0" />
        <circle cx="130" cy="88" r="25" fill="#f5d7c4" />
        {/* Hair, swept. */}
        <path d="M105 84 q2 -26 25 -26 q24 0 26 26 q-8 -12 -26 -12 q-17 0 -25 12 z" fill="#3a3550" />
        {/* Downturned brows and mouth — worry, not distress. */}
        <path d="M119 84 l7 2 M141 86 l-7 -2" stroke="#3a3550" strokeWidth="2" strokeLinecap="round" />
        <circle cx="122" cy="91" r="2.2" fill="#3a3550" />
        <circle cx="138" cy="91" r="2.2" fill="#3a3550" />
        <path d="M125 101 q5 -3 10 0" stroke="#3a3550" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Hand at the cheek. */}
        <path d="M108 150 q-6 -22 6 -30 q8 -5 10 4 q2 8 -6 12 q-6 3 -4 14 z" fill="#f5d7c4" />
      </g>

      {/* Laptop, lid open toward the viewer. */}
      <g filter="url(#ax-lift)">
        <path d="M158 150 l14 -34 h58 l-10 34 z" fill="url(#ax-lap)" />
        <path d="M172 116 h58 l-2 -30 h-52 z" fill="url(#ax-top)" />
        <rect x="182" y="94" width="36" height="3.5" rx="1.75" fill="#fff" opacity="0.55" />
        <rect x="182" y="102" width="24" height="3.5" rx="1.75" fill="#fff" opacity="0.38" />
      </g>

      {/* Two small sparkles, the app's recurring accent. */}
      <path d="M64 74 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 z" fill="#b9b2f7" opacity="0.7" />
      <path d="M232 116 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#b9b2f7" opacity="0.55" />
    </svg>
  );
}

/**
 * The memory scene: a stack of cards being gathered into one place, with a
 * ribbon tying them together. The visual claim is "these all belong together",
 * which is the actual product.
 */
export function MemoryScene({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 240 170"
      className={cn("h-auto w-full", className)}
      role="presentation"
      aria-hidden
    >
      <defs>
        <linearGradient id="mem-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1effc" />
        </linearGradient>
        <linearGradient id="mem-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7d6df2" />
          <stop offset="1" stopColor="#4a2ade" />
        </linearGradient>
        <filter id="mem-lift" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#2a2560" floodOpacity="0.14" />
        </filter>
      </defs>

      <ellipse cx="120" cy="92" rx="102" ry="66" fill="#eeebfb" opacity="0.85" />

      {/* Three fanned records behind. */}
      <g filter="url(#mem-lift)" transform="rotate(-13 74 86)">
        <rect x="42" y="46" width="62" height="80" rx="11" fill="url(#mem-card)" />
        <rect x="54" y="62" width="34" height="4.5" rx="2.25" fill="#cfcbee" />
        <rect x="54" y="74" width="26" height="4.5" rx="2.25" fill="#e2dff5" />
        <rect x="54" y="86" width="34" height="4.5" rx="2.25" fill="#e2dff5" />
      </g>
      <g filter="url(#mem-lift)" transform="rotate(-4 110 84)">
        <rect x="80" y="40" width="64" height="84" rx="11" fill="url(#mem-card)" />
        <rect x="93" y="57" width="36" height="4.5" rx="2.25" fill="#cfcbee" />
        <rect x="93" y="69" width="28" height="4.5" rx="2.25" fill="#e2dff5" />
        <rect x="93" y="81" width="36" height="4.5" rx="2.25" fill="#e2dff5" />
        <rect x="93" y="93" width="22" height="4.5" rx="2.25" fill="#e2dff5" />
      </g>

      {/* The front card, brand-filled: the one Baymax has organised. */}
      <g filter="url(#mem-lift)" transform="rotate(6 158 88)">
        <rect x="126" y="44" width="66" height="86" rx="12" fill="url(#mem-brand)" />
        <rect x="139" y="62" width="38" height="5" rx="2.5" fill="#fff" opacity="0.9" />
        <rect x="139" y="75" width="28" height="5" rx="2.5" fill="#fff" opacity="0.6" />
        <rect x="139" y="88" width="34" height="5" rx="2.5" fill="#fff" opacity="0.6" />
        <path
          d="M139 108 l7 7 l14 -16"
          stroke="#fff"
          strokeWidth="4.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* A brain-ish knot: the "remembers for you" idea, kept abstract. */}
      <g filter="url(#mem-lift)">
        <circle cx="52" cy="34" r="17" fill="#fff" />
        <path
          d="M45 34 q0 -8 7 -8 q7 0 7 8 q0 8 -7 8 q-7 0 -7 -8 M52 26 v16 M45 30 h14 M45 38 h14"
          stroke="#8b7bf0"
          strokeWidth="1.9"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      <path d="M206 40 l2.5 6 l6 2.5 l-6 2.5 l-2.5 6 l-2.5 -6 l-6 -2.5 l6 -2.5 z" fill="#b9b2f7" opacity="0.7" />
      <path d="M28 118 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 z" fill="#b9b2f7" opacity="0.55" />
    </svg>
  );
}
