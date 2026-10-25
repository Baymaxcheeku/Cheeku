import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

import { glassShadow } from "@/components/ui/glass";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { enablePush, pushPermission } from "@/lib/notifications/push";
import { kv } from "@/lib/storage";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

const DISMISSED = "cheeku.remindersPrompt";

/*
 * The explainer before the OS asks. iOS gives one chance at the permission
 * dialog, so it only comes after a tap here, never on its own. Shown on
 * Today while permission is still undecided; "Not now" hides it for good on
 * this phone, and settings can still turn reminders on later.
 */
export function RemindersPrompt({ meds }: { meds: boolean }) {
  const qc = useQueryClient();
  const permission = useQuery({ queryKey: ["push-permission"], queryFn: pushPermission });
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    void kv
      .get(DISMISSED)
      .then((v) => setHidden(v === "1"))
      .catch(() => setHidden(false));
  }, []);

  if (Platform.OS === "web" || hidden || permission.data !== "undetermined") return null;

  return (
    <View className="mx-5 mt-4 flex-row items-center gap-3 rounded-xl p-3.5" style={[glassShadow, { backgroundColor: "#fff", borderWidth: 1, borderColor: surface.line }]}>
      <View className="h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: lilac.base }}>
        <BellRing size={18} color={brand[600]} />
      </View>
      <View className="min-w-0 flex-1">
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{meds ? "Get a nudge at dose time" : "Get a nudge at the right time"}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 1 }}>A few a day, never after 10 pm.</Text>
      </View>
      <Tap
        accessibilityRole="button"
        onPress={() => {
          feel.tap();
          void enablePush().then(() => qc.invalidateQueries({ queryKey: ["push-permission"] }));
        }}
        className="h-9 items-center justify-center rounded-pill px-3.5"
        style={{ backgroundColor: brand[600] }}
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Turn on</Text>
      </Tap>
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Not now"
        hitSlop={8}
        onPress={() => {
          setHidden(true);
          void kv.set(DISMISSED, "1").catch(() => undefined);
        }}
      >
        <X size={16} color={ink[300]} />
      </Tap>
    </View>
  );
}
