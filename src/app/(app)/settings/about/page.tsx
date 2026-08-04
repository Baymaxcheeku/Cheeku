import Link from "next/link";
import {
  Brain,
  Check,
  Heart,
  Info,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from "lucide-react";

import { PopIn, StaggerItem, StaggerList, TapToWiggle } from "@/components/ui/motion";
import { SettingsHeader } from "@/components/app/settings-header";
import { JourneyRow, MemoryScene, SpiralScene } from "@/components/illustrations/about-scenes";
import { MascotBust } from "@/components/illustrations";
import { APP_VERSION } from "@/lib/app-meta";
import { FREE_CHAT_LIMIT } from "@/lib/billing/plans";
import { JOURNEYS } from "@/lib/onboarding/journeys";
import { castFaces } from "@/lib/profiles/avatar";

export const dynamic = "force-static";

/**
 * About Baymax — the product's own case for itself.
 *
 * Modelled on the reference frame, which is a long editorial page rather than a
 * settings row: hero, four pillars, the anxiety-spiral problem statement, what
 * Baymax remembers, a generic-search-versus-Baymax comparison, the privacy
 * trio, and a chat CTA.
 *
 * Two departures from that frame, both for the same reason as everywhere else in
 * this app:
 *
 *   The frame's pillars claim "Insights and next steps you can trust" and
 *   "Guidance". Baymax does not give next steps on a health value — that is
 *   rule 1 — so the pillar is about *organising* and *finding*, which is what it
 *   genuinely does.
 *
 *   The frame ends with "Baymax is not a replacement for professional medical
 *   advice", which is kept verbatim, and a "what Baymax will never do" block is
 *   added. A page that only sells is a page that has overpromised by the end.
 */
export default function AboutPage() {
  /*
   * One face per journey plus one for the spiral scene. Generated here rather
   * than in the components because the renderer needs `Buffer`, and this page
   * is static — they are baked at build time, not fetched.
   */
  const faces = castFaces(JOURNEYS.length + 1);
  const spiralFace = faces[JOURNEYS.length] ?? faces[0] ?? "";

  return (
    <div className="stagger flex flex-1 flex-col pb-8">
      <SettingsHeader title="About Baymax" eyebrow="Your AI health companion" icon={Info} />

      {/* ---------------------------------------------------------- hero --- */}
      <section className="relative mx-5 mt-4 overflow-hidden rounded-card bg-gradient-to-br from-brand-50 via-surface to-brand-50 p-4 ring-1 ring-brand-100">
        <TapToWiggle className="absolute -right-4 -top-4 w-[124px]">
          <MascotBust className="w-full" />
        </TapToWiggle>
        <div className="relative pr-[34%]">
          <h2 className="text-[21px] font-bold leading-[1.15] tracking-tight text-ink-900">
            More than answers.
            <br />
            <span className="text-brand-600">A companion for life.</span>
          </h2>
          <p className="mt-2 text-[12.5px] leading-snug text-ink-600">
            Baymax keeps your family&apos;s health records in one place, remembers what matters, and
            answers questions grounded in what you&apos;ve actually uploaded.
          </p>
        </div>
      </section>

      {/*
       * Four traits as one strip, not four cards.
       *
       * As a 2x2 card grid this was the page's structure rather than its
       * content — four same-size boxes of icon-plus-heading-plus-text, which is
       * the lazy container. It also tinted "Personalised" green and "Grounded"
       * amber: those are the health-status colours everywhere else in this app,
       * spent here on words that carry no health meaning at all.
       */}
      <ul className="mx-5 mt-3 grid grid-cols-4 gap-1 rounded-card bg-surface px-2 py-3 shadow-e1">
        {[
          { icon: Lock, label: "Private" },
          { icon: Sliders, label: "Personal" },
          { icon: MessageCircle, label: "Grounded" },
          { icon: Sparkles, label: "Organised" },
        ].map(({ icon: Icon, label }, i) => (
          <PopIn key={label} index={i} className="flex flex-col items-center gap-1.5 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-pill bg-brand-50 text-brand-600">
              <Icon size={16} aria-hidden />
            </span>
            <span className="text-[10.5px] font-semibold leading-tight text-ink-700">{label}</span>
          </PopIn>
        ))}
      </ul>

      {/* ------------------------------------------------------ journeys --- */}
      {/*
       * Who it is for, said out loud and early.
       *
       * This page previously argued the product's merits without ever naming a
       * life it fits, so a reader deciding "is this for me" had to infer it. The
       * list is the same `JOURNEYS` the welcome carousel offers — one source, so
       * the promise made before signup and the promise repeated here cannot
       * drift apart. It ends on the open option because the product is a general
       * companion, not five niches.
       */}
      <section className="mt-6">
        <div className="px-5">
          <h2 className="text-[17px] font-bold leading-tight tracking-tight text-ink-900">
            Whatever you&apos;re carrying
            <br />
            <span className="text-brand-600">right now.</span>
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
            The same memory underneath, shaped around the season you&apos;re in.
          </p>
        </div>

        <StaggerList className="mx-5 mt-3 overflow-hidden rounded-card bg-surface shadow-e1 [&>*:last-child>div]:border-b-0">
          {JOURNEYS.map((journey, i) => (
            <StaggerItem key={journey.id}>
              <JourneyRow
                face={faces[i] ?? ""}
                label={journey.label}
                problem={journey.problem}
                tint={journey.tint}
                icon={journey.icon}
              />
            </StaggerItem>
          ))}
        </StaggerList>
      </section>

      {/* ------------------------------------------------ anxiety spiral --- */}
      <section className="mx-5 mt-6 overflow-hidden rounded-card bg-gradient-to-b from-brand-50 to-surface shadow-e1">
        <div className="p-4 pb-1">
          <h2 className="text-[17px] font-bold leading-tight tracking-tight text-ink-900">
            2am. Something feels off.
            <br />
            <span className="text-brand-600">You start searching.</span>
          </h2>
          <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">
            Ten tabs later you know less than when you started, and you are more frightened.
          </p>
        </div>

        <SpiralScene face={spiralFace} />

        <p className="mt-2 flex items-start gap-2.5 border-t border-line bg-surface px-4 py-3.5">
          <ShieldCheck size={16} className="mt-px shrink-0 text-brand-600" aria-hidden />
          <span className="text-[12.5px] leading-snug text-ink-700">
            <strong className="font-bold text-brand-700">Baymax breaks the loop.</strong> It reads
            what your own report says, names the document it came from, and leaves what it means to
            your doctor.
          </span>
        </p>
      </section>

      {/* -------------------------------------------------- remembers ------ */}
      <section className="mx-5 mt-4 overflow-hidden rounded-card bg-brand-50 ring-1 ring-brand-100">
        <MemoryScene className="w-full" />
        <div className="-mt-2 p-4">
          <h2 className="text-[16px] font-bold leading-tight text-ink-900">
            Baymax remembers everything about your family, so you don&apos;t have to.
          </h2>
          <ul className="mt-3 space-y-2">
            {[
              "Reports, scans, prescriptions and doctor visits",
              "Conditions, allergies and current medications",
              "Which family member each record belongs to",
              "What changed since the last reading",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-pill bg-brand-600 text-white">
                  <Check size={12} strokeWidth={3} aria-hidden />
                </span>
                <span className="text-[12.5px] leading-snug text-ink-700">{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2.5 rounded-tile bg-surface px-3.5 py-3">
            <Brain size={15} className="mt-px shrink-0 text-brand-500" aria-hidden />
            <span className="text-[12px] leading-snug text-ink-500">
              The more you add, the more it can answer, and every answer points back at the
              document it came from.
            </span>
          </p>
        </div>
      </section>

      {/* -------------------------------------------------- comparison ----- */}
      <section className="mx-5 mt-4">
        <h2 className="px-0.5 text-[16px] font-bold leading-tight text-ink-900">
          No more guessing.
          <br />
          <span className="text-safe-text">No more endless searching.</span>
        </h2>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="overflow-hidden rounded-card border border-line bg-surface">
            <p className="flex items-center gap-1.5 bg-canvas px-3 py-2 text-[11.5px] font-semibold text-ink-500">
              <X size={13} className="shrink-0" aria-hidden />
              Generic search
            </p>
            <ul className="space-y-1.5 p-3">
              {[
                "Overwhelming results",
                "Written for nobody",
                "No idea of your history",
                "More worry, less clarity",
              ].map((line) => (
                <li key={line} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-500">
                  <X size={11} className="mt-0.5 shrink-0 text-ink-300" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-card border-2 border-brand-500 bg-surface">
            <p className="flex items-center gap-1.5 bg-brand-600 px-3 py-2 text-[11.5px] font-semibold text-white">
              <Check size={13} strokeWidth={3} className="shrink-0" aria-hidden />
              Baymax
            </p>
            <ul className="space-y-1.5 p-3">
              {[
                "Reads your own reports",
                "Cites the exact document",
                "Knows what changed",
                "More clarity, less worry",
              ].map((line) => (
                <li key={line} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-ink-700">
                  <Check size={11} strokeWidth={3} className="mt-0.5 shrink-0 text-safe" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- privacy trio --- */}
      <section className="mx-5 mt-4 rounded-card bg-surface p-4 shadow-e1">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-tile bg-brand-50 text-brand-600">
            <ShieldCheck size={17} aria-hidden />
          </span>
          <h2 className="text-[15px] font-bold leading-tight text-ink-900">
            Your health. Your story. Our priority.
          </h2>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
          {[
            { icon: Lock, title: "Private by design", body: "Encrypted, never sold" },
            { icon: Sliders, title: "You're in control", body: "Export or delete anytime" },
            { icon: Heart, title: "Always by your side", body: "Judgement-free, 24/7" },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-center">
              <span className="mx-auto grid h-9 w-9 place-items-center rounded-pill bg-brand-50 text-brand-600">
                <Icon size={16} aria-hidden />
              </span>
              <p className="mt-1.5 text-[11px] font-semibold leading-tight text-ink-900">{title}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-ink-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------- what it never does ---- */}
      <section className="mx-5 mt-4 rounded-card border border-line bg-surface p-4">
        <h2 className="text-[14px] font-bold text-ink-900">What Baymax will never do</h2>
        <ul className="mt-2 space-y-1.5">
          {[
            "Diagnose a condition, or say what a value might mean",
            "Suggest a medication, a dose, or a treatment",
            "Show one family member's records under another's name",
            "Sell your data, or share it outside your family",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12px] leading-snug text-ink-500">
              <X size={12} className="mt-0.5 shrink-0 text-ink-300" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11.5px] leading-snug text-ink-500">
          Free includes {FREE_CHAT_LIMIT} chats a month. Anything a doctor should decide, Baymax
          hands to your doctor.
        </p>
      </section>

      {/* -------------------------------------------------------- CTA ------ */}
      <section className="mx-5 mt-5 overflow-hidden rounded-card bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-white/15">
            <MessageCircle size={19} aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-snug">
            I&apos;m here to listen and help you keep track, every step of the way. Let&apos;s take
            better care of you, together.
          </p>
        </div>
        <Link
          href="/ask"
          className="tappable mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-white text-[14px] font-semibold text-brand-700 active:scale-[0.98]"
        >
          <MessageCircle size={16} aria-hidden />
          Chat with Baymax
        </Link>
      </section>

      <ul className="mx-5 mt-4 overflow-hidden rounded-card bg-surface shadow-e1">
        <li className="flex items-center justify-between border-b border-line p-3.5">
          <span className="text-[13.5px] font-semibold text-ink-900">Version</span>
          <span className="text-[13px] text-ink-500">{APP_VERSION}</span>
        </li>
        <li>
          <Link
            href="/settings/security"
            className="tappable flex items-center justify-between p-3.5 text-left active:scale-[0.99]"
          >
            <span className="text-[13.5px] font-semibold text-ink-900">Security &amp; privacy</span>
            <span className="text-[12px] font-medium text-brand-600">View</span>
          </Link>
        </li>
      </ul>

      <p className="mx-5 mt-4 flex items-start gap-2 text-[11px] leading-snug text-ink-500">
        <ShieldCheck size={14} className="mt-px shrink-0 text-ink-300" aria-hidden />
        <span>
          Baymax is not a replacement for professional medical advice. For emergencies, contact your
          doctor or local emergency services.
        </span>
      </p>
    </div>
  );
}
