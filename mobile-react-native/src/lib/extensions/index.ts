import type { ComponentType } from "react";

/*
 * EXTENSIONS: how an optional layer plugs into the app without the app
 * knowing what it is.
 *
 * The main app offers four slots and nothing else: a card on Home, a row on
 * Profile, extra lines for Cheeku to read before answering, and a clean-up
 * call on sign-out. A layer (the
 * first is wearables, `src/modules/wearables`) registers itself once, from
 * one import line in `app/_layout.tsx`. Remove that line and the layer's
 * folder and every slot is simply empty: no screen, query or rule in the main
 * app refers to a layer by name.
 *
 * Rules for a layer:
 *   - it may import from the main app (`@/lib`, `@/components`, `@/theme`);
 *   - the main app never imports from it, except the one register line;
 *   - a slot that throws or stalls is skipped, never surfaced to the person.
 */

export type HomeCardProps = { profileId: string; isPrimary: boolean; firstName: string };

export type ProfileRow = {
  title: string;
  body: string;
  href: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

export type Extension = {
  id: string;
  /** A card on Home, under today's step. Return null to show nothing. */
  homeCard?: ComponentType<HomeCardProps>;
  /** A row under Account on Profile. */
  profileRow?: ProfileRow;
  /** Plain sentences about this person for Cheeku to read. Short, factual, dated. */
  chatNotes?: (profileId: string) => Promise<string[]>;
  /** Erase whatever the layer kept on the phone. Runs on sign-out and account deletion. */
  onSignOut?: () => Promise<void>;
};

const registered: Extension[] = [];

export function registerExtension(extension: Extension): void {
  if (!registered.some((e) => e.id === extension.id)) registered.push(extension);
}

export function extensions(): readonly Extension[] {
  return registered;
}

/** Every layer's clean-up. Best effort: a layer that fails must not stop a sign-out. */
export async function extensionsSignOut(): Promise<void> {
  await Promise.all(registered.map((e) => e.onSignOut?.().catch(() => undefined)));
}

const NOTES_TIMEOUT_MS = 1200;
const MAX_NOTES = 8;

/**
 * Every layer's notes for one person. Never throws and never waits long: a
 * question must not be held up, or fail, because an optional layer did.
 */
export async function extensionChatNotes(profileId: string): Promise<string[]> {
  const jobs = registered
    .filter((e) => e.chatNotes)
    .map((e) =>
      Promise.race([
        (e.chatNotes as (id: string) => Promise<string[]>)(profileId).catch(() => [] as string[]),
        new Promise<string[]>((resolve) => setTimeout(() => resolve([]), NOTES_TIMEOUT_MS)),
      ]),
    );
  const all = (await Promise.all(jobs)).flat();
  return all.filter((n) => typeof n === "string" && n.trim().length > 0).map((n) => n.trim().slice(0, 240)).slice(0, MAX_NOTES);
}
