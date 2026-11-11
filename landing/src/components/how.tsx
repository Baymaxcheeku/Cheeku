import { Check, FileText, Pill } from "lucide-react";

import { Img } from "./img";
import { Heading, Reveal } from "./ui";
import { LocalFilm } from "./video";

/* A white card over the foot of each photograph, showing what Cheeku does at that step. */
function Rows({ rows }: { rows: { icon: typeof Pill; top: string; main: string }[] }) {
  return (
    <ul className="glass-white divide-y divide-hair rounded-[20px] px-4">
      {rows.map((r) => (
        <li key={r.main} className="flex items-center gap-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-700">
            <r.icon size={16} strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-[12px] leading-tight text-ink-3">{r.top}</span>
            <span className="block text-[15px] font-medium leading-tight text-ink">{r.main}</span>
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
    alt: "A grandmother smiling as she reads a sheet of paper by a sunny window",
    pos: "object-top",
    overlay: (
      <div className="glass-white rounded-[20px] p-4">
        <p className="text-[12px] text-ink-3">About Ma&apos;s report</p>
        <p className="mt-1 text-[15px] leading-snug text-ink">Her sugar is a little higher than last year. Not urgent. Worth asking her doctor at the next visit.</p>
      </div>
    ),
  },
  {
    title: "Get it done",
    body: "Need a test or a doctor? Book it in the app. The sample is collected from home and the result files itself.",
    photo: "/photos/act.webp",
    alt: "A lab technician with a sample kit greeting a woman at her front door",
    pos: "object-top",
    overlay: (
      <div className="glass-white flex items-center gap-3 rounded-[20px] p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-loud text-ink">
          <Check size={18} strokeWidth={2.5} />
        </span>
        <span>
          <span className="block text-[15px] font-medium leading-tight text-ink">Home test booked</span>
          <span className="block text-[13px] leading-tight text-ink-3">Saturday, 8 to 9 am</span>
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
              <div className="relative aspect-[4/5] overflow-hidden rounded-[28px]">
                <Img src={s.photo} alt={s.alt} position={s.pos} />
                <div className="absolute inset-x-3 bottom-3">{s.overlay}</div>
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
        <Heading sub="Everything Cheeku does for one family, start to finish.">
          See it in <em>two minutes</em>
        </Heading>
        <Reveal className="mx-auto mt-12 max-w-[1040px] rounded-[32px] bg-white p-2 shadow-[var(--shadow-lg)] sm:p-3">
          <LocalFilm src="/video/cheeku-film.mp4" poster="/video/cheeku-film-poster.webp" title="Cheeku, in two minutes" />
        </Reveal>
      </div>
    </section>
  );
}
