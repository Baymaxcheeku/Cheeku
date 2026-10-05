import { useRouter } from "expo-router";
import { CalendarPlus, ChevronRight, FlaskConical, Plus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppointmentCard } from "@/components/booking/appointment-card";
import { MascotFigure } from "@/components/illustrations/sprout";
import { Glass, GlassCircle, glass, glassShadow } from "@/components/ui/glass";
import { useReducedMotion } from "@/components/ui/motion";
import { Backdrop, PageTitle, PillButton, ScreenHeader } from "@/components/ui/screen";
import { isUpcoming, startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { useLabBookings } from "@/lib/labs/queries";
import { ink } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * Appointments — every booking, upcoming first.
 *
 * Reached from the Upcoming card on Home, the Profile tab, and the booking
 * confirmation. Not a tab of its own: most people have none or one, and a tab
 * that is empty most of the time teaches people to ignore it.
 *
 * Two segments, Upcoming and Past, because those are the two questions: "when
 * is my next one" and "who did I see last time". Cancelled bookings sit in Past
 * so Upcoming only ever lists things that will happen.
 */
export default function Appointments() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const still = useReducedMotion();
  const { items, loaded } = useAppointmentList();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const labs = useLabBookings();
  const labsOpen = (labs.data ?? []).filter((b) => b.status !== "ready" && b.status !== "cancelled").length;

  const upcoming = items.filter((a) => isUpcoming(a)).sort((a, b) => startsAt(a).getTime() - startsAt(b).getTime());
  const past = items.filter((a) => !isUpcoming(a)).sort((a, b) => startsAt(b).getTime() - startsAt(a).getTime());
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader
        title="Appointments"
        right={
          <GlassCircle label="Book a doctor" onPress={() => router.push("/book/consult")}>
            <Plus size={21} color={ink[900]} />
          </GlassCircle>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <PageTitle title="Your appointments" line="Doctors you've booked through Cheeku." style={{ marginTop: 8 }} />

        {/* Lab collections live on their own screen; this is the way across. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/labs/bookings")}
          style={({ pressed }) => [glassShadow, { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: pressed ? "#fff" : glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#dcecff", alignItems: "center", justifyContent: "center" }}>
            <FlaskConical size={18} color="#1a6fc2" />
          </View>
          <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>
            Lab tests at home{labsOpen ? ` · ${labsOpen} in progress` : ""}
          </Text>
          <ChevronRight size={18} color={ink[300]} />
        </Pressable>

        <View className="mt-5 flex-row gap-2">
          {(
            [
              ["upcoming", `Upcoming${upcoming.length ? ` · ${upcoming.length}` : ""}`],
              ["past", "Past"],
            ] as const
          ).map(([k, label]) => {
            const on = tab === k;
            return (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setTab(k)}
                style={[
                  on ? null : glassShadow,
                  {
                    height: 44,
                    paddingHorizontal: 18,
                    borderRadius: 999,
                    justifyContent: "center",
                    backgroundColor: on ? ink[900] : glass.fillStrong,
                    borderWidth: on ? 0 : 1,
                    borderColor: glass.rim,
                  },
                ]}
              >
                <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 14, color: on ? "#fff" : ink[700] }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-4 gap-3">
          {list.map((a, i) => (
            <Animated.View key={a.id} entering={still ? undefined : FadeInDown.delay(i * 60).duration(300)}>
              <AppointmentCard appt={a} hero={tab === "upcoming" && i === 0} />
            </Animated.View>
          ))}
        </View>

        {loaded && list.length === 0 ? (
          <Glass strong className="mt-2 items-center rounded-[28px] px-6 py-8">
            <MascotFigure size={84} moment="shrug" move="float" hop />
            <Text style={{ fontFamily: font.semibold, fontSize: 18, color: ink[900], marginTop: 10, textAlign: "center" }}>
              {tab === "upcoming" ? "Nothing booked yet" : "No past appointments"}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4, textAlign: "center" }}>
              {tab === "upcoming"
                ? "Tell me what's bothering you and I'll help you find a doctor, online or nearby."
                : "Appointments you've had will show up here."}
            </Text>
            {tab === "upcoming" ? (
              <PillButton
                onPress={() => router.push("/book/consult")}
                icon={<CalendarPlus size={18} color="#fff" />}
                style={{ marginTop: 18, alignSelf: "stretch" }}
              >
                Book a doctor
              </PillButton>
            ) : null}
          </Glass>
        ) : null}
      </ScrollView>
    </View>
  );
}
