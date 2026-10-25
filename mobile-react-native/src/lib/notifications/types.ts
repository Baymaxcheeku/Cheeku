/*
 * The inbox vocabulary. Mirrors `public.notifications` (migration 0024).
 *
 * Rows are written by database triggers for everything the server owns
 * (records, family, plans, support, launches), by the family-care sweep
 * every 15 minutes (doses, refills, nudges, parent alerts; migration 0038),
 * and by the app only for what
 * lives on the phone (appointments, a password change it just made). The
 * database derives `category` from `kind`, so the two cannot disagree.
 */

export type NotificationKind =
  | "report_ready"
  | "report_review"
  | "report_flagged"
  | "appointment_booked"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "lab_booked"
  | "lab_update"
  | "lab_cancelled"
  | "family_added"
  | "family_removed"
  | "plan_changed"
  | "plan_ended"
  | "password_changed"
  | "support_update"
  | "service_live"
  | "welcome"
  // Written by the family-care sweep (migration 0038).
  | "dose_due"
  | "refill_due"
  | "daily_nudge"
  | "retest_due"
  | "sunday_review"
  | "parent_alert"
  // Written by create/cancel_fitness_booking (migration 0039).
  | "fitness_booked"
  | "fitness_cancelled";

export type NotificationCategory = "reports" | "appointments" | "family" | "account" | "updates" | "medicines" | "nudges" | "care";

/** The kinds the app itself may write. Everything else is refused by RLS. */
export type DeviceEventKind = Extract<
  NotificationKind,
  "appointment_booked" | "appointment_rescheduled" | "appointment_cancelled" | "password_changed"
>;

export type InboxItem = {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  body: string;
  /** In-app path. Null means the row has nowhere further to go. */
  route: string | null;
  /** The family member this is about, when it is about one. */
  profileId: string | null;
  documentId: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

export type InboxFilter = "all" | "unread" | NotificationCategory;

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  reports: "Reports",
  appointments: "Appointments",
  family: "Family",
  account: "Account",
  updates: "Updates",
  medicines: "Medicines",
  nudges: "Reminders",
  care: "Family care",
};

/*
 * The one action word each kind leads to, shown as a small chip on the row so
 * the reader knows what a tap will do before they tap. Null where the tap only
 * opens something to read.
 */
export const ACTION_LABEL: Partial<Record<NotificationKind, string>> = {
  report_review: "Check it",
  report_flagged: "See values",
  report_ready: "Open",
  family_added: "Add a report",
  welcome: "Snap a report",
  appointment_booked: "View",
  appointment_rescheduled: "View",
  lab_booked: "Track",
  lab_update: "Track",
  service_live: "Book now",
  dose_due: "Tick doses",
  refill_due: "Refill",
  daily_nudge: "Open today",
  retest_due: "Plan it",
  sunday_review: "Plan the week",
  parent_alert: "See family",
  fitness_booked: "View",
};
