import { ImageResponse } from "next/og";

import { ICON_BACKGROUND, SproutFlatMark } from "@/components/illustrations/sprout-flat";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The iOS home-screen icon, used when the app is added to the home screen. */
export default function AppleIcon() {
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
        <SproutFlatMark size={132} />
      </div>
    ),
    size,
  );
}
