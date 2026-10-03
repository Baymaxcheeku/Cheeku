import { supabase } from "@/lib/supabase/client";

import type { DeviceEventKind, InboxItem, NotificationCategory, NotificationKind } from "./types";

/*
 * Reads and writes against `public.notifications`, through the user's own JWT.
 * RLS decides whose rows come back and the column grants decide what can be
 * changed (only `read_at` and `dismissed_at`), so nothing here takes a user id
 * except the insert, where the policy re-checks it against auth.uid().
 */

type Row = {
  id: string;
  kind: NotificationKind;
  category: NotificationCategory;
  title: string;
  body: string;
  route: string | null;
  profile_id: string | null;
  document_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

const SELECT = "id, kind, category, title, body, route, profile_id, document_id, data, created_at, read_at";

/** How far back the inbox reaches. Older rows stay stored and exported. */
export const INBOX_LIMIT = 60;

export function toItem(r: Row): InboxItem {
  return {
    id: r.id,
    kind: r.kind,
    category: r.category,
    title: r.title,
    body: r.body,
    route: r.route,
    profileId: r.profile_id,
    documentId: r.document_id,
    data: r.data ?? {},
    createdAt: r.created_at,
    readAt: r.read_at,
  };
}

export async function fetchInbox(): Promise<InboxItem[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(INBOX_LIMIT);
  if (error) throw new Error(`fetchInbox: ${error.message}`);
  return ((data ?? []) as Row[]).map(toItem);
}

export async function setRead(ids: string[], read: boolean): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .in("id", ids);
  if (error) throw new Error(`setRead: ${error.message}`);
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null)
    .is("dismissed_at", null);
  if (error) throw new Error(`markAllRead: ${error.message}`);
}

/** Hidden from the inbox, kept in the table (and in an export). */
export async function dismiss(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications")
    .update({ dismissed_at: now, read_at: now })
    .in("id", ids);
  if (error) throw new Error(`dismiss: ${error.message}`);
}

/** Undo for a dismiss: back in the inbox, still read. */
export async function restore(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notifications").update({ dismissed_at: null }).in("id", ids);
  if (error) throw new Error(`restore: ${error.message}`);
}

/**
 * An event that happened on this phone. Idempotent through `dedupeKey`, so a
 * double tap on "Confirm" is still one row. Failures are swallowed on purpose:
 * the booking itself already succeeded, and a missing inbox row must never
 * turn that into an error screen.
 */
export async function recordDeviceEvent(event: {
  kind: DeviceEventKind;
  title: string;
  body: string;
  route?: string;
  dedupeKey: string;
  profileId?: string | null;
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").upsert(
      {
        user_id: user.id,
        kind: event.kind,
        title: event.title.slice(0, 120),
        body: event.body.slice(0, 400),
        route: event.route ?? null,
        dedupe_key: event.dedupeKey,
        profile_id: event.profileId ?? null,
      },
      { onConflict: "user_id,dedupe_key", ignoreDuplicates: true },
    );
  } catch {
    // See above: never louder than the thing it records.
  }
}

// ------------------------------------------------------------- waitlist --

export async function fetchWaitlist(): Promise<string[]> {
  const { data, error } = await supabase.from("service_waitlist").select("service_id");
  if (error) throw new Error(`fetchWaitlist: ${error.message}`);
  return (data ?? []).map((r) => r.service_id as string);
}

export async function setWaitlisted(serviceId: string, on: boolean): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = on
    ? await supabase
        .from("service_waitlist")
        .upsert({ user_id: user.id, service_id: serviceId }, { onConflict: "user_id,service_id", ignoreDuplicates: true })
    : await supabase.from("service_waitlist").delete().eq("service_id", serviceId);
  if (error) throw new Error(`setWaitlisted: ${error.message}`);
}

// ---------------------------------------------------------- push devices --

export async function registerPushDevice(token: string, platform: "ios" | "android"): Promise<void> {
  const { error } = await supabase.rpc("register_push_device", { p_token: token, p_platform: platform });
  if (error) throw new Error(`registerPushDevice: ${error.message}`);
}

/** On sign-out, so the next person to sign in on this phone does not get our buzzes. */
export async function forgetPushDevice(token: string): Promise<void> {
  await supabase.from("push_devices").delete().eq("token", token);
}
