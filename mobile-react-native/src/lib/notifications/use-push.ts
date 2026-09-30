import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { DEFAULT_PREFS, ownFamily } from "@/lib/settings/queries";

import { configureNotifications, registerThisDevice, syncAppointmentReminders } from "./push";
import type { InboxItem } from "./types";
import { INBOX_KEY, useOpenNotification } from "./use-inbox";

const native = Platform.OS === "ios" || Platform.OS === "android";

/**
 * Mounted once, in the signed-in shell. Three jobs:
 *
 * 1. Configure how notifications behave and refresh this phone's push token.
 * 2. Keep the scheduled appointment reminders in step with the appointment
 *    list and the "Appointment reminders" switch.
 * 3. Route a tapped notification, including the one that cold-started the
 *    app, to the screen it is about, in the right family member's context.
 */
export function usePushSetup() {
  const open = useOpenNotification();
  const qc = useQueryClient();
  const { items, loaded } = useAppointmentList();
  const family = useQuery({ queryKey: ["own-family"], queryFn: ownFamily });
  const remindersOn = (family.data?.prefs ?? DEFAULT_PREFS).appointmentReminders;

  useEffect(() => {
    configureNotifications();
    void registerThisDevice();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    void syncAppointmentReminders(
      items.map((a) => ({
        id: a.id,
        mode: a.mode,
        start: startsAt(a),
        time: a.slotLabel.split(" – ")[0] ?? a.slotLabel,
        booked: a.status === "booked",
      })),
      remindersOn,
    );
  }, [items, loaded, remindersOn]);

  useEffect(() => {
    if (!native) return;
    function handle(response: Notifications.NotificationResponse) {
      const data = response.notification.request.content.data as { url?: unknown; notificationId?: unknown } | undefined;
      const route = typeof data?.url === "string" && data.url.startsWith("/") ? data.url : "/notifications";
      const id = typeof data?.notificationId === "string" ? data.notificationId : null;
      // A remote push carries ids only; who it is about comes from the inbox.
      const known = id ? qc.getQueryData<InboxItem[]>(INBOX_KEY)?.find((i) => i.id === id) : undefined;
      open({ id: id ?? "", route, profileId: known?.profileId ?? null, readAt: id ? null : "local" });
    }

    // The tap that launched the app from cold, handled once.
    const cold = Notifications.getLastNotificationResponse();
    if (cold) {
      Notifications.clearLastNotificationResponse();
      handle(cold);
    }
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [open, qc]);
}
