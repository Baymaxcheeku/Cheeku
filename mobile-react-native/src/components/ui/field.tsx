import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { brand, ink, semantic, surface } from "@/theme/tokens";
import { Tap } from "@/components/ui/tap";

/**
 * A labelled text input. Web `components/ui/field`.
 *
 * The web version read its value out of the surrounding <form> on submit. There
 * is no FormData here, so every field is controlled by its screen — which is
 * also what lets the screen keep one object of answers to hand to Supabase.
 */
export function Field({
  label,
  icon: Icon,
  hint,
  error,
  required,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  // The error border has to beat the focus border: a field can be both, and the
  // one the reader needs to act on is the failure.
  const borderColor = error ? semantic.danger : focused ? brand[500] : surface.line;

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-ink-700">
        {label}
        {required ? <Text className="text-brand-600"> *</Text> : null}
      </Text>

      {/*
       * A multiline field grows; a single-line one is a fixed 52pt row. Using
       * the fixed height for both squashed every textarea in the app to one
       * line — `alignItems: center` on a growing box also centres the first
       * line and leaves the rest below the border.
       */}
      <View
        className="flex-row gap-3 rounded-tile bg-surface px-4"
        style={{
          alignItems: props.multiline ? "flex-start" : "center",
          ...(props.multiline ? { paddingVertical: 12 } : { height: 52 }),
          borderWidth: 1,
          borderColor,
        }}
      >
        {Icon ? (
          <Icon size={18} color={brand[400]} style={props.multiline ? { marginTop: 2 } : undefined} />
        ) : null}
        <TextInput
          {...props}
          accessibilityLabel={label}
          /*
           * Wrapped, not replaced. A caller that passes its own onFocus must
           * still get one, and the focus border must still move — spreading
           * props over these afterwards would drop whichever the caller did
           * not happen to define.
           */
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={ink[300]}
          /*
           * AUTOFILL IS OFF BY DEFAULT, and that is a privacy decision rather
           * than a styling one. These fields hold height, weight, conditions
           * and medicine names; letting the browser or the OS keychain
           * remember them copies medical data into a store this app does not
           * control and cannot reach from its own delete path.
           *
           * `?? "off"` rather than a hard "off": sign-in genuinely wants the
           * password manager, and passes its own value.
           */
          autoComplete={props.autoComplete ?? "off"}
          autoCorrect={props.autoCorrect ?? false}
          style={[
            { flex: 1, fontSize: 15, color: ink[900], fontFamily: "Inter_400Regular" },
            /*
             * Web only, and cast because React Native's TextStyle has no
             * `outlineStyle` — react-native-web passes it through to CSS and
             * the native renderers ignore it. Without it the browser paints
             * its own focus ring inside our border, which reads as a second,
             * misaligned box sitting inside the field.
             */
            { outlineStyle: "none" } as never,
            // The caller's style LAST. It used to come first, so every
            // `minHeight` passed to a multiline field was silently discarded.
            props.style,
          ]}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-xs font-medium text-danger-text">
          {error}
        </Text>
      ) : hint ? (
        <Text className="text-xs text-ink-300">{hint}</Text>
      ) : null}
    </View>
  );
}

/**
 * The replacement for the web build's two <select> elements.
 *
 * A native picker on iOS is a modal wheel, which for four gender options and
 * eight blood groups costs a sheet, a scroll and a confirm to answer something
 * a single tap can. Both option sets are small and stable, so they are laid out
 * as chips and answered in place — and unlike a wheel, nothing is preselected,
 * which matters when "prefer not to say" has to be as easy to reach as any
 * other answer.
 */
export function ChipSelect<T extends string>({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon?: LucideIcon;
  options: readonly (readonly [T, string])[];
  /** Empty string means unanswered, matching the schema's `.or(z.literal(""))`. */
  value: T | "";
  onChange: (next: T | "") => void;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        {Icon ? <Icon size={16} color={brand[400]} /> : null}
        <Text className="text-sm font-medium text-ink-700">{label}</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {options.map(([option, optionLabel]) => {
          const on = value === option;
          return (
            <Tap
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              aria-checked={on}
              accessibilityLabel={optionLabel}
              // Tapping the chosen chip clears it. Every one of these fields is
              // optional, so a reader who taps by accident must have a way back
              // to unanswered without reloading the screen.
              onPress={() => onChange(on ? "" : option)}
              className="rounded-pill px-3.5 py-2"
              style={{
                borderWidth: 1,
                borderColor: on ? brand[600] : surface.line,
                backgroundColor: on ? brand[600] : surface.base,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: on ? "#ffffff" : ink[700] }}
              >
                {optionLabel}
              </Text>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
