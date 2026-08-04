import { ImageResponse } from "next/og";

import { ICON_BACKGROUND, SproutFlatMark } from "@/components/illustrations/sprout-flat";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** The manifest icon — Android home screens, install prompts, task switchers. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ICON_BACKGROUND,
        }}
      >
        <SproutFlatMark size={376} />
      </div>
    ),
    size,
  );
}
