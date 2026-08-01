import { Check, Plus } from "lucide-react";

import { cn } from "@/lib/cn";
import { castFaces } from "@/lib/profiles/avatar";

/*
 * The app's illustrations, drawn rather than cropped.
 *
 * ---------------------------------------------------------------------------
 * THIRD PASS. What was wrong, and what changed.
 *
 * The mascot kept reading as a snowman with a stain behind it. Three actual
 * causes, none of them shading:
 *
 *   1. THE ARMS WERE BEING CLIPPED. The old arm paths ran to x = -12 in a
 *      viewBox starting at 0, so they were cut off entirely and the figure
 *      rendered as two stacked ellipses. It was never drawn without arms on
 *      purpose — it just never showed them.
 *
 *   2. THE BACKDROP HAD A HARD EDGE. `bx-field` was an amorphous blob path with
 *      a solid fill, so the eye found its boundary and read a second object —
 *      the "weird egg shape around it". Backdrops are now edgeless radial glows
 *      that fade to full transparency (`Glow` below).
 *
 *   3. THE HEAD AND BODY WERE THE SAME SHAPE at different sizes, which is the
 *      definition of a snowman. The head is now wide and flat, the body a bean
 *      that is widest low down, and there are visible arms and feet.
 *
 * ONE SOURCE OF GEOMETRY. Four separate components used to paste their own copy
 * of the mascot paths inline, which is exactly how the design drifted between
 * screens. `MascotHead`, `MascotBody` and `Mascot` are now the only places those
 * curves exist; every scene composes them.
 * ---------------------------------------------------------------------------
 */

type ArtProps = { className?: string };

/**
 * An edgeless backdrop. Replaces the old blob paths.
 *
 * `bx-glow` fades to zero alpha, so there is no boundary for the eye to latch
 * onto — it reads as light in the air rather than a shape lying behind the
 * subject.
 */
function Glow({
  cx,
  cy,
  rx,
  ry,
  fill = "url(#bx-glow)",
  opacity = 1,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fill?: string;
  opacity?: number;
}) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} opacity={opacity} />;
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

/* ------------------------------------------------------------- the mascot --- */

/*
 * Local coordinate space for every mascot part: 200 wide, 212 tall, feet at
 * y≈198 and the ground at y≈204. Scenes translate/scale this whole box.
 */

const HEAD_PATH =
  "M 100 18 C 144 18 154 36 154 56 C 154 78 133 92 100 92 C 67 92 46 78 46 56 C 46 36 56 18 100 18 Z";

/*
 * Narrower at the shoulders than at the belly. When the body was a symmetric
 * oval it read as the head again at a larger size, which is the definition of a
 * snowman — the taper is what makes the two forms different objects.
 */
const BODY_PATH =
  "M 100 84 C 133 84 154 110 156 144 C 158 174 132 192 100 192 C 68 192 42 174 44 144 C 46 110 67 84 100 84 Z";

