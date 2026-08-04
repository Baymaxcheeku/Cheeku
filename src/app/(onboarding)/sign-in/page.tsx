"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Apple, Lock, Mail, Phone, ShieldCheck } from "lucide-react";

import { Headline, OnboardingHeader } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";
import { Field, PasswordField } from "@/components/ui/field";
import { createAccount, signIn } from "@/lib/auth/actions";
import { MascotBust } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/auth/schemas";

type Tab = "sign-in" | "create";

/** A3 — email/password is the primary path, per the frames. */
export default function SignInPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sign-in");
  const [result, setResult] = useState<Extract<ActionResult, { ok: false }> | null>(null);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    start(async () => {
      const action = tab === "sign-in" ? signIn : createAccount;
      const outcome = await action(formData);
      if (outcome.ok) router.push(outcome.redirectTo);
      else setResult(outcome);
    });
  }

  // Switching tabs must clear errors — an error about the other form's fields
  // would point at controls that are no longer on screen.
  function switchTo(next: Tab) {
    setTab(next);
    setResult(null);
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingHeader back="/welcome" action={{ label: "Help", href: "/help" }} />

      {/* The art is absolutely positioned, so the text needs its own gutter. */}
      <div className="relative px-5 pb-1 pr-[38%]">
        <Headline lead="Welcome" accent="to Baymax" />
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Your family&apos;s health, protected and organized in one secure place.
        </p>
        <MascotBust className="pointer-events-none absolute -right-3 top-0 w-[140px]" />
      </div>

      <div className="mt-2 flex flex-1 flex-col rounded-t-sheet bg-surface px-5 pb-4 pt-1 shadow-e2">
        <div role="tablist" aria-label="Account" className="flex border-b border-line">
          {(
            [
              ["sign-in", "Sign in"],
              ["create", "Create account"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => switchTo(value)}
              className={cn(
                "-mb-px flex-1 border-b-2 pb-2.5 pt-3 text-[14px] font-semibold",
                tab === value
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-ink-500 hover:text-ink-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="pt-4">
          <h2 className="text-[15px] font-semibold text-ink-900">
            {tab === "sign-in" ? "Sign in to your account" : "Create your account"}
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-500">
            {tab === "sign-in"
              ? "Access your health records and insights"
              : "Your records stay private to you and the family you invite"}
          </p>
        </div>

        {/* Remounting on tab change resets the inputs, so a password typed on one
            tab is never silently submitted to the other action. */}
        <form key={tab} onSubmit={submit} className="mt-4 space-y-3">
          <Field
            name="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="Email address"
            error={result?.fieldErrors?.email}
            required
          />
          <PasswordField
            name="password"
            icon={Lock}
            autoComplete={tab === "sign-in" ? "current-password" : "new-password"}
            placeholder="Password"
            error={result?.fieldErrors?.password}
            hint={tab === "create" ? "At least 10 characters" : undefined}
            required
          />

          {tab === "sign-in" ? (
            <p className="text-right">
              <a href="/forgot-password" className="text-[13px] font-medium text-brand-500">
                Forgot password?
              </a>
            </p>
          ) : (
            <label className="flex gap-2.5 rounded-tile bg-brand-50 px-3.5 py-3">
              {/* DPDP Act: unticked by default, and the copy names what is being
                  consented to rather than linking away to find out. */}
              <input
                type="checkbox"
                name="consent"
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
              />
              <span className="text-[12px] leading-snug text-ink-500">
                I agree that Baymax may store and process my family&apos;s health records to give me
                insights. I can export or delete everything at any time.
                {result?.fieldErrors?.consent ? (
                  <span role="alert" className="mt-1 block font-medium text-danger">
                    {result.fieldErrors.consent}
                  </span>
                ) : null}
              </span>
            </label>
          )}

          {result?.message ? (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {result.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "One moment…" : tab === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[12px] text-ink-300">or continue with</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {/*
         * Present in the frames, but no provider is configured yet. Shipping
         * these as buttons that silently do nothing would be worse than
         * disabling them, so they are disabled and say why.
         */}
        <ul className="grid grid-cols-3 gap-2">
          {[
            { label: "Google", icon: Mail },
            { label: "Apple", icon: Apple },
            { label: "Phone (OTP)", icon: Phone },
          ].map(({ label, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                disabled
                title="Coming soon. Use email and password for now"
                className="flex h-11 w-full items-center justify-center gap-1.5 rounded-pill border border-line bg-surface text-[12px] font-medium text-ink-500 disabled:opacity-55"
              >
                <Icon size={14} aria-hidden />
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/*
         * The frames also close this sheet with a "New to Baymax? Create
         * account" line. The tablist at the top is on screen at the same time
         * and does exactly that, so the line was a second control for the same
         * job — and the one costing the primary CTA its place above the fold.
         */}
        <p className="mt-4 flex items-center justify-center gap-2 text-[12px] text-ink-500">
          <ShieldCheck size={14} className="text-brand-400" aria-hidden />
          Bank-level encryption. Your data is private and secure.
        </p>
      </div>
    </div>
  );
}
