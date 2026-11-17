import { View } from "react-native";
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

import { surface } from "@/theme/tokens";

/** The soft lilac sky behind the top of a screen, the same on Home and every page under it. */
export function SkyWash({ top }: { top: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top, left: 0, right: 0, height: 700 }}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 700">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#c9c6ff" />
            <Stop offset="0.38" stopColor="#e3e1ff" />
            <Stop offset="0.72" stopColor="#efeef9" />
            <Stop offset="1" stopColor={surface.canvas} />
          </LinearGradient>
          <RadialGradient id="glow" cx="78" cy="300" rx="70" ry="190" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="700" fill="url(#sky)" />
        <Rect x="0" y="0" width="100" height="700" fill="url(#glow)" />
      </Svg>
    </View>
  );
}
