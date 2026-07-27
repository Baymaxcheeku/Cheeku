import { redirect } from "next/navigation";

import { activeProfile } from "@/lib/profiles/context";
import { AskChat } from "./ask-chat";

export const dynamic = "force-dynamic";

/** E1 — Ask Baymax. The `q` param carries a question typed on Home. */
export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const profile = await activeProfile();
  if (!profile) redirect("/profile");

  return <AskChat initialQuestion={q} profileName={profile.name} />;
}
