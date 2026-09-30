import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

import type { ActiveProfile } from "@/lib/profiles/context";
import { useSwitchMember } from "@/lib/profiles/family";
import { supabase } from "@/lib/supabase/client";

import { unreadCount } from "./inbox";
import { dismiss, fetchInbox, markAllRead, setRead, toItem } from "./queries";
import type { InboxItem } from "./types";

/*
 * The inbox as one cached query, shared by the bell, the Home badge and the
 * Notifications screen, so they can never disagree about the count.
 *
 * SNAPPINESS. Every action writes the cache first and the network second: a
 * tap marks the row read and navigates in the same frame, and only a failed
 * write puts things back. New rows arrive over Supabase Realtime straight into
 * the cache, so the badge moves within a second of a trigger firing without
 * anyone pulling to refresh.
 */

export const INBOX_KEY = ["notifications"] as const;

export function useInbox() {
  return useQuery({ queryKey: INBOX_KEY, queryFn: fetchInbox, staleTime: 20_000 });
}

export function useUnreadCount(): number {
  const { data } = useInbox();
  return unreadCount(data ?? []);
}

function patch(qc: QueryClient, fn: (items: InboxItem[]) => InboxItem[]) {
  qc.setQueryData<InboxItem[]>(INBOX_KEY, (old) => (old ? fn(old) : old));
}

/** Optimistic, and rolled back if the write does not land. */
async function optimistic(qc: QueryClient, change: (items: InboxItem[]) => InboxItem[], write: () => Promise<void>) {
  await qc.cancelQueries({ queryKey: INBOX_KEY });
  const before = qc.getQueryData<InboxItem[]>(INBOX_KEY);
  patch(qc, change);
  try {
    await write();
  } catch {
    qc.setQueryData(INBOX_KEY, before);
  }
}

export function useInboxActions() {
  const qc = useQueryClient();
  // Stable across renders, so effects that depend on these do not resubscribe.
  return useMemo(() => ({
    markRead: (ids: string[]) => {
      const now = new Date().toISOString();
      return optimistic(
        qc,
        (items) => items.map((i) => (ids.includes(i.id) && !i.readAt ? { ...i, readAt: now } : i)),
        () => setRead(ids, true),
      );
    },
    markUnread: (id: string) =>
      optimistic(qc, (items) => items.map((i) => (i.id === id ? { ...i, readAt: null } : i)), () => setRead([id], false)),
    markAllRead: () => {
      const now = new Date().toISOString();
      return optimistic(qc, (items) => items.map((i) => (i.readAt ? i : { ...i, readAt: now })), markAllRead);
    },
    dismiss: (ids: string[]) => optimistic(qc, (items) => items.filter((i) => !ids.includes(i.id)), () => dismiss(ids)),
  }), [qc]);
}

/**
 * Streams inbox changes while the signed-in shell is mounted, and refetches
 * when the app comes back to the foreground (a socket asleep in the
 * background misses things). `onNew` fires for rows that arrive while the app
 * is open, which is what the in-app toast listens to.
 */
export function useInboxLive(onNew?: (item: InboxItem) => void) {
  const qc = useQueryClient();
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      channel = supabase
        .channel(`inbox:${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const item = toItem(payload.new as Parameters<typeof toItem>[0]);
            patch(qc, (items) => (items.some((i) => i.id === item.id) ? items : [item, ...items]));
            if (!item.readAt) onNewRef.current?.(item);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Parameters<typeof toItem>[0] & { dismissed_at: string | null };
            patch(qc, (items) =>
              row.dismissed_at ? items.filter((i) => i.id !== row.id) : items.map((i) => (i.id === row.id ? toItem(row) : i)),
            );
          },
        )
        .subscribe();
    });

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void qc.invalidateQueries({ queryKey: INBOX_KEY });
    });

    return () => {
      cancelled = true;
      sub.remove();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [qc]);
}

type HomeContext = { profile: ActiveProfile | null; access: { selectable: ActiveProfile[] } } | undefined;

/**
 * Opens whatever a notification points at, in the right family member's
 * context (PLAN.md rule 4).
 *
 * Navigation happens in the same tick as the tap. When the row is about a
 * different member, the switch runs alongside and Home is refetched behind
 * the screen that just opened, so the reader never waits on it. A member the
 * plan no longer covers opens the plan chooser instead of their record.
 */
export function useOpenNotification() {
  const router = useRouter();
  const qc = useQueryClient();
  const { markRead } = useInboxActions();
  const switchMember = useSwitchMember();

  return useCallback(
    (item: Pick<InboxItem, "id" | "route" | "profileId" | "readAt">) => {
      if (!item.readAt) void markRead([item.id]);

      const ctx = qc.getQueryData<HomeContext>(["home-context"]);
      const activeId = ctx?.profile?.id;
      if (item.profileId && ctx && !ctx.access.selectable.some((p) => p.id === item.profileId)) {
        router.push("/plan");
        return;
      }

      if (item.route) router.push(item.route as never);

      if (item.profileId && item.profileId !== activeId) void switchMember(item.profileId);
    },
    [qc, router, markRead, switchMember],
  );
}
