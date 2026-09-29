import {
  BellRing,
  Check,
  Dumbbell,
  FlaskConical,
  HeartHandshake,
  Pill,
  Salad,
  Stethoscope,
  type LucideIcon,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MascotBust } from "@/components/illustrations/sprout";
import { Boop, BubblePop } from "@/components/onboarding/motion";
import { PressRow } from "@/components/ui/motion";
import { kv } from "@/lib/storage";
import { brand, ink, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * Book with Cheeku — the marketplace, as a front door that is honest about
 * being unbuilt.
 *
 * ┌─ WHAT THIS IS AND IS NOT ────────────────────────────────────────────────┐
 * │                                                                          │
 * │ The roadmap's phase 2 turns Cheeku from a companion into something that  │
 * │ books: consultations, lab tests, medicines. Phase 3 carries that into    │
 * │ diet, fitness and the day-to-day. None of it exists yet, so this row     │
 * │ shows the SHAPE of it and says "coming soon" in words on every tap.      │
 * │                                                                          │
 * │ Deliberately NOT here: invented doctors, invented ratings, invented      │
 * │ slots, or a "recommended specialist" inferred from records. The last one │
 * │ is triage, and a health app that routes you to a specialty from your     │
 * │ reports has made a clinical judgement it is not allowed to make.         │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * "Notify me" is stored on this device only, per service. It is a way to
 * say "I want this" that costs the reader nothing and measures demand.
 *
 * Tints come from the journey palette. Never green, amber or red: those mean
 * a health result everywhere in this app.
 */
type Service = {
  id: string;
  label: string;
  Icon: LucideIcon;
  bg: string;
  fg: string;
  /** What booking it will mean, in one line. */
  promise: string;
};

const SERVICES: readonly Service[] = [
  { id: "doctor", label: "Doctor", Icon: Stethoscope, bg: brand[50], fg: brand[600], promise: "Tell me what's bothering you, and I'll find a doctor and a slot that suits you." },
  { id: "labs", label: "Lab tests", Icon: FlaskConical, bg: "#e6f1fd", fg: "#1a6fc2", promise: "Home sample collection, with the report filed straight into your health file." },
  { id: "medicines", label: "Medicines", Icon: Pill, bg: "#fdeee0", fg: "#c2650b", promise: "Order what your doctor prescribed, delivered, with the prescription kept on file." },
  { id: "gynae", label: "Gynae", Icon: HeartHandshake, bg: "#fdeaf0", fg: "#c22a6b", promise: "Book a gynaecologist, online or at a clinic near you." },
  { id: "diet", label: "Dietician", Icon: Salad, bg: "#f3e9fd", fg: "#7b3fd4", promise: "A dietician who can see your reports, so the plan starts from your numbers." },
  { id: "fitness", label: "Fitness", Icon: Dumbbell, bg: "#e8eefc", fg: "#3f5bd9", promise: "Classes and trainers, online or at home, that fit around your routine." },
];

const KEY = "cheeku.notify";

export function BookWithCheeku() {
  const [open, setOpen] = useState<Service | null>(null);
  const [notify, setNotify] = useState<string[]>([]);

  useEffect(() => {
    void kv.get(KEY).then((raw) => {
      if (raw) {
        try {
          setNotify(JSON.parse(raw) as string[]);
        } catch {
          // A corrupt value is not worth surfacing; start again.
        }
      }
    });
  }, []);

  async function toggle(id: string) {
    const next = notify.includes(id) ? notify.filter((n) => n !== id) : [...notify, id];
    setNotify(next);
    await kv.set(KEY, JSON.stringify(next));
  }

  return (
    <View className="mt-7">
      <View className="flex-row items-center justify-between px-5">
        <View className="flex-row items-center gap-2">
          <Text style={[type.heading, { fontSize: 18 }]}>Book with Cheeku</Text>
          <View className="rounded-pill px-2 py-0.5" style={{ backgroundColor: brand[50] }}>
            <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 0.6, color: brand[700] }}>SOON</Text>
          </View>
        </View>
      </View>
      <Text style={[type.bodySmall, { paddingHorizontal: 20, marginTop: 2 }]}>
        Tell me what you need. I&apos;ll find it, book it and file it.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12, gap: 10 }}
      >
        {SERVICES.map((s, i) => (
          <PressRow key={s.id} index={i} onPress={() => setOpen(s)}>
            <View
              accessibilityRole="button"
              accessibilityLabel={`${s.label}. Booking coming soon`}
              className="w-[76px] items-center gap-2 rounded-[20px] bg-surface py-3"
              style={shadow.e1}
            >
              <View className="h-11 w-11 items-center justify-center rounded-pill" style={{ backgroundColor: s.bg }}>
                <s.Icon size={20} color={s.fg} />
              </View>
              <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 12, color: ink[700] }}>
                {s.label}
              </Text>
              {notify.includes(s.id) ? (
                <View className="absolute right-1.5 top-1.5 h-4 w-4 items-center justify-center rounded-pill" style={{ backgroundColor: brand[600] }}>
                  <BellRing size={9} color="#fff" />
                </View>
              ) : null}
            </View>
          </PressRow>
        ))}
      </ScrollView>

      <SoonSheet
        service={open}
        on={open ? notify.includes(open.id) : false}
        onToggle={() => open && void toggle(open.id)}
        onClose={() => setOpen(null)}
      />
    </View>
  );
}

function SoonSheet({
  service,
  on,
  onToggle,
  onClose,
}: {
  service: Service | null;
  on: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(service)} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(15,16,48,0.4)" }} />
      {service ? (
        <View className="rounded-t-sheet bg-canvas px-6 pt-3" style={{ paddingBottom: insets.bottom + 18 }}>
          <View className="mb-4 h-1 w-10 self-center rounded-pill" style={{ backgroundColor: surface.line }} />
          <View className="flex-row items-end gap-3">
            <MascotBust size={70} />
            <BubblePop from="left" style={{ flexShrink: 1, marginBottom: 8 }}>
              <View className="rounded-[18px] bg-surface px-3.5 py-2.5" style={[shadow.e1, { borderBottomLeftRadius: 6 }]}>
                <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>
                  I&apos;m learning to do this. Almost there!
                </Text>
              </View>
            </BubblePop>
          </View>

          <View className="mt-4 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-pill" style={{ backgroundColor: service.bg }}>
              <service.Icon size={22} color={service.fg} />
            </View>
            <View className="flex-1">
              <Text style={type.heading}>{service.label} booking</Text>
              <Text style={[type.caption, { color: brand[600] }]}>Coming soon to Cheeku</Text>
            </View>
          </View>
          <Text style={[type.body, { marginTop: 12, color: ink[700] }]}>{service.promise}</Text>

          <Boop trigger={on} style={{ marginTop: 20 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={onToggle}
              className="h-[52px] flex-row items-center justify-center gap-2 rounded-pill"
              style={{ backgroundColor: on ? brand[50] : brand[600], borderWidth: on ? 1.5 : 0, borderColor: brand[300] }}
            >
              {on ? <Check size={18} color={brand[700]} strokeWidth={3} /> : <BellRing size={18} color="#fff" />}
              <Text style={[type.button, { color: on ? brand[700] : "#ffffff" }]}>
                {on ? "You're on the list" : "Notify me when it's live"}
              </Text>
            </Pressable>
          </Boop>
          <Pressable accessibilityRole="button" onPress={onClose} className="mt-2 h-11 items-center justify-center">
            <Text style={{ fontFamily: font.semibold, fontSize: 14.5, color: ink[500] }}>Maybe later</Text>
          </Pressable>
        </View>
      ) : null}
    </Modal>
  );
}
