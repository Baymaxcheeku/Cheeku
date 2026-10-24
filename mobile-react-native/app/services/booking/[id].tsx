import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarCheck2, Check, MessageCircleHeart } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotFigure } from "@/components/illustrations/sprout";
import { Brand } from "@/components/ui/brand";
import { Gradient, glassShadow } from "@/components/ui/glass";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { MODE_LABEL, serviceById } from "@/lib/services/catalog";
import { marketplace, STATUS_STEPS, statusIndex } from "@/lib/services/provider";
import { useServiceRequestList, whenText } from "@/lib/services/requests";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * One service request: where it is now, the details, and a way out. Opened
 * straight after booking (with a "you're booked" header), from the hub's "Your
 * requests", and from the Booked card in the person's chat thread.
 */
export default function ServiceBooking() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useServiceRequestList();
  const r = store.items.find((x) => x.id === id);

  if (!r) {
    return (
      <View className="flex-1 bg-canvas">
        <Backdrop />
        <ScreenHeader title="Booking" fallback="/services" />
        <Text style={{ marginTop: 40, textAlign: "center", fontFamily: font.regular, fontSize: 15, color: ink[500] }}>{store.loaded ? "This booking isn't on this phone." : "Loading…"}</Text>
      </View>
    );
  }

  const service = serviceById(r.serviceId);
  const cancelled = r.status === "cancelled";
  const at = statusIndex(r.status);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title={service?.title ?? "Booking"} fallback="/services" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={[glassShadow, { borderRadius: 32, overflow: "hidden", padding: 20, marginTop: 6 }]}>
          <Gradient from={service?.tint.from ?? brand[50]} to="#ffffff" glow="#ffffff" />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <CalendarCheck2 size={14} color={brand[600]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: brand[600] }}>{cancelled ? "Cancelled" : fresh ? "You're booked" : "Booked"}</Text>
              </View>
              <Text style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: ink[900], marginTop: 6 }}>{r.title}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[700], marginTop: 4 }}>For {r.forName} · {whenText(r)}</Text>
            </View>
            {fresh && !cancelled ? (
              <MascotFigure size={92} moment="celebrate" move="pop" />
            ) : null}
          </View>
          {fresh && !cancelled ? (
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 10 }}>
              It&apos;s in {r.forName}&apos;s memory now. Ask <Brand /> about it any time.
            </Text>
          ) : null}
        </View>

        {!cancelled ? (
          <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 16 }]}>
            {STATUS_STEPS.map((s, i) => {
              const done = i <= at;
              const last = i === STATUS_STEPS.length - 1;
              return (
                <View key={s.status} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 24 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: done ? brand[600] : surface.tint, alignItems: "center", justifyContent: "center" }}>
                      {done ? <Check size={13} color="#fff" strokeWidth={3} /> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: surface.line }} />}
                    </View>
                    {last ? null : <View style={{ width: 2, flex: 1, minHeight: 18, backgroundColor: i < at ? brand[300] : surface.line }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: done ? ink[900] : ink[500] }}>{s.label}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{s.line}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <View style={[glassShadow, { borderRadius: 24, backgroundColor: "#fff", padding: 16, gap: 10 }]}>
          <Row k="How" v={MODE_LABEL[r.mode]} />
          {r.address ? <Row k="Where" v={r.address} /> : null}
          {r.note ? <Row k="Your note" v={r.note} /> : null}
          <Row k="Provider" v={`${r.provider}${marketplace().preview ? " (preview)" : ""}`} />
          <Row k="Reference" v={r.reference} />
        </View>

        <PillButton icon={<MessageCircleHeart size={17} color="#fff" />} onPress={() => router.push("/ask")}>
          Ask Cheeku about this
        </PillButton>
        {!cancelled ? (
          <Tap accessibilityRole="button" onPress={() => store.cancel(r.id)} style={{ alignSelf: "center", paddingVertical: 12, paddingHorizontal: 20 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500], textDecorationLine: "underline" }}>Cancel this booking</Text>
          </Tap>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <Text style={{ width: 84, fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{k}</Text>
      <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[900] }}>{v}</Text>
    </View>
  );
}
