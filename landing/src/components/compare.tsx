import { Check, X } from "lucide-react";

import { Heading, Reveal } from "./ui";

const GROUPS: { name: string; rows: [string, string, "no" | "sometimes"][] }[] = [
  {
    name: "Understand",
    rows: [
      ["Answers about your family", "From their own reports, not from the internet", "no"],
      ["Reports in simple words", "What it means and what changed", "no"],
      ["Medicines checked together", "Every tablet, from every doctor", "no"],
      ["Says when to see a doctor", "Wait, call tomorrow, or go now", "sometimes"],
    ],
  },
  {
    name: "Keep track",
    rows: [
      ["One file per person", "Papa’s is never mixed with Ma’s", "no"],
      ["Finds a report in seconds", "Any lab, any year", "no"],
      ["Reminds you what is due", "The test, the dose, the follow-up", "no"],
    ],
  },
  {
    name: "Get it done",
    rows: [
      ["Books the test or doctor", "Home collection, video or clinic", "no"],
      ["Files the result itself", "Under the right person", "no"],
      ["Ready for the next visit", "Everything the doctor will ask for", "no"],
    ],
  },
];

export function Compare() {
  return (
    <section className="bg-soft py-24 sm:py-28">
      <div className="mx-auto max-w-[1180px] px-6">
        <Heading sub="Most families run their health on a search engine, a WhatsApp group and a drawer.">
          <em>Your family&apos;s whole health story</em> in one app
        </Heading>

        <Reveal className="mx-auto mt-12 max-w-[820px] overflow-hidden rounded-[28px] border border-hair bg-white">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Cheeku compared with Google and WhatsApp</caption>
            <thead>
              <tr>
                <td className="p-5 sm:p-6" />
                <th scope="col" className="w-[92px] bg-purple-600 p-4 text-center font-[family-name:var(--font-display)] text-[22px] font-normal text-white sm:w-[150px]">
                  Cheeku
                </th>
                <th scope="col" className="w-[92px] p-4 text-center text-[13px] font-medium leading-tight text-ink-2 sm:w-[150px] sm:text-[14px]">
                  Google and WhatsApp
                </th>
              </tr>
            </thead>
            {GROUPS.map((g) => (
              <tbody key={g.name}>
                <tr>
                  <th scope="colgroup" colSpan={1} className="border-t border-hair px-5 pb-1 pt-6 text-[13px] font-medium text-ink-3 sm:px-6">
                    {g.name}
                  </th>
                  <td className="border-t border-purple-500 bg-purple-600" />
                  <td className="border-t border-hair" />
                </tr>
                {g.rows.map(([t, d, other]) => (
                  <tr key={t}>
                    <th scope="row" className="border-t border-hair px-5 py-4 font-normal sm:px-6">
                      <span className="block text-[16px] font-medium text-ink">{t}</span>
                      <span className="block text-[14px] text-ink-2">{d}</span>
                    </th>
                    <td className="border-t border-purple-500 bg-purple-600 text-center">
                      <span className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-white text-purple-700">
                        <Check size={15} strokeWidth={2.5} aria-label="Yes" />
                      </span>
                    </td>
                    <td className="border-t border-hair text-center text-[14px] text-ink-2">
                      {other === "sometimes" ? "Sometimes" : <X size={18} strokeWidth={1.5} className="mx-auto text-ink-3" aria-label="No" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </Reveal>
      </div>
    </section>
  );
}
