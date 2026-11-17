import { useQuery, type QueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import { isoOf, dayNumber, todayIso } from "@/lib/memory/clock";
import { memoryKey } from "@/lib/memory/store";
import { supabase } from "@/lib/supabase/client";
import { sessionUser } from "@/lib/supabase/session";

import type { CatalogTask } from "./catalog";
import type { Pillar } from "./content";
import type { DailyLog, DailyPrefs } from "./plan";
import { logStep } from "./stage";
import { ensureMediaAccess } from "@/lib/upload/media-access";

/*
 * THE DAY'S LOGS, READ AND WRITTEN.
 *
 * daily_logs (migration 0034) holds the evidence: a step count with its
 * screenshot, a meal photo with its tags, a reading, a sleep rating, a
 * finished breathing session. today_actions (0033) still says "done", so the
 * streak and the week count every kind of task the same way.
 *
 * PHOTOS are re-encoded on the phone before upload: scaled to 1280 px on the
 * long edge and saved as a fresh JPEG, which drops the camera's location and
 * device metadata. They live in the private documents bucket under
 * <account>/<member>/daily/<day>/, which the database refuses to let a log
 * point outside of. The key carries nothing from the original file name.
 *
 * READINGS also go into memory_facts, so a BP typed here is on the chart and
 * in the next chat answer, exactly like one said in the chat.
 *
 * Before 0034 is applied the table is missing: logs are kept in memory for
 * the session so the plan still works, and readings still reach memory.
 */

export const dailyLogsKey = (profileId: string | undefined) => ["daily-logs", profileId ?? "none"] as const;
export const dailyPrefsKey = (profileId: string | undefined) => ["daily-prefs", profileId ?? "none"] as const;

const missing = (message: string | undefined) => Boolean(message && /relation .* does not exist|could not find the table|column .* does not exist|could not find the .* column/i.test(message));

let memoryLogs: DailyLog[] = [];

function readLog(r: Record<string, unknown>): DailyLog {
  return {
    id: String(r.id),
    profileId: String(r.profile_id),
    day: String(r.day).slice(0, 10),
    taskKey: String(r.task_key),
    pillar: String(r.pillar) as Pillar,
    kind: String(r.kind),
    slot: (r.slot as string | null) ?? null,
    value: r.value === null || r.value === undefined ? null : Number(r.value),
    valueText: (r.value_text as string | null) ?? null,
    unit: (r.unit as string | null) ?? null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    photoPath: (r.photo_path as string | null) ?? null,
    createdAt: String(r.created_at ?? ""),
  };
}

/** Today and the seven days before, for one member. */
export async function fetchDailyLogs(profileId: string): Promise<DailyLog[]> {
  const since = isoOf(dayNumber(todayIso()) - 8);
  const { data, error } = await supabase
    .from("daily_logs")
    .select("id, profile_id, day, task_key, pillar, kind, slot, value, value_text, unit, tags, photo_path, created_at")
    .eq("profile_id", profileId)
    .gte("day", since)
    .order("created_at", { ascending: true })
    .limit(400);
  if (error) {
    if (missing(error.message)) return memoryLogs.filter((l) => l.profileId === profileId);
    throw new Error(`daily logs: ${error.message}`);
  }
  return (data ?? []).map((r) => readLog(r as Record<string, unknown>));
}

export async function fetchDailyPrefs(profileId: string): Promise<DailyPrefs> {
  const { data, error } = await supabase.from("profiles").select("daily_prefs").eq("id", profileId).maybeSingle();
  if (error || !data) return {};
  const p = (data as { daily_prefs?: unknown }).daily_prefs;
  return p && typeof p === "object" && !Array.isArray(p) ? (p as DailyPrefs) : {};
}

export function useDailyLogs(profileId: string | undefined) {
  return useQuery({ queryKey: dailyLogsKey(profileId), queryFn: () => fetchDailyLogs(profileId as string), enabled: Boolean(profileId), staleTime: 30_000, placeholderData: (p) => p });
}

export function useDailyPrefs(profileId: string | undefined) {
  return useQuery({ queryKey: dailyPrefsKey(profileId), queryFn: () => fetchDailyPrefs(profileId as string), enabled: Boolean(profileId), staleTime: 5 * 60_000 });
}

export async function saveDailyPrefs(qc: QueryClient, profileId: string, prefs: DailyPrefs): Promise<boolean> {
  qc.setQueryData(dailyPrefsKey(profileId), prefs);
  const { error } = await supabase.from("profiles").update({ daily_prefs: prefs }).eq("id", profileId);
  return !error || missing(error.message);
}

// ---------------------------------------------------------------- photos --

/** Camera or library; null when cancelled or not allowed. */
export async function pickDailyPhoto(source: "camera" | "library"): Promise<string | null> {
  // Cheeku's own sheet first, the system dialog only after "Allow" (lib/upload/media-access).
  if (!(await ensureMediaAccess(source === "camera" ? "camera" : "photos"))) return null;
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, exif: false };
  const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

async function prepare(uri: string): Promise<ArrayBuffer> {
  const context = ImageManipulator.manipulate(uri);
  const image = await context.renderAsync();
  const longest = Math.max(image.width, image.height);
  if (longest > 1280) context.resize(image.width >= image.height ? { width: 1280 } : { height: 1280 });
  const saved = await (await context.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  if (Platform.OS === "web") return (await fetch(saved.uri)).arrayBuffer();
  return new File(saved.uri).arrayBuffer();
}

const signed = new Map<string, { url: string; until: number }>();

/** A short-lived link to show a logged photo. */
export function usePhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ["daily-photo", path],
    enabled: Boolean(path),
    staleTime: 45 * 60_000,
    queryFn: async () => {
      const hit = path ? signed.get(path) : undefined;
      if (hit && hit.until > Date.now()) return hit.url;
      const { data } = await supabase.storage.from("documents").createSignedUrl(path as string, 3600);
      if (data?.signedUrl && path) signed.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60_000 });
      return data?.signedUrl ?? null;
    },
  });
}