/** The face: two dots joined by a line. The whole character reads from this. */
function Face({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 7.5 * scale;
  const gap = 29 * scale;
  return (
    <g>
      <line
        x1={cx - gap}
        y1={cy}
        x2={cx + gap}
        y2={cy}
        stroke="#191a38"
        strokeWidth={3.6 * scale}
        strokeLinecap="round"
      />
      <circle cx={cx - gap} cy={cy} r={r} fill="#191a38" />
      <circle cx={cx + gap} cy={cy} r={r} fill="#191a38" />
    </g>
  );
}

/**
 * The head, with its full material stack.
 *
 * Order matters and is the same on every form: base radial → rim occlusion →
 * ground bounce → specular. Reordering these flattens it.
 */
function MascotHead() {
  return (
    <g>
      <path d={HEAD_PATH} fill="url(#bx-shell)" />
      <path d={HEAD_PATH} fill="url(#bx-ao)" />
      <path d={HEAD_PATH} fill="url(#bx-bounce)" opacity="0.45" />
      <ellipse
        cx="74"
        cy="38"
        rx="20"
        ry="12"
        fill="url(#bx-spec)"
        filter="url(#bx-blur)"
        opacity="0.95"
      />
      <Face cx={100} cy={56} />
    </g>
  );
}

/**
 * The torso.
 *
 * Deliberately unmarked. A debossed chest port was tried and read as a navel —
 * the real character's access port is tiny and under the armour, so at 100px it
 * contributes nothing but a dimple in the middle of the brightest part of the
 * form.
 */
function MascotBody() {
  return (
    <g>
      <path d={BODY_PATH} fill="url(#bx-shell)" />
      <path d={BODY_PATH} fill="url(#bx-ao)" />
      <path d={BODY_PATH} fill="url(#bx-bounce)" opacity="0.85" />
      <ellipse
        cx="70"
        cy="122"
        rx="17"
        ry="26"
        fill="url(#bx-spec)"
        filter="url(#bx-blur)"
        opacity="0.6"
      />
    </g>
  );
}

/** A mitten hand. Wider than the arm, so the limb reads as ending in something. */
function Hand({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx="16" ry="15" fill="url(#bx-shell-shade)" />
      <ellipse cx={cx} cy={cy} rx="16" ry="15" fill="url(#bx-ao)" />
      <ellipse
        cx={cx - 5}
        cy={cy - 5}
        rx="6"
        ry="5"
        fill="url(#bx-spec)"
        filter="url(#bx-blur-sm)"
        opacity="0.8"
      />
    </g>
  );
}

/**
 * The full figure.
 *
 * `wave` raises the right arm, which is the pose the reference frames use and
 * the one that reads as friendly at small sizes.
 */
function Mascot({
  x = 0,
  y = 0,
  s = 1,
  wave = false,
}: {
  x?: number;
  y?: number;
  s?: number;
  wave?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* Ground contact first, so everything sits on top of it. */}
      <ellipse cx="100" cy="208" rx="72" ry="10" fill="url(#bx-ground)" />

      {/*
       * Feet are wide ellipses, not round-capped strokes. As strokes they were
       * narrow enough that only the cap showed below the body, and two dark
       * points poking out under a white torso read unmistakably as claws.
       * A foot has to be wider than it is tall or it is a toe.
       */}
      <ellipse cx="74" cy="196" rx="22" ry="13" fill="url(#bx-shell-shade)" />
      <ellipse cx="126" cy="196" rx="22" ry="13" fill="url(#bx-shell-shade)" />
      <ellipse cx="74" cy="196" rx="22" ry="13" fill="url(#bx-ao)" />
      <ellipse cx="126" cy="196" rx="22" ry="13" fill="url(#bx-ao)" />

      {/*
       * Arms sit further out than the torso's widest point so there is daylight
       * between limb and body. Tucked closer, they merged into the silhouette
       * and read as lumps rather than arms.
       */}
      <g stroke="url(#bx-shell-shade)" strokeWidth="26" strokeLinecap="round" fill="none">
        <path d="M 64 112 C 40 122 28 144 31 168" />
        {wave ? (
          <path d="M 140 106 C 162 94 172 74 172 56" />
        ) : (
          <path d="M 136 112 C 160 122 172 144 169 168" />
        )}
      </g>
      {wave ? <Hand cx={172} cy={52} /> : <Hand cx={169} cy={172} />}
      <Hand cx={31} cy={172} />

      <MascotBody />

      {/* Where the head sits ON the body. Without this the head floats. */}
      <ellipse
        cx="100"
        cy="88"
        rx="44"
        ry="12"
        fill="#312a6b"
        opacity="0.11"
        filter="url(#bx-blur)"
      />

      <MascotHead />
    </g>
  );
}

/**
 * Head, shoulders and a raised hand — the small-format mascot used in card
 * corners across the app.
 *
 * Composed from the same `MascotHead` as the full figure so the character
 * cannot drift between the two. The body is cropped by the viewBox bottom
 * deliberately: at 90–140px wide a whole figure loses the face, and the face is
 * the only part that carries the character.
 */
