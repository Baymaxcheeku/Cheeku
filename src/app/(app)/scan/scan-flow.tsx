"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Cpu,
  FileText,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { uploadDocument } from "@/lib/records/upload";
import { stripImageMetadata } from "@/lib/upload/strip-exif";

type Phase = "pick" | "working" | "error";

/*
 * The five steps the frame shows. They are labels over one real request, and
 * the code does not pretend otherwise: `settleStep` is where the upload
 * actually is, and the display never runs ahead of it.
 *
 * A progress bar that animates to 100% while the request is still in flight is
 * a lie that costs the user their trust exactly when the app is handling their
 * medical records.
 */
const STEPS = [
  { key: "upload", icon: FileText, title: "Document uploaded", body: "Sent over an encrypted connection" },
  { key: "read", icon: Search, title: "Reading document", body: "Scanning text and structure" },
  { key: "extract", icon: Cpu, title: "Extracting key information", body: "Identifying important data" },
  { key: "validate", icon: ShieldCheck, title: "Validating data", body: "Checking accuracy and consistency" },
  { key: "finalise", icon: Lock, title: "Finalising", body: "Preparing your record" },
] as const;

export function ScanFlow({ profiles }: { profiles: readonly { id: string; name: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  /*
   * The steps advance on a timer only up to the one the request has actually
   * reached. `settleStep` is raised when the upload resolves, so the display
   * can never claim more progress than has happened.
   */
  const [settleStep, setSettleStep] = useState(0);

  useEffect(() => {
    if (phase !== "working") return;
    const timer = setInterval(() => {
      setStepIndex((i) => (i < settleStep ? i + 1 : i));
    }, 420);
    return () => clearInterval(timer);
  }, [phase, settleStep]);

  async function onFile(file: File) {
    setFileName(file.name);
    setPhase("working");
    setStepIndex(0);
    setSettleStep(1);
    setMessage(null);

    // Strip metadata before anything leaves the device.
    const { file: clean } = await stripImageMetadata(file);
    setSettleStep(2);

    const formData = new FormData();
    formData.set("file", clean);
    formData.set("profileId", profileId);

    const result = await uploadDocument(formData);
    if (!result.ok) {
      setMessage(result.message);
      setPhase("error");
      return;
    }

    setSettleStep(STEPS.length);
    // Let the last steps land before the screen changes, so the transition does
    // not read as a flicker.
    setTimeout(() => router.push(`/scan/review?document=${result.documentId}`), 700);
  }

  if (phase === "pick" || phase === "error") {
    return (
      <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
        <header className="flex items-center gap-3">
          <Link
            href="/records"
            aria-label="Go back"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-surface text-brand-600 shadow-e1"
          >
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <h1 className="text-[20px] font-bold text-ink-900">Add a document</h1>
        </header>

        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Baymax will read it and pull out the key information. You review everything before it is
          saved.
        </p>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-700">Who is this for?</span>
          <select
            value={profileId}
            onChange={(e) => setProfileId(e.target.value)}
            className="h-12 w-full rounded-tile border border-line bg-surface px-3 text-[15px] text-ink-900 outline-none focus:border-brand-500"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 rounded-card border-2 border-dashed border-brand-200 bg-brand-50/50 px-5 py-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-pill bg-surface shadow-e1">
            <Upload size={20} className="text-brand-600" aria-hidden />
          </span>
          <h2 className="mt-3 text-[16px] font-semibold text-ink-900">Choose a document</h2>
          <p className="mx-auto mt-1 max-w-[280px] text-[12px] leading-snug text-ink-500">
            Lab reports, prescriptions, discharge summaries and more.
          </p>

          {/*
           * `capture` is deliberately absent. Leaving it off lets the OS offer
           * both the camera and the file picker, which is what people actually
           * want — half these documents are already photos in the gallery.
           */}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/heic,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <Button
            className="mt-4 w-full"
            size="md"
            onClick={() => inputRef.current?.click()}
            disabled={!profileId}
          >
            <Upload size={16} aria-hidden />
            Choose file or take a photo
          </Button>
          <p className="mt-1.5 text-[11px] text-ink-300">PDF, JPG, PNG or HEIC up to 10MB</p>
        </div>

        {message ? (
          <p role="alert" className="mt-3 text-[13px] font-medium text-danger-text">
            {message}
          </p>
        ) : null}

        <p className="mt-4 flex items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5 text-[11px] leading-snug text-ink-500">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
          Photos are stripped of location data on your device before they are uploaded. Files are
          stored privately and only you and your family can open them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
      <div className="relative pr-[38%]">
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink-900">
          Processing your{" "}
          <span className="block text-brand-600">document</span>
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Baymax is securely reading your document and extracting key information.
        </p>
        <Image
          src="/illustrations/upload-hero.png"
          alt=""
          width={321}
          height={259}
          priority
          className="pointer-events-none absolute -right-3 top-0 h-[96px] w-auto object-contain"
        />
      </div>

      <div className="mt-5 rounded-card bg-surface p-5 text-center shadow-e1">
        <ProgressRing done={stepIndex} total={STEPS.length} />
        <p className="mt-3 text-[15px] font-semibold text-ink-900">
          {STEPS[Math.min(stepIndex, STEPS.length - 1)]?.title}
        </p>
        <p className="mt-1 text-[12px] text-ink-500">
          Please keep the app open while we process your document.
        </p>
      </div>

      <ol className="mt-4 rounded-card bg-surface p-4 shadow-e1">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-center gap-3 py-2">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-pill",
                  done
                    ? "bg-safe-bg text-safe"
                    : active
                      ? "bg-brand-600 text-surface"
                      : "bg-canvas text-ink-300",
                )}
              >
                {done ? <Check size={16} aria-hidden /> : <Icon size={15} aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[13px] font-semibold",
                    active ? "text-brand-700" : done ? "text-ink-900" : "text-ink-300",
                  )}
                >
                  {step.title}
                </span>
                <span className="block truncate text-[11px] text-ink-500">
                  {i === 0 && fileName ? fileName : step.body}
                </span>
              </span>
              {active ? (
                <Loader2 size={16} className="shrink-0 animate-spin text-brand-500" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 flex items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-2.5 text-[11px] leading-snug text-ink-500">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
        Your data is encrypted and secure. Only you and your family can access it.
      </p>
    </div>
  );
}

/** The percentage ring from the frame, drawn from real step progress. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const pct = Math.round((done / total) * 100);
  const R = 42;
  const circumference = 2 * Math.PI * R;

  return (
    <div className="relative mx-auto h-[108px] w-[108px]">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={R} stroke="var(--brand-100)" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={R}
          stroke="var(--brand-600)"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Processing progress"
        className="absolute inset-0 grid place-items-center text-[24px] font-bold text-ink-900"
      >
        {pct}%
      </span>
    </div>
  );
}
