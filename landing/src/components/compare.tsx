import { Heading, Reveal } from "./ui";

type Level = 0 | 1 | 2; // no, partly, yes

const STEPS = ["Reads your reports", "Remembers the whole family", "Plans your week", "Reminds you first", "Checks it got done", "Books the care"];

/*
 * Kinds of product, not single companies: the names under each are examples
 * of the kind. The marks are our own reading of what each kind does today
 * (November 2026). Check them before every release; this is a claim about
 * other people's products.
 */
const ROWS: { kind: string; examples: string; marks: Level[] }[] = [
  { kind: "Care booking apps", examples: "Practo, Apollo 24|7, Eka Care", marks: [1, 1, 0, 1, 0, 2] },
  { kind: "Watches and fitness apps", examples: "Smartwatches, rings, step and diet trackers", marks: [1, 0, 2, 2, 1, 0] },
  { kind: "AI chat", examples: "ChatGPT, Claude", marks: [1, 1, 0, 0, 0, 0] },
  { kind: "What most families use", examples: "Google, WhatsApp and a drawer", marks: [0, 0, 0, 0, 0, 0] },
];

function Mark({ level, onPurple = false }: { level: Level; onPurple?: boolean }) {
  const label = level === 2 ? "Yes" : level === 1 ? "Partly" : "No";
  const ring = onPurple ? "border-white" : "border-purple-600";
  const fill = onPurple ? "bg-white" : "bg-purple-600";
  return (
    <span role="img" aria-label={label} className={`relative mx-auto block h-5 w-5 overflow-hidden rounded-full border-[1.5px] ${level === 0 ? (onPurple ? "border-white/40" : "border-ink-3/40") : ring}`}>
      {level === 2 && <span className={`absolute inset-0 ${fill}`} />}
      {level === 1 && <span className={`absolute inset-y-0 left-0 w-1/2 ${fill}`} />}
    </span>
  );
}

/** Six jobs across the top, five kinds of product down the side. */
export function Compare() {
  return (
    <section className="bg-soft py-24 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Heading sub="Plenty of apps do one part. Looking after a family's health between doctor visits takes all six.">
          <em>Your family&apos;s whole health story</em> in one app
        </Heading>

        <Reveal className="mt-12 overflow-hidden rounded-[28px] border border-hair bg-white shadow-[var(--shadow-sm)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <caption className="sr-only">What Cheeku does, compared with other kinds of health product</caption>
              <thead>
                <tr>
                  <td className="w-[250px] p-5" />
                  {STEPS.map((s, i) => (
                    <th key={s} scope="col" className={`px-2 pb-4 pt-6 text-center align-bottom text-[14px] font-medium leading-tight ${i === 4 ? "text-purple-700" : "text-ink"}`}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-purple-600 text-white">
                  <th scope="row" className="px-5 py-5 font-normal">
                    <span className="block font-[family-name:var(--font-display)] text-[26px] leading-none">Cheeku</span>
                    <span className="mt-1 block text-[13px] text-purple-100">All six, for everyone at home</span>
                  </th>
                  {STEPS.map((s) => (
                    <td key={s} className="px-2 py-5">
                      <Mark level={2} onPurple />
                    </td>
                  ))}
                </tr>
                {ROWS.map((r) => (
                  <tr key={r.kind}>
                    <th scope="row" className="border-t border-hair px-5 py-4 font-normal">
                      <span className="block text-[16px] font-medium text-ink">{r.kind}</span>
                      <span className="block text-[13px] text-ink-3">{r.examples}</span>
                    </th>
                    {r.marks.map((m, i) => (
                      <td key={i} className={`border-t border-hair px-2 py-4 ${i === 4 ? "bg-purple-50" : ""}`}>
                        <Mark level={m} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair px-5 py-4 text-[13px] text-ink-2">
            <span className="flex items-center gap-2"><Mark level={2} /> Does it</span>
            <span className="flex items-center gap-2"><Mark level={1} /> Partly</span>
            <span className="flex items-center gap-2"><Mark level={0} /> Doesn&apos;t</span>
            <span className="text-ink-3 md:hidden">Swipe sideways to see all six</span>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-8 max-w-[640px] text-center">
          <p className="display text-[28px] sm:text-[34px]">
            The step nobody else does: <em>checking it actually happened</em>
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-3">
            Our own reading of what each kind of product does today, November 2026. The names are examples and belong to their owners; none of them is connected with Cheeku.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
