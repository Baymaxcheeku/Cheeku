import { Check, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Pressable } from "@/components/ui/pressable";

import { glass } from "@/components/ui/glass";
import { allergySuggestions, BLOOD, conditionSuggestions, type MemberHealth } from "@/lib/profiles/health";
import { brand, ink, lilac, surface } from "@/theme/tokens";
import { font } from "@/theme/type";
import { Tap } from "@/components/ui/tap";

/*
 * Health basics, as taps rather than typing.
 *
 *   Conditions   chips suggested for their age (a baby's list is not a
 *                grandparent's), plus "Add another" for anything else
 *   Allergies    chips, "None known", and "Add another"
 *   Medicines    one row per medicine: name, dose, when
 *   Blood group  eight chips
 *   Height, weight
 *
 * Controlled: the caller owns the value and decides when to save. Every
 * section is optional and says so; an honest "not sure" beats a guess in a
 * medical record.
 *
 * Chip rows wrap. They are fixed-height and aligned to the start, which is
 * what keeps the iOS "stretched wrapped row" bug (PROGRESS.md) away: that bug
 * needs children whose height the row decides.
 */
export function HealthEditor({
  value,
  onChange,
  age,
  name,
}: {
  value: MemberHealth;
  onChange: (next: MemberHealth) => void;
  age: number | null;
  /** Used in the copy: "What does Amma take?" */
  name?: string;
}) {
  const set = <K extends keyof MemberHealth>(k: K, v: MemberHealth[K]) => onChange({ ...value, [k]: v });
  const who = name?.trim() ? name.trim().split(" ")[0] : "they";

  return (
    <View style={{ gap: 26 }}>
      <Section title="Known conditions" hint="Only what a doctor has told you. Tap to add.">
        <ChipSet
          suggestions={conditionSuggestions(age)}
          selected={value.conditions}
          onChange={(v) => set("conditions", v)}
          addLabel="Add another"
          placeholder="e.g. Vitamin D deficiency"
        />
      </Section>

      <Section title="Allergies" hint="Medicines especially. A doctor needs these first.">
        <ChipSet
          suggestions={allergySuggestions()}
          selected={value.allergies}
          onChange={(v) => set("allergies", v)}
          addLabel="Add another"
          placeholder="e.g. Ibuprofen"
          noneLabel="None known"
        />
      </Section>

      <Section title={`Medicines ${who === "they" ? "they take" : `${who} takes`}`} hint="Anything taken regularly, including supplements.">
        <View style={{ gap: 10 }}>
          {value.medications.map((m, i) => (
            <View key={i} style={{ padding: 12, borderRadius: 16, backgroundColor: glass.fillStrong, borderWidth: 1, borderColor: surface.line, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Input
                  value={m.name}
                  onChangeText={(t) => set("medications", value.medications.map((x, j) => (j === i ? { ...x, name: t } : x)))}
                  placeholder="Medicine, e.g. Metformin"
                  style={{ flex: 1 }}
                />
                <Tap accessibilityRole="button" accessibilityLabel="Remove medicine" hitSlop={8} onPress={() => set("medications", value.medications.filter((_, j) => j !== i))}>
                  <X size={18} color={ink[300]} />
                </Tap>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Input
                  value={m.dose}
                  onChangeText={(t) => set("medications", value.medications.map((x, j) => (j === i ? { ...x, dose: t } : x)))}
                  placeholder="Dose, e.g. 500 mg"
                  style={{ flex: 1 }}
                />
                <Input
                  value={m.frequency}
                  onChangeText={(t) => set("medications", value.medications.map((x, j) => (j === i ? { ...x, frequency: t } : x)))}
                  placeholder="When, e.g. after dinner"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))}
          <AddButton label={value.medications.length ? "Add another medicine" : "Add a medicine"} onPress={() => set("medications", [...value.medications, { name: "", dose: "", frequency: "" }])} />
        </View>
      </Section>

      <Section title="Blood group" hint="Skip it if you're not sure.">
        {[BLOOD.slice(0, 4), BLOOD.slice(4)].map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: 8, marginTop: r ? 8 : 0 }}>
            {row.map((b) => {
              const on = value.bloodGroup === b;
              return (
                <Tap
                  key={b}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => set("bloodGroup", on ? "" : b)}
                  style={{ flex: 1, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: on ? brand[600] : glass.fillStrong, borderWidth: on ? 0 : 1, borderColor: surface.line }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 15, color: on ? "#fff" : ink[900] }}>{b}</Text>
                </Tap>
              );
            })}
          </View>
        ))}
      </Section>

      <Section title="Height and weight" hint="Helps read BMI-linked results. Rough is fine.">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Unit value={value.heightCm} onChangeText={(t) => set("heightCm", t.replace(/[^0-9.]/g, ""))} unit="cm" placeholder="Height" />
          <Unit value={value.weightKg} onChangeText={(t) => set("weightKg", t.replace(/[^0-9.]/g, ""))} unit="kg" placeholder="Weight" />
        </View>
      </Section>
    </View>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={{ fontFamily: font.semibold, fontSize: 17, color: ink[900] }}>{title}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: ink[500], marginTop: 2, marginBottom: 12 }}>{hint}</Text>
      {children}
    </View>
  );
}

