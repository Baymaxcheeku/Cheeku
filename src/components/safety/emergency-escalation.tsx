"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderClosed,
  HeartPulse,
  Info,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import { MascotAlert } from "@/components/illustrations";
import { cn } from "@/lib/cn";
import type { SafetyResult } from "@/lib/safety/detect";
import { contactsFor, copyFor, escalationKind, HOLD_MS } from "@/lib/safety/escalation";

/*
 * G1 — the safety escalation, as the frames' three steps.
 *
 * The shape is a ruling: a HARD gate first, then the design's support flow. The
 * frames open straight onto a scrollable page with a back arrow; the spec wants
 * a non-dismissible interrupt. Both are here, in that order — step 1 cannot be
 * left for HOLD_MS, and after that it is the frames' flow.
 *
 * One deliberate departure, on step 3. The frame reports three things as
 * "Completed": urgent care recommended, conversation summary prepared,
 * emergency contacts notified. Only the first two are true — there is no
 * contact list in V1 and nothing is sent to anyone. A safety screen that claims
 * to have alerted someone's family when it has not is the worst possible place
 * to put a reassuring lie, so this marks only what actually happened.
 *
 * Nothing here diagnoses. It says Cheeku cannot help, and hands over.
 */

type Props = {
  result: SafetyResult;
  onDismiss: () => void;
};

type Step = 1 | 2 | 3;
type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

