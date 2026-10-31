"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, Crown, UserPlus, X } from "lucide-react";

import { Paywall } from "@/components/billing/paywall";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { addFamilyMember, type SettingsResult } from "@/lib/settings/actions";
import { allowsFamily, planFor, seatsFor, type Tier } from "@/lib/billing/plans";

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

/**
 * Add a family member — or, on a plan that doesn't cover more than one person,
 * the reason why not.
 *
 * The gate is shown rather than the form because the alternative is letting
 * someone fill in their mother's date of birth and only then telling them it
 * costs money. The server re-checks the same entitlement regardless.
 */
export function AddMemberSheet({
  tier,
  memberCount,
  onClose,
  onBack,
}: {
  tier: Tier;
  memberCount: number;
  onClose: () => void;
  onBack: () => void;
}) {
  const [result, setResult] = useState<Extract<SettingsResult, { ok: false }> | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pending, start] = useTransition();

  const seats = seatsFor(tier);
  const allowed = allowsFamily(tier);
  const full = allowed && memberCount >= seats;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await addFamilyMember(formData);
      if (outcome.ok) {
        onClose();
        return;
      }
      if (outcome.needsUpgrade) {
        setPaywallOpen(true);
        return;
      }
      setResult(outcome);
    });
  }

  if (paywallOpen) {
    return (
      <Paywall
        open
        reason="family"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => {
          setPaywallOpen(false);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet onClose={onClose} label="Add family member" className="px-5">
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-700 shadow-e1 active:scale-90"
        >
          <ArrowLeft size={17} aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold text-ink-900">Add family member</h2>
          <p className="text-[12px] text-ink-500">
            {allowed ? `${memberCount} of ${seats} members used` : "Part of the Family plan"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1 active:scale-90"
        >
          <X size={17} aria-hidden />
        </button>
      </div>

      {!allowed ? (
        <div className="mt-4 pb-2">
          <div className="rounded-card border border-brand-200 bg-brand-50 p-4 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-pill bg-surface text-brand-600">
              <Crown size={22} aria-hidden />
            </span>
            <h3 className="mt-3 text-[16px] font-bold text-ink-900">
              Family access is a Family plan feature
            </h3>
            <p className="mx-auto mt-1.5 max-w-[290px] text-[12.5px] leading-snug text-ink-500">
              You&apos;re on {planFor(tier).name}, which covers one profile. The Family plan adds up
              to {seatsFor("family")} members with shared records and insights.
            </p>
            <Button
              type="button"
              size="md"
              className="mt-4 w-full"
              onClick={() => setPaywallOpen(true)}
            >
              View plans
            </Button>
          </div>
        </div>
      ) : full ? (
        <p className="mt-4 rounded-card bg-caution-bg px-4 py-3.5 text-[13px] leading-snug text-caution-text">
          Your plan covers {seats} members and they&apos;re all in use. Remove someone from their
          profile screen first.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 pb-2">
          <div className="space-y-3.5">
            <Field name="name" label="Full name" placeholder="e.g. Amma" error={result?.fieldErrors?.name} required />
            <Field
              name="relationship"
              label="Relationship to you"
              placeholder="e.g. Mother, Son, Spouse"
              error={result?.fieldErrors?.relationship}
              required
            />
            <Field
              name="dob"
              type="date"
              label="Date of birth (optional)"
              max={new Date().toISOString().slice(0, 10)}
              error={result?.fieldErrors?.dob}
            />
            <div className="space-y-1.5">
              <span className="block text-[13px] font-medium text-ink-700">Sex (optional)</span>
              <div className="grid grid-cols-2 gap-2">
                {SEXES.map(([value, label]) => (
                  <label
                    key={value}
                    className="flex h-11 items-center gap-2 rounded-tile border border-line bg-surface px-3 text-[13px] text-ink-900 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
                  >
                    <input type="radio" name="sex" value={value} className="accent-brand-600" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {result && !result.fieldErrors ? (
            <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
              {result.message}
            </p>
          ) : null}

          <Button type="submit" size="md" className="mt-5 w-full" disabled={pending}>
            <UserPlus size={16} aria-hidden />
            {pending ? "Adding…" : "Add member"}
          </Button>
          <p className="mt-2 text-center text-[11px] leading-snug text-ink-500">
            Their records stay separate from yours. You can switch between members anytime.
          </p>
        </form>
      )}
    </Sheet>
  );
}
