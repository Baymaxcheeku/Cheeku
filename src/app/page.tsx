"use client";

import { HeroScene } from "@/components/illustrations";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * A1 — splash. No frame was supplied for this screen, so it is built from the
 * carousel's own vocabulary rather than invented.
 *
 * It hands off automatically, but the link is real and focusable: a splash that
 * only advances on a timer strands anyone whose timer never fires.
 */
export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/welcome");
    const timer = setTimeout(() => router.replace("/welcome"), 1400);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    // The artwork is cut from the frames and carries their pale lavender wash,
    // so the splash is light too — on a deep violet field it reads as a pasted
    // rectangle rather than a character.
    <main className="grid min-h-app place-items-center bg-canvas px-8 text-center">
      <div>
        <HeroScene className="mx-auto w-[250px]" />
        <h1 className="mt-4 text-[30px] font-bold tracking-[-0.02em] text-ink-900">Cheeku AI</h1>
        <p className="mt-1.5 text-[14px] text-ink-500">Your family&apos;s health companion</p>
        <Link
          href="/welcome"
          className="mt-6 inline-block text-[13px] font-medium text-brand-600 underline underline-offset-4"
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
