import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Building2, CalendarDays, ChevronRight, Clock3, Hash, MonitorPlay, Receipt, Share2, ShieldPlus, Store, TestTube, Wallet } from "lucide-react-native";
import { Share, Text, View } from "react-native";

import { PillButton } from "@/components/ui/screen";
import { useAppointments } from "@/lib/booking/appointments";
import {
  amountDue,
  PAYMENT_LABEL,
  rupees,
  shortDate,
  type BillDetails,
  type BookingInvoiceDetails,
  type ConsultationInvoiceDetails,
} from "@/lib/records/details";
import { recordsOfType } from "@/lib/records/record-actions";
import type { RecordDetail } from "@/lib/records/types";
import { brand, hue, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Icon3D } from "@/components/ui/icon3d";

import { Card, Eyebrow, FactList, MoneyLine, PaymentBadge, Perforation, Section } from "./parts";
import { Tap } from "@/components/ui/tap";

/*
 * Money records: a pharmacy or hospital bill, and the invoices the app files
 * for bookings. Each opens on the one number people look for (what it cost,
 * and whether anything is still owed), then the receipt itself, laid out the
 * way a paper receipt is: lines, a perforation, the total.
 */

/** "Card" becomes "Paid by card"; "Pay at the clinic" stays as it is. */
function paidBy(mode: string): string {
  return /^pa(id|y)\b/i.test(mode) ? mode : `Paid by ${mode.toLowerCase() === "upi" ? "UPI" : mode.toLowerCase()}`;
}

function share(title: string, lines: string[]) {
  void Share.share({ title, message: [title, ...lines].join("\n") }).catch(() => undefined);
}

function AmountHero({ total, status, caption, tint }: { total: number; status: BillDetails["status"]; caption: string | null; tint: string }) {
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <Eyebrow>Total</Eyebrow>
          <Text style={{ fontFamily: font.semibold, fontSize: 40, letterSpacing: -1.4, color: ink[900], marginTop: 4, fontVariant: ["tabular-nums"] }}>{rupees(total)}</Text>
          {caption ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>{caption}</Text> : null}
        </View>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: surface.tint, alignItems: "center", justifyContent: "center" }}>
          <Icon3D name="report" size={34} />
        </View>
      </View>
      <View style={{ marginTop: 12 }}>
        <PaymentBadge status={status} />
      </View>
    </Card>
  );
}

// ------------------------------------------------------------------- bill --

const VENDOR: Record<BillDetails["vendorKind"], string> = {
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  clinic: "Clinic",
  diagnostic: "Diagnostic centre",
  other: "Provider",
};