export function EmergencyEscalation({ result, onDismiss }: Props) {
  const [held, setHeld] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const kind = escalationKind(result);
  const copy = copyFor(kind);
  const contacts = contactsFor(result);
  const primary = contacts.find((c) => c.primary) ?? contacts[0];

  useEffect(() => {
    const timer = setTimeout(() => setHeld(true), HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  /*
   * Focus the heading on mount and on each step change. Someone using a screen
   * reader has just typed a message and needs to be told the app interrupted
   * them; with focus left in the composer they would hear nothing at all.
   */
  useEffect(() => {
    headingRef.current?.focus();
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // A gate with a keyboard bypass is not a gate.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !held) event.preventDefault();
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [held]);

  function back() {
    if (step === 1) {
      if (held) onDismiss();
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  return (
    <div
      role="alertdialog"
      aria-modal
      aria-label="This may need urgent attention"
      className="scrim-in fixed inset-0 z-50 bg-canvas"
    >
      <div ref={scrollRef} className="h-full overflow-y-auto">
        <div className="flex min-h-full flex-col px-5 pb-[calc(var(--safe-bottom)+1rem)] pt-[calc(var(--safe-top)+0.75rem)]">
          <div className="flex items-start justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 1 && !held}
              aria-label={step === 1 ? "Back to Cheeku" : "Previous step"}
              className={cn(
                "tappable grid h-10 w-10 place-items-center rounded-tile bg-surface shadow-e1 active:scale-90",
                step === 1 && !held ? "text-ink-300" : "text-danger",
              )}
            >
              <ArrowLeft size={19} aria-hidden />
            </button>

            <div className="text-right">
              <span className="text-[13px] font-semibold text-ink-500">Step {step} of 3</span>
              <div className="mt-1.5 flex gap-1" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className={cn(
                      "h-1.5 w-11 rounded-pill transition-colors",
                      n <= step ? "bg-danger-strong" : "bg-danger-bg",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {step === 1 ? (
            <StepOne copy={copy} kind={kind} contacts={contacts} headingRef={headingRef} />
          ) : step === 2 ? (
            <StepTwo kind={kind} contacts={contacts} headingRef={headingRef} />
          ) : (
            <StepThree headingRef={headingRef} primaryLabel={primary?.label ?? "urgent care"} />
          )}

          <div className="mt-auto pt-5">
            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!held}
                className={cn(
                  "tappable flex h-14 w-full items-center justify-center gap-2 rounded-pill text-[15px] font-semibold text-white",
                  held ? "bg-danger-strong active:scale-[0.98]" : "bg-danger/45",
                )}
              >
                {held ? (
                  <>
                    I understand. Take me to support options
                    <ArrowRight size={17} aria-hidden />
                  </>
                ) : (
                  <HoldCountdown />
                )}
              </button>
            ) : step === 2 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={back}
                  className="tappable flex h-14 shrink-0 items-center justify-center gap-2 rounded-pill border border-danger/40 bg-surface px-6 text-[15px] font-semibold text-danger active:scale-[0.98]"
                >
                  <ArrowLeft size={17} aria-hidden />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="tappable flex h-14 flex-1 items-center justify-center gap-2 rounded-pill bg-danger-strong text-[16px] font-semibold text-white active:scale-[0.98]"
                >
                  Continue
                  <ArrowRight size={18} aria-hidden />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDismiss}
                className="tappable h-14 w-full rounded-pill bg-danger-strong text-[16px] font-semibold text-white active:scale-[0.98]"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- step 1 --- */

function StepOne({
  copy,
  kind,
  contacts,
  headingRef,
}: {
  copy: ReturnType<typeof copyFor>;
  kind: ReturnType<typeof escalationKind>;
  contacts: ReturnType<typeof contactsFor>;
  headingRef: HeadingRef;
}) {
  return (
    <>
      <div className="relative mt-3 pr-[40%]">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[28px] font-bold leading-[1.12] tracking-tight text-ink-900 outline-none focus-visible:outline-none"
        >
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[18px] font-bold leading-tight text-danger-strong">{copy.lead}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{copy.body}</p>
        <MascotAlert badge="alert" className="pointer-events-none absolute -right-5 -top-3 w-[156px]" />
      </div>

      <section className="mt-5 rounded-card bg-danger-bg p-3.5">
        <h2 className="px-1 text-[14px] font-bold text-danger-strong">
          {kind === "mental_health" ? "Talk to someone now" : "Immediate action recommended"}
        </h2>
        <ul className="mt-2.5 space-y-2">
          {contacts.map((contact) => (
            <CallRow key={contact.number} contact={contact} />
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 border-t border-danger/15 px-1 pt-3 text-[12px] leading-snug text-danger-strong">
          <ShieldCheck size={15} className="mt-px shrink-0" aria-hidden />
          If this is a medical emergency, call your local emergency number or visit the nearest
          emergency room.
        </p>
      </section>

      <section className="mt-3 rounded-card bg-surface p-4 shadow-e1">
        <h2 className="text-[15px] font-semibold text-ink-900">Why am I seeing this?</h2>
        <div className="mt-2 flex gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-danger-bg text-danger">
            <Info size={18} aria-hidden />
          </span>
          <p className="text-[13px] leading-relaxed text-ink-500">{copy.why}</p>
        </div>
      </section>

      <section className="mt-3">
        <h2 className="text-[15px] font-semibold text-ink-900">You can also do</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          <ActionTile
            icon={UserPlus}
            title="Add symptoms"
            body="Update your information"
            soon="Symptom tracking arrives in a later phase"
          />
          <ActionTile icon={FileText} title="Upload reports" body="Share lab reports" href="/scan" />
          <ActionTile
            icon={Bell}
            title="Set reminder"
            body="Get reminded to follow up"
            soon="Reminders arrive in a later phase"
          />
          <ActionTile
            icon={Users}
            title="Invite family"
            body="Let family help and support"
            soon="Family invitations arrive with the account phase"
          />
        </ul>
      </section>

      <p className="mt-3 flex items-start gap-2.5 rounded-card bg-danger-bg px-4 py-3.5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden />
        <span className="text-[12px] leading-snug text-ink-500">
          <strong className="block text-[13px] font-semibold text-danger-strong">
            Your safety comes first
          </strong>
          Cheeku is not a substitute for professional medical advice, diagnosis, or treatment.
        </span>
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- step 2 --- */

function StepTwo({
  kind,
  contacts,
  headingRef,
}: {
  kind: ReturnType<typeof escalationKind>;
  contacts: ReturnType<typeof contactsFor>;
  headingRef: HeadingRef;
}) {
  return (
    <>
      <div className="relative mt-3 pr-[40%]">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[28px] font-bold leading-[1.12] tracking-tight text-ink-900 outline-none focus-visible:outline-none"
        >
          {kind === "mental_health" ? "Support options" : "Emergency support options"}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          Choose the best way to get the care you need right now.
        </p>
        <MascotAlert badge="care" className="pointer-events-none absolute -right-5 -top-3 w-[156px]" />
      </div>

      <p className="mt-4 flex items-start gap-3 rounded-card bg-danger-bg px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-danger-strong text-white">
          <TriangleAlert size={19} aria-hidden />
        </span>
        <span>
          <strong className="block text-[15px] font-bold text-danger-strong">
            {kind === "mental_health"
              ? "You do not have to handle this alone."
              : "This may be a medical emergency."}
          </strong>
          <span className="mt-0.5 block text-[12px] leading-snug text-ink-500">
            Please don&apos;t wait. Getting help early can make a big difference.
          </span>
        </span>
      </p>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">
          {kind === "mental_health" ? "Talk to someone now" : "Talk to a doctor now"}
        </h2>
        <ul className="mt-2 space-y-2">
          {contacts.map((contact) => (
            <CallRow key={contact.number} contact={contact} />
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">Get care nearby</h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <SupportRow
            icon={MapPin}
            title="Find nearest emergency care"
            body="Hospitals and clinics near you"
            soon="Finding nearby care needs location access, which arrives in a later phase"
          />
          <SupportRow
            icon={Stethoscope}
            title="Talk to a doctor online"
            body="Connect with a professional"
            soon="Teleconsultation is not part of V1"
          />
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">Share &amp; get help</h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <SupportRow
            icon={Users}
            title="Notify family members"
            body="Let your loved ones know"
            soon="Family notifications arrive with the account phase"
          />
          <SupportRow
            icon={FileText}
            title="Share conversation summary"
            body="Send this conversation to your doctor"
            soon="Sharing arrives with the account phase"
          />
        </ul>
      </section>

      <p className="mt-4 flex items-start gap-2.5 rounded-card bg-safe-bg px-4 py-3.5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-safe" aria-hidden />
        <span className="text-[12px] leading-snug text-ink-500">
          <strong className="block text-[13px] font-semibold text-safe-text">
            You&apos;re not alone.
          </strong>
          Cheeku is here to support you and your family. Please reach out for help.
        </span>
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- step 3 --- */

function StepThree({
  headingRef,
  primaryLabel,
}: {
  headingRef: HeadingRef;
  primaryLabel: string;
}) {
  return (
    <>
      <div className="relative mt-3 pr-[40%]">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[28px] font-bold leading-[1.12] tracking-tight text-ink-900 outline-none focus-visible:outline-none"
        >
          You&apos;re all set.
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">
          We&apos;ve shown you the right support options.{" "}
          <span className="font-semibold text-danger-strong">Take care.</span>
        </p>
        <MascotAlert badge="done" className="pointer-events-none absolute -right-5 -top-3 w-[156px]" />
      </div>

      <p className="mt-4 flex items-start gap-2.5 rounded-card bg-safe-bg px-4 py-3.5">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-safe" aria-hidden />
        <span className="text-[12px] leading-snug text-ink-500">
          <strong className="block text-[13px] font-semibold text-safe-text">
            This conversation is saved
          </strong>
          Cheeku kept a record of what you asked, so you can show it to a doctor.
        </span>
      </p>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">What we did</h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <DidRow
            icon={Phone}
            title="Showed urgent care options"
            body={`Including ${primaryLabel}`}
            done
          />
          <DidRow
            icon={FileText}
            title="Saved this conversation"
            body="Kept in your records, flagged for safety"
            done
          />
          {/*
           * The frame marks this "Completed" too. Nothing was sent — there is no
           * contact list in V1 — and telling someone their family has been
           * alerted when it has not could stop them calling anyone themselves.
           */}
          <DidRow
            icon={Bell}
            title="Notify emergency contacts"
            body="Not available yet. Please call someone directly"
          />
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">Important next steps</h2>
        <ul className="mt-2 overflow-hidden rounded-card bg-surface shadow-e1">
          <SupportRow
            icon={Stethoscope}
            title="Speak with a medical professional"
            body="Follow the guidance you received"
            plain
          />
          <SupportRow
            icon={HeartPulse}
            title="Monitor your symptoms"
            body="If symptoms worsen, seek help immediately"
            plain
          />
          <SupportRow
            icon={FolderClosed}
            title="Keep your records updated"
            body="Add new reports and follow-ups"
            href="/scan"
          />
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-[15px] font-semibold text-ink-900">Your resources</h2>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          <ActionTile
            icon={FolderClosed}
            title="Go to Documents"
            body="Access your reports"
            href="/records"
          />
          <ActionTile
            icon={Users}
            title="Invite family"
            body="Add people to support you"
            soon="Family invitations arrive with the account phase"
          />
        </ul>
      </section>
    </>
  );
}

/* ------------------------------------------------------------- fragments --- */

function CallRow({ contact }: { contact: ReturnType<typeof contactsFor>[number] }) {
  return (
    <li>
      {/*
       * A real `tel:` link, not a button that opens a dialog. One tap to a
       * dialler with the number already in it, and it works with no JavaScript
       * at all — the state this screen most needs to survive.
       */}
      <a
        href={`tel:${contact.number}`}
        className={cn(
          "tappable flex items-center gap-3 rounded-card p-3 active:scale-[0.98]",
          contact.primary ? "bg-danger-strong text-white" : "bg-surface text-ink-900 shadow-e1",
        )}
      >
        <span
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-pill",
            contact.primary ? "bg-white/20 text-white" : "bg-danger-bg text-danger",
          )}
        >
          <Phone size={19} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{contact.label}</span>
          <span
            className={cn(
              "block truncate text-[12px]",
              contact.primary ? "text-white/80" : "text-ink-500",
            )}
          >
            {contact.detail}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-pill px-3 py-1.5 text-[15px] font-bold",
            contact.primary ? "bg-white text-danger-strong" : "bg-danger-bg text-danger-strong",
          )}
        >
          {contact.number}
        </span>
      </a>
    </li>
  );
}

function SupportRow({
  icon: Icon,
  title,
  body,
  href,
  soon,
  plain = false,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
  href?: string;
  soon?: string;
  /** Advice with nowhere to navigate — not disabled, just not a link. */
  plain?: boolean;
}) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-tile bg-danger-bg text-danger">
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-ink-900">{title}</span>
        <span className="block truncate text-[12px] text-ink-500">{body}</span>
      </span>
      {!plain ? <ChevronRight size={18} className="shrink-0 text-ink-300" aria-hidden /> : null}
    </>
  );

  return (
    <li className="border-b border-line last:border-b-0">
      {href ? (
        <a href={href} className="tappable flex items-center gap-3 p-3 active:scale-[0.99]">
          {inner}
        </a>
      ) : (
        <div className={cn("flex items-center gap-3 p-3", !plain && "opacity-55")} title={soon}>
          {inner}
        </div>
      )}
    </li>
  );
}

function DidRow({
  icon: Icon,
  title,
  body,
  done = false,
}: {
  icon: typeof Phone;
  title: string;
  body: string;
  done?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line p-3 last:border-b-0">
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-tile",
          done ? "bg-danger-bg text-danger" : "bg-canvas text-ink-300",
        )}
      >
        <Icon size={18} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn("block text-[14px] font-semibold", done ? "text-ink-900" : "text-ink-500")}
        >
          {title}
        </span>
        <span className="block truncate text-[12px] text-ink-500">{body}</span>
      </span>
      {done ? (
        <span className="flex shrink-0 items-center gap-1 rounded-pill bg-safe-bg px-2.5 py-1 text-[11px] font-semibold text-safe-text">
          <CheckCircle2 size={12} aria-hidden />
          Done
        </span>
      ) : (
        <span className="shrink-0 rounded-pill bg-canvas px-2.5 py-1 text-[11px] font-medium text-ink-300">
          Not yet
        </span>
      )}
    </li>
  );
}

function ActionTile({
  icon: Icon,
  title,
  body,
  href,
  soon,
}: {
  icon: typeof Users;
  title: string;
  body: string;
  href?: string;
  soon?: string;
}) {
  const inner = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-tile bg-danger-bg text-danger">
        <Icon size={18} aria-hidden />
      </span>
      <span className="mt-2 block text-[13px] font-semibold text-ink-900">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-snug text-ink-500">{body}</span>
    </>
  );

  return (
    <li>
      {href ? (
        <a
          href={href}
          className="tappable block h-full rounded-card bg-surface p-3 shadow-e1 active:scale-[0.98]"
        >
          {inner}
        </a>
      ) : (
        <div title={soon} className="h-full rounded-card bg-surface p-3 opacity-55 shadow-e1">
          {inner}
        </div>
      )}
    </li>
  );
}

/** Counts the hold down so the disabled button explains itself. */
function HoldCountdown() {
  const [left, setLeft] = useState(Math.ceil(HOLD_MS / 1000));

  useEffect(() => {
    const timer = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  return <span aria-live="polite">Please read the above… {left}</span>;
}
