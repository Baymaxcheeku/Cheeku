import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { doctorById } from "@/lib/booking/catalog";
import { startsAt, useAppointments, whenLabel } from "@/lib/booking/appointments";
import type { MemoryContext } from "@/lib/memory/context";
import { kv } from "@/lib/storage";
import { supabase } from "@/lib/supabase/client";

import { chatNotes, type ChatNote, type ClassIn, type DocIn, type LabIn, type VisitIn } from "./notes";

/*
 * The notes Cheeku has to tell one person (lib/chat/notes.ts), minus the ones
 * already shown. Reports come from the memory the chat already holds; home
 * tests and classes are one small read each; doctor visits from the
 * appointments store. Which notes were shown is kept on the phone, per person.
 */

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v ? v : null);
const SEEN_CAP = 120;
const seenKey = (profileId: string) => `cheeku.chat.seen.${profileId}`;

function docsFrom(ctx: MemoryContext): DocIn[] {
  const byDoc = new Map<string, Row[]>();
  for (const e of ctx.entities) {
    const id = str(e.document_id);
    if (!id) continue;
    byDoc.set(id, [...(byDoc.get(id) ?? []), e]);
  }
  const fmt = (v: unknown, unit: unknown) => `${v}${str(unit) ? ` ${unit}` : ""}`;
  return ctx.documents.map((d) => {
    const id = String(d.id);
    const ents = byDoc.get(id) ?? [];
    const changes: DocIn["changes"] = [];
    for (const s of ctx.series.values()) {
      if (s.latest.documentId !== id || !s.previous) continue;
      changes.push({ name: s.name, from: fmt(s.previous.value, s.unit), to: fmt(s.latest.value, s.unit), direction: s.direction });
    }
    return {
      id,
      title: str(d.title) ?? "report",
      docType: String(d.doc_type),
      filedAt: String(d.created_at ?? ""),
      flagged: ents.filter((e) => e.flag === "high" || e.flag === "low").map((e) => ({ name: String(e.name), value: fmt(e.value ?? e.value_text, e.unit) })),
      changes,
      medicines: ents.filter((e) => e.kind === "medication").length,
      doctor: str(d.doctor),
    };
  });
}

async function readBookings(profileId: string): Promise<{ labs: LabIn[]; classes: ClassIn[] }> {
  const [labs, classes] = await Promise.all([
    supabase.from("lab_bookings").select("id, tests, slot_date, slot_window, status, created_at, result_document_id").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(6),
    supabase.from("fitness_bookings").select("id, session_title, studio_name, starts_at, status, created_at").eq("profile_id", profileId).order("starts_at", { ascending: false }).limit(6),
  ]);
  const ids = [...new Set((labs.data ?? []).flatMap((l) => (Array.isArray(l.tests) ? (l.tests as string[]) : [])))];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data } = await supabase.from("lab_tests").select("id, name").in("id", ids);
    for (const t of data ?? []) names.set(String(t.id), String(t.name));
  }
  return {
    labs: (labs.data ?? []).map((l) => ({
      id: String(l.id),
      tests: (Array.isArray(l.tests) ? (l.tests as string[]) : []).map((t) => names.get(t) ?? t),
      slotDate: String(l.slot_date),
      slotWindow: String(l.slot_window),
      status: String(l.status),
      createdAt: String(l.created_at),
      resultDocumentId: str(l.result_document_id),
    })),
    classes: (classes.data ?? []).map((c) => ({ id: String(c.id), title: String(c.session_title), studio: String(c.studio_name), startsAt: String(c.starts_at), status: String(c.status), createdAt: String(c.created_at) })),
  };
}

export function useChatNotes(profileId: string | undefined, ctx: MemoryContext | null, name: string): { notes: ChatNote[]; seen: (key: string) => void } {
  const qc = useQueryClient();
  const bookings = useQuery({ queryKey: ["chat-notes", profileId, "bookings"], queryFn: () => readBookings(profileId!), enabled: Boolean(profileId), staleTime: 60_000 });
  const seenQ = useQuery({
    queryKey: ["chat-notes", profileId, "seen"],
    queryFn: async () => {
      try {
        return new Set<string>(JSON.parse((await kv.get(seenKey(profileId!))) ?? "[]") as string[]);
      } catch {
        return new Set<string>();
      }
    },
    enabled: Boolean(profileId),
    staleTime: Infinity,
  });
  const appts = useAppointments((s) => s.items);
  useEffect(() => {
    void useAppointments.getState().load();
  }, []);

  const notes = useMemo(() => {
    if (!ctx || !seenQ.data) return [];
    const visits: VisitIn[] = appts
      .filter((a) => !a.profileId || a.profileId === profileId)
      .map((a) => ({ id: a.id, doctor: doctorById(a.doctorId)?.name ?? "the doctor", mode: a.mode === "online" ? "online" : "clinic", startsAt: startsAt(a).toISOString(), when: whenLabel(a), status: a.status, createdAt: a.createdAt }));
    const all = chatNotes({ name, docs: docsFrom(ctx), labs: bookings.data?.labs ?? [], classes: bookings.data?.classes ?? [], visits, now: new Date() });
    return all.filter((n) => !seenQ.data!.has(n.key));
  }, [ctx, seenQ.data, bookings.data, appts, profileId, name]);

  function seen(key: string) {
    if (!profileId) return;
    const next = new Set(seenQ.data ?? []);
    next.add(key);
    qc.setQueryData(["chat-notes", profileId, "seen"], next);
    void kv.set(seenKey(profileId), JSON.stringify([...next].slice(-SEEN_CAP)));
  }

  return { notes, seen };
}
