/*
 * Sprout — the app's mascot.
 *
 * ORIGINAL ARTWORK. The reference the brief pointed at ("Bloom Buddy") is a
 * commercial character set; its *language* is borrowed here — one continuous
 * pear-shaped body with no separate head, a stem on top, high close-set eyes
 * with a highlight, flipper arms, flat vector with soft shading — but every
 * path below is authored, and the character, its colour and its mark are the
 * product's own. That matters beyond licensing: the app is being renamed, and
 * a mascot is the one asset that has to survive the rename.
 *
 * WHY A SEEDLING. The previous mascot was a white robot. It read as clinical
 * hardware, and "a machine that reads your medical records" is the least
 * reassuring possible framing for a screen a pregnant woman opens at 2am. A
 * seedling says the opposite thing: something small you tend, that grows with
 * you, over years. The heart-leaf makes that literal in one glyph.
 *
 * GEOMETRY IS SINGLE-SOURCED. `SproutBody`, `SproutFace` and the limbs are
 * each defined once and composed by every scene, so the character cannot drift
 * between the onboarding hero and a 28px chat avatar. This is the same rule the
 * previous rebuild landed on after the mascot diverged across screens.
 *
 * All coordinates live in a 0 0 200 200 box. Nothing may extend past it — art
 * outside the viewBox is silently clipped, which is exactly how the old mascot
 * lost its arms and read as a snowman.
 */

/** The body: one closed form, narrower at the shoulders, wide and soft below. */
const BODY =
  "M100 44 C126 44 144 66 149 100 C154 134 146 166 120 173 C107 176 93 176 80 173 C54 166 46 134 51 100 C56 66 74 44 100 44 Z";

/** Ground contact. Drawn first so everything else sits on top of it. */
export function SproutShadow({ cy = 182 }: { cy?: number }) {
  return <ellipse cx="100" cy={cy} rx="52" ry="9" fill="url(#bx-ground)" />;
}

/**
 * The stem, one leaf, and the heart.
 *
 * The heart leans right and the leaf tucks left, so the silhouette is
 * asymmetric — a symmetric sprout reads as a logo, not a creature.
 */
export function SproutTop() {
  return (
    <g>
      <path
        d="M100 48 C100 36 101 28 105 21"
        fill="none"
        stroke="#8877dd"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* Small leaf, tucked left */}
      <path
        d="M99 34 C90 33 84 27 85 21 C92 20 99 26 99 34 Z"
        fill="url(#bx-leaf)"
      />
      {/* The heart-leaf: health and growth in one mark. */}
      <g transform="translate(112 15) rotate(14)">
        <path
          d="M0 9 C-3 4 -10 1 -10 -5 C-10 -10 -5 -12 0 -7 C5 -12 10 -10 10 -5 C10 1 3 4 0 9 Z"
          fill="url(#bx-heart)"
        />
        {/* A single specular so the heart reads as a soft solid, not a sticker. */}
        <ellipse cx="-4" cy="-5" rx="2.6" ry="1.9" fill="#fff" opacity="0.55" />
      </g>
    </g>
  );
}

/** Arms. `wave` lifts the right one; the left always hangs. */
export function SproutArms({ wave = false }: { wave?: boolean }) {
  return (
    <g>
      <path
        d="M56 116 C42 126 36 144 42 156 C46 163 56 161 60 153 C64 143 62 128 56 116 Z"
        fill="url(#bx-sprout-limb)"
      />
      {wave ? (
        <path
          d="M144 110 C160 104 172 88 170 74 C169 66 160 64 155 72 C148 82 144 98 144 110 Z"
          fill="url(#bx-sprout-limb)"
        />
      ) : (
        <path
          d="M144 116 C158 126 164 144 158 156 C154 163 144 161 140 153 C136 143 138 128 144 116 Z"
          fill="url(#bx-sprout-limb)"
        />
      )}
    </g>
  );
}

/** Feet. Wide ovals — narrow strokes read as claws, which the last pass proved. */
export function SproutFeet() {
  return (
    <g fill="url(#bx-sprout-foot)">
      <ellipse cx="80" cy="174" rx="16" ry="8.5" />
      <ellipse cx="120" cy="174" rx="16" ry="8.5" />
    </g>
  );
}

/** The body shell, with its occlusion and bounce light. */
export function SproutBody() {
  return (
    <g>
      <path d={BODY} fill="url(#bx-sprout)" />
      {/* Rim occlusion — sinks the edge without touching the lit centre. */}
      <path d={BODY} fill="url(#bx-ao)" />
      {/* Ground bounce along the lower edge, so the base does not go dead. */}
      <path d={BODY} fill="url(#bx-bounce)" opacity="0.5" />
      {/* One soft specular, upper-left, matching every other object here. */}
      <ellipse
        cx="78"
        cy="72"
        rx="20"
        ry="14"
        fill="url(#bx-spec)"
        opacity="0.75"
        transform="rotate(-22 78 72)"
      />
    </g>
  );
}

/**
 * The face.
 *
 * Eyes are large, close together and set high — the three things that read as
 * "young and friendly" rather than "adult and appraising". Brows arc gently
 * upward; angled the other way the character looks worried, which is the last
 * expression this app should wear.
 */
export function SproutFace() {
  return (
    <g>
      {/* Cheeks, under the eyes, very soft. */}
      <ellipse cx="67" cy="116" rx="8.5" ry="5.2" fill="#f2789e" opacity="0.28" />
      <ellipse cx="133" cy="116" rx="8.5" ry="5.2" fill="#f2789e" opacity="0.28" />

      <path
        d="M74 87 C79 82 88 82 93 86"
        fill="none"
        stroke="#2b2560"
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M107 86 C112 82 121 82 126 87"
        fill="none"
        stroke="#2b2560"
        strokeWidth="3.4"
        strokeLinecap="round"
        opacity="0.75"
      />

      <g fill="#141338">
        <ellipse cx="84" cy="102" rx="9" ry="10.5" />
        <ellipse cx="116" cy="102" rx="9" ry="10.5" />
      </g>
      <g fill="#ffffff">
        <circle cx="80.6" cy="98" r="3.1" />
        <circle cx="112.6" cy="98" r="3.1" />
        <circle cx="87" cy="106.5" r="1.5" opacity="0.6" />
        <circle cx="119" cy="106.5" r="1.5" opacity="0.6" />
      </g>

      {/* A closed, upturned smile. An open mouth at this size turns to mush. */}
      <path
        d="M91 120 C95 128 105 128 109 120"
        fill="none"
        stroke="#141338"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
    </g>
  );
}

/** The whole character, standing. */
export function SproutFigure({ wave = false }: { wave?: boolean }) {
  return (
    <g>
      <SproutShadow />
      <SproutTop />
      <SproutArms wave={wave} />
      <SproutFeet />
      <SproutBody />
      <SproutFace />
    </g>
  );
}
