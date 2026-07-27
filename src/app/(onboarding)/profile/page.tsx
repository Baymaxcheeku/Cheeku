"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Calendar,
  Droplet,
  Mail,
  Phone,
  Ruler,
  Stethoscope,
  User,
  UserCircle,
  Weight,
} from "lucide-react";

import { Headline, OnboardingHeader, ReassuranceStrip } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { saveProfile } from "@/lib/auth/actions";
import type { ActionResult } from "@/lib/auth/schemas";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const SEXES = [
  ["female", "Female"],
  ["male", "Male"],
  ["other", "Other"],
  ["prefer_not_to_say", "Prefer not to say"],
] as const;

/**
 * A5 — profile intake. Every field except the name is genuinely optional: this
 * is health data, and collecting it because a form has room is the opposite of
 * data minimisation.
 */
export default function ProfilePage() {
  const router = useRouter();
  const [result, setResult] = useState<Extract<ActionResult, { ok: false }> | null>(null);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const outcome = await saveProfile(formData);
      if (outcome.ok) router.push(outcome.redirectTo);
      else setResult(outcome);
    });
  }

  const errors = result?.fieldErrors;

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingHeader back="/who" action={{ label: "Skip", href: "/first-upload" }} />

      <form onSubmit={submit} className="flex flex-1 flex-col px-5">
        {/* The art is absolutely positioned, so the text needs its own gutter. */}
        <div className="relative pr-[38%]">
          <Headline lead="Let's set up your" accent="health profile" />
          <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
            This helps Baymax personalize insights and keep your information more accurate.
          </p>
          <Image
            src="/illustrations/profile-hero.png"
            alt=""
            quality={92}
            width={283}
            height={182}
            priority
            className="illus-soft pointer-events-none absolute right-0 top-0 h-[100px] w-auto object-contain"
          />
        </div>

        <Card className="mt-5 p-4">
          <div className="flex items-center gap-2">
            <UserCircle size={18} className="text-brand-500" aria-hidden />
            <h2 className="text-[15px] font-semibold text-ink-900">Basic information</h2>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-500">
            All fields are optional. You can edit later.
          </p>

          <div className="mt-3 space-y-3">
            <Field
              name="fullName"
              label="Full name"
              icon={User}
              autoComplete="name"
              placeholder="Your name"
              error={errors?.fullName}
              required
            />
            <Field
              name="dob"
              type="date"
              label="Date of birth"
              icon={Calendar}
              error={errors?.dob}
            />
            <div className="space-y-1.5">
              <label htmlFor="sex" className="block text-[13px] font-medium text-ink-700">
                Gender
              </label>
              <select
                id="sex"
                name="sex"
                defaultValue=""
                className="h-13 w-full rounded-tile border border-line bg-surface px-4 text-[15px] text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="">Select</option>
                {SEXES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              name="phone"
              type="tel"
              label="Phone number"
              icon={Phone}
              autoComplete="tel"
              placeholder="+91 98765 43210"
              error={errors?.phone}
            />
            <Field
              name="email"
              type="email"
              label="Email address"
              icon={Mail}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
        </Card>

        <Card className="mt-4 p-4">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-brand-500" aria-hidden />
            <h2 className="text-[15px] font-semibold text-ink-900">Health snapshot</h2>
          </div>
          <p className="mt-0.5 text-[12px] text-ink-500">
            Helps Baymax provide more relevant insights.
          </p>

          <div className="mt-3 space-y-3">
            <Field
              name="heightCm"
              type="number"
              label="Height (cm)"
              icon={Ruler}
              placeholder="175"
              error={errors?.heightCm}
            />
            <Field
              name="weightKg"
              type="number"
              label="Weight (kg)"
              icon={Weight}
              placeholder="72"
              error={errors?.weightKg}
            />
            <div className="space-y-1.5">
              <label htmlFor="bloodGroup" className="block text-[13px] font-medium text-ink-700">
                Blood group
              </label>
              <div className="flex items-center gap-3 rounded-tile border border-line bg-surface px-4">
                <Droplet size={18} className="shrink-0 text-brand-400" aria-hidden />
                <select
                  id="bloodGroup"
                  name="bloodGroup"
                  defaultValue=""
                  className="h-13 w-full bg-transparent text-[15px] text-ink-900 outline-none"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Field
              name="conditions"
              label="Known conditions"
              placeholder="Diabetes, hypertension…"
              hint="Separate with commas. Leave blank if none."
              error={errors?.conditions}
            />
          </div>
        </Card>

        {result?.message ? (
          <p role="alert" className="mt-4 text-[13px] font-medium text-danger">
            {result.message}
          </p>
        ) : null}

        <div className="mt-4">
          <ReassuranceStrip>
            Your data is encrypted and stored securely. Only you and your family can access it.
          </ReassuranceStrip>
        </div>

        {/*
         * Pinned rather than sitting at the end of the form. Ten fields cannot
         * fit one fold at any spacing, and every one of them is optional — so
         * the most common action here is to submit early, and that is exactly
         * the action a button parked below the fold hides.
         */}
        <div className="sticky bottom-0 -mx-5 mt-4 border-t border-line bg-canvas px-5 pb-[calc(var(--safe-bottom)+0.75rem)] pt-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Continue"}
            <ArrowRight size={18} aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  );
}
