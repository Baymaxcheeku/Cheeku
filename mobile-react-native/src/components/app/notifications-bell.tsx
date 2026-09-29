import { useRouter } from "expo-router";
import { Bell, CalendarClock, ChevronRight, PartyPopper, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { HomeNotification } from "@/lib/notifications/derive";
import { ink, semantic, shadow, surface } from "@/theme/tokens";

/**
 * The Home bell, wired to something real.
 *
 * Every row here is a flagged record, derived from the profile's own data —
 * there is nothing generic in this tray, so there is nothing to show when there
 * is nothing to say. Hence a genuine empty state rather than a placeholder
 * list, and no badge when the count is zero.
 */
export function NotificationsBell({ notifications }: { notifications: HomeNotification[] }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const count = notifications.length;

  function openNote(href: string) {
    setOpen(false);
    router.push(href as never);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count > 0 ? `Notifications, ${count} to review` : "Notifications"}
        onPress={() => setOpen(true)}
        className="h-10 w-10 items-center justify-center rounded-pill bg-surface"
        style={shadow.e1}
      >
        <Bell size={19} color={ink[500]} />
        {count > 0 ? (
          <View
            className="absolute right-1.5 top-1.5 h-4 min-w-4 items-center justify-center rounded-pill px-1"
            style={{ backgroundColor: semantic.danger }}
          >
            <Text className="text-[9px] font-bold leading-none text-white">
              {count > 9 ? "9+" : count}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {/*
       * A modal sheet rather than the web build's portal. The web `Sheet` works
       * around a stacking-context trap that does not exist here, so this is the
       * plain version: a dimmed backdrop that dismisses, and the panel itself.
       */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityLabel="Close notifications"
          onPress={() => setOpen(false)}
          className="flex-1"
          style={{ backgroundColor: "rgba(15,16,48,0.35)" }}
        />
        <View
          className="rounded-t-sheet bg-canvas px-5 pt-2"
          style={{ maxHeight: "72%", paddingBottom: insets.bottom + 16 }}
        >
          <View className="h-1 w-10 self-center rounded-pill" style={{ backgroundColor: surface.line }} />

          <View className="mt-3 flex-row items-start">
            <View className="flex-1">
              <Text className="text-[20px] font-bold text-ink-900">Notifications</Text>
              <Text className="mt-0.5 text-[13px] text-ink-500">
                {count > 0 ? "Records worth a look" : "Nothing needs your attention"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={() => setOpen(false)}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-pill bg-surface"
              style={shadow.e1}
            >
              <X size={17} color={ink[500]} />
            </Pressable>
          </View>

          {count > 0 ? (
            <ScrollView
              className="mt-4 rounded-card bg-surface"
              style={shadow.e1}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((note, i) => (
                <Pressable
                  key={note.id}
                  accessibilityRole="button"
                  onPress={() => openNote(note.href)}
                  className="flex-row items-center gap-3 p-3.5"
                  style={
                    i > 0 ? { borderTopWidth: 1, borderTopColor: surface.line } : undefined
                  }
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-tile"
                    style={{ backgroundColor: semantic.dangerBg }}
                  >
                    <CalendarClock size={18} color={semantic.danger} />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[14px] font-semibold text-ink-900" numberOfLines={1}>
                      {note.title}
                    </Text>
                    <Text className="text-[12px] text-ink-500" numberOfLines={1}>
                      {note.body}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-ink-300">{note.time}</Text>
                  </View>
                  <ChevronRight size={17} color={ink[300]} />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View className="mt-4 items-center rounded-card bg-surface px-6 py-10" style={shadow.e1}>
              <View
                className="h-12 w-12 items-center justify-center rounded-pill"
                style={{ backgroundColor: semantic.safeBg }}
              >
                <PartyPopper size={22} color={semantic.safe} />
              </View>
              <Text className="mt-3 text-[14px] font-semibold text-ink-900">
                You&apos;re all caught up
              </Text>
              <Text className="mt-1 max-w-[220px] text-center text-[12px] leading-[17px] text-ink-500">
                Cheeku will let you know here if a new record needs a look.
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
