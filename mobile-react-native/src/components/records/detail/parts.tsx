import { BellRing, Check, Moon, Sun, Sunrise, type LucideIcon } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View, type ViewStyle } from "react-native";

import { Glass } from "@/components/ui/glass";
import { clearRecordReminder, hasRecordReminder, setRecordReminder, type RecordReminder } from "@/lib/notifications/push";
import {
  courseStatus,
  medicineInstruction,
  PAYMENT_LABEL,
  rupees,
  shortDate,
  type Medicine,
  type MedTiming,
  type PaymentStatus,
} from "@/lib/records/details";
import { brand, ink, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * The pieces every record page is built from, so eleven layouts still read
 * as one app: the same card, the same section heading, the same way of
 * laying out facts and money.
 *
 * COLOUR. Green, amber and red mean how a HEALTH result reads, and nothing
 * here borrows them: "Paid" is not good news about your body, and "due" is
 * not a warning about it. Payment and dose states use ink and the brand.
 * The one exception is a discharge summary's "come back if" list, which is
 * genuinely about health and uses the caution hue.
 */

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: ViewStyle; padded?: boolean }) {
  return (
    <Glass strong className="rounded-[24px]" style={[padded ? { padding: 16 } : { overflow: "hidden" }, style]}>
      {children}
    </Glass>
  );
}

export function Section({ title, right, children, style }: { title: string; right?: React.ReactNode; children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginTop: 22 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: font.semibold, fontSize: 17.5, letterSpacing: -0.3, color: ink[900] }}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Eyebrow({ children, color = ink[500] }: { children: string; color?: string }) {
  return <Text style={{ fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 0.6, textTransform: "uppercase", color }}>{children}</Text>;
}

export type Fact = { label: string; value: string | null | undefined; icon?: LucideIcon };

/**
 * Facts two to a row, as small tiles. Hand-built rows, never a wrapping
 * flex row (a wrapped row stretched its tiles on iOS; PROGRESS.md).
 */
