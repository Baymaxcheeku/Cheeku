import { LocateFixed } from "lucide-react-native";
import { Text } from "react-native";

import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { useNearbyPlace } from "@/lib/location/live";
import { addressFrom } from "@/lib/location/rules";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/**
 * "Use Indiranagar, 560038" under an address field: fills it from the place
 * we already know for this member, so a home visit needs only the flat number.
 */
export function UseMyAddress({ profileId, onUse }: { profileId?: string | null; onUse: (address: string) => void }) {
  const near = useNearbyPlace(profileId);
  const p = near.place;
  if (!p || p.provider === "none") {
    return (
      <Tap accessibilityRole="button" onPress={() => void near.locate()} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, alignSelf: "flex-start" }}>
        <LocateFixed size={15} color={ink[900]} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>{near.locating ? "Finding you" : "Use my location"}</Text>
      </Tap>
    );
  }
  return (
    <Tap
      accessibilityRole="button"
      onPress={() => {
        feel.tick();
        onUse(addressFrom(p));
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, alignSelf: "flex-start", maxWidth: "100%" }}
    >
      <LocateFixed size={15} color={ink[900]} />
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>
        Use {p.pincode ? `${p.label}, ${p.pincode}` : p.label}
      </Text>
    </Tap>
  );
}
