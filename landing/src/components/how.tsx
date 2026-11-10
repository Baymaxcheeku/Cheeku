import { Check } from "lucide-react";

import { Phone } from "./phone";
import { Kicker, Reveal, Wrap } from "./ui";

const STEPS = [
  { n: "1", title: "Send it", body: "A photo, a PDF, or share it straight from WhatsApp. Reports, prescriptions, scans, bills.", screen: "/screens/home.webp", alt: "Cheeku's home screen with today's one step and the family's plan" },
  { n: "2", title: "Understand it", body: "Cheeku reads it and tells you what it means for that person, in plain words. No medical language.", screen: "/screens/track.webp", alt: "A lab report explained, with the values that need a doctor marked" },
  { n: "3", title: "Get it done", body: "Need a test or a doctor? Book it in the app. Sample collected from home. The result files itself.", screen: "/screens/lab.webp", alt: "A home sample collection booked, with the slot and address confirmed" },
];

export function How() {
  return (
    <Wrap id="how" className="py-20 sm:py-28">
      <Reveal className="max-w-[720px]">
        <Kicker>How it works</Kicker>
        <h2 className="h-section mt-3 text-[32px] sm:text-[48px]">Three steps. No learning curve</h2>
      </Reveal>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.06}>
            <li className="list-none">
              <div className="relative flex h-[380px] items-start justify-center overflow-hidden rounded-[24px] bg-purple-50 pt-8">
                <Phone src={s.screen} alt={s.alt} width={230} />
              </div>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-purple-600 text-[14px] font-semibold text-white">{s.n}</span>
                <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{s.title}</h3>
              </div>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Wrap>
  );
}

const CHECKS = [
  { title: "Checked against each other", body: "Every tablet, from every doctor, looked at together." },
  { title: "Checked for this person", body: "Their age, their other illnesses, pregnancy, allergies." },
  { title: "Same medicine, lower price", body: "See options with the same salt that cost less. You and your doctor decide." },
];

/** The one feature families ask about most, on the purple stage. */
export function Medicines() {
  return (
    <section id="medicines" className="mx-auto max-w-[1280px] px-3 sm:px-6">
      <div className="stage relative overflow-hidden rounded-[28px] sm:rounded-[40px]">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pt-14 sm:px-10 sm:pt-20 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="pb-4 lg:pb-20">
            <Reveal>
              <Kicker onPurple>Medicine check</Kicker>
              <h2 className="h-section mt-3 max-w-[560px] text-[32px] text-white sm:text-[48px]">Six tablets from three doctors. Has anyone checked them together?</h2>
              <p className="mt-5 max-w-[520px] text-[18px] leading-relaxed text-purple-100">
                Each doctor sees only their own prescription. Cheeku sees all of them, and tells you what to ask before the next dose.
              </p>
            </Reveal>
            <ul className="mt-8 grid max-w-[560px] gap-3">
              {CHECKS.map((c, i) => (
                <Reveal key={c.title} delay={i * 0.06}>
                  <li className="glass-dark flex list-none items-start gap-4 rounded-[18px] p-4 sm:p-5">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-purple-700">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <div>
                      <p className="text-[17px] font-medium text-white">{c.title}</p>
                      <p className="mt-0.5 text-[15px] leading-relaxed text-purple-100">{c.body}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 max-w-[520px] text-[14px] leading-relaxed text-purple-200">Cheeku never tells you to stop a medicine and never rates your doctor. If something looks dangerous, it sends you to a doctor the same day.</p>
          </div>
          <div className="flex justify-center self-end">
            <Phone src="/screens/meds-a.webp" alt="A medicine checked for one person: it fits her, with two things to get right and cheaper options with the same salt" width={300} className="-mb-28" />
          </div>
        </div>
      </div>
    </section>
  );
}
