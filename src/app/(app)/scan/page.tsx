import { selectableProfiles } from "@/lib/profiles/context";
import { ScanFlow } from "./scan-flow";

export const dynamic = "force-dynamic";

/**
 * C1 — pick a document, watch it being read, land on review.
 *
 * The "Who is this for?" picker offers only the profiles the plan can open.
 * Filing a report against a member the reader cannot then view would strand
 * the document somewhere they cannot reach it, and the upload action gates on
 * the same rule, so offering the choice at all would just be a dead end.
 */
export default async function ScanPage() {
  const profiles = await selectableProfiles();
  return <ScanFlow profiles={profiles} />;
}
