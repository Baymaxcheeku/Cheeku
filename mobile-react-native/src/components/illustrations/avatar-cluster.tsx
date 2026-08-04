import { View } from "react-native";

import { CastAvatar } from "@/components/ui/avatar";
import { castFaces } from "@/lib/profiles/avatar";
import { surface } from "@/theme/tokens";

/*
 * The two clusters on A4, one per audience card.
 *
 * They come from `castFaces` rather than from a bespoke drawing so the people
 * depicted here are the same visual species as real profiles elsewhere in the
 * app. The web build had its own copy of the generator here once; the two
 * drifted, and that is how an app ends up with two different-looking sets of
 * humans in it.
 *
 * The web version generated these server-side because DiceBear needed
 * `Buffer`. On device the generator returns raw SVG markup and `SvgXml` takes
 * it directly, so both render inline with no server involved.
 */

const RING = 2;

/** One portrait. Sized to match the family cluster's height so cards align. */
export function AvatarSolo({ size = 72 }: { size?: number }) {
  const [face] = castFaces(1);
  if (!face) return null;

  return (
    <View
      className="items-center justify-center rounded-pill"
      style={{
        width: size,
        height: size,
        borderWidth: RING,
        borderColor: surface.base,
        overflow: "hidden",
      }}
    >
      <CastAvatar svg={face} size={size} />
    </View>
  );
}

/**
 * Three overlapped faces.
 *
 * Wider than it is tall, because three overlapped heads are. The height is held
 * equal to the solo portrait so the two cards on A4 stay the same height, and
 * both are given the same fixed art column so their titles start at the same x
 * — letting each cluster size itself is what left the two cards misaligned in
 * the web build.
 */
export function AvatarFamily({ size = 72, count = 3 }: { size?: number; count?: number }) {
  const faces = castFaces(count);
  // Each face is inset from the last by a third of its width, so the group is
  // narrower than the sum of its parts and reads as one unit.
  const step = Math.round(size * 0.34);
  const face = Math.round(size * 0.72);

  return (
    <View style={{ height: size, width: step * (faces.length - 1) + face }}>
      {faces.map((svg, i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: i * step,
            // Absolutely positioned children ignore the parent's alignment, so
            // the vertical centring is computed rather than delegated.
            top: (size - face) / 2,
            width: face,
            height: face,
            borderRadius: 999,
            borderWidth: RING,
            borderColor: surface.base,
            overflow: "hidden",
            // Later faces sit on top of earlier ones, so the overlap reads
            // consistently left to right rather than as a random pile.
            zIndex: i,
          }}
        >
          <CastAvatar svg={svg} size={face} />
        </View>
      ))}
    </View>
  );
}
