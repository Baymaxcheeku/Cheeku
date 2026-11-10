import { Check, FileText, Pill } from "lucide-react";

import { Img } from "./img";
import { Heading, Reveal } from "./ui";
import { Film } from "./video";

/* Small panes of glass over each photograph, showing what Cheeku does at that step. */
function Rows({ rows }: { rows: { icon: typeof Pill; top: string; main: string }[] }) {
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.main} className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-white">
          <r.icon size={16} strokeWidth={1.5} className="shrink-0 opacity-90" />
          <span>
            <span className="block text-[11px] leading-tight text-white/70">{r.top}</span>
            <span className="block text-[14px] font-medium leading-tight">{r.main}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const STEPS = [
  {
    title: "Send it",
    body: "A photo, a PDF, or share it straight from WhatsApp. Reports, prescriptions, scans and bills.",
    photo: "/photos/send.webp",
    alt: "Hands photographing a printed lab report on a dining table",
    pos: "object-center",
    overlay: (
      <Rows
        rows={[
          { icon: FileText, top: "Just now", main: "Blood report, filed under Papa" },
          { icon: Pill, top: "Yesterday", main: "Prescription, filed under Ma" },
        ]}
      />
    ),
  },
  {
    title: "Understand it",
    body: "Cheeku tells you what it means for that person, in plain words, and what changed since last time.",
    photo: "/photos/understand.webp",
    alt: "A grandmother reading at home by a window",
    pos: "object-top",
    overlay: (
      <div className="glass rounded-2xl p-4 text-white">
        <p className="text-[12px] text-white/70">About Ma&apos;s report</p>
        <p className="mt-1 text-[15px] leading-snug">Her sugar is a little higher than last year. Not urgent. Worth asking her doctor at the next visit.</p>
      </div>
    ),
  },
  {
    title: "Get it done",
    body: "Need a test or a doctor? Book it in the app. The sample is collected from home and the result files itself.",
    photo: "/photos/act.webp",
    alt: "A lab technician with a sample kit greeting a man at his front door",
    pos: "object-top",
    overlay: (
      <div className="glass flex items-center gap-3 rounded-2xl p-4 text-white">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-loud text-ink">
          <Check size={18} strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-[15px] font-medium leading-tight">Home test booked</span>
          <span className="block text-[13px] leading-tight text-white/75">Saturday, 8 to 9 am</span>
        </span>
      </div>
    ),
  },
];

export function How() {
  return (
    <section id="how" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="No learning curve. If you can forward a WhatsApp message, you can use Cheeku.">
        How it <em>works</em>
      </Heading>
      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-5">
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.08}>
            <li className="list-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-purple-950">
                <Img src={s.photo} alt={s.alt} position={s.pos} />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-purple-950/85 to-transparent" />
                <div className="absolute inset-x-4 bottom-4">{s.overlay}</div>
              </div>
              <h3 className="display mt-6 text-center text-[30px]">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-[320px] text-center text-[16px] leading-relaxed text-ink-2">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/** The product film, where the hero's second button lands. */
export function FilmSection() {
  return (
    <section id="film" className="bg-soft">
      <div className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
        <Heading sub="One family, one evening, and everything Cheeku does for them.">
          See it in <em>two minutes</em>
        </Heading>
        <Reveal className="mx-auto mt-12 max-w-[980px] rounded-[32px] bg-white p-2 shadow-[var(--shadow-lg)] sm:p-3">
          <Film id="mI4FmQt_8Qk" title="Cheeku in two minutes" caption="Cheeku, in two minutes" />
        </Reveal>
      </div>
    </section>
  );
}
