import { cn } from "@/lib/cn";

/*
 * The app's illustrations, drawn rather than cropped.
 *
 * Every one of these was previously a rectangle cut out of the design mockups.
 * That approach had three faults that could not be fixed by processing: the
 * crop carries the frame's own near-white backdrop, which shows as a pale box
 * on any tinted card; the backdrop cannot be keyed out because it sits eight
 * levels away from the mascot's white body; and the resolution is fixed at
 * whatever the mockup was exported at, so it softens on a dense display.
 *
 * Vector art has no backdrop to remove, is sharp at every density, weighs a few
 * hundred bytes, and picks up the design tokens directly.
 *
 * The mascot is original artwork built from the same primitives the frames use
 * — a rounded shell, a two-dot face, a soft lavender field — rather than a
 * trace of the character in the mockups.
 */

type ArtProps = { className?: string };

/** The face: two dots joined by a line. The whole character reads from this. */
function Face({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 7 * scale;
  const gap = 30 * scale;
  return (
    <g>
      <line
        x1={cx - gap}
        y1={cy}
        x2={cx + gap}
        y2={cy}
        stroke="#1b1c3a"
        strokeWidth={3.4 * scale}
        strokeLinecap="round"
      />
      <circle cx={cx - gap} cy={cy} r={r} fill="#1b1c3a" />
      <circle cx={cx + gap} cy={cy} r={r} fill="#1b1c3a" />
    </g>
  );
}

/** Four-point sparkle, used to give the scenes some air. */
function Sparkle({
  x,
  y,
  size,
  opacity = 0.85,
  fill = "#8f7ffa",
}: {
  x: number;
  y: number;
  size: number;
  opacity?: number;
  fill?: string;
}) {
  return (
    <path
      d={`M ${x} ${y - size} Q ${x + size * 0.22} ${y - size * 0.22} ${x + size} ${y}
          Q ${x + size * 0.22} ${y + size * 0.22} ${x} ${y + size}
          Q ${x - size * 0.22} ${y + size * 0.22} ${x - size} ${y}
          Q ${x - size * 0.22} ${y - size * 0.22} ${x} ${y - size} Z`}
      fill={fill}
      opacity={opacity}
    />
  );
}

/** The mascot: head, body, arms. Shared by every scene that needs the character. */
function Mascot({ x = 0, y = 0, s = 1 }: { x?: number; y?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Far arm, behind the body and a shade darker so it reads as depth. */}
      <path
        d="M 22 96 q -30 10 -34 40 q -2 20 16 24 q 18 3 26 -14 z"
        fill="url(#bx-shell-shade)"
      />
      <path
        d="M 138 96 q 30 10 34 40 q 2 20 -16 24 q -18 3 -26 -14 z"
        fill="url(#bx-shell-shade)"
      />

      {/* Body: a soft, wide capsule. */}
      <path
        d="M 80 62 c 44 0 62 30 62 62 c 0 34 -26 52 -62 52 c -36 0 -62 -18 -62 -52 c 0 -32 18 -62 62 -62 z"
        fill="url(#bx-shell)"
      />

      {/* The care indicator on the chest — a circle with a soft cross. */}
      <circle cx="80" cy="128" r="15" fill="none" stroke="#d8d8ea" strokeWidth="2.6" />
      <path
        d="M 80 121 v 14 M 73 128 h 14"
        stroke="#c9c9e0"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Head: wider than tall, sitting slightly over the body. */}
      <ellipse cx="80" cy="52" rx="52" ry="40" fill="url(#bx-shell)" />
      <Face cx={80} cy={52} />
    </g>
  );
}

/**
 * The hero scene: the mascot with the app's four promises floating around it.
 * Used on the splash and the first carousel panel.
 */
