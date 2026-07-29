/*
 * Shared gradients and filters for the app's illustrations.
 *
 * Rendered once in the root layout and referenced by id, so the artwork itself
 * can stay server components rather than needing `useId` for unique gradient
 * ids per instance.
 *
 * WHY THESE ARE SHAPED THE WAY THEY ARE
 *
 * The first version of this used flat linear gradients and the result looked
 * like clip art — the complaint was fair. What makes a rendered object read as
 * three-dimensional is not one gradient, it is four things stacked:
 *
 *   1. a RADIAL base, with its focal point offset toward the light, so the form
 *      turns away from the viewer rather than fading in a straight line;
 *   2. AMBIENT OCCLUSION — a darkened rim where the form meets itself or the
 *      ground, which is what actually sells contact;
 *   3. a SPECULAR highlight, small and soft, well inside the silhouette;
 *   4. a CONTACT SHADOW on the ground, tight and dark directly under the form
 *      and spreading as it moves away.
 *
 * All four are here. The light is consistently upper-left across every scene,
 * because a scene lit from two directions reads as a collage.
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
        {/*
         * The mascot's shell. A radial gradient whose focal point sits up and
         * left of centre, so the brightest point is where the light lands and
         * the form falls off around it in every direction.
         */}
        <radialGradient id="bx-shell" cx="0.34" cy="0.26" r="0.92" fx="0.28" fy="0.18">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.42" stopColor="#fbfbff" />
          <stop offset="0.72" stopColor="#eaeaf6" />
          <stop offset="0.9" stopColor="#d6d6e9" />
          <stop offset="1" stopColor="#c3c3dc" />
        </radialGradient>

        {/* Limbs sitting behind the body: same light, one stop deeper. */}
        <radialGradient id="bx-shell-shade" cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#f0f0f8" />
          <stop offset="0.6" stopColor="#dedeee" />
          <stop offset="1" stopColor="#bfbfd8" />
        </radialGradient>

        {/*
         * Ambient occlusion. Transparent through the middle and darkening only
         * at the very edge, so it can be laid over a form to sink its rim
         * without touching the lit centre.
         */}
        <radialGradient id="bx-ao" cx="0.5" cy="0.44" r="0.58">
          <stop offset="0.62" stopColor="#2a2a5c" stopOpacity="0" />
          <stop offset="0.88" stopColor="#2a2a5c" stopOpacity="0.1" />
          <stop offset="1" stopColor="#2a2a5c" stopOpacity="0.22" />
        </radialGradient>

        {/* The specular highlight — soft, bright, and small. */}
        <radialGradient id="bx-spec" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* The contact shadow on the ground. */}
        <radialGradient id="bx-ground" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3a2f8f" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#3a2f8f" stopOpacity="0.12" />
          <stop offset="1" stopColor="#3a2f8f" stopOpacity="0" />
        </radialGradient>

        {/* The lavender field the characters sit on. */}
        <radialGradient id="bx-field" cx="0.36" cy="0.3" r="0.86">
          <stop offset="0" stopColor="#d8d4ff" />
          <stop offset="0.6" stopColor="#bdb5fa" />
          <stop offset="1" stopColor="#9c92f2" />
        </radialGradient>

        {/* Purple objects — the bell, brand badges. Same light. */}
        <radialGradient id="bx-purple" cx="0.32" cy="0.22" r="0.95" fx="0.26" fy="0.14">
          <stop offset="0" stopColor="#c9c2ff" />
          <stop offset="0.42" stopColor="#a99efb" />
          <stop offset="0.78" stopColor="#8171f3" />
          <stop offset="1" stopColor="#6350e0" />
        </radialGradient>

        <linearGradient id="bx-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b63f8" />
          <stop offset="1" stopColor="#4b2fe0" />
        </linearGradient>

        {/* White objects that are not the mascot — the calendar, paper. */}
        <radialGradient id="bx-paper" cx="0.3" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#f6f5fd" />
          <stop offset="1" stopColor="#e2e0f2" />
        </radialGradient>

        <radialGradient id="bx-card" cx="0.3" cy="0.2" r="0.95">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#f7f6fd" />
          <stop offset="1" stopColor="#e9e7f8" />
        </radialGradient>

        <radialGradient id="bx-safe" cx="0.32" cy="0.24" r="0.92">
          <stop offset="0" stopColor="#7ce4ab" />
          <stop offset="0.5" stopColor="#3cc97c" />
          <stop offset="1" stopColor="#159a52" />
        </radialGradient>

        <radialGradient id="bx-warm" cx="0.32" cy="0.24" r="0.92">
          <stop offset="0" stopColor="#ffb59c" />
          <stop offset="0.5" stopColor="#ff7f63" />
          <stop offset="1" stopColor="#ea4a32" />
        </radialGradient>

        {/* Emergency palette. Used ONLY on the safety escalation, where red is
            carrying its real meaning rather than decorating. */}
        <radialGradient id="bx-alert" cx="0.32" cy="0.22" r="0.94">
          <stop offset="0" stopColor="#ff8a97" />
          <stop offset="0.48" stopColor="#f8455c" />
          <stop offset="1" stopColor="#d40a1e" />
        </radialGradient>

        <radialGradient id="bx-field-alert" cx="0.36" cy="0.3" r="0.86">
          <stop offset="0" stopColor="#ffdde2" />
          <stop offset="0.6" stopColor="#ffc0ca" />
          <stop offset="1" stopColor="#ff9caa" />
        </radialGradient>

        <radialGradient id="bx-field-safe" cx="0.36" cy="0.3" r="0.86">
          <stop offset="0" stopColor="#d6f6e4" />
          <stop offset="0.6" stopColor="#a9e9c6" />
          <stop offset="1" stopColor="#7dd8aa" />
        </radialGradient>

        {/*
         * Lift shadows. Two stops of blur rather than one so the penumbra falls
         * off the way a real one does — a single `feDropShadow` gives a uniform
         * halo that reads as a sticker.
         */}
        <filter id="bx-lift" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2e2570" floodOpacity="0.16" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2e2570" floodOpacity="0.1" />
        </filter>

        <filter id="bx-lift-sm" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#2e2570" floodOpacity="0.18" />
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#2e2570" floodOpacity="0.12" />
        </filter>

        {/* Softens the specular highlight so it reads as a sheen, not a shape. */}
        <filter id="bx-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>

        <filter id="bx-blur-sm" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
    </svg>
  );
}
