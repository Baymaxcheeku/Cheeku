import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { kv } from "@/lib/storage";

import { reminderPlan } from "./inbox";
import { forgetPushDevice, registerPushDevice } from "./queries";

/*
 * Everything that touches the phone's own notification system.
 *
 * TWO KINDS OF BUZZ.
 *  - Local, scheduled on this phone: appointment reminders. They work with no
 *    server and no Apple/Google credentials, because appointments live on this
 *    phone too.
 *  - Remote, sent by the push-dispatch Edge Function when a row lands in the
 *    inbox (a report is filed, a service went live). Needs an EAS project id
 *    in app.json and APNs/FCM credentials in EAS before a token can exist. Until
 *    then registration quietly does nothing and the inbox still works.
 *
 * WEB. None of this runs in the browser preview. Every export checks first.
 */

const native = Platform.OS === "ios" || Platform.OS === "android";
const TOKEN_KEY = "cheeku.pushToken";

export type PushPermission = "granted" | "denied" | "undetermined" | "unsupported";

let configured = false;

/** Once, at startup: how a notification behaves while the app is open. */
export function configureNotifications(): void {
  if (!native || configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("default", {
      name: "Updates from Cheeku",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    void Notifications.setNotificationChannelAsync("appointments", {
      name: "Appointment reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
    });
  }
}

export async function pushPermission(): Promise<PushPermission> {
  if (!native) return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/**
 * Asks the OS, but only after our own explainer card was tapped. iOS gives one
 * chance at this dialog, so it is never the first thing someone sees.
 */
export async function enablePush(): Promise<PushPermission> {
  if (!native) return "unsupported";
  const current = await Notifications.getPermissionsAsync();
  const status =
    current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return status === "denied" ? "denied" : "undetermined";
  void registerThisDevice();
  return "granted";
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

/** Stores this phone's Expo push token against the signed-in account. */
export async function registerThisDevice(): Promise<void> {
  if (!native) return;
  try {
    if ((await pushPermission()) !== "granted") return;
    const id = projectId();
    if (!id) return; // No EAS project yet: local reminders still work.
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await registerPushDevice(token, Platform.OS as "ios" | "android");
    await kv.set(TOKEN_KEY, token);
  } catch {
    // Simulators cannot get a token. Nothing to tell anyone.
  }
}

/** On sign-out: this phone stops buzzing for the account that left. */
export async function forgetThisDevice(): Promise<void> {
  if (!native) return;
  try {
    const token = await kv.get(TOKEN_KEY);
    if (token) await forgetPushDevice(token);
    await kv.remove(TOKEN_KEY);
    await cancelAppointmentReminders();
  } catch {
    // Signing out must never fail because of this.
  }
}

// ------------------------------------------------------ appointment reminders --

type Bookable = { id: string; mode: "online" | "clinic"; start: Date; time: string; booked: boolean };

async function cancelAppointmentReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith("appt-"))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Makes the phone's scheduled reminders match the appointment list exactly.
 *
 * A full resync rather than add/remove bookkeeping: cancel every appointment
 * reminder, then schedule what the list says now. Booking, rescheduling and
 * cancelling all come out right without each one remembering to tidy up, and
 * a reminder can never outlive the appointment it was for.
 */
export async function syncAppointmentReminders(appts: Bookable[], enabled: boolean): Promise<void> {
  if (!native) return;
  try {
    await cancelAppointmentReminders();
    if (!enabled || (await pushPermission()) !== "granted") return;
    const now = new Date();
    for (const a of appts) {
      if (!a.booked) continue;
      for (const r of reminderPlan(a, now)) {
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: {
            title: r.title,
            body: r.body,
            sound: "default",
            data: { url: `/appointments/${a.id}` },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: r.at,
            channelId: "appointments",
          },
        });
      }
    }
  } catch {
    // A reminder that failed to schedule is not worth an error on screen; the
    // appointment card on Home still counts down.
  }
}

// ------------------------------------------------------------ lab reminders --

type LabVisit = { id: string; start: Date; fastingHours: number; open: boolean };

/**
 * Two phone reminders per open lab booking: half an hour before the fast has
 * to start (for tests that need one), and half an hour before the collector's
 * window. Same
 * full-resync rule as appointments, and just as generic on a locked screen.
 */
export async function syncLabReminders(visits: LabVisit[], enabled: boolean): Promise<void> {
  if (!native) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.identifier.startsWith("lab-")).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!enabled || (await pushPermission()) !== "granted") return;
    const now = Date.now();
    for (const v of visits) {
      if (!v.open) continue;
      const plan: { id: string; at: Date; title: string; body: string }[] = [];
      if (v.fastingHours > 0) {
        // Half an hour before the fast has to begin, naming the exact time.
        const fastFrom = new Date(v.start.getTime() - v.fastingHours * 3_600_000);
        const time = fastFrom.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
        plan.push({ id: `lab-${v.id}-fast`, at: new Date(fastFrom.getTime() - 30 * 60_000), title: "Fasting for tomorrow's blood test", body: `Last food by ${time}. Water is fine.` });
      }
      plan.push({ id: `lab-${v.id}-soon`, at: new Date(v.start.getTime() - 30 * 60_000), title: "Your sample collector is on the way", body: "Keep an ID handy. Tap to track the visit." });
      for (const r of plan) {
        if (r.at.getTime() <= now + 60_000) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: r.id,
          content: { title: r.title, body: r.body, sound: "default", data: { url: `/labs/booking/${v.id}` } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: "appointments" },
        });
      }
    }
  } catch {
    // As with appointments: the tracker still shows the time.
  }
}
