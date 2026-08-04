import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { AvatarFamily } from "@/components/illustrations/avatar-cluster";
import { brand, surface } from "@/theme/tokens";

/*
 * Two small scenes, one per onboarding screen that needs one.
 *
 * Deliberately built from flat shapes and the existing tokens rather than
 * ported pixel for pixel from the web SVGs: react-native-svg supports no
 * filters, and both web scenes lean on soft blurred shadows that simply do not
 * exist here. Reproducing the geometry without the blur looked like a broken
 * version of the original, so these are redrawn to read correctly flat.
 */

/** A6 — a stack of documents lifting off. */
export function UploadScene({ size = 128 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessibilityRole="image">
      {/* The sky behind, so the pale document faces have something to sit on. */}
      <Circle cx={64} cy={68} r={46} fill={brand[50]} />

      {/* Two settled pages, fanned. The back one is tinted so the overlap
          reads without a shadow to separate them. */}
      <Rect
        x={30}
        y={54}
        width={44}
        height={56}
        rx={7}
        fill={brand[100]}
        transform="rotate(-11 52 82)"
      />
      <Rect x={44} y={50} width={46} height={58} rx={7} fill={surface.base} />
      <Rect x={53} y={64} width={28} height={4} rx={2} fill={brand[200]} />
      <Rect x={53} y={74} width={28} height={4} rx={2} fill={brand[200]} />
      <Rect x={53} y={84} width={17} height={4} rx={2} fill={brand[200]} />

      {/* The one in flight, and its arrow. This is the whole point of the
          picture: the document is going somewhere. */}
      <Rect x={62} y={12} width={40} height={30} rx={7} fill={brand[600]} />
      <Path
        d="M82 36V20m0 0-6 6m6-6 6 6"
        stroke={surface.base}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * A7 — the family the plan is for.
 *
 * Reuses the A4 cluster rather than drawing a second set of people: these are
 * the same illustrated cast, and two different-looking families across two
 * consecutive onboarding screens would read as two different products.
 */
export function FamilyScene({ size = 150 }: { size?: number }) {
  return (
    <View style={{ width: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: size,
          height: size * 0.62,
          borderRadius: 999,
          backgroundColor: brand[50],
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AvatarFamily size={size * 0.42} count={4} />
      </View>
    </View>
  );
}
