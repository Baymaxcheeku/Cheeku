import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, Home as HomeIcon, Store } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Note, Section } from "@/components/partner/bits";
import { AddressForm, Field, useAddress } from "@/components/partner/forms";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { labstack } from "@/lib/partner/labstack";
import { SPEED_LABEL, usePharmacyCart } from "@/lib/partner/pharmacy-cart";
import { PartnerError, type PharmaOrderType } from "@/lib/partner/types";
import { checkAddress, checkPincode } from "@/lib/partner/validate";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * ORDER MEDICINES, STEP 2: WHERE.
 *
 * Home delivery (address in parts, pharmacy rules: street up to 200, city,
 * state, 6-digit pincode) or pickup from a pharmacy near the pincode. Then
 * the pharmacies that serve it (LabStack checkServiceability) with the
 * speeds each offers. Picks lsPharmacyId and the speed for the estimate.
 */

export default function PharmacyDelivery() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cart = usePharmacyCart();
  const address = useAddress(cart.profileId ?? undefined);
  const [type, setType] = useState<PharmaOrderType>(cart.orderType);
  const [pharmacyId, setPharmacyId] = useState<number | null>(cart.lsPharmacyId);
  const [speed, setSpeed] = useState(cart.speed);
  const [tried, setTried] = useState(false);
  const pin = checkPincode(address.value.pincode);

  const list = useQuery({
    queryKey: ["pharmacies", type, pin.ok ? pin.value : null, address.value.latitude],
    queryFn: () => labstack().pharma.pharmacies({ orderType: type, pincode: pin.ok ? pin.value : undefined, latitude: address.value.latitude, longitude: address.value.longitude }),
    enabled: pin.ok || address.value.latitude != null,
  });
  const chosen = list.data?.find((p) => p.lsPharmacyId === pharmacyId) ?? list.data?.[0] ?? null;
  useEffect(() => {
    if (chosen && (!speed || !chosen.speeds.includes(speed))) setSpeed(chosen.speeds[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen?.lsPharmacyId]);

  if (!cart.lines.length) {
    return (
      <View className="flex-1 bg-canvas">
        <ScreenHeader title="Delivery" fallback="/pharmacy" />
        <PillButton onPress={() => router.replace("/pharmacy" as never)} style={{ margin: 20 }}>
          Add a medicine first
        </PillButton>
      </View>
    );
  }

  function next() {
    setTried(true);
    const errs = type === "HOME_DELIVERY" ? checkAddress(address.value, "pharmacy") : pin.ok ? {} : { pincode: pin.error };
    if (Object.keys(errs).length || !chosen) return;
    cart.setDelivery(type, chosen.lsPharmacyId, speed);
    void address.remember();
    router.push("/pharmacy/review" as never);
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title="Delivery" fallback="/pharmacy" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          {([["HOME_DELIVERY", "Deliver home", HomeIcon], ["PICKUP", "Pick up", Store]] as const).map(([v, label, Icon]) => {
            const on = type === v;
            return (
              <Tap key={v} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => { setType(v); setPharmacyId(null); }} style={{ flex: 1, height: 52, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                <Icon size={17} color={on ? "#fff" : ink[900]} />
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? "#fff" : ink[900] }}>{label}</Text>
              </Tap>
            );
          })}
        </View>

        {type === "HOME_DELIVERY" ? (
          <View style={{ marginTop: 16 }}>
            <AddressForm a={address} kind="pharmacy" showErrors={tried} title="Deliver to" />
          </View>
        ) : (
          <Section title="Near which pincode?">
            <Field page label="Pincode" hint="We'll show pharmacies within 10 km." value={address.value.pincode} onChangeText={(t) => address.set({ pincode: t.replace(/\D/g, "").slice(0, 6), latitude: null, longitude: null })} keyboardType="number-pad" maxLength={6} error={tried && !pin.ok ? pin.error : undefined} />
          </Section>
        )}

        <Section title="Pharmacy">
          {!pin.ok && address.value.latitude == null ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500] }}>Add the pincode to see pharmacies that serve it.</Text>
          ) : list.isPending ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500] }}>Checking who delivers here…</Text>
          ) : list.isError ? (
            <Note tone="danger" text={list.error instanceof PartnerError ? list.error.message : "Couldn't check. Try again."} />
          ) : !list.data?.length ? (
            <Note tone="caution" text={type === "PICKUP" ? "No partner pharmacy for pickup near this pincode. Try home delivery." : "No partner pharmacy delivers to this pincode yet."} />
          ) : (
            <View style={{ gap: 8 }}>
              {list.data.map((p) => {
                const on = p.lsPharmacyId === chosen?.lsPharmacyId;
                return (
                  <Tap key={p.lsPharmacyId} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setPharmacyId(p.lsPharmacyId)} className="rounded-xl bg-white p-4" style={{ borderWidth: 1.5, borderColor: on ? brand[500] : surface.line, gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{p.name}</Text>
                      {on ? <Check size={17} color={brand[600]} /> : null}
                    </View>
                    <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>
                      {[p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km` : null, p.speeds.map((s) => SPEED_LABEL[s]).join(", ")].filter(Boolean).join(" · ")}
                    </Text>
                    {type === "PICKUP" && p.pickup ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700] }}>{p.pickup.address}{p.pickup.opens ? ` · open ${p.pickup.opens} to ${p.pickup.closes}` : ""}</Text> : null}
                  </Tap>
                );
              })}
            </View>
          )}
        </Section>

        {chosen && type === "HOME_DELIVERY" && chosen.speeds.length > 1 ? (
          <Section title="How fast?">
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {chosen.speeds.map((s) => {
                const on = s === speed;
                return (
                  <Tap key={s} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setSpeed(s)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 999, justifyContent: "center", backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? "#fff" : ink[900] }}>{SPEED_LABEL[s]}</Text>
                  </Tap>
                );
              })}
            </View>
          </Section>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" disabled={!chosen} onPress={next}>
          See the price
        </PillButton>
      </View>
    </KeyboardAvoidingView>
  );
}
