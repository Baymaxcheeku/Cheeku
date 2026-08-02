"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Crown, Users } from "lucide-react";

import { FamilySwitcherSheet } from "@/components/app/family-switcher";
import { Paywall } from "@/components/billing/paywall";
import { cn } from "@/lib/cn";
import { cancelPlan } from "@/lib/billing/actions";
import { planFor, type Tier } from "@/lib/billing/plans";
import type { Entitlement } from "@/lib/billing/quota";
import type { ActiveProfile } from "@/lib/profiles/context";

/**
 * Who you are and what you are on — one block.
 *
 * These were two stacked cards, and the split was the screen's worst habit:
 * the profile card printed the plan name in a chip and the plan card printed
 * it again as a headline, so the reader met the same fact twice before
 * reaching anything new. On a profile screen "who am I" and "what am I on"
 * are one question, and answering it once buys back most of the first
 * viewport.
 *
 * The free state does NOT reproduce the plan grid any more. Every plan, its
 * price and its features already live in the Paywall sheet, which is the one
 * place they can be correct; a second copy inline was three more upgrade
 * buttons competing with the two above them and a maintenance trap besides.
 */
export function ProfileIdentity({
  profile,
  profiles,
  recordCount,
  entitlement,
}: {
  profile: ActiveProfile;
  profiles: readonly ActiveProfile[];
  recordCount: number;
  entitlement: Entitlement;
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, start] = useTransition();

  const tier: Tier = entitlement.tier;
  const plan = planFor(tier);
  const paid = tier !== "free";
  const used = entitlement.limit !== null ? entitlement.chatsUsed : 0;
  const limit = entitlement.limit;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <>
      <section className="mx-5 mt-3 overflow-hidden rounded-card bg-surface shadow-e1">
        <div className="flex items-center gap-3.5 p-4">
          {/*
           * 72px with a ring and an offset. The avatar is the only portrait on
           * the screen now that the decorative mascot is gone from the header,
           * so it can carry the identity rather than compete with a second face
           * two rows above it.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI */}
          <img
            src={profile.avatar}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-pill bg-canvas object-cover ring-2 ring-brand-200 ring-offset-2 ring-offset-surface"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[22px] font-bold leading-tight tracking-tight text-ink-900">
              {profile.name}
            </h1>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-500">
              {profile.isPrimary ? "Your own profile" : (profile.relationship ?? "Family member")} ·{" "}
              {recordCount} record{recordCount === 1 ? "" : "s"}
            </p>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold",
                paid
                  ? "bg-brand-600 text-white"
                  : "border border-line bg-canvas text-ink-700",
              )}
            >
              {paid ? <Crown size={11} aria-hidden /> : null}
              {plan.name}
            </span>
          </div>
        </div>

        {/*
         * The usage line, on free only, and stated as where the reader
         * actually is rather than how close they are to a wall.
         */}
        {limit !== null ? (
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] font-medium text-ink-700">Chats this month</span>
              <span className="text-[12px] font-bold text-ink-900">
                {used} of {limit}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-brand-100">
              <div
                className={cn(
                  "h-full rounded-pill transition-[width] duration-500",
                  entitlement.canChat ? "bg-brand-600" : "bg-danger",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}

        {/*
         * Two actions, weighted. Switching member is the frequent one and gets
         * the quiet treatment; the upgrade or plan management is the rare one
         * and does not need to shout on a screen someone opened to change a
         * setting.
         */}
        <div className="flex items-stretch border-t border-line">
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            className="tappable flex flex-1 items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-ink-700 active:bg-brand-50"
          >
            <Users size={15} aria-hidden />
            Switch member
          </button>
          <span className="w-px bg-line" aria-hidden />
          <button
            type="button"
            onClick={() => (paid ? setConfirmCancel(true) : setPaywallOpen(true))}
            className="tappable flex flex-1 items-center justify-center gap-1 py-3.5 text-[13px] font-semibold text-brand-600 active:bg-brand-50"
          >
            {paid ? "Manage plan" : "See plans"}
            <ChevronRight size={15} aria-hidden />
          </button>
        </div>

        {/*
         * Cancelling is real and immediate rather than a support link. A
         * subscription that is one tap to start and a ticket to stop is a dark
         * pattern, and this one is attached to someone's medical records.
         */}
        {confirmCancel ? (
          <div className="border-t border-line bg-canvas p-4">
            <p className="text-[12.5px] leading-snug text-ink-700">
              Cancelling returns you to <strong className="font-semibold">5 chats a month</strong>.
              Your records and documents are untouched.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="tappable h-11 flex-1 rounded-pill border border-line bg-surface text-[13px] font-semibold text-ink-700 active:scale-[0.98]"
              >
                Keep my plan
              </button>
              <button
                type="button"
                disabled={pending}
                /*
                 * Closed on success, not left open. The revalidated page comes
                 * back on the free tier, and a panel still offering to cancel
                 * a plan the reader no longer has reads as a failed action.
                 */
                onClick={() =>
                  start(async () => {
                    await cancelPlan();
                    setConfirmCancel(false);
                  })
                }
                className="tappable h-11 flex-1 rounded-pill bg-ink-900 text-[13px] font-semibold text-white active:scale-[0.98] disabled:opacity-60"
              >
                {pending ? "Cancelling…" : "Cancel plan"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {switcherOpen ? (
        <FamilySwitcherSheet
          profiles={profiles}
          activeId={profile.id}
          tier={tier}
          onClose={() => setSwitcherOpen(false)}
        />
      ) : null}

      <Paywall
        open={paywallOpen}
        reason="upgrade"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => setPaywallOpen(false)}
      />
    </>
  );
}
