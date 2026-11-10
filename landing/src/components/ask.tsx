"use client";

import { Keyboard, Mic } from "lucide-react";
import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Dots, Typed } from "./typed";
import { EASE, Heading, Reveal, Soon } from "./ui";

const SAMPLES = [
  {
    id: "hinglish",
    label: "Hinglish",
    ask: "Mummy ke ghutne raat ko zyada dard karte hain. Doctor ko dikhana chahiye?",
    answer: "Teen hafte se ho raha hai, aur pichhla X-ray 2024 mein hua tha. Is hafte haddi ke doctor ko dikhana theek rahega. Paas mein doctor dhoondh doon?",
  },
  {
    id: "hindi",
    label: "हिन्दी",
    ask: "मम्मी के घुटनों में रात को ज़्यादा दर्द होता है। क्या डॉक्टर को दिखाना चाहिए?",
    answer: "यह तीन हफ़्ते से हो रहा है, और पिछला एक्स-रे 2024 में हुआ था। इस हफ़्ते हड्डी के डॉक्टर को दिखाना ठीक रहेगा। क्या मैं पास में डॉक्टर ढूँढ दूँ?",
  },
  {
    id: "english",
    label: "English",
    ask: "Ma's knees hurt more at night. Should we see a doctor?",
    answer: "It has been three weeks, and her last X-ray was in 2024. It is worth seeing a bone doctor this week. Shall I find one near her?",
  },
] as const;

const MORE = ["தமிழ்", "తెలుగు", "বাংলা", "मराठी", "ગુજરાતી", "ಕನ್ನಡ", "മലയാളം", "ਪੰਜਾਬੀ"];

const KNOWS = [
  ["Sugar, BP, gas, thyroid", "The words families actually use, not the ones on the lab report."],
  ["Crocin, Dolo, Thyronorm", "It knows Indian medicine brands and what is inside each one."],
  ["Roti and katori", "Food in the portions on your plate, not cups and ounces."],
];

/* The voice line: a row of bars that move while Cheeku is listening. */
function Wave({ on }: { on: boolean }) {
  return (
    <span className="flex h-8 items-center gap-[3px]" aria-hidden>
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-purple-600 ${on ? "animate-pulse" : ""}`}
          style={{ height: on ? `${30 + ((i * 37) % 70)}%` : "18%", animationDelay: `${(i % 7) * 90}ms`, animationDuration: "700ms", transition: "height 300ms var(--ease)" }}
        />
      ))}
    </span>
  );
}

/** Chat or voice, in the family's own language. */
export function Ask() {
  const [lang, setLang] = useState(0);
  const [mode, setMode] = useState<"voice" | "chat">("voice");
  const [stage, setStage] = useState<"ask" | "think" | "answer">("ask");
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-20% 0px" });
  const s = SAMPLES[lang]!;

  useEffect(() => setStage("ask"), [lang, mode]);
  useEffect(() => {
    if (stage !== "think") return;
    const id = setTimeout(() => setStage("answer"), 900);
    return () => clearTimeout(id);
  }, [stage]);

  return (
    <section id="ask" className="mx-auto max-w-[1180px] px-6 py-24 sm:py-28">
      <Heading sub="Type it or just say it, the way you would tell someone at home. Cheeku answers in the same language.">
        Ask the way <em>you talk at home</em>
      </Heading>

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr] [&>*]:min-w-0">
        <Reveal className="rounded-[32px] border border-hair bg-soft p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Language" className="inline-flex rounded-full bg-white p-1 ring-1 ring-hair">
              {SAMPLES.map((x, n) => (
                <button key={x.id} role="tab" type="button" aria-selected={n === lang} onClick={() => setLang(n)} className={`relative h-9 cursor-pointer rounded-full px-4 text-[14px] font-medium transition-colors duration-150 ${n === lang ? "text-white" : "text-ink-2 hover:text-ink"}`}>
                  {n === lang && <motion.span layoutId="lang-pill" className="absolute inset-0 rounded-full bg-purple-600" transition={{ duration: 0.3, ease: EASE }} />}
                  <span className="relative">{x.label}</span>
                </button>
              ))}
            </div>
            <div role="tablist" aria-label="How to ask" className="inline-flex rounded-full bg-white p-1 ring-1 ring-hair">
              {(["voice", "chat"] as const).map((m) => (
                <button key={m} role="tab" type="button" aria-selected={m === mode} onClick={() => setMode(m)} className={`flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-colors duration-150 ${m === mode ? "bg-purple-600 text-white" : "text-ink-2 hover:text-ink"}`}>
                  {m === "voice" ? <Mic size={15} strokeWidth={1.75} /> : <Keyboard size={15} strokeWidth={1.75} />}
                  {m === "voice" ? "Voice" : "Chat"}
                </button>
              ))}
            </div>
          </div>

          <div ref={ref} key={`${lang}-${mode}`} className="mt-6 min-h-[300px] space-y-3">
            {mode === "voice" && (
              <div className="flex items-center gap-4 rounded-[20px] bg-white px-4 py-3 ring-1 ring-hair">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${stage === "ask" ? "bg-loud text-ink" : "bg-purple-50 text-purple-700"}`}>
                  <Mic size={19} strokeWidth={1.75} />
                </span>
                <Wave on={seen && stage === "ask"} />
                <span className="ml-auto text-[13px] text-ink-3">{stage === "ask" ? "Listening" : "Heard you"}</span>
              </div>
            )}
            <p className="ml-auto w-fit max-w-[88%] rounded-[20px] rounded-br-md bg-purple-600 px-4 py-3 text-[16px] leading-snug text-white">
              <Typed text={s.ask} go={seen} speed={mode === "voice" ? 42 : 26} onDone={() => setStage((x) => (x === "ask" ? "think" : x))} />
            </p>
            <p className={`w-fit max-w-[92%] rounded-[20px] rounded-bl-md bg-white px-4 py-3 text-[16px] leading-snug text-ink ring-1 ring-hair transition-opacity duration-300 ${stage === "ask" ? "opacity-0" : "opacity-100"}`}>
              {stage === "answer" ? <Typed text={s.answer} go speed={16} /> : <Dots />}
            </p>
          </div>
        </Reveal>

        <div className="space-y-6 lg:pl-6 lg:pt-4">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="display text-[32px]">In your language</h3>
              <Soon />
            </div>
            <p className="mt-2 max-w-[440px] text-[16px] leading-relaxed text-ink-2">Chat works in English today. Voice, Hindi and Hinglish are next, and then more of India.</p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Languages planned">
              {["हिन्दी", "Hinglish", ...MORE].map((l) => (
                <li key={l} className="rounded-full border border-hair bg-white px-3.5 py-1.5 text-[15px] text-ink">
                  {l}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <h3 className="display text-[32px]">It understands how India talks about health</h3>
            <dl className="mt-4 divide-y divide-hair border-y border-hair">
              {KNOWS.map(([t, d]) => (
                <div key={t} className="py-4">
                  <dt className="text-[17px] font-medium text-ink">{t}</dt>
                  <dd className="mt-0.5 text-[15px] leading-relaxed text-ink-2">{d}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