// ---------------------------------------------------------------- writes --

export type NewLog = {
  profileId: string;
  task: Pick<CatalogTask, "key" | "pillar" | "kind" | "slot">;
  value?: number | null;
  valueText?: string | null;
  unit?: string | null;
  tags?: string[];
  /** A picked photo's uri, uploaded before the row is written. */
  photoUri?: string | null;
  /** Also mark the task done in today_actions. */
  complete?: boolean;
};

export type LogResult = { ok: true; log: DailyLog } | { ok: false; message: string };

export async function addDailyLog(qc: QueryClient, n: NewLog): Promise<LogResult> {
  const me = await sessionUser();
  if (!me) return { ok: false, message: "Your session expired. Please sign in again." };
  const day = todayIso();

  let photoPath: string | null = null;
  if (n.photoUri) {
    let bytes: ArrayBuffer;
    try {
      bytes = await prepare(n.photoUri);
    } catch {
      return { ok: false, message: "That photo couldn't be prepared. Try another one." };
    }
    photoPath = `${me.id}/${n.profileId}/daily/${day}/${randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("documents").upload(photoPath, bytes, { contentType: "image/jpeg", upsert: false });
    if (error) return { ok: false, message: "Couldn't upload the photo. Check your connection and try again." };
  }

  const row = {
    user_id: me.id,
    profile_id: n.profileId,
    day,
    task_key: n.task.key,
    pillar: n.task.pillar,
    kind: n.task.kind,
    slot: n.task.slot ?? null,
    value: n.value ?? null,
    value_text: n.valueText ?? null,
    unit: n.unit ?? null,
    tags: n.tags ?? [],
    photo_path: photoPath,
  };
  const { data, error } = await supabase.from("daily_logs").insert(row).select("id, profile_id, day, task_key, pillar, kind, slot, value, value_text, unit, tags, photo_path, created_at").single();

  let log: DailyLog;
  if (error) {
    if (!missing(error.message)) {
      if (photoPath) await supabase.storage.from("documents").remove([photoPath]);
      return { ok: false, message: /daily_cap/.test(error.message) ? "That's a lot of logs for one day. Try again tomorrow." : "Couldn't save that. Check your connection and try again." };
    }
    log = readLog({ ...row, id: randomUUID(), created_at: new Date().toISOString() });
    memoryLogs = [...memoryLogs, log];
  } else {
    log = readLog(data as Record<string, unknown>);
  }

  qc.setQueryData<DailyLog[]>(dailyLogsKey(n.profileId), (prev) => [...(prev ?? []), log]);
  if (n.complete) await logStep(qc, { profileId: n.profileId, stepKey: n.task.key, status: "done" });
  return { ok: true, log };
}

export async function removeDailyLog(qc: QueryClient, log: DailyLog): Promise<void> {
  qc.setQueryData<DailyLog[]>(dailyLogsKey(log.profileId), (prev) => (prev ?? []).filter((l) => l.id !== log.id));
  memoryLogs = memoryLogs.filter((l) => l.id !== log.id);
  await supabase.from("daily_logs").delete().eq("id", log.id);
  if (log.photoPath) await supabase.storage.from("documents").remove([log.photoPath]);
}

/**
 * A reading: one memory fact per field (so it is on the chart and in the
 * next answer), then one log for the plan.
 */
export async function saveReading(qc: QueryClient, args: { profileId: string; task: CatalogTask; values: Record<string, number> }): Promise<LogResult> {
  const { profileId, task, values } = args;
  const fields = task.fields ?? [];
  for (const f of fields) {
    const v = values[f.key];
    if (v === undefined || !Number.isFinite(v) || v < f.min || v > f.max) return { ok: false, message: `${f.label} should be between ${f.min} and ${f.max} ${f.unit}.` };
  }
  const me = await sessionUser();
  if (!me) return { ok: false, message: "Your session expired. Please sign in again." };
  const day = todayIso();
  const facts = fields.map((f) => ({ user_id: me.id, profile_id: profileId, key: f.key, label: f.factLabel, value: values[f.key], unit: f.unit, observed_on: day, source: "chat" }));
  const { error } = await supabase.from("memory_facts").insert(facts);
  if (error && !missing(error.message)) return { ok: false, message: "Couldn't save that reading. Check your connection and try again." };
  void qc.invalidateQueries({ queryKey: memoryKey(profileId) });

  const text = fields.map((f) => values[f.key]).join("/");
  return addDailyLog(qc, { profileId, task, value: values[fields[0]?.key ?? ""] ?? null, valueText: text, unit: fields[0]?.unit ?? null, complete: true });
}