export function BillBody({ record, details }: { record: RecordDetail; details: BillDetails }) {
  const router = useRouter();
  const due = amountDue(details);
  const insurance = useQuery({
    queryKey: ["records-of-type", record.profileId, "insurance"],
    queryFn: () => recordsOfType(record.profileId, "insurance"),
    enabled: details.claimable,
    staleTime: 60_000,
  });

  // By category, in the order they first appear.
  const groups: { name: string; items: BillDetails["items"] }[] = [];
  for (const item of details.items) {
    const name = item.category ?? "Items";
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(item);
    else groups.push({ name, items: [item] });
  }

  const caption = due > 0 ? `${rupees(due)} still to pay` : details.paymentMode ? `Paid by ${details.paymentMode}` : null;

  return (
    <View>
      <AmountHero total={details.total} status={details.status} caption={caption} tint={hue.slate.fg} />

      {details.items.length ? (
        <Section title="What was billed" right={<Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{details.items.length} item{details.items.length === 1 ? "" : "s"}</Text>}>
          <Card>
            {groups.map((g, gi) => (
              <View key={g.name} style={{ marginTop: gi ? 14 : 0 }}>
                {groups.length > 1 ? <Eyebrow>{g.name}</Eyebrow> : null}
                {g.items.map((item, i) => (
                  <MoneyLine
                    key={`${item.name}-${i}`}
                    label={item.name}
                    amount={item.amount}
                    sub={item.qty && item.rate !== null && item.qty > 1 ? `${item.qty} × ${rupees(item.rate)}` : null}
                  />
                ))}
              </View>
            ))}
            <Perforation />
            <MoneyLine label="Subtotal" amount={details.subtotal} muted />
            {details.discount > 0 ? <MoneyLine label="Discount" amount={details.discount} muted negative /> : null}
            {details.taxes.map((t) => (
              <MoneyLine key={t.label} label={t.label} amount={t.amount} muted />
            ))}
            <Perforation />
            <MoneyLine label="Total" amount={details.total} strong />
            {details.paid > 0 && details.paid < details.total ? <MoneyLine label="Paid" amount={details.paid} muted /> : null}
            {due > 0 ? <MoneyLine label="Balance due" amount={due} strong /> : null}
          </Card>
        </Section>
      ) : null}

      {details.claimable ? (
        <Section title="Insurance">
          <Tap
            accessibilityRole="button"
            onPress={() => {
              const first = insurance.data?.[0];
              if (first) router.push(`/records/${first.id}`);
            }}
            disabled={!insurance.data?.length}
          >
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 42, height: 42, borderRadius: 16, backgroundColor: hue.ocean.bg, alignItems: "center", justifyContent: "center" }}>
                <ShieldPlus size={19} color={hue.ocean.fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>This bill can be claimed</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: ink[500], marginTop: 2 }}>
                  {insurance.data?.length ? "Open the policy for the claims number and what it covers." : "Add the insurance policy to see what it covers."}
                </Text>
              </View>
              {insurance.data?.length ? <ChevronRight size={18} color={ink[500]} /> : null}
            </Card>
          </Tap>
        </Section>
      ) : null}

      <Section title="Details">
        <FactList
          rows={[
            { label: "Bill number", value: details.billNo },
            { label: "Date", value: record.eventDate ? shortDate(record.eventDate) : null },
            { label: VENDOR[details.vendorKind], value: details.vendor },
            { label: "GSTIN", value: details.gstin },
            { label: "Paid by", value: details.paymentMode },
          ]}
        />
      </Section>

      <PillButton
        tone="light"
        icon={<Share2 size={17} color={ink[900]} />}
        style={{ marginTop: 16 }}
        onPress={() =>
          share(`${details.vendor} bill`, [
            details.billNo ? `Bill ${details.billNo}` : "",
            record.eventDate ? shortDate(record.eventDate) : "",
            `Total ${rupees(details.total)} · ${PAYMENT_LABEL[details.status]}`,
          ].filter(Boolean))
        }
      >
        Share bill details
      </PillButton>
    </View>
  );
}

// ---------------------------------------------------- consultation invoice --

const STATUS_NOTE: Partial<Record<BillDetails["status"], string>> = {
  refunded: "The appointment was cancelled, so the fee goes back to how it was paid.",
  cancelled: "The appointment was cancelled before anything was paid.",
  due: "Pay at the clinic when you arrive.",
};

