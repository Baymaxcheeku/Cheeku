import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ChevronRight, Pill } from "lucide-react-native";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Note } from "@/components/partner/bits";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { labstack } from "@/lib/partner/labstack";
import { rupees } from "@/lib/partner/pharmacy-cart";
import type { PharmaStatus } from "@/lib/partner/types";
import { useFamily } from "@/lib/profiles/family";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/* Every medicine order for the family, newest first. */

const WORD: Record<PharmaStatus, string> = { PENDING: "Placed", CREATED: "Placed", PLACED: "Placed", CONFIRMED: "Confirmed", SHIPPED: "On the way", PARTIAL_DELIVERED: "Partly delivered", FULL_DELIVERED: "Delivered", COMPLETED: "Delivered", CANCELLED: "Cancelled" };

export default function PharmaOrders() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const family = useFamily();
  const orders = useQuery({ queryKey: ["pharma-orders"], queryFn: () => labstack().pharma.orders() });
  const nameOf = (id: string) => {
    const m = family.data?.access.all.find((x) => x.id === id);
    return m?.isPrimary ? "You" : (m?.name.split(" ")[0] ?? "");
  };
  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Medicine orders" fallback="/medicines" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30, gap: 10 }} refreshControl={<RefreshControl refreshing={orders.isRefetching} onRefresh={() => void orders.refetch()} tintColor={brand[600]} />}>
        {orders.isError ? <Note tone="danger" text="Couldn't load orders. Pull down to try again." /> : null}
        {(orders.data ?? []).map((o) => (
          <Tap key={o.orderId} accessibilityRole="button" onPress={() => router.push({ pathname: "/pharmacy/order/[id]", params: { id: o.orderId } } as never)} className="flex-row items-center gap-3 rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line }}>
            <View className="h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: brand[50] }}>
              <Pill size={17} color={ink[900]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{o.items.length > 1 ? `${o.items[0]?.name} and ${o.items.length - 1} more` : o.items[0]?.name}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{[WORD[o.status], nameOf(o.profileId), rupees(o.total), new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })].filter(Boolean).join(" · ")}</Text>
            </View>
            <ChevronRight size={16} color={ink[300]} />
          </Tap>
        ))}
        {orders.isSuccess && !orders.data.length ? (
          <View style={{ alignItems: "center", marginTop: 40, gap: 14 }}>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], textAlign: "center" }}>No medicine orders yet.</Text>
            <PillButton onPress={() => router.push("/pharmacy" as never)}>Order medicines</PillButton>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
