"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, FolderUp, Mail, ShieldCheck, Sparkles, Upload } from "lucide-react";

import { Headline, OnboardingHeader } from "@/components/onboarding/chrome";
import { Button } from "@/components/ui/button";

const ALTERNATES = [
  { icon: Camera, title: "Take a photo", body: "Snap a clear picture" },
  { icon: Mail, title: "Email to Baymax", body: "Send from your inbox" },
  { icon: FolderUp, title: "Import from device", body: "Choose from your library" },
];

/**
 * A6 — the first-upload hook. Skipping is a first-class outcome, not a
 * consolation: a nag screen at the end of onboarding costs more accounts than
 * one extra document is worth.
 */
export default function FirstUploadPage() {
  return (
    <div className="flex flex-1 flex-col">
      <OnboardingHeader step={6} back="/profile" action={{ label: "Skip", href: "/home" }} />

      <div className="flex flex-1 flex-col px-5 pb-6">
        {/* The art is absolutely positioned, so the text needs its own gutter or
            the second headline line runs underneath it. */}
        <div className="relative pr-[38%]">
          <Headline lead="Let's add your" accent="first health record" />
          <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
            Upload a document and Baymax will organize it and extract key information for you.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-700">
            <ShieldCheck size={12} aria-hidden />
            Secure · Private · Encrypted
          </p>
          <Image
            src="/illustrations/upload-hero.png"
            alt=""
            width={321}
            height={259}
            priority
            className="pointer-events-none absolute -right-2 top-0 h-[108px] w-auto object-contain"
          />
        </div>

        <div className="mt-5 rounded-card border-2 border-dashed border-brand-200 bg-brand-50/50 px-5 py-6 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-pill bg-surface shadow-e1">
            <Upload size={19} className="text-brand-600" aria-hidden />
          </span>
          <h2 className="mt-3 text-[15px] font-semibold text-ink-900">Upload your first document</h2>
          <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-snug text-ink-500">
            Lab reports, prescriptions, discharge summaries, immunization records and more.
          </p>
          {/*
           * The frame shows a live upload here. The pipeline lands in Phase 4,
           * and a button that opens a file picker leading nowhere would be a
           * worse first impression than one that says it is not ready.
           */}
          <Button className="mt-4 w-full" size="md" disabled title="Uploads arrive in the next build phase">
            <Upload size={16} aria-hidden />
            Upload document
          </Button>
          <p className="mt-2 text-[11px] text-ink-300">PDF, JPG, PNG up to 10MB</p>
        </div>

        <h3 className="mt-5 text-[13px] font-semibold text-ink-700">Or try these</h3>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {ALTERNATES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="flex flex-col items-center gap-1.5 rounded-tile border border-line bg-surface px-2 py-3 text-center opacity-60"
            >
              <Icon size={17} className="text-brand-500" aria-hidden />
              <span className="text-[11px] font-semibold leading-tight text-ink-900">{title}</span>
              <span className="text-[10px] leading-tight text-ink-500">{body}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-start gap-2 rounded-tile bg-brand-50 px-3.5 py-3 text-[11px] leading-snug text-ink-500">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-brand-400" aria-hidden />
          Baymax reads and organizes your documents to answer your questions. It never diagnoses,
          prescribes, or shares anything outside your family.
        </p>

        <div className="mt-auto pt-5">
          <Button asChild className="w-full">
            <Link href="/home">I&apos;ll upload later</Link>
          </Button>
          <p className="mt-2 text-center text-[12px] text-ink-300">
            You can add documents anytime from the app.
          </p>
        </div>
      </div>
    </div>
  );
}
