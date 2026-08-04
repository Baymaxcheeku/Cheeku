import Svg, {
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

/*
 * Sprout, the mascot. Ported from the web app's `illustrations/sprout.tsx`.
 *
 * TWO PORT DIFFERENCES, both forced by react-native-svg.
 *
 * DEFS ARE LOCAL. On web the gradients live once in the root layout and every
 * scene references them by id. react-native-svg resolves ids only within the
 * same <Svg>, so the defs are inlined here. That is why this file carries its
 * own <Defs> rather than importing them.
 *
 * FILTERS ARE GONE. The web build used `feDropShadow` for the lift and
 * `feGaussianBlur` to soften the specular. react-native-svg supports neither
 * portably. The specular is instead a low-opacity ellipse and the lift is left
 * to the container's shadow. The character reads the same; only the softness of
 * the highlight is lost, and it was never visible below ~120px anyway.
 *
 * Geometry is otherwise identical, including the viewBox. Anything that changes
 * the silhouette must change in both files.
 */

const BODY =
  "M100 44 C126 44 144 66 149 100 C154 134 146 166 120 173 C107 176 93 176 80 173 C54 166 46 134 51 100 C56 66 74 44 100 44 Z";

function SproutDefs() {
  return (
    <Defs>
      <RadialGradient id="shell" cx="0.34" cy="0.24" r="0.88" fx="0.28" fy="0.16">
        <Stop offset="0" stopColor="#f4f1ff" />
        <Stop offset="0.34" stopColor="#e7e1fd" />
        <Stop offset="0.66" stopColor="#d3c9f9" />
        <Stop offset="0.88" stopColor="#bcaef3" />
        <Stop offset="1" stopColor="#a394ea" />
      </RadialGradient>

      <RadialGradient id="limb" cx="0.36" cy="0.26" r="0.86">
        <Stop offset="0" stopColor="#e2dbfc" />
        <Stop offset="0.55" stopColor="#c9bcf7" />
        <Stop offset="1" stopColor="#9b8ae6" />
      </RadialGradient>

      <LinearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#a99aec" />
        <Stop offset="1" stopColor="#8877dd" />
      </LinearGradient>

      {/* Blush, deliberately not the danger red. */}
      <LinearGradient id="heart" x1="0" y1="0" x2="0.4" y2="1">
        <Stop offset="0" stopColor="#ffc2d4" />
        <Stop offset="1" stopColor="#f2789e" />
      </LinearGradient>

      <LinearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#cfc6fb" />
        <Stop offset="1" stopColor="#9f8fe8" />
      </LinearGradient>

      {/* Rim occlusion: transparent through the lit centre, darkening only at
          the edge, tinted indigo because black on lavender reads as dirt. */}
      <RadialGradient id="ao" cx="0.5" cy="0.44" r="0.6">
        <Stop offset="0.66" stopColor="#312a6b" stopOpacity="0" />
        <Stop offset="0.89" stopColor="#312a6b" stopOpacity="0.09" />
        <Stop offset="1" stopColor="#312a6b" stopOpacity="0.2" />
      </RadialGradient>

      {/* Light bounced up off the ground, so the base does not go dead. */}
      <LinearGradient id="bounce" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
        <Stop offset="0.62" stopColor="#ffffff" stopOpacity="0" />
        <Stop offset="1" stopColor="#fffdf8" stopOpacity="0.7" />
      </LinearGradient>
    </Defs>
  );
}

function Top() {
  return (
    <G>
      <Path d="M100 48 C100 36 101 28 105 21" fill="none" stroke="#8877dd" strokeWidth="4.5" strokeLinecap="round" />
      <Path d="M99 34 C90 33 84 27 85 21 C92 20 99 26 99 34 Z" fill="url(#leaf)" />
      {/* Health and growth in one glyph. This is the mark that identifies the
          character at 34px, so it must never be cropped by a viewBox. */}
      <G transform="translate(112 15) rotate(14)">
        <Path d="M0 9 C-3 4 -10 1 -10 -5 C-10 -10 -5 -12 0 -7 C5 -12 10 -10 10 -5 C10 1 3 4 0 9 Z" fill="url(#heart)" />
        <Ellipse cx="-4" cy="-5" rx="2.6" ry="1.9" fill="#fff" opacity="0.55" />
      </G>
    </G>
  );
}

function Arms({ wave }: { wave: boolean }) {
  return (
    <G>
      <Path
        d="M56 116 C42 126 36 144 42 156 C46 163 56 161 60 153 C64 143 62 128 56 116 Z"
        fill="url(#limb)"
      />
      <Path
        d={
          wave
            ? "M144 110 C160 104 172 88 170 74 C169 66 160 64 155 72 C148 82 144 98 144 110 Z"
            : "M144 116 C158 126 164 144 158 156 C154 163 144 161 140 153 C136 143 138 128 144 116 Z"
        }
        fill="url(#limb)"
      />
    </G>
  );
}

function Face() {
  return (
    <G>
      <Ellipse cx="67" cy="116" rx="8.5" ry="5.2" fill="#f2789e" opacity="0.28" />
      <Ellipse cx="133" cy="116" rx="8.5" ry="5.2" fill="#f2789e" opacity="0.28" />

      {/* Brows arc upward. Angled the other way the character looks worried,
          which is the last expression this app should wear. */}
      <Path d="M74 87 C79 82 88 82 93 86" fill="none" stroke="#2b2560" strokeWidth="3.4" strokeLinecap="round" opacity="0.75" />
      <Path d="M107 86 C112 82 121 82 126 87" fill="none" stroke="#2b2560" strokeWidth="3.4" strokeLinecap="round" opacity="0.75" />

      <Ellipse cx="84" cy="102" rx="9" ry="10.5" fill="#141338" />
      <Ellipse cx="116" cy="102" rx="9" ry="10.5" fill="#141338" />
      <Ellipse cx="80.6" cy="98" rx="3.1" ry="3.1" fill="#fff" />
      <Ellipse cx="112.6" cy="98" rx="3.1" ry="3.1" fill="#fff" />
      <Ellipse cx="87" cy="106.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.6" />
      <Ellipse cx="119" cy="106.5" rx="1.5" ry="1.5" fill="#fff" opacity="0.6" />

      <Path d="M91 120 C95 128 105 128 109 120" fill="none" stroke="#141338" strokeWidth="3.6" strokeLinecap="round" />
    </G>
  );
}

function Body() {
  return (
    <G>
      <Path d={BODY} fill="url(#shell)" />
      <Path d={BODY} fill="url(#ao)" />
      <Path d={BODY} fill="url(#bounce)" opacity="0.5" />
      <Ellipse cx="78" cy="72" rx="20" ry="14" fill="#fff" opacity="0.32" transform="rotate(-22 78 72)" />
    </G>
  );
}

/**
 * Head and shoulders. The format used across card corners.
 *
 * The viewBox starts above y=0 because the heart sits at y≈3; a box starting at
 * 0 slices the top off the mark.
 */
export function MascotBust({ size = 148 }: { size?: number }) {
  return (
    <Svg width={size} height={size * (160 / 172)} viewBox="14 -10 172 160">
      <SproutDefs />
      <Top />
      <Arms wave />
      <Body />
      <Face />
    </Svg>
  );
}

/** The whole character, standing. */
export function MascotFigure({ size = 200, wave = false }: { size?: number; wave?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <SproutDefs />
      <Ellipse cx="100" cy="182" rx="52" ry="9" fill="#2f2578" opacity="0.1" />
      <Top />
      <Arms wave={wave} />
      <Ellipse cx="80" cy="174" rx="16" ry="8.5" fill="url(#foot)" />
      <Ellipse cx="120" cy="174" rx="16" ry="8.5" fill="url(#foot)" />
      <Body />
      <Face />
    </Svg>
  );
}
