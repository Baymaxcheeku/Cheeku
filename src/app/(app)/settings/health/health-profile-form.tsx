"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { updateHealthProfile, type SettingsResult } from "@/lib/settings/actions";
import type { ProfileDetail } from "@/lib/settings/queries";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/** "Folic acid | 5 mg | once daily" — one line per medication, matched to `parseMedications`. */
function medicationsToLines(meds: ProfileDetail["medications"]): string {
  return meds.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" | ")).join("\n");
}

export function HealthProfileForm({ profile }: { profile: ProfileDetail }) {
  const [result, setResult] = useState<Extract<SettingsResult, { ok: false }> | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await updateHealthProfile(formData);
      if (outcome.ok) setSaved(true);
      else setResult(outcome);
    });
  }

  const errors = result?.fieldErrors;

  return (
    <form onSubmit={submit} className="mt-4 flex flex-1 flex-col px-5">
      <input type="hidden" name="profileId" value={profile.id} />

      <p className="flex items-start gap-2 rounded-card bg-brand-50 px-4 py-3 text-[12px] leading-snug text-ink-600">
        <Info size={15} className="mt-px shrink-0 text-brand-500" aria-hidden />
        This is your own summary, not a diagnosis. Baymax never edits it and never infers it from
        your reports.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Field
          name="heightCm"
          type="number"
          inputMode="numeric"
          label="Height (cm)"
          defaultValue={profile.heightCm ?? ""}
          error={errors?.heightCm}
        />
        <Field
          name="weightKg"
          type="number"
          inputMode="decimal"
          step="0.1"
          label="Weight (kg)"
          defaultValue={profile.weightKg ?? ""}
          error={errors?.weightKg}
        />
        <div className="space-y-1.5">
          <label htmlFor="bloodGroup" className="block text-[13px] font-medium text-ink-700">
            Blood group
          </label>
          <select
            id="bloodGroup"
            name="bloodGroup"
            defaultValue={profile.bloodGroup ?? ""}
            className="h-13 w-full rounded-tile border border-line bg-surface px-3 text-[15px] text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="">—</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="conditions" className="mb-1.5 block text-[13px] font-medium text-ink-700">
          Known conditions
        </label>
        <textarea
          id="conditions"
          name="conditions"
          rows={2}
          placeholder="Comma-separated, e.g. Type 2 diabetes, Hypertension"
          defaultValue={profile.conditions.join(", ")}
          className="w-full rounded-tile border border-line bg-surface p-3 text-[14px] text-ink-900 outline-none focus:border-brand-500"
        />
        {errors?.conditions ? (
          <p role="alert" className="mt-1 text-[13px] text-danger">
            {errors.conditions}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label htmlFor="medications" className="mb-1.5 block text-[13px] font-medium text-ink-700">
          Current medications
        </label>
        <textarea
          id="medications"
          name="medications"
          rows={4}
          placeholder={"One per line: Name | Dose | Frequency\ne.g. Metformin | 500 mg | twice daily"}
          defaultValue={medicationsToLines(profile.medications)}
          className="w-full rounded-tile border border-line bg-surface p-3 text-[14px] text-ink-900 outline-none focus:border-brand-500"
        />
        {errors?.medications ? (
          <p role="alert" className="mt-1 text-[13px] text-danger">
            {errors.medications}
          </p>
        ) : null}
      </div>

      {result ? (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {result.message}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="mt-3 text-[13px] font-medium text-safe-text">
          Saved.
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="sticky bottom-4 mt-6 w-full">
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
