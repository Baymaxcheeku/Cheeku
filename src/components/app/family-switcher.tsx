"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ChevronRight, Crown, Lock, Plus, ShieldCheck, Users, X } from "lucide-react";

import { AddMemberSheet } from "@/components/app/add-member-sheet";
import { Paywall } from "@/components/billing/paywall";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/cn";
import { switchProfile } from "@/lib/profiles/actions";
import type { ActiveProfile } from "@/lib/profiles/context";
import { allowsFamily, type Tier } from "@/lib/billing/plans";

/*
 * B2 — the family switcher, as the inline row on Home and as the full sheet.
 *
 * The ring colour is decorative identity, deliberately drawn from a
 * non-semantic palette: green/amber/red mean health severity everywhere in this
 * app, and a green ring around someone's face would read as a verdict on them.
 */
const RINGS = [
  "#6C4EF6", // brand violet
  "#0E9BD1", // cyan
  "#D6459B", // magenta
  "#3F5BD9", // indigo
  "#7A5AF8", // light violet
  "#5B6B8C", // slate
] as const;

function ringFor(index: number) {
  return RINGS[index % RINGS.length] ?? RINGS[0];
}

/** "24 years • Female", as the sheet shows it. Both parts are optional. */
function describe(profile: ActiveProfile): string {
  const parts: string[] = [];
  if (profile.dob) {
    const born = new Date(`${profile.dob}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();
    const beforeBirthday =
      now.getMonth() < born.getMonth() ||
      (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
    if (beforeBirthday) years -= 1;
    if (years >= 0 && years < 130) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  }
  if (profile.sex && profile.sex !== "prefer_not_to_say") {
    parts.push(profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1));
  }
  return parts.join(" • ");
}

function Avatar({
  profile,
  index,
  size,
}: {
  profile: ActiveProfile;
  index: number;
  size: number;
}) {
  /*
   * A plain <img>, not next/image: the source is an inline data URI. There is
   * nothing for the optimiser to fetch or resize, and routing it through the
   * image loader would turn bytes we already hold into a network request.
   */
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={profile.avatar}
      alt=""
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        ["--tw-ring-color" as string]: ringFor(index),
      }}
      className="shrink-0 rounded-pill bg-surface object-cover ring-2 ring-offset-2 ring-offset-canvas"
    />
  );
}

export function FamilySwitcher({
  profiles,
  activeId,
  tier = "free",
  lockedCount = 0,
}: {
  /**
   * Only the profiles the current plan can actually open — see
   * `selectableProfiles`. Passing the full roster here would draw faces that
   * the server action then refuses to switch to, which reads as a broken
   * control rather than a locked feature.
   */
  profiles: readonly ActiveProfile[];
  activeId: string;
  tier?: Tier;
  /** Profiles that exist on the account but are behind the plan. */
  lockedCount?: number;
}) {
  const [pending, start] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const canSwitch = allowsFamily(tier);

  if (profiles.length === 0) return null;

  function choose(id: string) {
    setSheetOpen(false);
    if (id !== activeId) start(() => void switchProfile(id));
  }

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Family member"
        className={cn(
          "flex items-center gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          pending && "opacity-60",
        )}
      >
        {profiles.map((profile, i) => {
          const active = profile.id === activeId;

          /*
           * The selected member expands into a labelled pill, as in the frame,
           * rather than only tinting. On a row of small faces a tint is far too
           * quiet a signal for "whose health am I looking at".
           */
          if (active) {
            return (
              <span
                key={profile.id}
                role="radio"
                aria-checked
                className="flex shrink-0 items-center gap-2.5 rounded-card bg-brand-50 py-1.5 pl-1.5 pr-4"
              >
                <Avatar profile={profile} index={i} size={48} />
                <span className="min-w-0">
                  <span className="block max-w-[110px] truncate text-[14px] font-semibold text-ink-900">
                    {profile.name}
                  </span>
                  <span className="block text-[11px] text-ink-500">
                    {profile.isPrimary ? "Me" : (profile.relationship ?? "Family")}
                  </span>
                </span>
                <span className="h-2 w-2 shrink-0 rounded-pill bg-brand-600" aria-hidden />
              </span>
            );
          }

          return (
            <button
              key={profile.id}
              type="button"
              role="radio"
              aria-checked={false}
              disabled={pending}
              onClick={() => choose(profile.id)}
              className="tappable flex shrink-0 flex-col items-center gap-1.5 px-1 py-1 active:scale-95"
            >
              <Avatar profile={profile} index={i} size={48} />
              <span className="max-w-[64px] truncate text-[11px] text-ink-500">{profile.name}</span>
            </button>
          );
        })}

        {/*
         * Members this plan does not reach, drawn as padlocks rather than
         * omitted.
         *
         * Silently dropping them would tell a downgraded subscriber their
         * mother's records are gone. They are not — they are untouched and one
         * upgrade away — so the row says "locked", which is true, instead of
         * "absent", which is not.
         */}
        {!canSwitch && lockedCount > 0
          ? Array.from({ length: Math.min(lockedCount, 3) }, (_, i) => (
              <button
                key={`locked-${i}`}
                type="button"
                onClick={() => setPaywallOpen(true)}
                aria-label="Family members are part of the Family plan"
                className="tappable flex shrink-0 flex-col items-center gap-1.5 px-1 py-1 active:scale-95"
              >
                <span className="grid h-12 w-12 place-items-center rounded-pill border border-dashed border-line bg-surface-tint text-ink-300">
                  <Lock size={16} aria-hidden />
                </span>
                <span className="text-[11px] text-ink-300">Locked</span>
              </button>
            ))
          : null}

        {/* "All" opens the sheet rather than being a view of its own: a combined
            family view is the one place one person's results could appear under
            another's name, so it is not a thing you can land on by accident. */}
        <button
          type="button"
          onClick={() => (canSwitch ? setSheetOpen(true) : setPaywallOpen(true))}
          className="tappable flex shrink-0 flex-col items-center gap-1.5 px-1 py-1 active:scale-95"
        >
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-pill border bg-surface",
              canSwitch ? "border-line text-ink-500" : "border-brand-200 text-brand-600",
            )}
          >
            {canSwitch ? <Users size={18} aria-hidden /> : <Crown size={17} aria-hidden />}
          </span>
          <span className={cn("text-[11px]", canSwitch ? "text-ink-500" : "text-brand-600")}>
            {canSwitch ? "All" : "Upgrade"}
          </span>
        </button>
      </div>

      {sheetOpen ? (
        <FamilySwitcherSheet
          profiles={profiles}
          activeId={activeId}
          tier={tier}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}

      <Paywall
        open={paywallOpen}
        reason="family"
        onClose={() => setPaywallOpen(false)}
        onActivated={() => setPaywallOpen(false)}
      />
    </>
  );
}

/**
 * The bottom sheet from the frame: every member, with age and sex.
 *
 * Exported because the Profile tab opens it too, and two implementations of the
 * control that decides whose medical records you are looking at is one more
 * than should exist.
 */
export function FamilySwitcherSheet({
  profiles,
  activeId,
  onClose,
  tier = "free",
}: {
  profiles: readonly ActiveProfile[];
  activeId: string;
  onClose: () => void;
  /** Decides whether adding a member is available or an upsell. */
  tier?: Tier;
}) {
  const [pending, start] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  function onChoose(id: string) {
    onClose();
    if (id !== activeId) start(() => void switchProfile(id));
  }

  // The add-member form replaces this sheet rather than stacking on top of it:
  // two sheets deep, the back gesture stops meaning anything predictable.
  if (addOpen) {
    return (
      <AddMemberSheet
        tier={tier}
        memberCount={profiles.length}
        onClose={onClose}
        onBack={() => setAddOpen(false)}
      />
    );
  }

  return (
    <Sheet onClose={onClose} label="Switch family member" className={cn("px-5", pending && "opacity-70")}>
      <div className="mt-2">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[20px] font-bold text-ink-900">Switch family member</h2>
            <p className="mt-0.5 text-[13px] text-ink-500">
              View and manage health records for your family.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-surface text-ink-500 shadow-e1"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        <ul className="mt-4 overflow-hidden rounded-card bg-surface shadow-e1">
          {profiles.map((profile, i) => {
            const active = profile.id === activeId;
            const detail = describe(profile);
            return (
              <li key={profile.id} className={cn(i > 0 && "border-t border-line")}>
                <button
                  type="button"
                  onClick={() => onChoose(profile.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 p-3 text-left",
                    active && "bg-brand-50",
                  )}
                >
                  <Avatar profile={profile} index={i} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink-900">
                        {profile.name}
                      </span>
                      {profile.isPrimary ? (
                        <span className="shrink-0 rounded-pill bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                          Me
                        </span>
                      ) : null}
                    </span>
                    {detail ? (
                      <span className="mt-0.5 block truncate text-[12px] text-ink-500">
                        {detail}
                      </span>
                    ) : null}
                  </span>
                  {active ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-brand-600 text-surface">
                      <Check size={14} aria-hidden />
                    </span>
                  ) : (
                    <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/*
         * "All members" opens the records list unscoped, which is the honest
         * version of the frame's "see everyone in one place" — it is a real
         * screen that already exists, rather than a new one invented for a row.
         */}
        <div className="mt-3 space-y-2">
          <SheetAction
            icon={Users}
            title="View all members"
            body="See every member's records together"
            href="/records?profileId=all"
            onNavigate={onClose}
          />
          <SheetAction
            icon={Plus}
            title="Add family member"
            body="Add a new member to manage their health"
            onClick={() => setAddOpen(true)}
          />
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-card bg-brand-50 px-3.5 py-3 text-[12px] leading-snug text-ink-500">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden />
          <span>
            <strong className="font-semibold text-ink-900">Your data is private and secure.</strong>{" "}
            Only you can access your family&apos;s health information.
          </span>
        </p>
      </div>
    </Sheet>
  );
}

function SheetAction({
  icon: Icon,
  title,
  body,
  href,
  onClick,
  onNavigate,
}: {
  icon: typeof Users;
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[12px] text-ink-500">{body}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden />
    </>
  );

  const shell = "tappable flex w-full items-center gap-3 rounded-card bg-surface p-3 text-left shadow-e1 active:scale-[0.99]";

  if (href) {
    return (
      <Link href={href} onClick={onNavigate} className={shell}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={shell}>
      {inner}
    </button>
  );
}
