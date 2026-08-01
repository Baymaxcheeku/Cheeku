"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { FamilySwitcherSheet } from "./family-switcher";
import { planFor, type Tier } from "@/lib/billing/plans";
import type { ActiveProfile } from "@/lib/profiles/context";

/**
 * The card at the top of the Profile tab: who you are currently viewing, and
 * the way to change it.
 *
 * The switcher lives here as well as on Home because this is the screen people
 * open when they want to know "whose profile is this" — finding the answer only
 * on another tab is the kind of thing that makes someone act on the wrong
 * person's records.
 */
export function ProfileHeader({
  profile,
  profiles,
  recordCount,
  tier,
}: {
  profile: ActiveProfile;
  profiles: readonly ActiveProfile[];
  recordCount: number;
  tier: Tier;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="mx-5 mt-4 rounded-card bg-surface p-4 shadow-e1">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={profile.avatar}
            alt=""
            width={64}
            height={64}
            className="h-16 w-16 shrink-0 rounded-pill bg-canvas object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[19px] font-bold text-ink-900">{profile.name}</p>
            <p className="mt-0.5 text-[12px] text-ink-500">
              {profile.isPrimary ? "Your own profile" : (profile.relationship ?? "Family member")} ·{" "}
              {recordCount} record{recordCount === 1 ? "" : "s"}
            </p>
            <span className="mt-1.5 inline-block rounded-pill bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
              {planFor(tier).name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill border border-brand-200 bg-brand-50 py-2.5 text-[13px] font-semibold text-brand-700"
        >
          <Users size={15} aria-hidden />
          Switch family member
        </button>
      </section>

      {open ? (
        <FamilySwitcherSheet
          profiles={profiles}
          activeId={profile.id}
          tier={tier}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
