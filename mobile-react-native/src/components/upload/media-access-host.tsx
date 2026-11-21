import { ShieldCheck } from "lucide-react-native";
import { Text, View } from "react-native";

import { Icon3D } from "@/components/ui/icon3d";
import { PillButton } from "@/components/ui/screen";
import { Sheet } from "@/components/ui/sheet";
import { allowMediaAccess, declineMediaAccess, mediaSheetGone, useMediaAccess } from "@/lib/upload/media-access";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

const COPY = {
  photos: {
    title: "Let Cheeku see your photos?",
    body: "So you can pick reports and prescriptions you've already photographed. Cheeku only ever opens the ones you choose.",
    allow: "Allow photos",
  },
  camera: {
    title: "Let Cheeku use the camera?",
    body: "So you can snap a report or prescription and have it read and filed in seconds.",
    allow: "Allow camera",
  },
} as const;

/** The one sheet that explains camera and photo access before iOS asks. Mounted once, in the root layout. */
export function MediaAccessHost() {
  const kind = useMediaAccess((s) => s.kind);
  const mode = useMediaAccess((s) => s.mode);
  const busy = useMediaAccess((s) => s.busy);
  const copy = COPY[kind ?? "photos"];
  return (
    <Sheet open={kind !== null} onClose={declineMediaAccess} dismissible={!busy} onGone={mediaSheetGone}>
      <View style={{ alignItems: "center", paddingTop: 6 }}>
        <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon3D name={kind === "camera" ? "monitor" : "folder"} size={58} />
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 22, letterSpacing: -0.5, color: ink[900], textAlign: "center", marginTop: 16 }}>
          {mode === "settings" ? (kind === "camera" ? "Camera access is off" : "Photo access is off") : copy.title}
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: ink[500], textAlign: "center", marginTop: 8, paddingHorizontal: 8 }}>
          {mode === "settings" ? `Turn it on for Cheeku in Settings, then come back. ${copy.body}` : copy.body}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, backgroundColor: surface.tint }}>
          <ShieldCheck size={16} color={brand[600]} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>Location data is removed on your phone before anything is uploaded.</Text>
        </View>
      </View>
      <PillButton tone="brand" loading={busy} onPress={() => void allowMediaAccess()} style={{ marginTop: 20 }}>
        {mode === "settings" ? "Open Settings" : copy.allow}
      </PillButton>
      <PillButton tone="light" onPress={declineMediaAccess} style={{ marginTop: 10 }}>
        Not now
      </PillButton>
    </Sheet>
  );
}
