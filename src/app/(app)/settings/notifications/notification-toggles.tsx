"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  BellRing,
  CalendarClock,
  Gift,
  Lightbulb,
  LineChart,
  Mail,
  Megaphone,
  ShieldAlert,
  Tag,
  Users2,
  type LucideIcon,
} from "lucide-react";

import { PressRow, SpringSwitch } from "@/components/ui/motion";
import { updateNotificationPrefs } from "@/lib/settings/actions";
import type { NotificationPrefs } from "@/lib/settings/schemas";

type Key = keyof NotificationPrefs;

const GROUPS: {
  title: string;
  body: string;
  icon: LucideIcon;
  rows: { key: Key; icon: LucideIcon; title: string; body: string }[];
}[] = [
  {
    title: "General updates",
    body: "Important updates about your account and Baymax.",
    icon: BellRing,
    rows: [
      {
        key: "accountSecurity",
        icon: ShieldAlert,
        title: "Account & security",
        body: "Login, password changes and security alerts.",
      },
      {
        key: "productUpdates",
        icon: Megaphone,
        title: "Product updates",
        body: "New features, improvements and announcements.",
      },
      {
        key: "tipsReminders",
        icon: Lightbulb,
        title: "Tips & reminders",
        body: "Helpful tips to get the most out of Baymax.",
      },
    ],
  },
  {
    title: "Health & insights",
    body: "Stay on top of your health and check-ins.",
    icon: LineChart,
    rows: [
      {
        key: "checkinReminders",
        icon: CalendarClock,
        title: "Daily check-in reminders",
        body: "Receive reminders to complete your check-in.",
      },
      {
        key: "healthInsights",
        icon: LineChart,
        title: "Health insights",
        body: "Personalised insights based on your data.",
      },
      {
        key: "reportNotifications",
        icon: Mail,
        title: "Report notifications",
        body: "When your reports are ready or updated.",
      },
    ],
  },
  {
    title: "Family & sharing",
    body: "Updates about your family members and sharing.",
    icon: Users2,
    rows: [
      {
        key: "familyActivity",
        icon: Users2,
        title: "Family member activity",
        body: "Check-ins and added reports from family members.",
      },
      {
        key: "invitations",
        icon: Mail,
        title: "Invitations & requests",
        body: "Alerts for invites to join or share.",
      },
    ],
  },
  {
    title: "Marketing & offers",
    body: "Special offers and content we think you'll love.",
    icon: Gift,
    rows: [
      {
        key: "promotions",
        icon: Tag,
        title: "Promotions & offers",
        body: "Discounts, offers and exclusive deals.",
      },
    ],
  },
];

export function NotificationToggles({ initial }: { initial: NotificationPrefs }) {
  const [prefs, setPrefs] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  function toggle(key: Key) {
    const next = !prefs[key];
    setPrefs((p) => ({ ...p, [key]: next }));
    setError(null);
    start(async () => {
      const result = await updateNotificationPrefs({ [key]: next });
      if (!result.ok) {
        // Revert on failure — the switch must reflect what actually saved.
        setPrefs((p) => ({ ...p, [key]: !next }));
        setError(result.message);
      }
    });
  }

  const ROWS = GROUPS.flatMap((g) => g.rows);
  const on = ROWS.filter((r) => prefs[r.key]).length;

  return (
    <div className="mt-5 space-y-5 px-5">
      {/*
       * A live count of what is on.
       *
       * Fourteen switches with no summary means the only way to answer "what am
       * I actually subscribed to" is to scroll and tally by eye. This answers it
       * in one line, and it moves when a switch does, so flipping one has a
       * visible consequence beyond the switch itself.
       */}
      <div className="flex items-center justify-between rounded-card bg-surface px-4 py-3 shadow-e1">
        <span className="text-[12.5px] font-semibold text-ink-900">Notifications on</span>
        <motion.span
          key={on}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
          className="rounded-pill bg-brand-50 px-2.5 py-1 text-[12px] font-bold text-brand-700"
        >
          {on} of {ROWS.length}
        </motion.span>
      </div>
      {GROUPS.map((group) => (
        <section key={group.title}>
          <div className="flex items-center gap-2.5 px-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
              <group.icon size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14px] font-bold text-ink-900">{group.title}</h2>
              <p className="truncate text-[11.5px] text-ink-500">{group.body}</p>
            </div>
          </div>

          <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
            {group.rows.map((row, i) => (
              <PressRow key={row.key} index={i} className={i > 0 ? "border-t border-line" : undefined}>
                <div className="flex items-center gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-500">
                    <row.icon size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink-900">{row.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">
                      {row.body}
                    </span>
                  </span>
                  <SpringSwitch
                    checked={prefs[row.key]}
                    onChange={() => toggle(row.key)}
                    label={row.title}
                  />
                </div>
              </PressRow>
            ))}
          </ul>
        </section>
      ))}

      {error ? (
        <p role="alert" className="text-[12px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}

      <p className="flex items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3 text-[12px] leading-snug text-ink-500">
        <span>
          <strong className="font-semibold text-ink-900">You&apos;re in control.</strong> You can
          update your preferences anytime. We respect your choices.
        </span>
      </p>
    </div>
  );
}