export function MascotBust({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 200 150" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={100} cy={72} rx={98} ry={72} />

      <Sparkle x={30} y={44} size={7} opacity={0.5} />
      <Sparkle x={182} y={30} size={5.5} opacity={0.45} />
      <Sparkle x={188} y={104} size={6.5} opacity={0.35} />

      <g filter="url(#bx-lift)">
        {/*
         * The waving arm STARTS AT THE SHOULDER (y 118), below the head's lower
         * edge at y 92, and swings outward before it rises. Anchored higher and
         * closer, it looped from the head's side back up beside it and read
         * unmistakably as a teapot handle.
         */}
        <g stroke="url(#bx-shell-shade)" strokeWidth="24" strokeLinecap="round" fill="none">
          <path d="M 140 122 C 162 116 174 92 175 68" />
        </g>
        <Hand cx={175} cy={62} />

        {/* Shoulders, running off the bottom edge. */}
        <path
          d="M 100 86 C 133 86 154 110 157 150 L 43 150 C 46 110 67 86 100 86 Z"
          fill="url(#bx-shell)"
        />
        <path
          d="M 100 86 C 133 86 154 110 157 150 L 43 150 C 46 110 67 86 100 86 Z"
          fill="url(#bx-ao)"
        />

        <ellipse
          cx="100"
          cy="90"
          rx="42"
          ry="12"
          fill="#312a6b"
          opacity="0.11"
          filter="url(#bx-blur)"
        />

        <MascotHead />
      </g>
    </svg>
  );
}

/**
 * The hero scene: the mascot waving, with the app's promises floating around it.
 * Used on the splash and the first carousel panel.
 */
export function HeroScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 320 240" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={160} cy={120} rx={150} ry={112} />

      <Sparkle x={44} y={66} size={9} opacity={0.55} />
      <Sparkle x={278} y={82} size={7} opacity={0.45} />
      <Sparkle x={266} y={186} size={9} opacity={0.4} />
      <Sparkle x={54} y={190} size={6} opacity={0.35} />

      <g filter="url(#bx-lift)">
        <Mascot x={78} y={14} s={0.92} wave />
      </g>

      {/* Floating chips. Small, tilted, and lifted off the glow. */}
      <g filter="url(#bx-lift-sm)" transform="rotate(-8 66 88)">
        <rect x="22" y="66" width="56" height="46" rx="14" fill="url(#bx-card)" />
        <path
          d="M 38 84 h 12 l 4 5 h 12 v 12 a 3 3 0 0 1 -3 3 H 41 a 3 3 0 0 1 -3 -3 z"
          fill="#7b63f8"
        />
      </g>

      <g filter="url(#bx-lift-sm)" transform="rotate(9 258 132)">
        <rect x="234" y="110" width="56" height="46" rx="14" fill="url(#bx-card)" />
        <path
          d="M 262 122 l 13 5 v 12 c 0 9 -6 14 -13 16 c -7 -2 -13 -7 -13 -16 v -12 z"
          fill="url(#bx-safe)"
        />
      </g>
    </svg>
  );
}

/**
 * The mascot on the emergency escalation, with a state badge.
 *
 * Semantic red is used decoratively here and nowhere else, because on that
 * screen it is not decoration.
 */
