import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Avatar } from "@/components/ui/avatar";
import { glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { useSwitchPulse } from "@/lib/profiles/family";
import { ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * "Now viewing Amma's file", for a second and a half after a switch.
 *
 * Every number on Home changes when the member does. Without a word saying
 * so, someone who tapped the wrong face reads their mother's results as their
 * own. The pill names whose file this is now, then gets out of the way.
 */
export function SwitchPulse() {
  const { member, at } = useSwitchPulse();
  const still = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!member || Date.now() - at > 1000) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(t);
  }, [member, at]);

  if (!visible || !member) return null;
  const first = member.name.split(" ")[0] ?? member.name;

  return (
    <View pointerEvents="none" style={{ alignItems: "center", marginTop: 12, marginBottom: -4 }}>
      <Animated.View
        key={at}
        entering={still ? undefined : FadeInUp.duration(200)}
        exiting={still ? undefined : FadeOutUp.duration(180)}
        accessibilityLiveRegion="polite"
        style={[glassShadow, { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 36, borderRadius: 999, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
      >
        <Avatar svg={member.avatar} photo={member.photo} background={member.avatarBackground} size={28} />
        <Text style={{ fontFamily: font.semibold, fontSize: 13.5, color: ink[900] }}>
          {member.isPrimary ? "Back to your own file" : `Now viewing ${first}'s file`}
        </Text>
      </Animated.View>
    </View>
  );
}
