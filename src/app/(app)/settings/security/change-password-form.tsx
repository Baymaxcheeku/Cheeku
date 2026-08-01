"use client";

import { useState, useTransition } from "react";
import { ChevronDown, KeyRound } from "lucide-react";

import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { changePassword, type SettingsResult } from "@/lib/settings/actions";

/**
 * Collapsed by default: a form that changes the sign-in credential should not
 * be the first thing open on a screen someone visits mainly to read the
 * privacy copy.
 */
export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Extract<SettingsResult, { ok: false }> | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setResult(null);
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await changePassword(formData);
      if (outcome.ok) {
        setSaved(true);
        (event.target as HTMLFormElement).reset();
      } else {
        setResult(outcome);
      }
    });
  }

  const errors = result?.fieldErrors;

  return (
    <section className="mx-5 mt-4 overflow-hidden rounded-card bg-surface shadow-e1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tappable flex w-full items-center gap-3 p-3.5 text-left"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
          <KeyRound size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink-900">Change password</span>
          <span className="block text-[12px] text-ink-500">Update your sign-in password</span>
        </span>
        <ChevronDown
          size={18}
          className={cn("shrink-0 text-ink-300 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <form onSubmit={submit} className="space-y-3 border-t border-line p-3.5">
          <PasswordField
            name="currentPassword"
            label="Current password"
            autoComplete="current-password"
            error={errors?.currentPassword}
          />
          <PasswordField
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            hint="At least 10 characters."
            error={errors?.newPassword}
          />
          <PasswordField
            name="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            error={errors?.confirmPassword}
          />

          {result && !errors ? (
            <p role="alert" className="text-[13px] text-danger">
              {result.message}
            </p>
          ) : null}
          {saved ? (
            <p role="status" className="text-[13px] font-medium text-safe-text">
              Password updated.
            </p>
          ) : null}

          <Button type="submit" size="md" disabled={pending} className="w-full">
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
