import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import {
  severityFromFlags,
  type DocStatus,
  type DocType,
  type EntityFlag,
  type RecordDetail,
  type RecordEntity,
  type RecordStats,
  type RecordSummary,
  type Severity,
} from "./types";

/*
 * Every query here goes through the request-scoped client, never the service
 * key. RLS is the isolation boundary — a query that reaches for the service key
 * to "just get the data" has stepped around the guarantee the whole app rests
 * on. None of these functions take a user_id for the same reason: `auth.uid()`
 * decides what comes back, so there is no parameter to get wrong.
 *
 * `profileId` is a *narrowing* filter within the caller's own data, not the
 * security boundary. Passing another family member's id returns their rows only
 * if RLS already permits it.
 */

export type RecordFilters = {
  profileId?: string;
  docType?: DocType;
  search?: string;
  /** ISO date; records on or after this are returned. */
  since?: string;
  sort?: "newest" | "oldest";
};

/*
 * The row shape Supabase returns for the joins below. Written out rather than
 * inferred because `profiles` arrives as an object or an array depending on how
 * the relationship is resolved, and letting that type flow into the UI produces
 * errors a long way from the cause.
 */
type DocumentRow = {
  id: string;
  profile_id: string;
  doc_type: DocType;
  status: DocStatus;
  mime_type: string;
  event_date: string | null;
  facility: string | null;
  doctor: string | null;
  confidence: number | null;
  created_at: string;
  extraction: { title?: string } | null;
  profiles: { name: string } | { name: string }[] | null;
  entities: { flag: EntityFlag | null }[] | null;
};

function profileName(row: DocumentRow): string {
  const p = row.profiles;
  if (!p) return "Unknown";
  return Array.isArray(p) ? (p[0]?.name ?? "Unknown") : p.name;
}

/*
 * A document's display title lives in `extraction.title` because it is a
 * *derived* value — what the OCR thought the report was called. The column set
 * deliberately has no `title`, so that a re-extraction cannot silently rewrite
 * something the user typed.
 */
function documentTitle(row: { extraction: { title?: string } | null; doc_type: DocType }): string {
  const fromExtraction = row.extraction?.title?.trim();
  if (fromExtraction) return fromExtraction;
  return DOC_TYPE_FALLBACK[row.doc_type];
}

const DOC_TYPE_FALLBACK: Record<DocType, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  discharge: "Discharge summary",
  scan: "Scan",
  bill: "Bill",
  vaccination: "Vaccination record",
  other: "Document",
};

function toSummary(row: DocumentRow): RecordSummary {
  const flags = (row.entities ?? [])
    .map((e) => e.flag)
    .filter((f): f is EntityFlag => f !== null);

  return {
    id: row.id,
    profileId: row.profile_id,
    profileName: profileName(row),
    title: documentTitle(row),
    docType: row.doc_type,
    status: row.status,
    mimeType: row.mime_type,
    eventDate: row.event_date,
    facility: row.facility,
    doctor: row.doctor,
    confidence: row.confidence,
    severity: severityFromFlags(flags),
    createdAt: row.created_at,
  };
}

const SUMMARY_SELECT =
  "id, profile_id, doc_type, status, mime_type, event_date, facility, doctor, confidence, created_at, extraction, profiles(name), entities(flag)";

export async function listRecords(filters: RecordFilters = {}): Promise<RecordSummary[]> {
  const supabase = await createServerSupabase();

  let query = supabase.from("documents").select(SUMMARY_SELECT);

  if (filters.profileId) query = query.eq("profile_id", filters.profileId);
  if (filters.docType) query = query.eq("doc_type", filters.docType);
  if (filters.since) query = query.gte("event_date", filters.since);

  /*
   * Search covers the facility and the doctor, which are real columns. The
   * title is not searchable here because it lives inside a jsonb blob and
   * matching on it would need a functional index that does not exist yet —
   * better an honestly narrow search than one that silently misses.
   */
  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    query = query.or(`facility.ilike.${term},doctor.ilike.${term}`);
  }

  // `nullsFirst: false` keeps undated documents at the end rather than
  // pretending they are the newest thing the user owns.
  const ascending = filters.sort === "oldest";
  const { data, error } = await query
    .order("event_date", { ascending, nullsFirst: false })
    .order("created_at", { ascending });

  if (error) throw new Error(`listRecords: ${error.message}`);
  return (data as unknown as DocumentRow[]).map(toSummary);
}

export async function getRecord(id: string): Promise<RecordDetail | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("documents")
    .select(`${SUMMARY_SELECT}, raw_text, storage_path`)
    .eq("id", id)
    .maybeSingle();

  // A row the caller cannot see comes back as null, not as an error — RLS
  // filters it rather than refusing it. "Not found" and "not yours" are
  // deliberately indistinguishable to the caller.
  if (error) throw new Error(`getRecord: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as DocumentRow & { raw_text: string | null; storage_path: string };

  const { data: entityRows, error: entityError } = await supabase
    .from("entities")
    .select("id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date")
    .eq("document_id", id)
    .order("created_at", { ascending: true });

  if (entityError) throw new Error(`getRecord entities: ${entityError.message}`);

  const entities: RecordEntity[] = (entityRows ?? []).map((e) => ({
    id: e.id as string,
    kind: e.kind as RecordEntity["kind"],
    name: e.name as string,
    canonicalName: e.canonical_name as string | null,
    value: e.value as number | null,
    valueText: e.value_text as string | null,
    unit: e.unit as string | null,
    refRange: e.ref_range as string | null,
    flag: e.flag as EntityFlag | null,
    eventDate: e.event_date as string | null,
  }));

  return {
    ...toSummary(row),
    severity: severityFromFlags(entities.map((e) => e.flag).filter((f): f is EntityFlag => !!f)),
    rawText: row.raw_text,
    storagePath: row.storage_path,
    entities,
    extraction: row.extraction,
  };
}

/** The four counts across the top of D1 and D3, over the same filtered set. */
export function statsFrom(records: readonly RecordSummary[]): RecordStats {
  const count = (s: Severity) => records.filter((r) => r.severity === s).length;
  return {
    total: records.length,
    normal: count("normal"),
    borderline: count("borderline"),
    highRisk: count("high_risk"),
  };
}

/**
 * Records belonging to one family member.
 *
 * Separate from `listRecords` because the caller's intent is different: this is
 * "show me Amma's records" and must never silently widen. `listRecords` with no
 * profileId is the deliberate cross-family view used by D1's "All members".
 */
export async function listProfileRecords(
  profileId: string,
  filters: Omit<RecordFilters, "profileId"> = {},
): Promise<RecordSummary[]> {
  return listRecords({ ...filters, profileId });
}

/** Profiles the signed-in user can see, for the "All members" filter. */
export async function listProfiles(): Promise<{ id: string; name: string }[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`listProfiles: ${error.message}`);
  return (data ?? []) as { id: string; name: string }[];
}

/**
 * A short-lived signed URL for the original file.
 *
 * 60 seconds, and minted only here. The bucket is private and there is no code
 * path that returns a permanent URL for a medical document — a link that
 * outlives the screen it was rendered on is a link that can be forwarded.
 */
export async function signedDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage.from("documents").createSignedUrl(storagePath, 60);
  if (error) return null;
  return data.signedUrl;
}
