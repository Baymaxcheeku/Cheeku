import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { BellRing, Package, Pill, RefreshCw, ShieldCheck } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { firstName } from "@/components/home/ask-hero";
import { DoseList } from "@/components/today/task-card";
import { Sheet } from "@/components/today/sheets";
import { Glass, glassShadow } from "@/components/ui/glass";
import { SpringSwitch, StaggerItem } from "@/components/ui/motion";
import { Backdrop, PillButton, ScreenHeader } from "@/components/ui/screen";
import { ListSkeleton, ScreenSkeleton } from "@/components/ui/skeleton";
import { Tap } from "@/components/ui/tap";
import { feel } from "@/lib/feel";
import { saveDailyPrefs, useDailyPrefs } from "@/lib/home/logs";
import { SLOT_LABEL, SLOTS, TIMING_SHORT, lastDayLabel, readMedPrefs, runsOutLine, scheduleText, writeMedPrefs, type MedPrefs, type MedView, type Schedule, type Slot } from "@/lib/home/meds";
import { useHomeStage } from "@/lib/home/stage";
import { usePlan } from "@/lib/home/use-plan";
import { todayIso } from "@/lib/memory/clock";
import { enablePush } from "@/lib/notifications/push";
import { useFamily } from "@/lib/profiles/family";
import { brand, hue, ink, lilac, semantic, surface } from "@/theme/tokens";
import { font } from "@/theme/type";

/*
 * YOUR MEDICINES (loop-meds).
 *
 * Today's doses by part of the day, then every medicine with how it is taken,
 * how the week went, and how long the strip will last. Three small sheets set
 * what the record cannot know: how many are left, a schedule when the record
 * has none, and the times that suit this person. Every change saves to
 * daily_prefs.meds and the on-phone reminders follow (use-engagement.ts).
 *
 * Opened from the dose card on Today and from the memory screen.
 */

const TIME_CHOICES: Record<Slot, string[]> = {
  morning: ["07:00", "08:00", "09:00", "10:00"],
  afternoon: ["13:00", "14:00", "15:00", "16:00"],
  night: ["20:00", "21:00", "22:00", "23:00"],
};

const clockLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2026, 0, 1, h ?? 0, m ?? 0).toLocaleTimeString("en-IN", { hour: "numeric", minute: m ? "2-digit" : undefined });
};

const unitWord = (dose: string | null) => (/ml\b/i.test(dose ?? "") ? "ml" : "tablets");

