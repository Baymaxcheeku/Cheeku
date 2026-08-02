import { redirect } from "next/navigation";

import { activeProfile } from "@/lib/profiles/context";
import { AskChat } from "./ask-chat";

export const dynamic = "force-dynamic";

/**
 * E1 — Ask Baymax. `q` carries a question typed on Home; `upload=1` carries
 * the Home Ask box's camera button, so a photo question opens straight into
 * the picker instead of landing on an empty chat first.
 */
export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; upload?: string }>;
}) {
  const { q, upload } = await searchParams;
  const profile = await activeProfile();
  if (!profile) redirect("/profile");

  return <AskChat initialQuestion={q} autoOpenPicker={upload === "1"} profileName={profile.name} />;
}
