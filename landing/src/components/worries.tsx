import { Kicker, PersonTag, Reveal, Wrap } from "./ui";

const WORRIES = [
  { who: "Papa", q: "His sugar report came. Is this number okay?" },
  { who: "Ma", q: "Three doctors, six tablets. Can she take them together?" },
  { who: "Baby", q: "Fever at 2 am. Do we go now or wait till morning?" },
  { who: "You", q: "The doctor said repeat a test. Which one? When?" },
  { who: "Wife", q: "Is this medicine safe in pregnancy?" },
  { who: "Everyone", q: "Where is last year's report?" },
];

/** The reader's own questions, before anything about the product. */
export function Worries() {
  return (
    <Wrap className="py-20 sm:py-28">
      <Reveal className="max-w-[720px]">
        <Kicker>You know these nights</Kicker>
        <h2 className="h-section mt-3 text-[32px] sm:text-[48px]">The questions that keep a family awake</h2>
      </Reveal>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {WORRIES.map((w, i) => (
          <Reveal key={w.q} delay={Math.min(i, 5) * 0.05}>
            <li className="flex h-full list-none flex-col justify-between gap-6 rounded-[20px] border border-hair bg-soft p-6 transition-colors duration-150 hover:border-purple-200 hover:bg-purple-50">
              <p className="text-[20px] font-medium leading-snug tracking-[-0.01em] text-ink sm:text-[22px]">&ldquo;{w.q}&rdquo;</p>
              <PersonTag who={w.who} />
            </li>
          </Reveal>
        ))}
      </ul>
      <Reveal className="mt-10 max-w-[720px]">
        <p className="text-[20px] leading-snug text-ink-2 sm:text-[24px]">
          Google answers for a stranger. <span className="font-medium text-ink">Cheeku answers for your family</span>, because it has read their reports.
        </p>
      </Reveal>
    </Wrap>
  );
}