export function HeroScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 320 240" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      {/* The field. An organic blob, not a rectangle — there is no edge to hide. */}
      <path
        d="M 60 44 q 46 -34 104 -18 q 58 16 84 62 q 24 44 -6 82 q -30 38 -92 44 q -62 6 -104 -26 q -42 -32 -30 -80 q 12 -48 44 -64 z"
        fill="url(#bx-field)"
        opacity="0.32"
      />

      <Sparkle x={48} y={70} size={9} opacity={0.6} />
      <Sparkle x={272} y={88} size={7} opacity={0.5} />
      <Sparkle x={262} y={182} size={10} opacity={0.45} />
      <Sparkle x={58} y={186} size={6} opacity={0.4} />

      <g filter="url(#bx-lift)">
        <Mascot x={82} y={34} s={0.94} />
      </g>

      {/* Floating chips. Small, tilted, and lifted off the field. */}
      <g filter="url(#bx-lift-sm)" transform="rotate(-8 74 84)">
        <rect x="30" y="60" width="58" height="46" rx="14" fill="url(#bx-card)" />
        <path d="M 46 78 h 12 l 4 5 h 14 v 12 a 3 3 0 0 1 -3 3 H 49 a 3 3 0 0 1 -3 -3 z" fill="#7b63f8" />
      </g>

      <g filter="url(#bx-lift-sm)" transform="rotate(9 250 84)">
        <rect x="228" y="58" width="58" height="46" rx="14" fill="url(#bx-card)" />
        <path d="M 257 74 l 13 5 v 9 c 0 8 -6 13 -13 15 c -7 -2 -13 -7 -13 -15 v -9 z" fill="url(#bx-safe)" />
        <path d="M 252 87 l 4 4 l 7 -8" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <g filter="url(#bx-lift-sm)" transform="rotate(-6 66 168)">
        <rect x="22" y="146" width="58" height="46" rx="14" fill="url(#bx-card)" />
        <path
          d="M 40 165 c 0 -6 8 -9 11 -3 c 3 -6 11 -3 11 3 c 0 7 -11 13 -11 13 s -11 -6 -11 -13 z"
          fill="url(#bx-warm)"
        />
      </g>

      <g filter="url(#bx-lift-sm)" transform="rotate(7 256 170)">
        <rect x="234" y="148" width="58" height="46" rx="14" fill="url(#bx-card)" />
        <path d="M 248 162 h 30 a 5 5 0 0 1 5 5 v 12 a 5 5 0 0 1 -5 5 h -18 l -8 7 v -7 h -4 a 5 5 0 0 1 -5 -5 v -12 a 5 5 0 0 1 5 -5 z" fill="url(#bx-brand)" />
        <Sparkle x={263} y={173} size={5} fill="#ffffff" opacity={0.95} />
      </g>
    </svg>
  );
}

/**
 * The mascot with a status badge, for the safety escalation.
 *
 * `alert` raises a hand and carries a warning triangle; `care` holds a phone
 * beside a medical cross; `done` is the same figure with a green tick. The
 * field behind turns pink for the first two and green for the last, which is
 * the one place in this app where the semantic palette is allowed to be
 * decorative — because on that screen it is not decoration.
 */
