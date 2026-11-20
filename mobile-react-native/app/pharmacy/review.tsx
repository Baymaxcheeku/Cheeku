import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Check, FileText } from "lucide-react-native";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Line, Note, Section } from "@/components/partner/bits";
import { AddressForm, Field, PatientCard, useAddress, usePatient } from "@/components/partner/forms";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { Tap } from "@/components/ui/tap";
import { recordBooking, threadKey, useMemory } from "@/lib/memory/store";
import { labstack, LIVE } from "@/lib/partner/labstack";
import { rupees, SPEED_LABEL, usePharmacyCart } from "@/lib/partner/pharmacy-cart";
import { PartnerError } from "@/lib/partner/types";
import { formatEventDate } from "@/lib/records/grouping";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { openPayment } from "@/lib/partner/pay";

/*
 * ORDER MEDICINES, STEP 3: CHECK AND PLACE.
 *
 * The real price from the pharmacy (getEstimate): each line with MRP and
 * what you pay, delivery, total, and anything not available. If a medicine
 * needs a prescription, pick it from this person's records (sent with the
 * order; pdf or image up to 10 MB). Then who it's for, a note, and place
 * (placeOrder, our order id as the referenceId).
 */

export default function PharmacyReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const cart = usePharmacyCart();
  const patient = usePatient(cart.profileId ?? undefined);
  const address = useAddress(cart.profileId ?? undefined);
  const memory = useMemory(cart.profileId ?? undefined);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const est = useQuery({
    queryKey: ["pharma-estimate", cart.lsPharmacyId, cart.orderType, cart.speed, address.value.pincode, address.value.address, address.value.city, cart.lines.map((l) => `${l.drug.drugMasterId}x${l.quantity}`).join(",")],
    queryFn: () => labstack().pharma.estimate({ orderType: cart.orderType, lsPharmacyId: cart.lsPharmacyId!, speed: cart.speed, lines: cart.lines, pincode: address.value.pincode || undefined, latitude: address.value.latitude, longitude: address.value.longitude, address: address.value }),
    enabled: Boolean(cart.lsPharmacyId && cart.lines.length && (address.value.pincode || address.value.latitude != null)),
  });

  const prescriptions = useMemo(
    () => (memory.data?.documents ?? []).filter((d) => d.doc_type === "prescription").sort((a, b) => String(b.event_date ?? b.created_at).localeCompare(String(a.event_date ?? a.created_at))).slice(0, 6),
    [memory.data],
  );
  const e = est.data;
  const needsRx = Boolean(e?.prescriptionRequired);

  async function place() {
    setTried(true);
    if (!patient.ready) return setError("A few details are missing above.");
    if (!e) return;
    if (needsRx && !cart.prescriptionIds.length) return setError("Attach the prescription for the medicines that need one.");
    setBusy(true);
    setError(null);
    try {
      const { orderId, payment } = await labstack().pharma.place({
        profileId: cart.profileId!,
        orderType: cart.orderType,
        lsPharmacyId: e.lsPharmacyId,
        speed: cart.speed,
        lines: cart.lines.filter((l) => e.items.find((i) => i.drugMasterId === l.drug.drugMasterId)?.available !== false).map((l) => ({ drugMasterId: l.drug.drugMasterId, quantity: l.quantity })),
        patient: patient.result!.patient,
        address: address.value,
        notes: cart.notes.trim(),
        prescriptionDocumentIds: cart.prescriptionIds,
      });
      const names = cart.lines.map((l) => l.drug.name);
      const first = patient.member?.name.split(" ")[0] ?? "them";
      void recordBooking(
        cart.profileId!,
        { kind: "medicine", title: names.length > 2 ? `${names[0]} and ${names.length - 1} more` : names.join(" + "), when: cart.orderType === "PICKUP" ? "Ready for pickup soon" : cart.speed ? SPEED_LABEL[cart.speed] : "Delivery", where: e.pharmacyName, route: `/pharmacy/order/${orderId}` },
        `Ordered ${names.join(", ")} for ${first} from ${e.pharmacyName}. I'll tell you when it ships and top up the strip count when it arrives.`,
      ).then(() => qc.invalidateQueries({ queryKey: threadKey(cart.profileId!) }));
      cart.clear();
      void qc.invalidateQueries({ queryKey: ["pharma-orders"] });
      router.replace({ pathname: "/pharmacy/order/[id]", params: { id: orderId, fresh: "1" } } as never);
      if (payment?.link) void openPayment(payment.link).then(() => qc.invalidateQueries({ queryKey: ["pharma-order", orderId] }));
    } catch (err) {
      setError(err instanceof PartnerError ? err.message : "That didn't go through. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-canvas" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Backdrop />
      <ScreenHeader title="Check and order" fallback="/pharmacy/delivery" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <Section title={e ? e.pharmacyName : "Price"}>
          {est.isPending ? (
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: ink[500] }}>Getting the price from the pharmacy…</Text>
          ) : est.isError ? (
            <>
              {/* The partner names medicines by code; say them by name. */}
              <Note tone="danger" text={(est.error instanceof PartnerError ? est.error.message : "Couldn't get a price. Go back and try again.").replace(/\s*—\s*/g, ". ").replace(/unavailable drugMasterId\(s\):\s*/i, "Not in stock here: ").replace(/[A-Z]{2,4}\d{3,}/g, (code) => cart.lines.find((l) => l.drug.drugMasterId === code)?.drug.name ?? code)} />
              <PillButton tone="light" onPress={() => router.back()} style={{ marginTop: 10 }}>
                Pick another pharmacy
              </PillButton>
            </>
          ) : e ? (
            <View className="rounded-xl bg-white p-4" style={{ borderWidth: 1, borderColor: surface.line, gap: 10 }}>
              {e.items.map((i) => (
                <View key={i.drugMasterId}>
                  <Line label={`${i.name} × ${i.quantity}`} value={i.available ? rupees(i.linePrice) : "Not available"} muted={!i.available} />
                  {i.available && i.mrp * i.quantity > i.linePrice ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>MRP {rupees(i.mrp * i.quantity)}</Text> : null}
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: surface.line }} />
              <Line label={cart.orderType === "PICKUP" ? "Pickup" : `Delivery${e.speed ? ` · ${SPEED_LABEL[e.speed]}` : ""}`} value={e.charges ? rupees(e.charges) : "Free"} />
              {e.mrpTotal > e.subTotal ? <Line label="You save on MRP" value={rupees(e.mrpTotal - e.subTotal)} muted /> : null}
              <Line label="To pay" value={rupees(e.total)} strong />
            </View>
          ) : null}
          {e && !e.allAvailable ? <Note tone="caution" text="Something isn't available at this pharmacy right now. It's left out of the order; go back to try another pharmacy." /> : null}
        </Section>

        {needsRx ? (
          <Section title="Prescription">
            {prescriptions.length ? (
              <View style={{ gap: 8 }}>
                {prescriptions.map((d) => {
                  const id = String(d.id);
                  const on = cart.prescriptionIds.includes(id);
                  return (
                    <Tap key={id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => cart.setPrescriptions(on ? cart.prescriptionIds.filter((x) => x !== id) : [...cart.prescriptionIds, id])} className="flex-row items-center gap-3 rounded-xl bg-white p-3.5" style={{ borderWidth: 1.5, borderColor: on ? brand[500] : surface.line }}>
                      <FileText size={18} color={ink[900]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{String((d.extraction as { title?: string } | null)?.title ?? d.title ?? "Prescription")}</Text>
                        <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500] }}>{d.event_date ? formatEventDate(String(d.event_date)) : "No date"}{d.doctor ? ` · ${d.doctor}` : ""}</Text>
                      </View>
                      {on ? <Check size={18} color={brand[600]} /> : null}
                    </Tap>
                  );
                })}
              </View>
            ) : (
              <Note tone="caution" text="No prescription in this person's records yet. Add one (photo or PDF), then come back." />
            )}
            <Tap accessibilityRole="button" onPress={() => router.push("/scan")} style={{ height: 44, justifyContent: "center", marginTop: 4 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>Add a prescription</Text>
            </Tap>
          </Section>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <PatientCard p={patient} showErrors={tried} />
        </View>
        {cart.orderType === "HOME_DELIVERY" ? (
          <View style={{ marginTop: 14 }}>
            <AddressForm a={address} kind="pharmacy" showErrors={tried} title="Deliver to" />
          </View>
        ) : null}
        <Section title="Note for the pharmacy">
          <Field page label="Note" hint="Optional. For example: call when outside." value={cart.notes} onChangeText={cart.setNotes} maxLength={1000} multiline placeholder="Optional" />
        </Section>

        {error ? <Note tone="danger" text={error} /> : null}
        {!LIVE ? <Note tone="info" text="Preview: nothing is ordered or charged. Payment is decided before launch." /> : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: insets.bottom + 12 }}>
        <PillButton tone="brand" loading={busy} disabled={!e} onPress={() => void place()}>
          {e ? `Place order · ${rupees(e.total)}` : "Place order"}
        </PillButton>
      </View>
    </KeyboardAvoidingView>
  );
}
