import { Check, Minus } from "lucide-react";

import { Heading, Reveal } from "./ui";

type Level = 0 | 1 | 2; // doesn't, partly, does

const JOBS = ["Reads your reports", "Remembers the whole family", "Plans your week", "Reminds you first", "Checks it got done", "Books the care"];

/*
 * Kinds of product, not single companies: the names under each are examples
 * of the kind. The marks are our own reading of what each kind does today
 * (November 2026). Check them before every release; this is a claim about
 * other people's products.
 */
const OTHERS: { kind: string; examples: string; marks: Level[] }[] = [
  { kind: "Care booking apps", examples: "Practo, Apollo 24|7, Eka Care", marks: [1, 1, 0, 1, 0, 2] },
  { kind: "Watches and fitness apps", examples: "Smartwatches, rings, step and diet trackers", marks: [1, 0, 2, 2, 1, 0] },
  { kind: "AI chat", examples: "ChatGPT, Claude", marks: [1, 1, 0, 0, 0, 0] },
  { kind: "What most families use", examples: "Google, WhatsApp and a drawer", marks: [0, 0, 0, 0, 0, 0] },
];

/*
 * Three marks that cannot be mistaken for each other, on any background:
 * a solid tick for yes, the word for partly, a faint dash for no.
 */
function Mark({ level }: { level: Level }) {
  if (level === 2)
    return (
      <span role="img" aria-label="Does it" className="grid h-7 w-7 place-items-center rounded-full bg-purple-600 text-white">
        <Check size={15} strokeWidth={3} />
      </span>
    );
  if (level === 1) return <span className="rounded-full border border-purple-300 px-2.5 py-0.5 text-[12px] font-medium text-purple-700">Partly</span>;
  return (
    <span role="img" aria-label="Doesn't" className="text-ink-3/50">
      <Minus size={18} strokeWidth={1.5} />
    </span>
  );
}

const COLS = "grid grid-cols-[minmax(220px,1.5fr)_repeat(6,minmax(0,1fr))] items-center gap-x-4";

function count(marks: Level[]) {
  return marks.filter((m) => m === 2).length;
}

/**
 * Cheeku stands apart, in its own raised row; the rest sit quietly beneath
 * it. Wide screens get a grid with room to breathe, phones get one card per
 * product so nothing has to scroll sideways.
 */
export function Compare() {
  return (
    <section className="bg-soft py-28 sm:py-36">
      <div className="mx-auto max-w-[1180px] px-6">
        <Heading sub="Plenty of apps do one part. Looking after a family between doctor visits takes all six.">
          <em>Your family&apos;s whole health story</em> in one app
        </Heading>

        {/* Wide screens */}
        <Reveal className="mx-auto mt-20 hidden max-w-[1080px] lg:block" role="table" aria-label="What Cheeku does, compared with other kinds of health product">
          <div role="row" className={`${COLS} px-8 pb-6`}>
            <span role="columnheader" className="sr-only">
              Product
            </span>
            <span aria-hidden />
            {JOBS.map((j) => (
              <span key={j} role="columnheader" className="text-center text-[14px] font-medium leading-snug text-ink-2">
                {j}
              </span>
            ))}
          </div>

          <div role="row" className={`${COLS} rounded-[24px] bg-white px-8 py-8 shadow-[var(--shadow-md)] ring-1 ring-purple-200`}>
            <div role="rowheader">
              <p className="font-[family-name:var(--font-display)] text-[34px] leading-none text-purple-700">Cheeku</p>
              <p className="mt-2 text-[14px] text-ink-2">All six, for everyone at home</p>
            </div>
            {JOBS.map((j) => (
              <div key={j} role="cell" className="flex justify-center">
                <Mark level={2} />
              </div>
            ))}
          </div>

          <div className="mt-4">
            {OTHERS.map((r) => (
              <div key={r.kind} role="row" className={`${COLS} border-b border-hair px-8 py-7 last:border-b-0`}>
                <div role="rowheader">
                  <p className="text-[17px] font-medium text-ink">{r.kind}</p>
                  <p className="mt-1 text-[14px] text-ink-3">{r.examples}</p>
                </div>
                {r.marks.map((m, i) => (
                  <div key={i} role="cell" className="flex justify-center">
                    <Mark level={m} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Reveal>

        {/* Phones and tablets: one card each, the six jobs as a list */}
        <div className="mt-14 space-y-4 lg:hidden">
          <Reveal className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-md)] ring-1 ring-purple-200">
            <div className="flex items-baseline justify-between">
              <p className="font-[family-name:var(--font-display)] text-[32px] leading-none text-purple-700">Cheeku</p>
              <p className="text-[14px] font-medium text-purple-700">6 of 6</p>
            </div>
            <ul className="mt-5 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
              {JOBS.map((j) => (
                <li key={j} className="flex items-center gap-3 text-[16px] text-ink">
                  <Mark level={2} />
                  {j}
                </li>
              ))}
            </ul>
          </Reveal>
          {OTHERS.map((r) => (
            <Reveal key={r.kind} className="rounded-[24px] border border-hair bg-white/60 p-6">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[18px] font-medium text-ink">{r.kind}</p>
                <p className="shrink-0 text-[14px] text-ink-3">{count(r.marks)} of 6</p>
              </div>
              <p className="mt-0.5 text-[14px] text-ink-3">{r.examples}</p>
              {r.marks.some((m) => m > 0) && (
                <ul className="mt-5 space-y-3">
                  {JOBS.map((j, i) =>
                    r.marks[i] === 0 ? null : (
                      <li key={j} className="flex items-center gap-3 text-[15px] text-ink">
                        <span className="flex w-[58px] shrink-0 justify-center">
                          <Mark level={r.marks[i]!} />
                        </span>
                        {j}
                      </li>
                    ),
                  )}
                </ul>
              )}
              <p className="mt-5 border-t border-hair pt-4 text-[14px] leading-relaxed text-ink-3">
                <span className="font-medium text-ink-2">Doesn&apos;t: </span>
                {JOBS.filter((_, i) => r.marks[i] === 0)
                  .map((j) => j.toLowerCase())
                  .join(", ")}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-[640px] text-center">
          <p className="display text-[30px] sm:text-[38px]">
            The part nobody else does: <em>checking it actually happened</em>
          </p>
          <p className="mx-auto mt-5 max-w-[520px] text-[13px] leading-relaxed text-ink-3">
            Our own reading of what each kind of product does today, November 2026. The names are examples and belong to their owners; none of them is connected with Cheeku.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
