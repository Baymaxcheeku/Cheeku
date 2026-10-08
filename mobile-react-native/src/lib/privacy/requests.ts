import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase/client";

import { logActivity } from "./activity";

/*
 * Rights requests under the DPDP Act that the app cannot complete by itself.
 *
 * Export and deletion are buttons that do the whole job, so they are not
 * requests. What is left needs a person on our side: correcting something the
 * app cannot edit, a grievance, nominating someone to act for you. Each is
 * written with a due date (90 days, set by the database) so the reader can see
 * when to expect an answer and whoever answers can see what is late.
 */

export type RequestKind = "correction" | "grievance" | "nomination" | "access";

export type PrivacyRequest = {
  id: string;
  kind: RequestKind | "erasure" | "withdrawal";
  details: string | null;
  status: "received" | "in_progress" | "resolved" | "rejected";
  response: string | null;
  due_by: string;
  created_at: string;
};

export const REQUEST_COPY: Record<RequestKind, { title: string; line: string; placeholder: string }> = {
  correction: {
    title: "Correct something",
    line: "A value, date or detail we hold that is wrong or incomplete.",
    placeholder: "Which record, and what should it say?",
  },
  access: {
    title: "Ask how your data is used",
    line: "A summary of what we hold and who it has been shared with.",
    placeholder: "Anything in particular you want to know?",
  },
  nomination: {
    title: "Nominate someone",
    line: "Who can exercise your rights if you die or cannot act yourself.",
    placeholder: "Their name, relationship to you, and email or phone.",
  },
  grievance: {
    title: "Raise a concern",
    line: "Anything about how your data was handled. Goes to our Grievance Officer.",
    placeholder: "What happened, and when?",
  },
};

export const STATUS_LABEL: Record<PrivacyRequest["status"], string> = {
  received: "Received",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Closed",
};

export const REQUESTS_KEY = ["privacy-requests"] as const;

export async function openRequest(kind: RequestKind, details: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const text = details.trim();
  if (text.length < 5) return { ok: false, message: "Add a few words so we know what to look at." };
  if (text.length > 2000) return { ok: false, message: "Keep it under 2,000 characters." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, message: "Your session expired. Please sign in again." };
  const { error } = await supabase.from("privacy_requests").insert({ user_id: data.user.id, kind, details: text });
  if (error) return { ok: false, message: "Could not send that. Check your connection and try again." };
  void logActivity("privacy_request", kind);
  return { ok: true };
}

export function useRequests() {
  return useQuery({
    queryKey: REQUESTS_KEY,
    queryFn: async (): Promise<PrivacyRequest[]> => {
      const { data, error } = await supabase
        .from("privacy_requests")
        .select("id, kind, details, status, response, due_by, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return (data ?? []) as PrivacyRequest[];
    },
  });
}
