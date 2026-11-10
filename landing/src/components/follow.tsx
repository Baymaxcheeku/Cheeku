import { Phone } from "./phone";
import { Heading, Soon } from "./ui";

const CARDS = [
  {
    title: "Reports, explained for that person",
    body: "What it means, what changed since last time, and what needs a doctor. In simple words, not lab language.",
    screen: "/screens/track.webp",
    alt: "A lab report read by Cheeku, showing which values need a doctor",
  },
  {
    title: "Six tablets from three doctors, checked together",
    body: "Each doctor sees only their own prescription. Cheeku sees all of them, tells you what to ask, and shows the same medicine at a lower price.",
    screen: "/screens/meds-a.webp",
    alt: "A medicine checked for one person, with cheaper options that have the same salt",
  },
  {
    title: "The next test or doctor, booked",
    body: "Lab tests collected from home, doctors on video or at the clinic. The result comes back and files itself under the right person.",
    screen: "/screens/lab.webp",
    alt: "A home sample collection booked, with the slot and address confirmed",
  },
  {
    title: "One small step, every day",
    body: "A plan built from that person’s own numbers. Today’s tablets, one change to a meal, a walk. Nothing you can’t do.",
    screen: "/screens/fit.webp",
    alt: "Today's plan in Cheeku",
  },
];

const SOON = [
  ["Your watch and Strava", "Sleep, steps and activity, read alongside your reports"],
  ["Scan a meal or a label", "A plate of food or an ingredient list, explained for you"],
  ["Compare health cover", "Family insurance plans, side by side, in plain words"],
  ["Talk, don’t type", "Ask Cheeku out loud, in your own language"],
];

/** A stack of cards: each one slides up and rests on the last. */
export function FollowThrough() {
  return (
    <section id="follow-through" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="An answer is not the end. Cheeku stays with it until the thing is done.">
        This is how <em>Cheeku follows through</em>
      </Heading>
      <div className="mt-14">
        {CARDS.map((c, i) => (
          <article
            key={c.title}
            className="sticky mb-6 grid overflow-hidden rounded-[32px] border border-hair bg-white shadow-[var(--shadow-md)] md:grid-cols-[1fr_420px]"
            style={{ top: `${96 + i * 16}px` }}
          >
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <h3 className="display max-w-[440px] text-[34px] sm:text-[44px]">{c.title}</h3>
              <p className="mt-4 max-w-[420px] text-[17px] leading-relaxed text-ink-2">{c.body}</p>
            </div>
            <div className="relative flex h-[340px] items-start justify-center overflow-hidden bg-gradient-to-b from-purple-100 to-purple-50 pt-10 md:h-[400px]">
              <Phone src={c.screen} alt={c.alt} width={250} />
            </div>
          </article>
        ))}
        <article className="sticky mb-6 overflow-hidden rounded-[32px] bg-purple-950 p-8 text-white shadow-[var(--shadow-md)] sm:p-12" style={{ top: `${96 + CARDS.length * 16}px` }}>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="display text-[34px] sm:text-[44px]">And next</h3>
            <Soon />
          </div>
          <ul className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {SOON.map(([t, d]) => (
              <li key={t} className="border-t border-white/15 pt-5">
                <p className="text-[19px] font-medium">{t}</p>
                <p className="mt-1 text-[16px] leading-relaxed text-purple-200">{d}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
