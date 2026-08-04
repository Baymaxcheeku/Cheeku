"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Meter, SaveFlash } from "@/components/ui/motion";
import { Field } from "@/components/ui/field";
import { updatePersonalInfo, type SettingsResult } from "@/lib/settings/actions";
import type { ProfileDetail } from "@/lib/settings/queries";

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

export function PersonalInfoForm({
  profile,
  avatar,
  isPrimary,
  accountEmail,
}: {
  profile: ProfileDetail;
  avatar: string;
  isPrimary: boolean;
  accountEmail: string | null;
}) {
  const [result, setResult] = useState<Extract<SettingsResult, { ok: false }> | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await updatePersonalInfo(formData);
      if (outcome.ok) setSaved(true);
      else setResult(outcome);
    });
  }

  const errors = result?.fieldErrors;

  // Counted from the saved record, so it moves on save rather than on keystroke.
  const filled = [profile.name, profile.dob, profile.sex].filter(Boolean).length;

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col px-5">
      <div className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-e1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-pill object-cover" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink-900">{profile.name}</p>
          <p className="text-[12px] text-ink-500">
            {isPrimary ? "Your own profile" : (profile.relationship ?? "Family member")}
          </p>
        </div>
      </div>

      {accountEmail ? (
        <div className="mt-3 flex items-center gap-3 rounded-card bg-brand-50 px-4 py-3 text-[13px] text-ink-700">
          <Mail size={16} className="shrink-0 text-brand-500" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{accountEmail}</span>
          <span className="shrink-0 text-[11px] text-ink-500">Sign-in email</span>
        </div>
      ) : null}

      <input type="hidden" name="profileId" value={profile.id} />

      <div className="mt-3">
        <Meter
          value={filled}
          total={3}
          label="Profile details"
          hint="Age and sex let Baymax read a lab's reference range the way your lab intends it."
        />
      </div>

      <div className="mt-4 space-y-4">
        <Field
          name="name"
          label="Full name"
          defaultValue={profile.name}
          error={errors?.name}
          required
        />

        <Field
          name="dob"
          type="date"
          label="Date of birth"
          defaultValue={profile.dob ?? ""}
          error={errors?.dob}
          max={new Date().toISOString().slice(0, 10)}
        />

        <div className="space-y-1.5">
          <span className="block text-[13px] font-medium text-ink-700">Sex</span>
          <div className="grid grid-cols-2 gap-2">
            {SEXES.map(([value, label]) => (
              <label
                key={value}
                className="tappable flex h-12 items-center gap-2 rounded-tile border border-line bg-surface px-3 text-[13px] text-ink-900 active:scale-[0.97] has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name="sex"
                  value={value}
                  defaultChecked={profile.sex === value}
                  className="accent-brand-600"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {!isPrimary ? (
          <Field
            name="relationship"
            label="Relationship to you"
            placeholder="e.g. Mother, Son, Spouse"
            defaultValue={profile.relationship ?? ""}
            error={errors?.relationship}
          />
        ) : null}
      </div>

      {result ? (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {result.message}
        </p>
      ) : null}
      {/* No "Saved." line: the button itself now confirms, and two
          confirmations of one save is one too many. `role=status` moves onto
          the button so screen readers still hear it. */}

      <SaveFlash show={saved}>
        <span role="status" className="sr-only">{saved ? "Saved" : ""}</span>
        <Button type="submit" disabled={pending} className="sticky bottom-4 mt-6 w-full">
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </Button>
      </SaveFlash>
    </form>
  );
}
