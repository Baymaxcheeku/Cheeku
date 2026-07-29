"use client";

import { useEffect } from "react";

import { ScreenError } from "@/components/app/screen-states";

export default function OnboardingError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[onboarding]", error.message);
  }, [error]);

  return (
    <ScreenError
      reset={reset}
      title="Setup hit a snag"
      body="That step didn't complete. Nothing has been saved incorrectly — try again."
    />
  );
}