function ChipSet({
  suggestions,
  selected,
  onChange,
  addLabel,
  placeholder,
  noneLabel,
}: {
  suggestions: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  addLabel: string;
  placeholder: string;
  noneLabel?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const none = noneLabel ? selected.length === 1 && selected[0] === noneLabel : false;
  const custom = selected.filter((s) => !suggestions.includes(s) && s !== noneLabel);
  const all = [...suggestions, ...custom];

  function toggle(item: string) {
    if (noneLabel && item === noneLabel) {
      onChange(none ? [] : [noneLabel]);
      return;
    }
    const without = selected.filter((s) => s !== noneLabel);
    onChange(without.includes(item) ? without.filter((s) => s !== item) : [...without, item]);
  }

  function commit() {
    const t = draft.trim();
    if (t && !selected.includes(t)) onChange([...selected.filter((s) => s !== noneLabel), t]);
    setDraft("");
    setAdding(false);
  }

  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", alignContent: "flex-start", gap: 8 }}>
        {noneLabel ? <Chip label={noneLabel} on={none} onPress={() => toggle(noneLabel)} /> : null}
        {all.map((s) => (
          <Chip key={s} label={s} on={selected.includes(s)} onPress={() => toggle(s)} />
        ))}
        {!adding ? (
          <Tap
            accessibilityRole="button"
            onPress={() => setAdding(true)}
            style={{ height: 38, paddingHorizontal: 12, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[300] }}
          >
            <Plus size={14} color={ink[900]} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: brand[700] }}>{addLabel}</Text>
          </Tap>
        ) : null}
      </View>
      {adding ? (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Input value={draft} onChangeText={setDraft} placeholder={placeholder} autoFocus onSubmitEditing={commit} returnKeyType="done" style={{ flex: 1 }} />
          <Tap scale={0.95} accessibilityRole="button" accessibilityLabel="Add" onPress={commit} style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: ink[900], alignItems: "center", justifyContent: "center" }}>
            <Check size={18} color="#fff" />
          </Tap>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 38,
        paddingHorizontal: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: on ? brand[50] : pressed ? "#fff" : glass.fillStrong,
        borderWidth: 1.5,
        borderColor: on ? brand[500] : surface.line,
      })}
    >
      {on ? <Check size={13} color={brand[700]} strokeWidth={3} /> : null}
      <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13, color: on ? brand[700] : ink[700] }}>{label}</Text>
    </Pressable>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ height: 46, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderStyle: "dashed", borderColor: brand[300], backgroundColor: pressed ? lilac.base : "transparent" })}
    >
      <Plus size={16} color={ink[900]} />
      <Text style={{ fontFamily: font.semibold, fontSize: 15, color: brand[700] }}>{label}</Text>
    </Pressable>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      placeholderTextColor={ink[300]}
      {...props}
      onFocus={(e) => { setFocus(true); props.onFocus?.(e); }}
      onBlur={(e) => { setFocus(false); props.onBlur?.(e); }}
      style={[{ height: 46, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: focus ? brand[500] : surface.line, fontFamily: font.regular, fontSize: 15, color: ink[900] }, props.style]}
    />
  );
}

function Unit({ value, onChangeText, unit, placeholder }: { value: string; onChangeText: (t: string) => void; unit: string; placeholder: string }) {
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
      <Input value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType="decimal-pad" style={{ flex: 1, paddingRight: 44 }} />
      <Text style={{ position: "absolute", right: 14, fontFamily: font.medium, fontSize: 13, color: ink[500] }}>{unit}</Text>
    </View>
  );
}