export function ConsultationInvoiceBody({ record, details }: { record: RecordDetail; details: ConsultationInvoiceDetails }) {
  const router = useRouter();
  const appointmentId = (record.extraction as { appointment_id?: string } | null)?.appointment_id;
  const appointment = useAppointments((s) => s.items.find((a) => a.id === appointmentId));
  const online = details.mode === "online";

  return (
    <View>
      <Card style={{ marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Eyebrow>Invoice</Eyebrow>
            <Text selectable style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900], marginTop: 4 }}>{details.invoiceNo}</Text>
            {details.issuedAt ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>Issued {shortDate(details.issuedAt)}</Text> : null}
          </View>
          <PaymentBadge status={details.status} />
        </View>

        <View style={{ marginTop: 16, padding: 12, borderRadius: 16, backgroundColor: "rgba(15,16,48,0.035)", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: hue.blue.wash, alignItems: "center", justifyContent: "center" }}>
              {online ? <MonitorPlay size={17} color={hue.blue.fg} /> : <Building2 size={17} color={hue.blue.fg} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{details.doctor.name}</Text>
              <Text numberOfLines={1} style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>
                {[details.doctor.specialty, online ? "Video consultation" : details.doctor.clinic ?? "Clinic visit"].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>
          {details.appointment.day ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CalendarDays size={14} color={ink[500]} />
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
                {shortDate(details.appointment.day)}
                {details.appointment.slot ? `, ${details.appointment.slot}` : ""}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 12 }}>
          {details.lines.map((l) => (
            <MoneyLine key={l.label} label={l.label} amount={l.amount} free />
          ))}
          <Perforation />
          <MoneyLine label="Total" amount={details.total} strong />
          {details.paymentMode ? <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 4 }}>{paidBy(details.paymentMode)}</Text> : null}
        </View>

        {STATUS_NOTE[details.status] ? (
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: ink[700], marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: surface.line }}>
            {STATUS_NOTE[details.status]}
          </Text>
        ) : null}
      </Card>

      {appointment ? (
        <PillButton icon={<Clock3 size={17} color="#fff" />} style={{ marginTop: 16 }} onPress={() => router.push(`/appointments/${appointment.id}`)}>
          See the appointment
        </PillButton>
      ) : null}
      <PillButton
        tone="light"
        icon={<Share2 size={17} color={ink[900]} />}
        style={{ marginTop: 10 }}
        onPress={() => share(`Consultation invoice ${details.invoiceNo}`, [details.doctor.name, details.appointment.day ? shortDate(details.appointment.day) : "", `Total ${rupees(details.total)} · ${PAYMENT_LABEL[details.status]}`].filter(Boolean))}
      >
        Share invoice
      </PillButton>
    </View>
  );
}

// -------------------------------------------------------- booking invoice --

export function BookingInvoiceBody({ record, details }: { record: RecordDetail; details: BookingInvoiceDetails }) {
  const router = useRouter();
  const fromApp = (record.extraction as { source?: string } | null)?.source === "cheeku";
  const caption = details.status === "due" ? "Paid to the collector at your door" : details.status === "paid" ? "Paid at collection" : null;

  return (
    <View>
      <AmountHero total={details.total} status={details.status} caption={caption} tint="#3a3a41" />

      <Section title={`${details.tests.length} test${details.tests.length === 1 ? "" : "s"} booked`}>
        <Card>
          {details.tests.map((t) => (
            <MoneyLine key={t.name} label={t.name} amount={t.price} />
          ))}
          <MoneyLine label="Home collection" amount={details.collectionFee} free muted />
          <Perforation />
          <MoneyLine label="Total" amount={details.total} strong />
        </Card>
      </Section>

      <Section title="Details">
        <FactList
          rows={[
            { label: "Invoice", value: details.invoiceNo, icon: Hash },
            { label: "Lab", value: details.partner, icon: Store },
            { label: "Collection", value: details.slot.date ? `${shortDate(details.slot.date)}${details.slot.window ? `, ${details.slot.window}` : ""}` : null, icon: TestTube },
            { label: "Issued", value: details.issuedAt ? shortDate(details.issuedAt) : null, icon: Receipt },
          ]}
        />
      </Section>

      {fromApp && details.bookingId ? (
        <PillButton icon={<TestTube size={17} color="#fff" />} style={{ marginTop: 16 }} onPress={() => router.push(`/labs/booking/${details.bookingId}`)}>
          {details.status === "cancelled" ? "See the booking" : "Track this booking"}
        </PillButton>
      ) : null}
      <PillButton
        tone="light"
        icon={<Share2 size={17} color={ink[900]} />}
        style={{ marginTop: 10 }}
        onPress={() => share(`${details.partner} invoice ${details.invoiceNo}`, [...details.tests.map((t) => `${t.name} ${rupees(t.price)}`), `Total ${rupees(details.total)} · ${PAYMENT_LABEL[details.status]}`])}
      >
        Share invoice
      </PillButton>
    </View>
  );
}