export function FactGrid({ facts, tint = brand[600] }: { facts: Fact[]; tint?: string }) {
  const shown = facts.filter((f) => f.value);
  const rows: Fact[][] = [];
  for (let i = 0; i < shown.length; i += 2) rows.push(shown.slice(i, i + 2));
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 8 }}>
          {row.map((f) => (
            <Glass key={f.label} strong className="rounded-[18px]" style={{ flex: 1, padding: 12 }}>
              {f.icon ? <f.icon size={15} color={tint} /> : null}
              <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500], marginTop: f.icon ? 6 : 0 }}>{f.label}</Text>
              <Text selectable style={{ fontFamily: font.semibold, fontSize: 13.5, lineHeight: 18, color: ink[900], marginTop: 2 }}>
                {f.value}
              </Text>
            </Glass>
          ))}
          {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/** Label on the left, value on the right, a hairline between rows. */
export function FactList({ rows }: { rows: Fact[] }) {
  const shown = rows.filter((r) => r.value);
  if (shown.length === 0) return null;
  return (
    <Card padded={false}>
      {shown.map((r, i) => (
        <View key={r.label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
          <Text style={{ width: 112, fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{r.label}</Text>
          <Text selectable style={{ flex: 1, fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: ink[900], textAlign: "right" }}>
            {r.value}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function Chip({ text, bg = "rgba(15,16,48,0.05)", fg = ink[700], icon: Icon }: { text: string; bg?: string; fg?: string; icon?: LucideIcon }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: bg }}>
      {Icon ? <Icon size={12} color={fg} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: fg }}>{text}</Text>
    </View>
  );
}

/** Chips in hand-built rows of up to three. */
export function ChipRow({ items, bg, fg }: { items: string[]; bg?: string; fg?: string }) {
  const rows: string[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((t) => (
            <Chip key={t} text={t} bg={bg} fg={fg} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function Bullets({ items, color = brand[500], numbered = false }: { items: string[]; color?: string; numbered?: boolean }) {
  return (
    <View style={{ gap: 10 }}>
      {items.map((t, i) => (
        <View key={`${i}-${t}`} style={{ flexDirection: "row", gap: 10 }}>
          {numbered ? (
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: brand[50], alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 11, color: brand[700] }}>{i + 1}</Text>
            </View>
          ) : (
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, marginTop: 7 }} />
          )}
          <Text selectable style={{ flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20.5, color: ink[700] }}>
            {t}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ money --

const PAYMENT_TONE: Record<PaymentStatus, { bg: string; fg: string }> = {
  paid: { bg: brand[50], fg: brand[700] },
  due: { bg: ink[900], fg: "#ffffff" },
  partial: { bg: ink[900], fg: "#ffffff" },
  refunded: { bg: "#e9eef7", fg: "#2f4a7a" },
  cancelled: { bg: "rgba(15,16,48,0.06)", fg: ink[500] },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const tone = PAYMENT_TONE[status];
  return <Chip text={PAYMENT_LABEL[status]} bg={tone.bg} fg={tone.fg} icon={status === "paid" ? Check : undefined} />;
}

export function MoneyLine({ label, amount, strong, muted, negative, sub, free }: { label: string; amount: number; strong?: boolean; muted?: boolean; negative?: boolean; sub?: string | null; /** Say "Free" rather than ₹0. */ free?: boolean }) {
  const color = muted ? ink[500] : ink[900];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: strong ? 4 : 6 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: strong ? font.semibold : font.regular, fontSize: strong ? 16 : 14, color }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 1 }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontFamily: strong ? font.bold : font.medium, fontSize: strong ? 17 : 14, color, fontVariant: ["tabular-nums"] }}>
        {free && amount === 0 ? "Free" : `${negative ? "− " : ""}${rupees(amount)}`}
      </Text>
    </View>
  );
}

/** The perforation on a receipt. */
export function Perforation() {
  return (
    <View style={{ flexDirection: "row", gap: 5, marginVertical: 10, overflow: "hidden" }}>
      {Array.from({ length: 40 }, (_, i) => (
        <View key={i} style={{ width: 6, height: 1.5, borderRadius: 1, backgroundColor: surface.line }} />
      ))}
    </View>
  );
}

// -------------------------------------------------------------- medicines --

const SLOTS = [
  { label: "Morning", icon: Sunrise },
  { label: "Afternoon", icon: Sun },
  { label: "Night", icon: Moon },
] as const;

const TIMING_CHIP: Record<MedTiming, string | null> = {
  before_food: "Before food",
  after_food: "After food",
  with_food: "With food",
  empty_stomach: "Empty stomach",
  bedtime: "At bedtime",
  any: null,
};

/**
 * One medicine, the way a careful pharmacist would explain it: what, how much,
 * when in the day (three slots, lit for the doses), relative to food, and for
 * how long, with how many days are left when the start is known.
 */
export function MedicineCard({ m, startIso, extra }: { m: Medicine; startIso: string | null; extra?: string | null }) {
  const course = courseStatus(m, startIso);
  const timing = TIMING_CHIP[m.timing];
  return (
    <View style={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text selectable style={{ fontFamily: font.semibold, fontSize: 15.5, color: ink[900] }}>
            {m.name}
            {m.strength ? <Text style={{ fontFamily: font.medium, color: ink[500] }}>{`  ${m.strength}`}</Text> : null}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 3 }}>
            {[m.dose, medicineInstruction(m)].filter(Boolean).join(" · ")}
          </Text>
        </View>
        {course.left !== null ? (
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: course.ended ? ink[300] : brand[700] }}>
              {course.ended ? "Course done" : `${course.left} day${course.left === 1 ? "" : "s"} left`}
            </Text>
            {course.endsOn && !course.ended ? <Text style={{ fontFamily: font.regular, fontSize: 11.5, color: ink[500], marginTop: 1 }}>till {shortDate(course.endsOn)}</Text> : null}
          </View>
        ) : null}
      </View>

      {m.asNeeded ? null : (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {SLOTS.map((slot, i) => {
            const n = m.schedule[i] ?? 0;
            const on = n > 0;
            return (
              <View
                key={slot.label}
                accessibilityLabel={`${slot.label}: ${on ? n : "none"}`}
                style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 12, backgroundColor: on ? brand[50] : "rgba(15,16,48,0.035)" }}
              >
                <slot.icon size={14} color={on ? brand[600] : ink[300]} />
                <Text style={{ fontFamily: on ? font.semibold : font.regular, fontSize: 12.5, color: on ? brand[700] : ink[300] }}>{on ? (n === 0.5 ? "½" : n) : "–"}</Text>
              </View>
            );
          })}
        </View>
      )}

      {timing || m.note || extra ? (
        <View style={{ gap: 6 }}>
          {timing ? <Chip text={timing} bg="#fff4e6" fg="#8a4b08" /> : null}
          {m.note ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500] }}>{m.note}</Text> : null}
          {extra ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: ink[500] }}>{extra}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export function MedicineList({ medicines, startIso, extra }: { medicines: Medicine[]; startIso: string | null; extra?: (m: Medicine, i: number) => string | null }) {
  return (
    <Card padded={false}>
      {medicines.map((m, i) => (
        <View key={`${m.name}-${i}`} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: surface.line }}>
          <MedicineCard m={m} startIso={startIso} extra={extra?.(m, i)} />
        </View>
      ))}
    </Card>
  );
}

