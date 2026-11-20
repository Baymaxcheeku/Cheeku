import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Check, MapPin, Truck } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Line, Note, Section } from "@/components/partner/bits";
import { CancelSheet } from "@/components/partner/sheets";
import { glassShadow } from "@/components/ui/glass";
import { Enter } from "@/components/ui/motion";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { DetailSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { rupees, SPEED_LABEL } from "@/lib/partner/pharmacy-cart";
import { PartnerError, type PharmaStatus } from "@/lib/partner/types";
import { brand, ink, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { PaymentCard } from "@/components/partner/payment-card";

/*
 * One medicine order, placed to delivered (LabStack getOrderDetails, kept
 * fresh by the pharmacy webhook). A split order shows each delivery. Until
 * it ships it can be cancelled with a reason.
 */

const STEPS: { key: string; label: string; line: string; statuses: PharmaStatus[] }[] = [
  { key: "placed", label: "Order placed", line: "The pharmacy has it.", statuses: ["PENDING", "CREATED", "PLACED"] },
  { key: "confirmed", label: "Confirmed", line: "Packed against your prescription.", statuses: ["CONFIRMED"] },
  { key: "shipped", label: "On the way", line: "Out for delivery.", statuses: ["SHIPPED", "PARTIAL_DELIVERED"] },
  { key: "delivered", label: "Delivered", line: "I'll top up the strip counts.", statuses: ["FULL_DELIVERED", "COMPLETED"] },
];

export default function PharmaOrderScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const order = useQuery({ queryKey: ["pharma-order", id], queryFn: () => labstack().pharma.order(id), refetchInterval: (q) => (q.state.data?.payment?.required && !q.state.data.payment.expired ? 10_000 : 60_000) });
  const owed = Boolean(order.data?.payment?.required);
  const [cancelOpen, setCancelOpen] = useState(false);
  const celebrated = useRef(false);
  useEffect(() => {
    if (fresh && order.data && !celebrated.current) {
      celebrated.current = true;
      feel.success();
    }
  }, [fresh, order.data]);

  if (order.isPending) {
    return (
      <ScreenSkeleton title="Medicine order">
        <DetailSkeleton hero={180} />
      </ScreenSkeleton>
    );
  }
  const o = order.data;
  if (!o) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Medicine order" fallback="/pharmacy/orders" />
        <Note tone="danger" text={order.error instanceof PartnerError ? order.error.message : "This order isn't here."} />
      </View>
    );
  }
  const cancelled = o.status === "CANCELLED";
  const idx = Math.max(0, STEPS.findIndex((s) => s.statuses.includes(o.status)));
  const canCancel = !cancelled && idx <= 1;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title={fresh ? undefined : "Medicine order"} fallback="/pharmacy/orders" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 30 }} refreshControl={<RefreshControl refreshing={order.isRefetching} onRefresh={() => void order.refetch()} tintColor={brand[600]} />}>
        {owed ? (
          <View style={{ marginBottom: 18 }}>
            <PaymentCard payment={order.data?.payment} what="order" onReturn={() => void order.refetch()} />
          </View>
        ) : null}
        {fresh && !cancelled && !owed ? (
          <View style={{ alignItems: "center", marginBottom: 18 }}>
            <Enter kind="pop" style={[glassShadow, { width: 76, height: 76, borderRadius: 999, backgroundColor: brand[600], alignItems: "center", justifyContent: "center" }]}>
              <Check size={36} color="#fff" strokeWidth={3} />
            </Enter>
            <Text style={{ fontFamily: font.semibold, fontSize: 24, letterSpacing: -0.7, color: ink[900], marginTop: 14 }}>Order placed</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 15, color: ink[500], marginTop: 4, textAlign: "center" }}>I&apos;ll tell you when it ships.</Text>
          </View>
        ) : null}

        <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 6 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{o.pharmacyName}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
            {[o.orderType === "PICKUP" ? "Pickup" : `Home delivery${o.speed ? ` · ${SPEED_LABEL[o.speed]}` : ""}`, rupees(o.total), o.lsOrderId ? `Order ${o.lsOrderId}` : null].filter(Boolean).join(" · ")}
          </Text>
          {o.pickup ? (
            <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
              <MapPin size={14} color={ink[500]} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700] }}>{o.pickup.address}{o.pickup.opens ? ` · open ${o.pickup.opens} to ${o.pickup.closes}` : ""}</Text>
            </View>
          ) : null}
          {o.trackingId ? (
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginTop: 4 }}>
              <Truck size={14} color={ink[500]} />
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>Tracking {o.trackingId}</Text>
            </View>
          ) : null}
        </View>

        {cancelled ? (
          <Note tone="caution" text={`Cancelled${o.cancelReason ? `: ${o.cancelReason}` : ""}. Nothing is charged.`} />
        ) : (
          <View className="mt-4 rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line }}>
            {STEPS.map((s, i) => {
              const done = i <= idx;
              const now = i === idx;
              return (
                <View key={s.key} style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ alignItems: "center", width: 26 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: done ? brand[600] : "rgba(15,16,48,0.07)", borderWidth: now ? 4 : 0, borderColor: brand[100] }}>
                      {done && !now ? <Check size={13} color="#fff" strokeWidth={3} /> : null}
                    </View>
                    {i < STEPS.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: i < idx ? brand[600] : "rgba(15,16,48,0.08)" }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingBottom: i < STEPS.length - 1 ? 12 : 0 }}>
                    <Text style={{ fontFamily: now ? font.semibold : font.medium, fontSize: 15, color: done ? ink[900] : ink[300] }}>{s.label}</Text>
                    {now ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{o.status === "PARTIAL_DELIVERED" ? "Part of it has arrived; the rest is coming." : s.line}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {o.related.length ? <Note tone="info" text={`The pharmacy is sending this in ${o.related.length + 1} parts. Each arrives on its own.`} /> : null}

        <Section title="Medicines">
          <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 8 }}>
            {o.items.map((i) => (
              <Line key={i.drugMasterId} label={`${i.name} × ${i.quantity}`} value={rupees(i.linePrice)} />
            ))}
            {(() => {
              // On a split order the total covers every part but the items only this one, so the gap isn't a charge.
              const charges = o.total - o.items.reduce((s, i) => s + i.linePrice, 0);
              return !o.related.length && charges >= 1 ? <Line label="Delivery and handling" value={rupees(charges)} muted /> : null;
            })()}
            <View style={{ height: 1, backgroundColor: surface.line }} />
            <Line label="Total" value={rupees(o.total)} strong />
          </View>
        </Section>

        {canCancel ? (
          <Tap accessibilityRole="button" onPress={() => setCancelOpen(true)} style={{ height: 48, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 15, color: semantic.dangerText }}>Cancel this order</Text>
          </Tap>
        ) : null}
        {!LIVE ? <Note tone="info" text="Preview: the status moves on by itself so you can see each step. Nothing is ordered." /> : null}
      </ScrollView>

      <CancelSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this order?"
        line="Only before it ships. Nothing is charged."
        reasons={["Ordered by mistake", "Found it cheaper elsewhere", "Doctor changed the medicine", "Taking too long", "Something else"]}
        onCancel={async (reason) => {
          try {
            await labstack().pharma.cancel(o.orderId, reason);
            await qc.invalidateQueries({ queryKey: ["pharma-order", id] });
            void qc.invalidateQueries({ queryKey: ["pharma-orders"] });
            return null;
          } catch (e) {
            return e instanceof PartnerError ? e.message : "That didn't go through. Try again.";
          }
        }}
      />
    </View>
  );
}
