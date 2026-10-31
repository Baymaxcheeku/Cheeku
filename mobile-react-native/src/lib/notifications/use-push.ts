import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { startsAt, useAppointmentList } from "@/lib/booking/appointments";
import { useFitnessBookings } from "@/lib/fitness/queries";
import { fastingFor } from "@/lib/labs/logic";
import { useCatalog, useLabBookings } from "@/lib/labs/queries";
import { DEFAULT_PREFS, ownFamily } from "@/lib/settings/queries";

import { configureNotifications, registerThisDevice, syncAppointmentReminders, syncFitnessReminders, syncLabReminders } from "./push";
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
  // Also keeps lab statuses moving: reading bookings runs the sync.
  const labs = useLabBookings();
  const catalog = useCatalog();
  const fitness = useFitnessBookings(native);

  useEffect(() => {
    if (!fitness.data) return;
    void syncFitnessReminders(
      fitness.data.map((b) => ({ id: b.id, start: new Date(b.startsAt), durationMin: b.durationMin, studio: b.studioName, code: b.checkinCode, open: b.status === "booked" })),
      remindersOn,
    );
  }, [fitness.data, remindersOn]);

  useEffect(() => {
    if (!labs.data || !catalog.data) return;
    const tests = catalog.data.tests;
    void syncLabReminders(
      labs.data.map((b) => {
        const [y, m, d] = b.slotDate.split("-").map(Number);
        const hour = Number(b.slotWindow.split("-")[0]) + (b.slotWindow.startsWith("4") ? 12 : 0);
        return {
          id: b.id,
          start: new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hour),
          fastingHours: fastingFor(tests, b.tests),
          open: b.status === "booked" || b.status === "assigned",
        };
      }),
      remindersOn,
    );
  }, [labs.data, catalog.data, remindersOn]);

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
      const data = response.notification.request.content.data as { url?: unknown; notificationId?: unknown; profileId?: unknown } | undefined;
      const route = typeof data?.url === "string" && data.url.startsWith("/") ? data.url : "/notifications";
      const id = typeof data?.notificationId === "string" ? data.notificationId : null;
      // A remote push carries ids only; who it is about comes from the inbox.
      const known = id ? qc.getQueryData<InboxItem[]>(INBOX_KEY)?.find((i) => i.id === id) : undefined;
      // A dose or a nudge planned on this phone says whose it is.
      const own = typeof data?.profileId === "string" ? data.profileId : null;
      open({ id: id ?? "", route, profileId: known?.profileId ?? own, readAt: id ? null : "local" });
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
