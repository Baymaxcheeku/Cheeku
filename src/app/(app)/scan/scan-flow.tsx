"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  Cpu,
  FileText,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { UploadScene } from "@/components/illustrations";
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
  {
    key: "upload",
    icon: FileText,
    title: "Document received",
    body: "Sent over an encrypted connection",
  },
  { key: "read", icon: Search, title: "Reading your document", body: "Scanning text and structure" },
  {
    key: "extract",
    icon: Cpu,
    title: "Pulling out the key details",
    body: "Identifying important data",
  },
  {
    key: "validate",
    icon: ShieldCheck,
    title: "Double-checking everything",
    body: "Checking accuracy and consistency",
  },
  { key: "finalise", icon: Lock, title: "Almost there", body: "Preparing your record" },
] as const;

/** One line of calm reassurance per step — never clinical, never rushed. */
const STEP_NARRATIVE = [
  "Nice and safe. Nothing leaves your device unprotected.",
  "Take a breath, Cheeku is doing the careful reading for you.",
  "This is the fiddly part. Cheeku has got it from here.",
  "A second look, just to be sure it's right.",
  "Almost time to see everything, laid out clearly.",
] as const;

export function ScanFlow({ profiles }: { profiles: readonly { id: string; name: string }[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);

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
    setDone(false);

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
    setDone(true);
    // Let the last steps land before the screen changes, so the transition does
    // not read as a flicker.
    setTimeout(() => router.push(`/scan/review?document=${result.documentId}`), 900);
  }

  if (phase === "pick" || phase === "error") {
    return (
      <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
        <header className="flex items-center gap-3">
          <Link
            href="/records"
            aria-label="Go back"
            className="tappable grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-surface text-brand-600 shadow-e1 active:scale-90"
          >
            <ChevronLeft size={20} aria-hidden />
          </Link>
          <h1 className="text-[20px] font-bold text-ink-900">Add a document</h1>
        </header>

        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Cheeku will read it and pull out the key information. You review everything before it is
          saved.
        </p>

        <div className="mt-5">
          <span className="mb-2 block text-[13px] font-medium text-ink-700">Who is this for?</span>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const active = p.id === profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  aria-pressed={active}
                  className={cn(
                    "tappable flex items-center gap-2 rounded-pill border py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold active:scale-95",
                    active
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-line bg-surface text-ink-700",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-pill text-[12px] font-bold text-white",
                      active ? "bg-brand-600" : "bg-ink-300",
                    )}
                    aria-hidden
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/*
         * The dropzone breathes with the same ambient glow as Ask Cheeku on
         * Home — the two places in the app that are "waiting for you to do
         * something" now feel like they belong to the same product, rather
         * than a functional form bolted onto a designed home screen.
         */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void onFile(file);
          }}
          className={cn(
            "relative mt-5 overflow-hidden rounded-card border-2 border-dashed px-5 py-8 text-center transition-colors",
            dragOver ? "border-brand-500 bg-brand-50" : "border-brand-200 bg-brand-50/50",
          )}
        >
          <div
            aria-hidden
            className="glow-pulse pointer-events-none absolute left-1/2 top-2 h-32 w-32 -translate-x-1/2 rounded-pill bg-brand-300/40 blur-2xl"
          />

          <motion.span
            className="relative mx-auto grid h-14 w-14 place-items-center rounded-pill bg-surface shadow-e2"
            animate={dragOver ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <Upload size={22} className="text-brand-600" aria-hidden />
          </motion.span>
          <h2 className="relative mt-3 text-[16px] font-semibold text-ink-900">
            Choose a document
          </h2>
          <p className="relative mx-auto mt-1 max-w-[280px] text-[12px] leading-snug text-ink-500">
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
            className="relative mt-4 w-full active:scale-[0.98]"
            size="md"
            onClick={() => inputRef.current?.click()}
            disabled={!profileId}
          >
            <Upload size={16} aria-hidden />
            Choose file or take a photo
          </Button>
          <p className="relative mt-1.5 text-[11px] text-ink-300">PDF, JPG, PNG or HEIC up to 10MB</p>
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

  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  return (
    <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
      <div className="relative pr-[42%]">
        <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink-900">
          Processing your{" "}
          <span className="block text-brand-600">document</span>
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Cheeku is securely reading your document and extracting key information.
        </p>
        <UploadScene className="pointer-events-none absolute -right-2 top-0 w-[132px]" />
      </div>

      <div className="relative mt-5 overflow-hidden rounded-card bg-surface p-5 text-center shadow-e1">
        <div
          aria-hidden
          className="glow-pulse pointer-events-none absolute left-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-pill bg-brand-200/50 blur-2xl"
        />
        <div className="relative">
          <ProgressRing done={stepIndex} total={STEPS.length} complete={done} />
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep?.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="relative mt-3 text-[15px] font-semibold text-ink-900"
          >
            {done ? "All done!" : currentStep?.title}
          </motion.p>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${currentStep?.key}-body`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="relative mt-1 text-[12px] text-ink-500"
          >
            {done
              ? "Your document is ready to review."
              : (STEP_NARRATIVE[stepIndex] ?? "Please keep the app open while we process your document.")}
          </motion.p>
        </AnimatePresence>
      </div>

      <ol className="mt-4 rounded-card bg-surface p-4 shadow-e1">
        {STEPS.map((step, i) => {
          const stepDone = i < stepIndex || done;
          const active = i === stepIndex && !done;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-center gap-3 py-2">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-pill transition-colors",
                  stepDone
                    ? "bg-safe-bg text-safe"
                    : active
                      ? "bg-brand-600 text-surface"
                      : "bg-canvas text-ink-300",
                )}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {stepDone ? (
                    <motion.span
                      key="check"
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    >
                      <Check size={16} aria-hidden />
                    </motion.span>
                  ) : (
                    <Icon key="icon" size={15} aria-hidden />
                  )}
                </AnimatePresence>
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[13px] font-semibold",
                    active ? "text-brand-700" : stepDone ? "text-ink-900" : "text-ink-300",
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
              ) : stepDone ? (
                <Sparkles size={13} className="shrink-0 text-safe" aria-hidden />
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
function ProgressRing({
  done,
  total,
  complete,
}: {
  done: number;
  total: number;
  complete: boolean;
}) {
  const pct = complete ? 100 : Math.round((done / total) * 100);
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
          stroke={complete ? "var(--safe)" : "var(--brand-600)"}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className="transition-[stroke-dashoffset,stroke] duration-500 ease-out"
        />
      </svg>
      <span
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Processing progress"
        className="absolute inset-0 grid place-items-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          {complete ? (
            <motion.span
              key="done"
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="grid h-11 w-11 place-items-center rounded-pill bg-safe text-white"
            >
              <Check size={22} strokeWidth={2.6} aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key={pct}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[24px] font-bold text-ink-900"
            >
              {pct}%
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </div>
  );
}
