import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, ChevronLeft } from "lucide-react-native";

import { MascotBust } from "@/components/illustrations/sprout";
import { BubblePop, FillBar } from "@/components/onboarding/motion";
import { Enter } from "@/components/ui/motion";
import { Tap } from "@/components/ui/tap";
import { brand, ink, semantic, shadow, surface } from "@/theme/tokens";
import { font, type } from "@/theme/type";

/*
 * The frame every sign-in screen shares: Log in, Check your email, New
 * password. Same header, same Cheeku, same sheet rising from the bottom, so
 * moving between them reads as one conversation continuing rather than three
 * different forms. Lifted out of `app/sign-in.tsx` unchanged.
 */

/** Mirrors `passwordSchema`'s minimum, for the live length meter. */
export const MIN_PASSWORD = 10;

export function AuthScaffold({
  title,
  greet,
  greetKey,
  onBack,
  trailing,
  children,
}: {
  title: React.ReactNode;
  /** What Cheeku says in the bubble. */
  greet: string;
  /** Change it to make the bubble pop again (a tab switch, a new step). */
  greetKey?: string;
  onBack: () => void;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
        <View className="h-12 flex-row items-center px-5">
          <Tap
            scale={0.95}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            hitSlop={8}
            className="h-11 w-11 items-center justify-center rounded-pill bg-surface"
            style={shadow.e1}
          >
            <ChevronLeft size={20} color={ink[700]} />
          </Tap>
          {trailing ? <View className="ml-auto">{trailing}</View> : null}
        </View>

        {/* The greeting. Cheeku says hello in a bubble that changes with the step. */}
        <View className="flex-row items-end px-6 pb-1 pt-1">
          <View className="flex-1 pb-3">
            <Text accessibilityRole="header" style={type.title}>
              {title}
            </Text>
          </View>
          <View className="items-center">
            <BubblePop key={greetKey ?? greet} from="right" style={{ marginBottom: 4 }}>
              <View
                accessibilityLiveRegion="polite"
                className="rounded-lg px-3 py-1.5"
                style={[shadow.e1, { backgroundColor: brand[600], borderBottomRightRadius: 4 }]}
              >
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#ffffff" }}>{greet}</Text>
              </View>
            </BubblePop>
            <MascotBust size={104} moment="present" />
          </View>
        </View>

        {/* The sheet. Rounded at the top only. */}
        <ScrollView
          className="flex-1 bg-surface"
          style={[{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }, shadow.e1]}
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/** A labelled input. Labels stay visible: a placeholder vanishes on the first keystroke. */
export function Field({
  label,
  icon,
  trailing,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-1.5">
      <Text style={{ fontFamily: font.semibold, fontSize: 13, color: ink[700] }}>{label}</Text>
      <View
        className="h-[54px] flex-row items-center gap-3 rounded-lg px-4"
        style={{
          backgroundColor: focused ? surface.base : surface.canvas,
          borderWidth: 1.5,
          borderColor: focused ? brand[500] : surface.line,
        }}
      >
        {icon}
        <TextInput
          {...props}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={ink[300]}
          style={{ flex: 1, fontSize: 17, color: ink[900], fontFamily: font.regular }}
        />
        {trailing}
      </View>
    </View>
  );
}

/** Counts up to the minimum length. Violet, never green: green means health. */
export function PasswordMeter({ length }: { length: number }) {
  const done = length >= MIN_PASSWORD;
  return (
    <View className="mt-2.5 flex-row items-center gap-2.5">
      <View className="flex-1">
        <FillBar value={length / MIN_PASSWORD} color={brand[600]} track={brand[100]} height={5} />
      </View>
      <Text style={{ fontFamily: font.semibold, fontSize: 12, color: done ? brand[700] : ink[500] }}>
        {done
          ? "Long enough"
          : `${MIN_PASSWORD - length} more ${MIN_PASSWORD - length === 1 ? "character" : "characters"}`}
      </Text>
    </View>
  );
}

/**
 * The one error line. Icon AND words AND colour, never colour alone. Keyed on
 * the message so a second, different failure arrives visibly rather than
 * swapping text in place.
 */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Enter key={message} kind="quick">
      <View accessibilityRole="alert" accessibilityLiveRegion="assertive" className="flex-row items-start gap-2">
        <AlertCircle size={16} color={semantic.dangerText} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: semantic.dangerText }}>
          {message}
        </Text>
      </View>
    </Enter>
  );
}

/** A calm, low-emphasis action: brand text, no fill. 44pt tall so a thumb finds it. */
export function TextAction({
  label,
  onPress,
  disabled,
  align = "center",
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  align?: "center" | "start" | "end";
  accessibilityHint?: string;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      accessibilityHint={accessibilityHint}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      className="min-h-11 justify-center"
      style={{ alignSelf: align === "center" ? "center" : align === "start" ? "flex-start" : "flex-end" }}
    >
      <Text
        style={{
          fontFamily: font.semibold,
          fontSize: 15,
          color: disabled ? ink[300] : brand[600],
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </Tap>
  );
}
