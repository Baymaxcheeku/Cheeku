import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { create } from "zustand";

import { seatsFor, type Tier } from "@/lib/billing/plans";
import { getEntitlement, type Entitlement } from "@/lib/billing/quota";
import { listProfileRecords } from "@/lib/records/queries";
import { supabase } from "@/lib/supabase/client";
import { addMemberSchema } from "@/lib/settings/schemas";

import { activeProfile, familyProfiles, profileAccess, switchProfile, type ActiveProfile } from "./context";

/*
 * The family, as one query the whole app shares.
 *
 * WHY ONE QUERY. Home, the tray, the Profile tab and the plan screen all need
 * the same three facts: who is in the family, who the plan lets you open, and
 * who you are looking at now. When each screen fetched its own copy, switching
 * member updated one and left the others naming the previous person for a
 * beat. Now there is one cache entry (`home-context`, the key Home always
 * used, so the offline cache keeps working) and one switch function.
 *
 * WHY THE SWITCH IS INSTANT. It writes the new member into that cache first,
 * so every screen reading it re-renders in the same frame; then it stores the
 * choice and marks everything that depends on the member as stale. Records are
 * prefetched for everyone when the tray opens, so the list under the new name
 * is usually already there.
 */

export const FAMILY_KEY = ["home-context"] as const;

export type FamilyContext = {
  access: { all: ActiveProfile[]; selectable: ActiveProfile[]; lockedCount: number; canSwitch: boolean };
  profile: ActiveProfile | null;
  entitlement: Entitlement;
};

export async function loadFamily(): Promise<FamilyContext> {
  const [access, profile, entitlement] = await Promise.all([profileAccess(), activeProfile(), getEntitlement()]);
  return { access, profile, entitlement };
}

export function useFamily() {
  return useQuery({ queryKey: FAMILY_KEY, queryFn: loadFamily, staleTime: 30_000 });
}

/** Every query whose answer depends on WHO is active. */
export const MEMBER_SCOPED = [
  "records",
  "records-context",
  "records-list",
  "record",
  "ask-context",
  "settings-personal",
  "settings-health",
  "scan-context",
  "knowledge-feed",
  "active-profile-name",
  "health-overview",
  "settings-context",
] as const;

/** Every query that changes when the roster or the plan does. */
export const ROSTER_SCOPED = [
  ...MEMBER_SCOPED,
  "home-context",
  "settings-context",
  "subscription",
  "entitlement",
  "own-family",
  "family-members",
  "book-family",
] as const;

export function refreshMemberScoped(qc: QueryClient) {
  for (const key of MEMBER_SCOPED) void qc.invalidateQueries({ queryKey: [key] });
}

export function refreshRoster(qc: QueryClient) {
  for (const key of ROSTER_SCOPED) void qc.invalidateQueries({ queryKey: [key] });
}

/** Warms each member's records so a switch lands on a full screen. */
export function prefetchMembers(qc: QueryClient, members: readonly ActiveProfile[]) {
  for (const m of members) {
    void qc.prefetchQuery({ queryKey: ["records", m.id], queryFn: () => listProfileRecords(m.id), staleTime: 60_000 });
  }
}

/*
 * A one-line "Now viewing Amma" confirmation, shown by Home. A switch that
 * changes every number on the screen deserves a word saying so, or a reader
 * who tapped by accident is left wondering why their results look different.
 */
type SwitchPulse = { member: ActiveProfile | null; at: number; announce: (m: ActiveProfile) => void };
export const useSwitchPulse = create<SwitchPulse>((set) => ({
  member: null,
  at: 0,
  announce: (member) => set({ member, at: Date.now() }),
}));

