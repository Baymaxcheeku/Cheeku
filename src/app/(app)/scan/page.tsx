import { listProfiles } from "@/lib/records/queries";
import { ScanFlow } from "./scan-flow";

export const dynamic = "force-dynamic";

/** C1 — pick a document, watch it being read, land on review. */
export default async function ScanPage() {
  const profiles = await listProfiles();
  return <ScanFlow profiles={profiles} />;
}