export default function Medicines() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const family = useFamily();
  const profile = family.data?.profile ?? null;
  const home = useHomeStage();
  const { plan, loading } = usePlan(profile?.id, home.state?.due ?? []);
  const prefs = useDailyPrefs(profile?.id);
  const meds = readMedPrefs(prefs.data?.meds);

  const [stockFor, setStockFor] = useState<MedView | null>(null);
  const [scheduleFor, setScheduleFor] = useState<{ key: string; name: string; schedule: Schedule | null } | null>(null);
  const [timesOpen, setTimesOpen] = useState(false);

  if (!profile || !plan || (loading && !plan.meds)) {
    return (
      <ScreenSkeleton title="Your medicines">
        <ListSkeleton rows={3} />
        <ListSkeleton rows={4} />
      </ScreenSkeleton>
    );
  }

  const save = async (next: MedPrefs) => {
    const ok = await saveDailyPrefs(qc, profile.id, { ...(prefs.data ?? {}), meds: writeMedPrefs(next) });
    if (ok) feel.success();
    return ok;
  };

  const today = plan.meds;
  const who = profile.isPrimary ? "you" : firstName(profile.name);

  return (
    <View className="flex-1 bg-canvas">
      <Backdrop />
      <ScreenHeader title="Your medicines" subtitle={profile.isPrimary ? undefined : firstName(profile.name)} fallback="/today" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {!today ? (
          <View className="mt-4 rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
            <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>No medicines yet</Text>
            <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[700], marginTop: 4 }}>
              {`A prescription, a pharmacy bill or a photo of the box adds them. Cheeku then sets up the doses for ${who}.`}
            </Text>
            <PillButton style={{ marginTop: 14 }} onPress={() => router.push("/scan")}>
              Add a prescription
            </PillButton>
          </View>
        ) : (
          <>
            {/* Running low first: the one thing here with a deadline. */}
            {today.low.map((m) => (
              <View key={m.key} className="mt-4 flex-row items-center gap-3 rounded-xl p-3.5" style={{ backgroundColor: semantic.cautionBg }}>
                <Package size={20} color={semantic.cautionText} />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{`${m.name} is running low`}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[700], marginTop: 1 }}>{m.stock ? runsOutLine(m.stock) : ""}</Text>
                </View>
                <Tap
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: "/services/request", params: { service: "medicines", offering: "refill" } })}
                  className="h-9 items-center justify-center rounded-pill px-3.5"
                  style={{ backgroundColor: ink[900] }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: "#fff" }}>Refill</Text>
                </Tap>
              </View>
            ))}

            <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 0.2, color: ink[500], marginTop: 20, marginBottom: 10 }}>Today</Text>
            {today.slots.length ? (
              <View className="gap-3">
                {today.slots.map((s, i) => (
                  <StaggerItem key={s.slot} index={i}>
                    <View className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: s.done ? brand[100] : surface.line }]}>
                      <View className="flex-row items-center justify-between">
                        <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{SLOT_LABEL[s.slot]}</Text>
                        <Text style={{ fontFamily: font.medium, fontSize: 13, color: s.done ? brand[700] : ink[500] }}>{s.done ? "All taken" : clockLabel(s.time)}</Text>
                      </View>
                      <DoseList profileId={profile.id} doses={s.doses} />
                    </View>
                  </StaggerItem>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 20, color: ink[700] }}>Set when each one is taken below, and today&apos;s doses show up here.</Text>
            )}

            <Text style={{ fontFamily: font.semibold, fontSize: 13, letterSpacing: 0.2, color: ink[500], marginTop: 24, marginBottom: 10 }}>Every medicine</Text>
            <View className="gap-3">
              {today.meds.map((m) => (
                <MedCard key={m.key} med={m} onStock={() => setStockFor(m)} onSchedule={() => setScheduleFor({ key: m.key, name: m.name, schedule: m.schedule })} />
              ))}
              {today.unscheduled.map((e) => (
                <View key={e.key} className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{e.name}</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2 }}>The record doesn&apos;t say when. Set it to get dose reminders.</Text>
                  <View className="mt-3 flex-row">
                    <SmallPill label="Set when I take it" dark onPress={() => setScheduleFor({ key: e.key, name: e.name, schedule: null })} />
                  </View>
                </View>
              ))}
            </View>

            {/* Reminders */}
            <View className="mt-6 rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: lilac.base }}>
                  <BellRing size={18} color={hue.indigo.fg} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>Dose reminders</Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>The lock screen never names a medicine.</Text>
                </View>
                <SpringSwitch
                  checked={meds.remind}
                  label="Dose reminders"
                  onChange={() => {
                    const next = { ...meds, remind: !meds.remind };
                    void save(next);
                    if (next.remind) void enablePush().then(() => qc.invalidateQueries({ queryKey: ["push-permission"] }));
                  }}
                />
              </View>
              <Tap accessibilityRole="button" onPress={() => setTimesOpen(true)} className="mt-3 flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
                {SLOTS.map((s) => (
                  <View key={s} className="rounded-pill px-3 py-1.5" style={{ backgroundColor: surface.tint }}>
                    <Text style={{ fontFamily: font.medium, fontSize: 13, color: ink[700] }}>{`${SLOT_LABEL[s]} ${clockLabel(meds.times[s])}`}</Text>
                  </View>
                ))}
                <View className="rounded-pill px-3 py-1.5">
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[600] }}>Change times</Text>
                </View>
              </Tap>
            </View>
          </>
        )}

        <View className="mt-6 flex-row items-start gap-2 px-1">
          <ShieldCheck size={15} color={ink[500]} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 17, color: ink[500] }}>
            Cheeku follows your prescription and never changes a dose. If a dose was missed, ask your doctor or pharmacist before taking extra.
          </Text>
        </View>
      </ScrollView>

      <StockSheet med={stockFor} prefs={meds} onSave={save} onClose={() => setStockFor(null)} />
      <ScheduleSheet target={scheduleFor} prefs={meds} onSave={save} onClose={() => setScheduleFor(null)} />
      <TimesSheet open={timesOpen} prefs={meds} onSave={save} onClose={() => setTimesOpen(false)} />
    </View>
  );
}

