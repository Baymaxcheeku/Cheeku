import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Minus,
  Pill,
  Stethoscope,
  Syringe,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TYPE_META } from "@/components/health/health-file";
import { glass, glassShadow } from "@/components/ui/glass";
import { Backdrop, ScreenHeader } from "@/components/ui/screen";
import { font } from "@/theme/type";
import type { FlaggedValue } from "@/lib/records/overview";
import { useActiveProfileName, useHealthOverview } from "@/lib/records/use-overview";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * The whole file, opened from the stack on Home.
 *
 * WHAT IT IS NOT. Not a score, not a grade, not a "health age". Every number
 * here is something a document says or a count of documents — a single figure
 * summarising a person's health would be a clinical judgement, and this app
 * does not make those.
 *
 * The order is the order somebody actually asks in: what did the lab flag, what
 * am I taking, what is in the file, who has seen me.
 */
export default function HealthFileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /*
   * The SAME hook Home uses, not a second query under the same key. Two
   * different shapes on one key is what white-screened this app.
   */
  const data = useHealthOverview();
  const name = useActiveProfileName();

  if (data.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={brand[600]} />
      </View>
    );
  }

  const overview = data.data;
  if (!overview) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-10">
        <Text className="text-center text-[15px] text-ink-500">Set up a profile first.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          <Text
            accessibilityRole="header"
            style={{ fontFamily: font.semibold, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, color: ink[900] }}
          >
            {name.data ? `${name.data}'s health file` : "Health file"}
          </Text>
          <Text style={{ fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ink[500], marginTop: 4 }}>
            Everything filed, and what the labs measured. Cheeku reads it back to you; it does not
            interpret it.
          </Text>
        </View>

        {/* ------------------------------------------------------- flagged -- */}
        {overview.flagged.length > 0 ? (
          <Section label="Worth a look">
            <View className="mx-5 gap-2">
              {overview.flagged.map((value) => (
                <FlaggedRow
                  key={value.id}
                  value={value}
                  onPress={
                    value.documentId
                      ? () => router.push(`/records/${value.documentId}`)
                      : undefined
                  }
                />
              ))}
            </View>
            <Text className="mx-5 mt-2 text-[11.5px] leading-[17px] text-ink-300">
              Flagged by the laboratory that ran the test, against its own reference range. A flag
              is not a diagnosis.
            </Text>
          </Section>
        ) : overview.dataPoints > 0 ? (
          <Section label="Worth a look">
            <View
              className="mx-5 flex-row items-center gap-3 rounded-card px-4 py-3.5"
              style={{ backgroundColor: semantic.safeBg }}
            >
              <Text className="flex-1 text-[13px] leading-[19px]" style={{ color: semantic.safeText }}>
                Nothing in your {overview.dataPoints} recorded measurements is outside the range its
                lab printed.
              </Text>
            </View>
          </Section>
        ) : null}

        {/* --------------------------------------------------- medications -- */}
        {overview.medications.length > 0 ? (
          <Section label="Medicines">
            <View className="mx-5 overflow-hidden rounded-[26px]" style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
              {overview.medications.map((med, i) => (
                <View
                  key={med.id}
                  className="flex-row items-center gap-3 px-3.5 py-3"
                  style={i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
                    <Pill size={16} color={brand[600]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[14px] font-medium text-ink-900">{med.name}</Text>
                    {med.dose ? (
                      <Text className="mt-0.5 text-[11.5px] text-ink-500">{med.dose}</Text>
                    ) : null}
                  </View>
                  {/*
                   * Where it came from, said plainly. A name lifted off a
                   * prescription and a name the reader typed are different
                   * kinds of fact, and blending them would make the list
                   * impossible to audit later.
                   */}
                  <Text className="text-[10.5px] text-ink-300">
                    {med.source === "record" ? "From a record" : "You added"}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="mx-5 mt-2 text-[11.5px] leading-[17px] text-ink-300">
              Cheeku never suggests a medicine, a dose or a change. This is the list, not advice.
            </Text>
          </Section>
        ) : null}

        {/* --------------------------------------------------- what is in -- */}
        <Section label="In the file">
          <View className="mx-5 flex-row flex-wrap gap-2">
            {overview.byType.map((entry) => {
              const meta = TYPE_META[entry.type] ?? TYPE_META.other;
              return (
                <Pressable
                  key={entry.type}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.count} ${meta.label}. Opens documents`}
                  onPress={() => router.push("/records")}
                  className="flex-row items-center gap-2.5 rounded-[22px] px-3.5 py-3"
                  style={[glassShadow, { minWidth: "47%", backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
                    <meta.icon size={16} color={brand[600]} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[17px] font-semibold text-ink-900">{entry.count}</Text>
                    <Text className="text-[11px] text-ink-500" numberOfLines={1}>
                      {meta.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
            {overview.vaccinations > 0 ? (
              <View
                className="flex-row items-center gap-2.5 rounded-[22px] px-3.5 py-3"
                style={[glassShadow, { minWidth: "47%", backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}
              >
                <View className="h-9 w-9 items-center justify-center rounded-tile bg-brand-50">
                  <Syringe size={16} color={brand[600]} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[17px] font-semibold text-ink-900">
                    {overview.vaccinations}
                  </Text>
                  <Text className="text-[11px] text-ink-500">Doses recorded</Text>
                </View>
              </View>
            ) : null}
          </View>

          {overview.needsReview > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/records")}
              className="mx-5 mt-2 flex-row items-center gap-2.5 rounded-card px-4 py-3"
              style={{ backgroundColor: semantic.cautionBg }}
            >
              <Text className="flex-1 text-[12.5px]" style={{ color: semantic.cautionText }}>
                {overview.needsReview}{" "}
                {overview.needsReview === 1 ? "document needs" : "documents need"} checking against
                the original page
              </Text>
              <ChevronRight size={15} color={semantic.cautionText} />
            </Pressable>
          ) : null}
        </Section>

        {/* --------------------------------------------------------- care -- */}
        {overview.doctors.length > 0 || overview.facilities.length > 0 ? (
          <Section label="Who you've seen">
            <View className="mx-5 overflow-hidden rounded-[26px]" style={[glassShadow, { backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: glass.rim }]}>
              {overview.doctors.map((name, i) => (
                <Row key={`d-${name}`} icon={Stethoscope} label={name} first={i === 0} />
              ))}
              {overview.facilities.map((name, i) => (
                <Row
                  key={`f-${name}`}
                  icon={Building2}
                  label={name}
                  first={i === 0 && overview.doctors.length === 0}
                />
              ))}
            </View>
          </Section>
        ) : null}

        <Text className="mx-5 mt-7 text-[11.5px] leading-[17px] text-ink-300">
          This file is a record of what you have uploaded. It is not a diagnosis, a risk score or a
          medical opinion, and it is not a substitute for your doctor.
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-7">
      <Text className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">
        {label}
      </Text>
      <View className="mt-2.5">{children}</View>
    </View>
  );
}

function Row({
  icon: Icon,
  label,
  first,
}: {
  icon: typeof Stethoscope;
  label: string;
  first: boolean;
}) {
  return (
    <View
      className="flex-row items-center gap-3 px-3.5 py-3"
      style={first ? undefined : { borderTopWidth: 1, borderTopColor: surface.line }}
    >
      <Icon size={15} color={ink[300]} />
      <Text className="flex-1 text-[13.5px] text-ink-900">{label}</Text>
    </View>
  );
}

/**
 * A flagged measurement.
 *
 * The value leads at display size and the name follows, because somebody
 * scanning this is looking for the number. The flag is a word, not only a
 * colour: "Low" beside a red chip survives colour blindness and a screenshot
 * in greyscale.
 */
function FlaggedRow({ value, onPress }: { value: FlaggedValue; onPress?: () => void }) {
  const caution = value.flag === "caution";
  const tint = caution
    ? { bg: semantic.cautionBg, ink: semantic.cautionText }
    : { bg: semantic.dangerBg, ink: semantic.dangerText };

  const Arrow =
    value.direction === "up" ? ArrowUpRight : value.direction === "down" ? ArrowDownRight : Minus;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={`${value.name}, ${value.value} ${value.unit ?? ""}, flagged ${value.flag}`}
      onPress={onPress}
      className="flex-row items-center gap-3.5 rounded-card bg-surface p-3.5"
      style={[shadow.e1, { borderWidth: 1, borderColor: tint.bg }]}
    >
      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline gap-1.5">
          <Text className="text-[22px] font-semibold leading-[26px] text-ink-900">
            {value.value}
          </Text>
          {value.unit ? (
            <Text className="text-[12.5px] text-ink-500">{value.unit}</Text>
          ) : null}
          {value.direction ? (
            <View className="ml-0.5 flex-row items-center">
              <Arrow size={14} color={ink[300]} />
            </View>
          ) : null}
        </View>
        <Text className="mt-0.5 text-[13px] font-medium text-ink-900">{value.name}</Text>
        <Text className="mt-0.5 text-[11px] text-ink-300">
          {value.refRange ? `Lab range ${value.refRange}` : "No range printed"}
          {value.eventDate
            ? ` · ${new Date(value.eventDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`
            : ""}
        </Text>
      </View>

      <View className="items-end gap-1.5">
        <View className="rounded-pill px-2.5 py-1" style={{ backgroundColor: tint.bg }}>
          <Text className="text-[11px] font-bold capitalize" style={{ color: tint.ink }}>
            {value.flag}
          </Text>
        </View>
        {onPress ? <ChevronRight size={16} color={ink[300]} /> : null}
      </View>
    </Pressable>
  );
}
