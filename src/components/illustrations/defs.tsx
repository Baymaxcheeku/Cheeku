/*
 * Shared gradients and filters for the app's illustrations.
 *
 * Rendered once in the root layout and referenced by id, so the artwork itself
 * can stay server components rather than needing `useId` for unique gradient
 * ids per instance.
 *
 * WHY THESE ARE SHAPED THE WAY THEY ARE
 *
 * This is the third pass. Flat linear gradients read as clip art. Adding a
 * radial base plus occlusion plus specular helped but still read as flat — the
 * forms went white → neutral grey, and neutral grey is what a *photograph of a
 * grey object* looks like, not what a white object looks like sitting in a
 * lavender room.
 *
 * What a white object actually does:
 *
 *   1. LIT SIDE is warm-white, not pure white — pure white has nowhere left to
 *      go, so the specular cannot read against it.
 *   2. SHADOW SIDE takes the colour of its surroundings. In this app that is
 *      lavender, so the falloff runs white → warm white → lavender-grey. This
 *      single change does more for the illusion than everything else here.
 *   3. BOUNCE LIGHT brightens the lower edge, where light has reflected off the
 *      ground back up into the form. Without it, the bottom of every shape goes
 *      dead and the object looks pasted on.
 *   4. TERMINATOR — the turn from lit to shadow — is a narrow band, not a slow
 *      fade across the whole form. Radial `r` values here are deliberately
 *      under 1 with the stops bunched near the end.
 *
 * The light is upper-left in every scene. A scene lit from two directions reads
 * as a collage.
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
         * The mascot's shell. Note the last two stops: #d3d0ea and #bcb8dc are
         * lavender-greys, not neutral. That is the room reflected in a white
         * body, and it is the difference between "3D render" and "grey blob".
         */}
        <radialGradient id="bx-shell" cx="0.33" cy="0.24" r="0.86" fx="0.27" fy="0.16">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#fdfdff" />
          <stop offset="0.58" stopColor="#f2f1fa" />
          <stop offset="0.8" stopColor="#e0ddf1" />
          <stop offset="0.93" stopColor="#d3d0ea" />
          <stop offset="1" stopColor="#bcb8dc" />
        </radialGradient>

        {/* Limbs behind the body: same light, shifted one stop deeper so they
            separate from the torso without an outline. */}
        <radialGradient id="bx-shell-shade" cx="0.34" cy="0.26" r="0.84">
          <stop offset="0" stopColor="#f7f6fd" />
          <stop offset="0.5" stopColor="#eae8f6" />
          <stop offset="0.82" stopColor="#d5d2ea" />
          <stop offset="1" stopColor="#b6b2d6" />
        </radialGradient>

        {/*
         * Bounce light. Laid over the BOTTOM of a form with `mix-blend`-like
         * effect via opacity: transparent at the top, warm-white at the very
         * bottom edge. This is light coming back up off the ground.
         */}
        <linearGradient id="bx-bounce" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.62" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.88" stopColor="#fffdf8" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fffdf8" stopOpacity="0.78" />
        </linearGradient>

        {/*
         * Ambient occlusion. Transparent through the middle, darkening only at
         * the rim, so it sinks an edge without touching the lit centre. Tinted
         * indigo rather than black — black shadows on a lavender scene read as
         * dirt.
         */}
        <radialGradient id="bx-ao" cx="0.5" cy="0.44" r="0.6">
          <stop offset="0.66" stopColor="#312a6b" stopOpacity="0" />
          <stop offset="0.89" stopColor="#312a6b" stopOpacity="0.09" />
          <stop offset="1" stopColor="#312a6b" stopOpacity="0.2" />
        </radialGradient>

        {/* A tighter version, for where two forms actually meet. */}
        <radialGradient id="bx-ao-tight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#312a6b" stopOpacity="0.3" />
          <stop offset="0.6" stopColor="#312a6b" stopOpacity="0.13" />
          <stop offset="1" stopColor="#312a6b" stopOpacity="0" />
        </radialGradient>

        {/* The specular. Small, hot centre, fast falloff — a sheen, not a patch. */}
        <radialGradient id="bx-spec" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.38" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.72" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Contact shadow on the ground: dark and tight at the contact point. */}
        <radialGradient id="bx-ground" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2f2578" stopOpacity="0.3" />
          <stop offset="0.42" stopColor="#2f2578" stopOpacity="0.15" />
          <stop offset="0.75" stopColor="#2f2578" stopOpacity="0.04" />
          <stop offset="1" stopColor="#2f2578" stopOpacity="0" />
        </radialGradient>

        {/*
         * The backdrop glow, replacing the old `bx-field` blob.
         *
         * That blob was an amorphous lavender path with a HARD EDGE, which is
         * what read as "a weird egg shape around the mascot" — the eye finds the
         * boundary and sees a second object. This fades to fully transparent, so
         * there is no boundary to find: it reads as light in the air behind the
         * subject.
         */}
        <radialGradient id="bx-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#cfc9fb" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#d5d0fb" stopOpacity="0.5" />
          <stop offset="0.75" stopColor="#e2ddfd" stopOpacity="0.18" />
          <stop offset="1" stopColor="#e8e4fe" stopOpacity="0" />
        </radialGradient>

        {/*
         * THE MASCOT — "Sprout".
         *
         * An original character, not the previous white robot. The robot was
         * borrowed shorthand for "health companion" and it read as clinical
         * hardware; this product is a memory that grows with a family, so the
         * character is a seedling: one continuous rounded body, a stem, and a
         * heart-shaped leaf that folds "health" and "growth" into a single
         * mark readable at 24px.
         *
         * Kept in the BRAND family rather than the reference's greens for two
         * reasons. It has to sit on violet surfaces all over this app without
         * clashing, and green/amber/red are reserved for health status here —
         * a green character beside a green "Normal" pill would put decoration
         * and diagnosis in the same colour.
         *
         * Light stays upper-left, like everything else in this file.
         */}
        <radialGradient id="bx-sprout" cx="0.34" cy="0.24" r="0.88" fx="0.28" fy="0.16">
          <stop offset="0" stopColor="#f4f1ff" />
          <stop offset="0.34" stopColor="#e7e1fd" />
          <stop offset="0.66" stopColor="#d3c9f9" />
          <stop offset="0.88" stopColor="#bcaef3" />
          <stop offset="1" stopColor="#a394ea" />
        </radialGradient>

        {/* Limbs and feet: one stop deeper so they separate from the body
            without needing an outline. */}
        <radialGradient id="bx-sprout-limb" cx="0.36" cy="0.26" r="0.86">
          <stop offset="0" stopColor="#e2dbfc" />
          <stop offset="0.55" stopColor="#c9bcf7" />
          <stop offset="1" stopColor="#9b8ae6" />
        </radialGradient>

        <linearGradient id="bx-sprout-foot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a99aec" />
          <stop offset="1" stopColor="#8877dd" />
        </linearGradient>

        {/* The heart-leaf. A soft blush, deliberately NOT the danger red. */}
        <linearGradient id="bx-heart" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffc2d4" />
          <stop offset="1" stopColor="#f2789e" />
        </linearGradient>

        <linearGradient id="bx-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfc6fb" />
          <stop offset="1" stopColor="#9f8fe8" />
        </linearGradient>

        {/* Purple objects — the bell, brand badges. Same light direction. */}
        <radialGradient id="bx-purple" cx="0.3" cy="0.2" r="0.9" fx="0.24" fy="0.12">
          <stop offset="0" stopColor="#d5cfff" />
          <stop offset="0.3" stopColor="#b9afff" />
          <stop offset="0.62" stopColor="#8e7cf6" />
          <stop offset="0.86" stopColor="#6b57e6" />
          <stop offset="1" stopColor="#5340c9" />
        </radialGradient>

        {/* The darker underside of a purple form — inside a bell's skirt. */}
        <linearGradient id="bx-purple-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a37bd" />
          <stop offset="1" stopColor="#6c58e8" />
        </linearGradient>

        <linearGradient id="bx-brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7b63f8" />
          <stop offset="1" stopColor="#4b2fe0" />
        </linearGradient>

        {/* White objects that are not the mascot — paper, cards, calendar. */}
        <radialGradient id="bx-paper" cx="0.28" cy="0.16" r="0.94">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f8f7fd" />
          <stop offset="0.88" stopColor="#eae7f7" />
          <stop offset="1" stopColor="#dcd8ef" />
        </radialGradient>

        <radialGradient id="bx-card" cx="0.28" cy="0.16" r="0.94">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.66" stopColor="#f9f8fe" />
          <stop offset="1" stopColor="#e6e3f6" />
        </radialGradient>

        <radialGradient id="bx-safe" cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#8df0bb" />
          <stop offset="0.42" stopColor="#4bd489" />
          <stop offset="0.8" stopColor="#22ab60" />
          <stop offset="1" stopColor="#128a4a" />
        </radialGradient>

        <radialGradient id="bx-warm" cx="0.3" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffc4ad" />
          <stop offset="0.45" stopColor="#ff9070" />
          <stop offset="1" stopColor="#e4512f" />
        </radialGradient>

        {/* Emergency palette. Used ONLY on the safety escalation, where red is
            carrying its real meaning rather than decorating. */}
        <radialGradient id="bx-alert" cx="0.3" cy="0.2" r="0.92">
          <stop offset="0" stopColor="#ff9ba6" />
          <stop offset="0.45" stopColor="#f84f63" />
          <stop offset="1" stopColor="#cf0a1d" />
        </radialGradient>

        {/*
         * The two remaining tinted backdrops, kept for the escalation screens
         * where the surrounding colour is carrying meaning. Same edgeless
         * treatment as `bx-glow`.
         */}
        <radialGradient id="bx-field-alert" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc9d1" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#ffd8de" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffe6ea" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="bx-field-safe" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#b6ecce" stopOpacity="0.9" />
          <stop offset="0.55" stopColor="#cdf3de" stopOpacity="0.45" />
          <stop offset="1" stopColor="#e0f8ea" stopOpacity="0" />
        </radialGradient>

        {/*
         * Kept as an alias so any scene still referencing the old field id gets
         * the edgeless glow rather than a hard-edged blob.
         */}
        <radialGradient id="bx-field" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#cfc9fb" stopOpacity="0.8" />
          <stop offset="0.55" stopColor="#ddd8fc" stopOpacity="0.4" />
          <stop offset="1" stopColor="#e8e4fe" stopOpacity="0" />
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

        {/* Softens the specular so it reads as a sheen, not a shape. */}
        <filter id="bx-blur" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>

        <filter id="bx-blur-sm" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>

        <filter id="bx-blur-lg" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
    </svg>
  );
}
