"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";

import { cn } from "@/lib/cn";
import { deleteAccountData, exportAccount } from "@/lib/account/actions";

/**
 * Export and delete, on the Profile screen.
 *
 * These two are the reason this component exists separately from the rest of
 * the settings list: they are the only rows that actually do something
 * irreversible or produce a file, and neither is a placeholder.
 *
 * The delete asks for a typed confirmation. A destructive action guarded only
 * by a second tap is one mis-tap from gone, and this one removes someone's
 * medical history.
 */
export function AccountData() {
  const [busy, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  function download() {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await exportAccount();
      if (!result.ok) {
        setError(result.message);
        return;
      }

      /*
       * Built and revoked in the browser. The export is the account's entire
       * medical history, so it must never touch a URL, a query string or a
       * server-side temp file that could outlive the click.
       */
      const blob = new Blob([JSON.stringify(result.bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cheeku-ai-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);

      const counts = [
        `${result.bundle.profiles.length} profiles`,
        `${result.bundle.documents.length} documents`,
        `${result.bundle.messages.length} messages`,
      ].join(", ");
      setMessage(`Downloaded: ${counts}.`);
    });
  }

  function destroy() {
    setError(null);
    setMessage(null);
    start(async () => {
      const result = await deleteAccountData(typed);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setConfirmOpen(false);
      setTyped("");
      setMessage(
        `Deleted ${result.removedDocuments} document${result.removedDocuments === 1 ? "" : "s"} and every record. Your files are gone from storage.`,
      );
    });
  }

  return (
    <section className="mt-6">
      {/* Same label treatment as the settings groups above — this is one more
          group in that list, not a differently-shaped section. */}
      <h2 className="px-5 text-[12px] font-bold uppercase tracking-wide text-ink-300">Your data</h2>

      <ul className="mx-5 mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
        <li className="border-b border-line">
          <button
            type="button"
            onClick={download}
            disabled={busy}
            className="tappable flex w-full items-center gap-3.5 px-3.5 py-3 text-left active:bg-brand-50 disabled:opacity-60"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
              <Download size={17} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-tight text-ink-900">
                Export my data
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-500">
                Download everything as a JSON file
              </span>
            </span>
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => setConfirmOpen((v) => !v)}
            className="tappable flex w-full items-center gap-3.5 px-3.5 py-3 text-left active:bg-danger-bg/60"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-danger-bg text-danger">
              <Trash2 size={17} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-tight text-danger-text">
                Delete all my data
              </span>
              <span className="mt-0.5 block text-[11.5px] text-ink-500">
                Removes every record and file. Cannot be undone.
              </span>
            </span>
          </button>
        </li>
      </ul>

      {confirmOpen ? (
        <div className="mx-5 mt-2 rounded-card border border-danger/30 bg-danger-bg p-4">
          <p className="flex items-start gap-2 text-[13px] leading-snug text-ink-700">
            <AlertTriangle size={16} className="mt-px shrink-0 text-danger" aria-hidden />
            <span>
              This deletes every profile, document, extracted value, conversation and uploaded file.
              It cannot be undone, and Cheeku keeps no backup.
            </span>
          </p>

          <label className="mt-3 block">
            <span className="mb-1.5 block text-[12px] font-medium text-ink-700">
              Type <strong className="font-bold">DELETE</strong> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="h-11 w-full rounded-tile border border-danger/30 bg-surface px-3 text-[15px] text-ink-900 outline-none focus:border-danger"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setTyped("");
              }}
              className="tappable h-11 flex-1 rounded-pill border border-line bg-surface text-[14px] font-semibold text-ink-700 active:scale-[0.98]"
            >
              Keep my data
            </button>
            <button
              type="button"
              onClick={destroy}
              disabled={busy || typed.trim().toUpperCase() !== "DELETE"}
              className={cn(
                "tappable h-11 flex-1 rounded-pill text-[14px] font-semibold text-white active:scale-[0.98]",
                typed.trim().toUpperCase() === "DELETE" ? "bg-danger-strong" : "bg-danger/40",
              )}
            >
              {busy ? "Deleting…" : "Delete everything"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p role="status" className="mx-5 mt-2 text-[12px] font-medium text-safe-text">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mx-5 mt-2 text-[12px] font-medium text-danger-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}