// --------------------------------------------------------------- reminders --

/**
 * A reminder the person asks for from a record. Reads back whether one is
 * already set, so the button tells the truth on every visit. On web there
 * are no phone notifications, and it says so rather than pretending.
 */
export function ReminderButton({ reminder, label, setLabel = "Reminder set" }: { reminder: RecordReminder | null; label: string; setLabel?: string }) {
  const [on, setOn] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = reminder?.id;

  useEffect(() => {
    let live = true;
    if (id) void hasRecordReminder(id).then((v) => live && setOn(v));
    return () => {
      live = false;
    };
  }, [id]);

  if (!reminder) return null;

  async function toggle() {
    if (!reminder) return;
    setBusy(true);
    setNote(null);
    if (on) {
      await clearRecordReminder(reminder.id);
      setOn(false);
    } else {
      const outcome = await setRecordReminder(reminder);
      if (outcome === "set") setOn(true);
      else if (outcome === "past") setNote("That date has already passed.");
      else if (outcome === "denied") setNote("Notifications are off for Cheeku. Turn them on in your phone's settings.");
      else setNote(Platform.OS === "web" ? "Reminders work in the phone app." : "Reminders aren't available on this device.");
    }
    setBusy(false);
  }

  return (
    <View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: on, busy }}
        disabled={busy}
        onPress={() => void toggle()}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          height: 46,
          borderRadius: 999,
          backgroundColor: on ? brand[600] : pressed ? "#ece8ff" : brand[50],
          opacity: busy ? 0.6 : 1,
        })}
      >
        {on ? <Check size={16} color="#fff" strokeWidth={2.6} /> : <BellRing size={16} color={brand[700]} />}
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? "#fff" : brand[700] }}>{on ? setLabel : label}</Text>
      </Pressable>
      {note ? <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: ink[500], textAlign: "center", marginTop: 6 }}>{note}</Text> : null}
    </View>
  );
}

/** The date a reminder should fire: `days` before `iso`, at 9 am local. */
export function reminderAt(iso: string, daysBefore: number): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, (d ?? 1) - daysBefore, 9, 0, 0);
}

/** A tall stat: a big number and a small caption. */
export function Stat({ value, label, tint = ink[900] }: { value: string; label: string; tint?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: font.bold, fontSize: 20, letterSpacing: -0.4, color: tint }}>
        {value}
      </Text>
      <Text style={{ fontFamily: font.regular, fontSize: 12, color: ink[500], marginTop: 2 }}>{label}</Text>
    </View>
  );
}

/** A thin rounded bar, `share` from 0 to 1. */
export function Meter({ share, color = brand[600], track = "rgba(15,16,48,0.06)", height = 8 }: { share: number; color?: string; track?: string; height?: number }) {
  const pct = `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` as const;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: pct, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}
