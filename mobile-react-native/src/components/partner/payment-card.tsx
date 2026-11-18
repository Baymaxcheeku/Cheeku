import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { glassCard, PILLAR_TONE } from "@/components/today/palette";
import { Icon3D } from "@/components/ui/icon3d";
import { Tap } from "@/components/ui/tap";
import { minutesLeft, openPayment } from "@/lib/partner/pay";
import type { Payment } from "@/lib/partner/types";
import { brand, ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * "Pay to confirm", on any order still waiting for the partner's payment.
 *
 * The link lives 16 minutes. The card counts down in whole minutes, opens the
 * payment page in a sheet, and asks the screen to check again the moment the
 * sheet closes (onReturn), since there is no webhook to tell us.
 *
 * Once the time is up the booking is released on the partner's side; the card
 * says so plainly and points back to booking again, never a dead "Pay" button.
 */
export function PaymentCard({ payment, what, onReturn, onRebook }: { payment: Payment | undefined; what: string; onReturn: () => void; onRebook?: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!payment?.required || payment.expired) return;
    const t = setInterval(() => tick((n) => n + 1), 20_000);
    return () => clearInterval(t);
  }, [payment?.required, payment?.expired]);

  if (!payment?.required) return null;
  const left = minutesLeft(payment.dueAt);
  const lapsed = payment.expired || (payment.dueAt !== null && left === null);

  if (lapsed || !payment.link) {
    return (
      <View style={[glassCard(PILLAR_TONE.eat.glass), { borderRadius: 24, padding: 16, flexDirection: "row", gap: 12, alignItems: "center" }]}>
        <Icon3D name="clock" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: ink[900] }}>Not paid in time</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
            The {what} was released because the payment didn&apos;t come through. Nothing was charged.
          </Text>
          {onRebook ? (
            <Tap accessibilityRole="button" onPress={onRebook} hitSlop={6} style={{ marginTop: 8 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: brand[600] }}>Book again</Text>
            </Tap>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[glassCard(PILLAR_TONE.sleep.glass), { borderRadius: 24, padding: 16 }]}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Icon3D name="shield-check" size={36} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 17, letterSpacing: -0.2, color: ink[900] }}>Pay to confirm your {what}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 2 }}>
            {left ? `The secure link closes in ${left} min. After that the ${what} is released.` : `Pay through the secure link to hold the ${what}.`}
          </Text>
        </View>
      </View>
      <Tap
        accessibilityRole="button"
        accessibilityLabel="Pay now"
        scale={0.98}
        onPress={async () => {
          await openPayment(payment.link!);
          onReturn();
        }}
        style={{ marginTop: 14, height: 50, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: brand[600] }}
      >
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: "#fff" }}>Pay now</Text>
      </Tap>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], textAlign: "center", marginTop: 8 }}>
        Paid already? It can take a minute to show here.
      </Text>
    </View>
  );
}
