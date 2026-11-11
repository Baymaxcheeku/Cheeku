import { useQuery, type QueryClient } from "@tanstack/react-query";

import { selectableProfiles } from "@/lib/profiles/context";
import { supabase } from "@/lib/supabase/client";

import { policiesFor } from "@/lib/insurance/queries";

import { buildHealthFile, withPolicies, type Bundle, type HealthFile } from "./file";
import { readReport, type HealthReport } from "./report";

/*
 * The health file, one member at a time.
 *
 * KEYED BY MEMBER. The old overview sat under one key for whoever was being
 * viewed, so after a switch it could show the previous person's file until a
 * refetch landed. Here the member is part of the key: switching to Amma asks
 * for Amma's file, and never shows Athar's while it loads.
 *
 * One call, `health_file_bundle` (migration 0029), which refuses anyone
 * outside the caller's family or the plan. Before that migration has run,
 * the same three reads are made directly, RLS-scoped, with the plan check
 * done here instead.
 */

export const healthFileKey = (profileId: string | undefined) => ["health-file", profileId ?? "none"] as const;

const missingFunction = (message: string | undefined) => Boolean(message && /could not find the function|function .* does not exist/i.test(message));

export async function fetchHealthFile(profileId: string): Promise<HealthFile | null> {
  const [file, policies] = await Promise.all([readFile(profileId), policiesFor(profileId)]);
  return file ? withPolicies(file, policies) : null;
}

async function readFile(profileId: string): Promise<HealthFile | null> {
  const { data, error } = await supabase.rpc("health_file_bundle", { p_profile: profileId });
  if (!error) return data ? buildHealthFile(data as Bundle) : null;
  if (!missingFunction(error.message)) throw new Error(`health file: ${error.message}`);
  return fetchDirect(profileId);
}

async function fetchDirect(profileId: string): Promise<HealthFile | null> {
  const allowed = await selectableProfiles();
  if (!allowed.some((p) => p.id === profileId)) return null;

  const base = "id, name, relationship, is_primary, dob, sex, blood_group, height_cm, weight_kg, conditions, medications";
  let profile = await supabase.from("profiles").select(`${base}, allergies`).eq("id", profileId).maybeSingle();
  if (profile.error) profile = await supabase.from("profiles").select(base).eq("id", profileId).maybeSingle();

  const [documents, entities] = await Promise.all([
    supabase.from("documents").select("id, doc_type, status, event_date, facility, doctor, created_at, extraction").eq("profile_id", profileId),
    supabase.from("entities").select("id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date").eq("profile_id", profileId),
  ]);
  if (documents.error) throw new Error(`health file: ${documents.error.message}`);

  const docs = (documents.data ?? []).map((d) => {
    const x = (d.extraction ?? {}) as { title?: string; details?: unknown; source?: string };
    return { ...d, title: x.title ?? null, details: x.details ?? null, source: x.source ?? null };
  });
  return buildHealthFile({ profile: (profile.data as Record<string, unknown> | null) ?? null, documents: docs, entities: entities.data ?? [] });
}

export function useHealthFile(profileId: string | undefined) {
  return useQuery({
    queryKey: healthFileKey(profileId),
    queryFn: () => fetchHealthFile(profileId as string),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  });
}

/** Warms a member's file, so switching to them lands on a full page. */
export function prefetchHealthFile(qc: QueryClient, profileId: string) {
  void qc.prefetchQuery({ queryKey: healthFileKey(profileId), queryFn: () => fetchHealthFile(profileId), staleTime: 30_000 });
}

// --------------------------------------------------------- health report --
// The AI API's report for one member (0044, lib/health/report.ts).

export const healthReportKey = (profileId: string | undefined) => ["health-report", profileId ?? "none"] as const;

/**
 * Null when there is no report yet, and also when 0044 is not applied (the
 * table is missing): the card simply does not appear, nothing else breaks.
 */
export async function fetchHealthReport(profileId: string): Promise<HealthReport | null> {
  const { data, error } = await supabase
    .from("ai_health_reports")
    .select("summary, report, generated_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) return null;
  return readReport(data);
}

export function useHealthReport(profileId: string | undefined) {
  return useQuery({
    queryKey: healthReportKey(profileId),
    queryFn: () => fetchHealthReport(profileId as string),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  });
}
