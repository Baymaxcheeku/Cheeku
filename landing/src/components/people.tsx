"use client";

import { Heading, Marquee, PauseButton, usePause } from "./ui";

const ROWS: { who: string; line: string; av: string }[][] = [
  [
    { who: "Papa", line: "His sugar, year on year", av: "10" },
    { who: "Ma", line: "Six tablets, checked together", av: "07" },
    { who: "Your wife", line: "Every scan, week by week", av: "02" },
    { who: "The baby", line: "Vaccine card, next dose", av: "04" },
    { who: "You", line: "The test you keep forgetting", av: "12" },
  ],
  [
    { who: "Dadi", line: "BP readings, in one place", av: "07" },
    { who: "Your husband", line: "Last year's checkup, compared", av: "14" },
    { who: "Your sister", line: "Thyroid reports, in order", av: "09" },
    { who: "Nana", line: "The eye doctor, booked", av: "10" },
    { who: "Your son", line: "That fever, written down", av: "15" },
  ],
  [
    { who: "Mummy", line: "Knee X-rays, never lost again", av: "08" },
    { who: "You two", line: "Both your tests, side by side", av: "06" },
    { who: "Chachu", line: "Heart medicines, on time", av: "05" },
    { who: "Your daughter", line: "Height and weight, growing", av: "01" },
    { who: "Everyone", line: "One file each, on your phone", av: "13" },
  ],
];

/** The family, sliding past: each person with the one thing Cheeku keeps for them. */
export function People() {
  const { paused, toggle } = usePause();
  return (
    <section id="family" className={`overflow-hidden py-24 sm:py-28 ${paused ? "paused" : ""}`}>
      <div className="px-6">
        <Heading sub="Not one profile with everything mixed in. Each person at home gets a file of their own, and Cheeku remembers what matters for them.">
          Built around <em>everyone at home</em>
        </Heading>
      </div>
      <div className="mt-12 space-y-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        {ROWS.map((row, i) => (
          <Marquee key={i} label={`Family members, row ${i + 1}`} reverse={i === 1}>
            {row.map((c) => (
              <div key={c.who} className="mr-3 flex shrink-0 items-center gap-3 rounded-full border border-hair bg-white py-2 pl-2 pr-6 shadow-[var(--shadow-sm)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/avatars/v${c.av}.webp`} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 rounded-full bg-purple-50" />
                <span>
                  <span className="block text-[15px] font-medium leading-tight">{c.who}</span>
                  <span className="block text-[14px] leading-tight text-ink-2">{c.line}</span>
                </span>
              </div>
            ))}
          </Marquee>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <PauseButton paused={paused} onToggle={toggle} label="the moving family" />
      </div>
    </section>
  );
}
