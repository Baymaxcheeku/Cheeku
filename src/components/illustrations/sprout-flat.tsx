/*
 * A flat, filter-free redraw of the mascot, for app icons.
 *
 * Satori — the renderer behind `next/og`'s ImageResponse — supports neither
 * SVG filters nor `url(#…)` gradient fills, so the shipped character in
 * ./sprout.tsx cannot be used here; it would render as an empty square. This
 * keeps the same paths and solid-fills them. Any change to the silhouette has
 * to be made in both places, which is the cost of the icon existing at all.
 */
export function SproutFlatMark({ size = 132 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <path
        d="M100 48 C100 36 101 28 105 21"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M99 34 C90 33 84 27 85 21 C92 20 99 26 99 34 Z" fill="#ffffff" />
      <path
        d="M112 24 C109 19 102 16 102 10 C102 5 107 3 112 8 C117 3 122 5 122 10 C122 16 115 19 112 24 Z"
        fill="#ff9dbb"
      />
      <path
        d="M100 44 C126 44 144 66 149 100 C154 134 146 166 120 173 C107 176 93 176 80 173 C54 166 46 134 51 100 C56 66 74 44 100 44 Z"
        fill="#ffffff"
      />
      <ellipse cx="84" cy="102" rx="9" ry="10.5" fill="#2b2560" />
      <ellipse cx="116" cy="102" rx="9" ry="10.5" fill="#2b2560" />
      <path
        d="M91 120 C95 128 105 128 109 120"
        fill="none"
        stroke="#2b2560"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The violet field every icon size sits on. */
export const ICON_BACKGROUND = "linear-gradient(145deg, #6b57e6 0%, #4a2ade 100%)";