export function useSwitchMember() {
  const qc = useQueryClient();
  return useCallback(
    async (id: string): Promise<boolean> => {
      const ctx = qc.getQueryData<FamilyContext>(FAMILY_KEY);
      const target = ctx?.access.selectable.find((p) => p.id === id);

      if (!ctx || !target) {
        // No cache to trust: the slow, fully checked path.
        const ok = await switchProfile(id);
        if (ok) refreshRoster(qc);
        return ok;
      }
      if (ctx.profile?.id === id) return true;

      qc.setQueryData<FamilyContext>(FAMILY_KEY, { ...ctx, profile: target });
      useSwitchPulse.getState().announce(target);
      const ok = await switchProfile(id, ctx.access.selectable);
      if (!ok) {
        qc.setQueryData<FamilyContext>(FAMILY_KEY, ctx);
        return false;
      }
      refreshMemberScoped(qc);
      return true;
    },
    [qc],
  );
}

export { familyMode, joinNames, planChange, type FamilyMode, type PlanChange } from "./family-plan";

// --------------------------------------------------------- member admin --

export type MemberRow = ActiveProfile & { locked: boolean; reports: number };

/** Everyone on the account, locked or not, with how many reports each holds. */
export async function listMembers(): Promise<{ members: MemberRow[]; tier: Tier; seats: number }> {
  const [all, entitlement, docs] = await Promise.all([
    familyProfiles(),
    getEntitlement(),
    supabase.from("documents").select("profile_id"),
  ]);
  if (docs.error) throw new Error(`listMembers: ${docs.error.message}`);
  const counts = new Map<string, number>();
  for (const d of docs.data ?? []) counts.set(d.profile_id as string, (counts.get(d.profile_id as string) ?? 0) + 1);
  const seats = seatsFor(entitlement.tier);
  return {
    members: all.map((p, i) => ({ ...p, locked: i >= seats, reports: counts.get(p.id) ?? 0 })),
    tier: entitlement.tier,
    seats,
  };
}

export type MemberResult = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> };

export async function updateMember(
  id: string,
  patch: { name: string; relationship: string; dob: string; sex: string; avatarSeed: string },
): Promise<MemberResult> {
  const parsed = addMemberSchema.safeParse(patch);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      fieldErrors[k] ??= issue.message;
    }
    return { ok: false, message: "Check the fields below.", fieldErrors };
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      relationship: parsed.data.relationship,
      dob: parsed.data.dob || null,
      sex: parsed.data.sex || null,
      avatar_seed: parsed.data.avatarSeed || null,
    })
    .eq("id", id);
  if (error) return { ok: false, message: "That didn't save. Check your connection and try again." };
  return { ok: true };
}

/** Just the face, for the account holder, whose other details live in Personal information. */
export async function updateAvatar(id: string, avatarSeed: string | null): Promise<MemberResult> {
  const { error } = await supabase.from("profiles").update({ avatar_seed: avatarSeed }).eq("id", id);
  if (error) return { ok: false, message: "That didn't save. Try again." };
  return { ok: true };
}

/**
 * Removes a family member and everything filed under them.
 *
 * The FILES go first, through the storage API, because the database cascade
 * removes rows but cannot reach the bucket; a member removed rows-first would
 * leave their scanned reports sitting in storage with nothing pointing at
 * them. If the files cannot be removed, nothing else is touched. Then one
 * delete on the profile cascades documents, values, chats and notifications
 * (and the database refuses it outright for the account holder, migration
 * 0025). If the removed member was the one being viewed, the view falls back
 * to the account holder.
 */
export async function removeMember(id: string): Promise<MemberResult> {
  const { data: docs, error: readError } = await supabase.from("documents").select("storage_path").eq("profile_id", id);
  if (readError) return { ok: false, message: "Couldn't reach their records. Nothing was removed." };

  const paths = (docs ?? []).map((d) => d.storage_path as string).filter(Boolean);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from("documents").remove(paths);
    if (error) return { ok: false, message: "Couldn't remove their files. Nothing was removed." };
  }

  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) {
    if (error.message.includes("account holder")) {
      return { ok: false, message: "This is your own profile. To remove everything, delete your account instead." };
    }
    return { ok: false, message: "Their files are gone but the profile wasn't removed. Try again." };
  }
  return { ok: true };
}