export function MascotAlert({
  badge,
  className,
}: ArtProps & { badge: "alert" | "care" | "done" }) {
  const field = badge === "done" ? "url(#bx-field-safe)" : "url(#bx-field-alert)";

  return (
    <svg viewBox="0 0 210 160" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 54 34 q 42 -28 92 -12 q 50 16 54 56 q 4 38 -44 50 q -60 14 -100 -6 q -40 -20 -28 -54 q 10 -24 26 -34 z"
        fill={field}
        opacity="0.55"
      />
      <Sparkle x={40} y={44} size={7} opacity={0.55} fill={badge === "done" ? "#4fd08a" : "#ff8a97"} />
      <Sparkle x={186} y={116} size={6} opacity={0.5} fill={badge === "done" ? "#4fd08a" : "#ff8a97"} />

      <g filter="url(#bx-lift)">
        <g transform="translate(20 14) scale(0.74)">
          {/* Raised hand — the gesture reads as "stop" without any text. */}
          {badge !== "care" ? (
            <g>
              <path d="M 14 92 q -26 6 -32 30 q -4 18 12 22 q 16 4 24 -12 z" fill="url(#bx-shell-shade)" />
              <path d="M -14 96 q -8 -18 -2 -28 q 5 -8 10 2 l 6 14 z" fill="url(#bx-shell-shade)" />
            </g>
          ) : null}

          <path d="M 80 62 c 44 0 62 30 62 62 c 0 34 -26 52 -62 52 c -36 0 -62 -18 -62 -52 c 0 -32 18 -62 62 -62 z" fill="url(#bx-shell)" />
          <circle cx="80" cy="128" r="13" fill="none" stroke="#dcdcec" strokeWidth="2.4" />
          <ellipse cx="80" cy="52" rx="52" ry="40" fill="url(#bx-shell)" />
          <Face cx={80} cy={52} />

          {/* A phone, for the step that is about making a call. */}
          {badge === "care" ? (
            <g>
              <rect x="112" y="104" width="34" height="52" rx="8" fill="url(#bx-alert)" transform="rotate(-8 129 130)" />
              <path
                d="M 124 118 l 5 -3 l 5 7 l -4 3 c 2 5 5 8 10 10 l 3 -4 l 7 5 l -3 5 c -10 2 -22 -10 -23 -23 z"
                fill="#fff"
                transform="rotate(-8 129 130)"
              />
              <path d="M 100 118 q 18 -10 30 -4 q 6 4 0 10 q -14 -4 -28 2 z" fill="url(#bx-shell-shade)" />
            </g>
          ) : null}
        </g>
      </g>

      {/* The badge, lifted clear of the figure. */}
      <g filter="url(#bx-lift-sm)">
        {badge === "alert" ? (
          <>
            <path d="M 158 26 a 11 11 0 0 1 18 0 l 28 47 a 11 11 0 0 1 -9 16 h -56 a 11 11 0 0 1 -9 -16 z" fill="url(#bx-alert)" />
            <path d="M 167 47 v 17" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            <circle cx="167" cy="76" r="3.6" fill="#fff" />
          </>
        ) : badge === "care" ? (
          <>
            <circle cx="170" cy="50" r="29" fill="url(#bx-alert)" />
            <path d="M 170 36 v 28 M 156 50 h 28" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="170" cy="50" r="29" fill="url(#bx-safe)" />
            <path
              d="M 158 50 l 9 9 l 16 -17"
              stroke="#fff"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

/** A compact mascot bust. For the Ask panel and the auth header. */
export function MascotBust({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 48 40 q 40 -30 92 -14 q 50 16 56 58 q 4 40 -44 52 q -60 14 -104 -6 q -44 -20 -30 -56 q 10 -26 30 -34 z"
        fill="url(#bx-field)"
        opacity="0.3"
      />
      <Sparkle x={36} y={52} size={8} opacity={0.55} />
      <Sparkle x={172} y={40} size={6} opacity={0.5} />
      <Sparkle x={178} y={110} size={7} opacity={0.4} />

      <g filter="url(#bx-lift)">
        <g transform="translate(20 26) scale(0.72)">
          <path d="M 80 62 c 44 0 62 30 62 62 c 0 34 -26 52 -62 52 c -36 0 -62 -18 -62 -52 c 0 -32 18 -62 62 -62 z" fill="url(#bx-shell)" />
          <ellipse cx="80" cy="52" rx="52" ry="40" fill="url(#bx-shell)" />
          <Face cx={80} cy={52} />
        </g>
      </g>
    </svg>
  );
}

/** The mascot holding a document. For the upload and processing screens. */
export function UploadScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 54 40 q 44 -30 96 -14 q 52 16 62 60 q 8 40 -40 56 q -62 20 -110 -2 q -48 -22 -34 -60 q 10 -28 26 -40 z"
        fill="url(#bx-field)"
        opacity="0.3"
      />
      <Sparkle x={36} y={54} size={8} opacity={0.5} />
      <Sparkle x={210} y={46} size={6} opacity={0.5} />
      <Sparkle x={206} y={148} size={8} opacity={0.4} />

      <g filter="url(#bx-lift)">
        <g transform="translate(38 22) scale(0.68)">
          <path d="M 80 62 c 44 0 62 30 62 62 c 0 34 -26 52 -62 52 c -36 0 -62 -18 -62 -52 c 0 -32 18 -62 62 -62 z" fill="url(#bx-shell)" />
          <ellipse cx="80" cy="52" rx="52" ry="40" fill="url(#bx-shell)" />
          <Face cx={80} cy={52} />
        </g>
      </g>

      {/* The document, tilted and lifted so it reads as held rather than pasted. */}
      <g filter="url(#bx-lift-sm)" transform="rotate(-7 158 118)">
        <rect x="126" y="72" width="66" height="86" rx="10" fill="url(#bx-paper)" />
        <rect x="138" y="88" width="42" height="5" rx="2.5" fill="#c9c6e8" />
        <rect x="138" y="101" width="34" height="5" rx="2.5" fill="#d6d3ee" />
        <rect x="138" y="114" width="42" height="5" rx="2.5" fill="#d6d3ee" />
        <rect x="138" y="127" width="26" height="5" rx="2.5" fill="#d6d3ee" />
      </g>

      {/* The upward cue: this screen is about sending something in. */}
      <g filter="url(#bx-lift-sm)">
        <circle cx="196" cy="66" r="21" fill="url(#bx-brand)" />
        <path
          d="M 196 76 v -19 m 0 0 l -7 7 m 7 -7 l 7 7"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}

/** Bell and calendar. The Home insight card. */
export function ReminderScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 46 36 q 40 -28 88 -12 q 48 16 54 56 q 4 38 -42 50 q -58 14 -98 -6 q -40 -20 -28 -54 q 10 -24 26 -34 z"
        fill="url(#bx-field)"
        opacity="0.34"
      />

      <g filter="url(#bx-lift)">
        {/*
         * The bell is drawn as three explicit pieces — crown loop, body, clapper
         * — rather than one clever path. The first attempt tried to describe the
         * whole silhouette in a single curve and rendered as a blob.
         */}
        <path
          d="M 82 40 a 9 9 0 0 1 18 0 a 9 9 0 0 1 -18 0 z"
          fill="none"
          stroke="url(#bx-field)"
          strokeWidth="7"
        />
        {/* Body: straight-ish shoulders, flaring to a wide skirt, flat rim. */}
        <path
          d="M 91 48
             c -22 0 -34 18 -36 44
             c -1.6 18 -6 28 -13 34
             a 4 4 0 0 0 3 7
             h 92
             a 4 4 0 0 0 3 -7
             c -7 -6 -11.4 -16 -13 -34
             c -2 -26 -14 -44 -36 -44 z"
          fill="url(#bx-field)"
        />
        <path d="M 78 133 a 13 13 0 0 0 26 0 z" fill="url(#bx-field)" />
      </g>

      {/* Calendar, overlapping the bell's lower right. */}
      <g filter="url(#bx-lift-sm)">
        <rect x="116" y="86" width="68" height="64" rx="13" fill="url(#bx-card)" />
        <path d="M 116 99 a 13 13 0 0 1 13 -13 h 42 a 13 13 0 0 1 13 13 v 4 h -68 z" fill="#ded9fb" />
        <rect x="130" y="78" width="7" height="17" rx="3.5" fill="#9d94ee" />
        <rect x="163" y="78" width="7" height="17" rx="3.5" fill="#9d94ee" />
        <text
          x="150"
          y="136"
          textAnchor="middle"
          fontSize="29"
          fontWeight="700"
          fill="#2a2a4d"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          15
        </text>
      </g>

      <Sparkle x={34} y={52} size={7} opacity={0.5} />
      <Sparkle x={176} y={40} size={6} opacity={0.45} />
    </svg>
  );
}

/** A single person. The "just me" option. */
export function PersonScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 120 140" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <circle cx="60" cy="70" r="52" fill="url(#bx-field)" opacity="0.3" />
      <g filter="url(#bx-lift-sm)">
        <circle cx="60" cy="52" r="22" fill="url(#bx-card)" />
        <path d="M 24 108 c 0 -20 16 -32 36 -32 s 36 12 36 32 z" fill="url(#bx-card)" />
        <path d="M 60 34 a 22 22 0 0 1 21 16 h -42 a 22 22 0 0 1 21 -16 z" fill="#b9b2f7" />
      </g>
      <g filter="url(#bx-lift-sm)">
        <circle cx="94" cy="94" r="17" fill="url(#bx-safe)" />
        <path d="M 87 94 l 5 5 l 9 -10" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Three people. The "my family" option. */
export function FamilyScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 140 140" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <circle cx="70" cy="72" r="56" fill="url(#bx-field)" opacity="0.3" />

      {/* The two behind, smaller and set back. */}
      <g opacity="0.9">
        <circle cx="34" cy="60" r="16" fill="url(#bx-shell-shade)" />
        <path d="M 8 104 c 0 -15 12 -24 26 -24 s 26 9 26 24 z" fill="url(#bx-shell-shade)" />
      </g>
      <g opacity="0.9">
        <circle cx="106" cy="60" r="16" fill="url(#bx-shell-shade)" />
        <path d="M 80 104 c 0 -15 12 -24 26 -24 s 26 9 26 24 z" fill="url(#bx-shell-shade)" />
      </g>

      <g filter="url(#bx-lift-sm)">
        <circle cx="70" cy="58" r="21" fill="url(#bx-card)" />
        <path d="M 36 112 c 0 -19 15 -30 34 -30 s 34 11 34 30 z" fill="url(#bx-card)" />
        <path d="M 70 41 a 21 21 0 0 1 20 15 h -40 a 21 21 0 0 1 20 -15 z" fill="#b9b2f7" />
      </g>

      <g filter="url(#bx-lift-sm)">
        <circle cx="108" cy="106" r="17" fill="url(#bx-brand)" />
        <path
          d="M 108 98 v 16 M 100 106 h 16"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** A shield over a record. The privacy panel. */
export function PrivacyScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 52 38 q 42 -28 92 -12 q 50 16 56 56 q 4 38 -44 52 q -60 16 -102 -6 q -42 -22 -28 -56 q 10 -24 26 -34 z"
        fill="url(#bx-field)"
        opacity="0.3"
      />

      <g filter="url(#bx-lift-sm)" transform="rotate(-6 92 100)">
        <rect x="58" y="52" width="70" height="92" rx="12" fill="url(#bx-paper)" />
        <rect x="72" y="70" width="42" height="5" rx="2.5" fill="#cfcbee" />
        <rect x="72" y="83" width="32" height="5" rx="2.5" fill="#ddd9f2" />
        <rect x="72" y="96" width="42" height="5" rx="2.5" fill="#ddd9f2" />
      </g>

      <g filter="url(#bx-lift)">
        <path
          d="M 158 44 l 40 15 v 40 c 0 32 -22 48 -40 54 c -18 -6 -40 -22 -40 -54 V 59 z"
          fill="url(#bx-brand)"
        />
        <path
          d="M 142 96 l 12 12 l 22 -26"
          stroke="#fff"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <Sparkle x={40} y={56} size={8} opacity={0.5} />
      <Sparkle x={214} y={132} size={7} opacity={0.42} />
    </svg>
  );
}

/** Stacked records with a rising trend. The insights panel. */
export function InsightsScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <path
        d="M 50 40 q 44 -30 96 -14 q 52 16 58 58 q 6 38 -42 54 q -60 18 -106 -4 q -46 -22 -32 -58 q 10 -26 26 -36 z"
        fill="url(#bx-field)"
        opacity="0.3"
      />

      <g filter="url(#bx-lift-sm)">
        <rect x="52" y="46" width="136" height="96" rx="16" fill="url(#bx-card)" />
        {/* Bars, rising left to right. */}
        <rect x="74" y="102" width="18" height="24" rx="6" fill="#cfc9f8" />
        <rect x="102" y="88" width="18" height="38" rx="6" fill="#b0a6f4" />
        <rect x="130" y="72" width="18" height="54" rx="6" fill="#8b7bf0" />
        <rect x="158" y="60" width="18" height="66" rx="6" fill="url(#bx-brand)" />
      </g>

      <g filter="url(#bx-lift-sm)">
        <circle cx="188" cy="52" r="19" fill="url(#bx-safe)" />
        <path
          d="M 179 56 l 6 -7 l 5 5 l 8 -10"
          stroke="#fff"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <Sparkle x={38} y={62} size={8} opacity={0.5} />
      <Sparkle x={214} y={138} size={7} opacity={0.4} />
    </svg>
  );
}