export function MascotAlert({
  badge,
  className,
}: ArtProps & { badge: "alert" | "care" | "done" }) {
  const field = badge === "done" ? "url(#bx-field-safe)" : "url(#bx-field-alert)";
  const sparkle = badge === "done" ? "#4fd08a" : "#ff8a97";

  return (
    <svg viewBox="0 0 210 160" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={100} cy={80} rx={104} ry={78} fill={field} />

      <Sparkle x={30} y={38} size={7} opacity={0.55} fill={sparkle} />
      <Sparkle x={190} y={126} size={6} opacity={0.5} fill={sparkle} />

      <g filter="url(#bx-lift)">
        {/* `wave` doubles as the raised "stop" hand on the alert step. */}
        <g transform="translate(-6 -12) scale(0.7)">
          <Mascot wave={badge !== "care"} />
        </g>
      </g>

      {/* A phone, for the step that is about making a call. */}
      {badge === "care" ? (
        <g filter="url(#bx-lift-sm)" transform="rotate(-8 96 108)">
          <rect x="82" y="84" width="28" height="44" rx="7" fill="url(#bx-alert)" />
          <path
            d="M 91 96 l 4 -2 l 4 6 l -3 2 c 1.6 4 4 6.4 8 8 l 2 -3 l 6 4 l -2 4 c -8 1.6 -18 -8 -19 -19 z"
            fill="#fff"
          />
        </g>
      ) : null}

      {/* The badge, lifted clear of the figure. */}
      <g filter="url(#bx-lift-sm)">
        {badge === "alert" ? (
          <>
            <path
              d="M 158 26 a 11 11 0 0 1 18 0 l 28 47 a 11 11 0 0 1 -9 16 h -56 a 11 11 0 0 1 -9 -16 z"
              fill="url(#bx-alert)"
            />
            <path d="M 167 47 v 17" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
            <circle cx="167" cy="76" r="3.6" fill="#fff" />
          </>
        ) : badge === "care" ? (
          <>
            <circle cx="172" cy="48" r="28" fill="url(#bx-alert)" />
            <path d="M 172 34 v 28 M 158 48 h 28" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="172" cy="48" r="28" fill="url(#bx-safe)" />
            <path
              d="M 160 48 l 9 9 l 16 -17"
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

/** The mascot holding out a document. The upload screen. */
export function UploadScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={116} cy={100} rx={116} ry={94} />

      <Sparkle x={30} y={50} size={8} opacity={0.5} />
      <Sparkle x={216} y={40} size={6} opacity={0.45} />
      <Sparkle x={212} y={152} size={8} opacity={0.35} />

      <g filter="url(#bx-lift)">
        <g transform="translate(14 6) scale(0.72)">
          <Mascot />
        </g>
      </g>

      {/* The document, tilted and lifted so it reads as held rather than pasted. */}
      <g filter="url(#bx-lift-sm)" transform="rotate(-7 166 116)">
        <rect x="134" y="70" width="66" height="86" rx="11" fill="url(#bx-paper)" />
        <rect x="134" y="70" width="66" height="86" rx="11" fill="url(#bx-ao)" />
        <rect x="146" y="86" width="42" height="5" rx="2.5" fill="#c6c2e6" />
        <rect x="146" y="99" width="34" height="5" rx="2.5" fill="#d8d5ef" />
        <rect x="146" y="112" width="42" height="5" rx="2.5" fill="#d8d5ef" />
        <rect x="146" y="125" width="26" height="5" rx="2.5" fill="#d8d5ef" />
      </g>

      {/* The upward cue: this screen is about sending something in. */}
      <g filter="url(#bx-lift-sm)">
        <circle cx="204" cy="62" r="21" fill="url(#bx-purple)" />
        <circle cx="204" cy="62" r="21" fill="url(#bx-ao)" />
        <path
          d="M 204 72 v -19 m 0 0 l -7 7 m 7 -7 l 7 7"
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

/**
 * A bell and a calendar. Reminders and notifications.
 *
 * The bell is built as ONE silhouette with a separate lip bar rather than a
 * dome plus a skirt: two adjoining filled shapes always showed a seam where
 * their anti-aliased edges met, and at 100px that seam was most of why the
 * previous version read as a blob. The lip is what makes it a bell rather than
 * a purple mound — a real bell has visible metal thickness at the bottom, and a
 * darker band there does the whole job.
 */
export function ReminderScene({ className }: ArtProps) {
  const BELL =
    "M 88 44 C 64 44 52 66 51 98 C 50 116 44 128 36 134 C 32 137 34 142 39 142 H 137 C 142 142 144 137 140 134 C 132 128 126 116 125 98 C 124 66 112 44 88 44 Z";

  return (
    <svg viewBox="0 0 200 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={96} cy={90} rx={100} ry={84} />

      <g filter="url(#bx-lift)">
        <ellipse cx="88" cy="166" rx="54" ry="9" fill="url(#bx-ground)" />

        {/* Crown loop. */}
        <circle cx="88" cy="33" r="9" fill="none" stroke="url(#bx-purple)" strokeWidth="6.5" />

        {/* Body, then rim darkening, then the sheen down the lit side. */}
        <path d={BELL} fill="url(#bx-purple)" />
        <path d={BELL} fill="url(#bx-ao)" />
        <ellipse
          cx="68"
          cy="80"
          rx="10"
          ry="24"
          fill="url(#bx-spec)"
          filter="url(#bx-blur)"
          opacity="0.8"
          transform="rotate(-10 68 80)"
        />

        {/* The lip: the metal's thickness, and an inner shadow just above it. */}
        <rect x="39" y="129" width="98" height="5" fill="#4a37bd" opacity="0.22" filter="url(#bx-blur-sm)" />
        <path
          d="M 39 132 H 137 C 142 132 144 137 140 140 C 138 141.4 137 142 137 142 H 39 C 39 142 38 141.4 36 140 C 32 137 34 132 39 132 Z"
          fill="url(#bx-purple-deep)"
        />
        <path
          d="M 42 134 H 134"
          stroke="#ffffff"
          strokeOpacity="0.28"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* Clapper, hanging below. */}
        <circle cx="88" cy="150" r="11" fill="url(#bx-purple)" />
        <circle cx="88" cy="150" r="11" fill="url(#bx-ao)" />
        <ellipse cx="84" cy="145" rx="4" ry="3" fill="#fff" opacity="0.4" filter="url(#bx-blur-sm)" />
      </g>

      {/* Calendar, overlapping the bell's lower right. */}
      <g filter="url(#bx-lift-sm)">
        <rect x="118" y="84" width="68" height="64" rx="14" fill="url(#bx-card)" />
        <rect x="118" y="84" width="68" height="64" rx="14" fill="url(#bx-ao)" />
        <path
          d="M 118 98 a 14 14 0 0 1 14 -14 h 40 a 14 14 0 0 1 14 14 v 5 h -68 z"
          fill="url(#bx-purple)"
        />
        <rect x="132" y="76" width="7" height="17" rx="3.5" fill="#8f83ea" />
        <rect x="165" y="76" width="7" height="17" rx="3.5" fill="#8f83ea" />
        <ellipse
          cx="136"
          cy="116"
          rx="10"
          ry="13"
          fill="url(#bx-spec)"
          filter="url(#bx-blur-sm)"
          opacity="0.65"
        />
        <text
          x="152"
          y="136"
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fill="#2a2a4d"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          15
        </text>
      </g>

      <Sparkle x={28} y={48} size={7} opacity={0.5} />
      <Sparkle x={180} y={36} size={6} opacity={0.4} />
    </svg>
  );
}

/*
 * The two "who is this for" scenes.
 *
 * These were abstract grey figure silhouettes — a head-and-shoulders blob per
 * person. Next to the generated faces used in the switcher, on A4, and on every
 * profile row, they read as a different app: the whole point of generating
 * distinct faces is that people are recognisable, and a featureless silhouette
 * is the opposite of that. They now use the same `micah` cast as everything
 * else, so there is exactly one visual idea of "a person" in the product.
 */

/** A single person. The "just me" option. */
export function PersonScene({ className }: ArtProps) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[150px]", className)}>
      <span className="absolute inset-0 rounded-pill bg-brand-100/50 blur-[2px]" aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
      <img
        src={castFaces(1)[0]}
        alt=""
        className="absolute left-1/2 top-1/2 h-[68%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-pill object-cover shadow-e2 ring-[3px] ring-white"
      />
      <span className="absolute bottom-[8%] right-[8%] grid h-[26%] w-[26%] place-items-center rounded-pill bg-safe text-white shadow-e1">
        <Check className="h-[55%] w-[55%]" strokeWidth={3.5} aria-hidden />
      </span>
    </div>
  );
}

/** Three people. The "my family" option. */
export function FamilyScene({ className }: ArtProps) {
  const faces = castFaces(3);

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[170px]", className)}>
      <span className="absolute inset-0 rounded-pill bg-brand-100/50 blur-[2px]" aria-hidden />

      {/* Two set back and slightly lower, one forward and centred — a group
          rather than a row, same composition as the A4 cluster. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
      <img
        src={faces[1]}
        alt=""
        className="absolute left-[4%] top-[26%] h-[42%] w-[42%] rounded-pill object-cover shadow-e1 ring-[3px] ring-white"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
      <img
        src={faces[2]}
        alt=""
        className="absolute right-[4%] top-[26%] h-[42%] w-[42%] rounded-pill object-cover shadow-e1 ring-[3px] ring-white"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
      <img
        src={faces[0]}
        alt=""
        className="absolute left-1/2 top-[40%] h-[52%] w-[52%] -translate-x-1/2 rounded-pill object-cover shadow-e2 ring-[3px] ring-white"
      />

      <span className="absolute bottom-[4%] right-[4%] grid h-[26%] w-[26%] place-items-center rounded-pill bg-brand-600 text-white shadow-e1">
        <Plus className="h-[55%] w-[55%]" strokeWidth={3.5} aria-hidden />
      </span>
    </div>
  );
}

/** A shield over a record. The privacy panel. */
export function PrivacyScene({ className }: ArtProps) {
  const SHIELD = "M 158 44 l 42 16 v 40 c 0 33 -23 50 -42 56 c -19 -6 -42 -23 -42 -56 V 60 z";

  return (
    <svg viewBox="0 0 240 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={124} cy={92} rx={116} ry={86} />

      <g filter="url(#bx-lift-sm)" transform="rotate(-7 92 100)">
        <rect x="56" y="50" width="72" height="94" rx="13" fill="url(#bx-paper)" />
        <rect x="56" y="50" width="72" height="94" rx="13" fill="url(#bx-ao)" />
        <rect x="70" y="70" width="44" height="5.5" rx="2.75" fill="#c6c2e6" />
        <rect x="70" y="84" width="34" height="5.5" rx="2.75" fill="#d8d5ef" />
        <rect x="70" y="98" width="44" height="5.5" rx="2.75" fill="#d8d5ef" />
        <rect x="70" y="112" width="28" height="5.5" rx="2.75" fill="#d8d5ef" />
      </g>

      <g filter="url(#bx-lift)">
        <path d={SHIELD} fill="url(#bx-purple)" />
        <path d={SHIELD} fill="url(#bx-ao)" />
        <ellipse
          cx="140"
          cy="72"
          rx="12"
          ry="20"
          fill="url(#bx-spec)"
          filter="url(#bx-blur)"
          opacity="0.7"
          transform="rotate(-14 140 72)"
        />
        <path
          d="M 142 98 l 12 12 l 22 -26"
          stroke="#fff"
          strokeWidth="6.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <Sparkle x={34} y={54} size={8} opacity={0.5} />
      <Sparkle x={214} y={134} size={7} opacity={0.4} />
    </svg>
  );
}

/** Stacked records with a rising trend. The insights panel. */
export function InsightsScene({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 240 180" className={cn("h-auto w-full", className)} role="presentation" aria-hidden>
      <Glow cx={120} cy={92} rx={116} ry={86} />

      <g filter="url(#bx-lift)">
        <rect x="48" y="44" width="144" height="100" rx="18" fill="url(#bx-card)" />
        <rect x="48" y="44" width="144" height="100" rx="18" fill="url(#bx-ao)" />

        {/*
         * Bars, rising left to right, each with its own top highlight so they
         * read as extruded blocks rather than flat rectangles.
         */}
        {[
          { x: 72, y: 104, h: 24, fill: "#cfc9f8" },
          { x: 101, y: 90, h: 38, fill: "#b3a8f5" },
          { x: 130, y: 74, h: 54, fill: "#8f7cf1" },
          { x: 159, y: 62, h: 66, fill: "url(#bx-purple)" },
        ].map((bar) => (
          <g key={bar.x}>
            <rect x={bar.x} y={bar.y} width="18" height={bar.h} rx="7" fill={bar.fill} />
            <rect
              x={bar.x + 3}
              y={bar.y + 3}
              width="5"
              height={bar.h - 10}
              rx="2.5"
              fill="#ffffff"
              opacity="0.3"
            />
          </g>
        ))}
      </g>

      <g filter="url(#bx-lift-sm)">
        <circle cx="192" cy="50" r="20" fill="url(#bx-safe)" />
        <circle cx="192" cy="50" r="20" fill="url(#bx-ao)" />
        <path
          d="M 183 51 l 6 6 l 12 -14"
          stroke="#fff"
          strokeWidth="3.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <Sparkle x={32} y={58} size={8} opacity={0.5} />
      <Sparkle x={216} y={136} size={7} opacity={0.4} />
    </svg>
  );
}
