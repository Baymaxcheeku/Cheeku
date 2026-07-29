"use client";

import { useEffect } from "react";

import { ScreenError } from "@/components/app/screen-states";

/**
 * The boundary for every signed-in screen.
 *
 * The error object is logged for a developer and never rendered: a database
 * error can carry column names, ids and occasionally a fragment of a row, and
 * this app's rows are medical records.
 */
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[app]", error.message);
  }, [error]);

  return <ScreenError reset={reset} />;
}
