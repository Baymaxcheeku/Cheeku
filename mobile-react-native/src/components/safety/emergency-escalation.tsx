import { Phone, ShieldAlert, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  contactsFor,
  copyFor,
  escalationKind,
  HOLD_MS,
  type EmergencyContact,
} from "@/lib/safety/escalation";
import type { SafetyResult } from "@/lib/safety/detect";
import { ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * The interrupt shown when the safety gate escalates.
 *
 * NOT A BANNER AND NOT DISMISSIBLE ON ARRIVAL. It covers the screen and refuses
 * to close for {@link HOLD_MS}, because the entire purpose of a hard gate is
 * that the emergency numbers cannot be swiped past before they have been read.
 * Three seconds is short enough not to trap anyone.
 *
 * `onRequestClose` is deliberately a no-op while held: on Android the hardware
 * back button would otherwise dismiss the one screen in the app that must not
 * be dismissible.
 */
export function EmergencyEscalation({
  result,
  onClose,
}: {
  result: SafetyResult | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [held, setHeld] = useState(true);

  useEffect(() => {
    if (!result) return;
    setHeld(true);
    const timer = setTimeout(() => setHeld(false), HOLD_MS);
    return () => clearTimeout(timer);
  }, [result]);

  if (!result) return null;

  const kind = escalationKind(result);
  const copy = copyFor(kind);
  const contacts = contactsFor(result);

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!held) onClose();
      }}
    >
      <View
        className="flex-1 bg-canvas"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            className="h-14 w-14 items-center justify-center rounded-pill"
            style={{ backgroundColor: semantic.dangerBg }}
          >
            <ShieldAlert size={26} color={semantic.danger} />
          </View>

          <Text className="mt-4 text-[24px] font-bold leading-tight text-ink-900">
            {copy.title}
          </Text>
          <Text className="mt-1 text-[18px] font-semibold leading-tight text-ink-900">
            {copy.lead}
          </Text>
          <Text className="mt-3 text-[14px] leading-[21px] text-ink-700">{copy.body}</Text>

          <View className="mt-5 gap-2.5">
            {contacts.map((contact) => (
              <ContactRow key={contact.number} contact={contact} />
            ))}
          </View>

          {/*
           * Why this happened, stated plainly and without quoting the message
           * back. Someone in distress should not have their own words replayed
           * to them by an app that just refused to answer.
           */}
          <View className="mt-5 rounded-card bg-surface p-4" style={shadow.e1}>
            <Text className="text-[13px] font-semibold text-ink-900">Why you are seeing this</Text>
            <Text className="mt-1.5 text-[12.5px] leading-[18px] text-ink-500">{copy.why}</Text>
          </View>

          <View className="flex-1" />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: held }}
            accessibilityLabel={
              held ? "Close, available in a moment" : "Close and return to the chat"
            }
            disabled={held}
            onPress={onClose}
            className="mt-6 h-12 flex-row items-center justify-center gap-2 rounded-pill"
            style={{
              borderWidth: 1,
              borderColor: surface.line,
              backgroundColor: surface.base,
              opacity: held ? 0.45 : 1,
            }}
          >
            <X size={16} color={ink[700]} />
            <Text className="text-[14px] font-semibold text-ink-700">
              {held ? "Please read the above" : "Back to the chat"}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function ContactRow({ contact }: { contact: EmergencyContact }) {
  /*
   * `tel:` rather than a copyable string. In an emergency the number should be
   * one tap from ringing, and retyping five digits under stress is exactly the
   * step that fails.
   */
  function call() {
    void Linking.openURL(`tel:${contact.number}`);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Call ${contact.label} on ${contact.number.split("").join(" ")}`}
      onPress={call}
      className="flex-row items-center gap-3 rounded-card p-3.5"
      style={[
        shadow.e1,
        {
          backgroundColor: contact.primary ? semantic.danger : surface.base,
        },
      ]}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-pill"
        style={{ backgroundColor: contact.primary ? "rgba(255,255,255,0.2)" : semantic.dangerBg }}
      >
        <Phone size={19} color={contact.primary ? "#ffffff" : semantic.danger} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[15px] font-bold"
          style={{ color: contact.primary ? "#ffffff" : ink[900] }}
        >
          {contact.label}
        </Text>
        <Text
          className="text-[12px]"
          style={{ color: contact.primary ? "rgba(255,255,255,0.85)" : ink[500] }}
        >
          {contact.detail}
        </Text>
      </View>
      <Text
        className="text-[17px] font-bold"
        style={{ color: contact.primary ? "#ffffff" : semantic.danger }}
      >
        {contact.number}
      </Text>
    </Pressable>
  );
}