function SmallPill({ label, onPress, dark, icon: Icon }: { label: string; onPress: () => void; dark?: boolean; icon?: typeof Pill }) {
  return (
    <Tap
      accessibilityRole="button"
      onPress={onPress}
      className="h-9 flex-row items-center gap-1.5 rounded-pill px-3.5"
      style={{ backgroundColor: dark ? brand[600] : "#fff", borderWidth: dark ? 0 : 1, borderColor: surface.line }}
    >
      {Icon ? <Icon size={14} color={dark ? "#fff" : ink[900]} /> : null}
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: dark ? "#fff" : ink[900] }}>{label}</Text>
    </Tap>
  );
}

function MedCard({ med, onStock, onSchedule }: { med: MedView; onStock: () => void; onSchedule: () => void }) {
  const how = [med.dose, scheduleText(med.schedule), TIMING_SHORT[med.timing]].filter(Boolean).join(" · ");
  const pct = med.adherence && med.adherence.due ? Math.round((med.adherence.taken / med.adherence.due) * 100) : null;
  return (
    <View className="rounded-xl bg-white p-4" style={[glassShadow, { borderWidth: 1, borderColor: surface.line }]}>
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: brand[50] }}>
          <Pill size={18} color={ink[900]} />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{med.name}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 1 }}>{how}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row gap-2">
        <Stat label="This week" value={med.adherence ? `${med.adherence.taken} of ${med.adherence.due}` : "Starts today"} sub={pct !== null ? `${pct}% of doses` : "Tick doses to see it"} />
        <Stat label="Strip" value={med.stock ? (med.stock.daysLeft === 0 ? "Ran out" : `${med.stock.daysLeft} days`) : "Not counted"} sub={med.stock ? (med.stock.daysLeft === 0 ? "Time to refill." : `Lasts till ${lastDayLabel(med.stock)}`) : "Count to get a refill nudge"} warn={med.stock?.low} />
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2" style={{ alignItems: "flex-start" }}>
        <SmallPill label={med.stock ? "Update count" : "Count what's left"} icon={RefreshCw} onPress={onStock} />
        <SmallPill label="Change when" onPress={onSchedule} />
      </View>
    </View>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <View className="flex-1 rounded-lg p-3" style={{ backgroundColor: warn ? semantic.cautionBg : surface.tint }}>
      <Text style={{ fontFamily: font.medium, fontSize: 11, letterSpacing: 0.4, color: ink[500] }}>{label.toUpperCase()}</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: warn ? semantic.cautionText : ink[900], marginTop: 2 }}>{value}</Text>
      <Text numberOfLines={2} style={{ fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: ink[500], marginTop: 2 }}>
        {sub}
      </Text>
    </View>
  );
}

function StockSheet({ med, prefs, onSave, onClose }: { med: MedView | null; prefs: MedPrefs; onSave: (p: MedPrefs) => Promise<boolean>; onClose: () => void }) {
  const [count, setCount] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setCount("");
    setError(null);
  }, [med]);
  if (!med) return null;
  const unit = unitWord(med.dose);
  async function submit() {
    if (!med) return;
    const n = Number(count.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0 || n > 2000) {
      setError(`Type how many ${unit} are left, up to 2,000.`);
      return;
    }
    const ok = await onSave({ ...prefs, stock: { ...prefs.stock, [med.key]: { left: n, on: todayIso() } } });
    if (ok) onClose();
    else setError("Couldn't save that. Check your connection and try again.");
  }
  return (
    <Sheet open title={`How many ${unit} are left?`} line={`${med.name}. Count after today's doses.`} onClose={onClose}>
      <Glass className="flex-row items-center gap-2 rounded-lg px-4 py-3">
        <TextInput
          value={count}
          onChangeText={setCount}
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor={ink[300]}
          accessibilityLabel={`${unit} left`}
          autoFocus
          style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 24, color: ink[900], paddingVertical: 4 }}
        />
        <Text style={{ fontFamily: font.medium, fontSize: 15, color: ink[500] }}>{unit}</Text>
      </Glass>
      <Text style={{ fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: ink[500], marginTop: 8 }}>
        {`At ${med.unitsPerDay % 1 ? med.unitsPerDay.toFixed(1) : med.unitsPerDay} a day. Cheeku nudges you five days before it runs out.`}
      </Text>
      {error ? <Text style={{ fontFamily: font.medium, fontSize: 13, color: semantic.dangerText, marginTop: 10 }}>{error}</Text> : null}
      <PillButton style={{ marginTop: 18 }} onPress={() => void submit()} disabled={!count.trim()}>
        Save
      </PillButton>
    </Sheet>
  );
}

