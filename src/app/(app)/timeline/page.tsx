import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * D3 now lives inside D1 as a view toggle (see RecordsView) rather than a
 * separate route — the two were always the same records rearranged, and a
 * full navigation between them showed a fresh loading state to switch
 * "what do I have" to "what happened when". This redirect keeps any old
 * link or bookmark to /timeline working, carrying its filters along.
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
  }
  query.set("view", "timeline");
  redirect(`/records?${query.toString()}`);
}