const DOSE_CHOICES = [0, 0.5, 1, 2];

function ScheduleSheet({
  target,
  prefs,
  onSave,
  onClose,
}: {
  target: { key: string; name: string; schedule: Schedule | null } | null;
  prefs: MedPrefs;
  onSave: (p: MedPrefs) => Promise<boolean>;
  onClose: () => void;
}) {
  const [s, setS] = useState<Schedule>([1, 0, 0]);
  useEffect(() => {
    if (target) setS(target.schedule ?? [1, 0, 0]);
  }, [target]);
  if (!target) return null;
  const own = Boolean(prefs.schedules[target.key]);
  async function submit() {
    if (!target) return;
    if (await onSave({ ...prefs, schedules: { ...prefs.schedules, [target.key]: s } })) onClose();
  }
  async function reset() {
    if (!target) return;
    const key = target.key;
    const schedules = Object.fromEntries(Object.entries(prefs.schedules).filter(([k]) => k !== key));
    if (await onSave({ ...prefs, schedules })) onClose();
  }
  return (
    <Sheet open title="When do you take it?" line={`${target.name}. As your doctor wrote it.`} onClose={onClose}>
      {SLOTS.map((slot, i) => (
        <View key={slot} className="mb-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{SLOT_LABEL[slot]}</Text>
          <View className="mt-2 flex-row gap-2">
            {DOSE_CHOICES.map((n) => {
              const on = s[i] === n;
              return (
                <Tap
                  key={n}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${SLOT_LABEL[slot]}: ${n === 0 ? "none" : n}`}
                  onPress={() => {
                    feel.tick();
                    setS((p) => p.map((v, j) => (j === i ? n : v)) as Schedule);
                  }}
                  className="h-10 flex-1 items-center justify-center rounded-pill"
                  style={{ backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{n === 0 ? "None" : n === 0.5 ? "½" : String(n)}</Text>
                </Tap>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500] }}>{`That's ${scheduleText(s)}. This only sets reminders; it never changes the prescription.`}</Text>
      <PillButton style={{ marginTop: 18 }} disabled={s[0] + s[1] + s[2] === 0} onPress={() => void submit()}>
        Save
      </PillButton>
      {own ? (
        <Tap accessibilityRole="button" onPress={() => void reset()} style={{ alignSelf: "center", paddingVertical: 12, marginTop: 4 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[500] }}>Go back to the record&apos;s schedule</Text>
        </Tap>
      ) : null}
    </Sheet>
  );
}

function TimesSheet({ open, prefs, onSave, onClose }: { open: boolean; prefs: MedPrefs; onSave: (p: MedPrefs) => Promise<boolean>; onClose: () => void }) {
  const [times, setTimes] = useState(prefs.times);
  useEffect(() => {
    if (open) setTimes(prefs.times);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Sheet open={open} title="Your dose times" line="Pick what fits your day. Reminders follow." onClose={onClose}>
      {SLOTS.map((slot) => (
        <View key={slot} className="mb-4">
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: ink[900] }}>{SLOT_LABEL[slot]}</Text>
          <View className="mt-2 flex-row gap-2">
            {TIME_CHOICES[slot].map((t) => {
              const on = times[slot] === t;
              return (
                <Tap
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    feel.tick();
                    setTimes((p) => ({ ...p, [slot]: t }));
                  }}
                  className="h-10 flex-1 items-center justify-center rounded-pill"
                  style={{ backgroundColor: on ? ink[900] : "#fff", borderWidth: 1, borderColor: on ? ink[900] : surface.line }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: on ? "#fff" : ink[900] }}>{clockLabel(t)}</Text>
                </Tap>
              );
            })}
          </View>
        </View>
      ))}
      <PillButton
        style={{ marginTop: 6 }}
        onPress={() =>
          void (async () => {
            if (await onSave({ ...prefs, times })) onClose();
          })()
        }
      >
        Save times
      </PillButton>
    </Sheet>
  );
}
