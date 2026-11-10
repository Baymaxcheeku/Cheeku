"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Text that types itself out once `go` is true, then calls `onDone`. With
 * Reduce Motion on, the whole text is there at once. Screen readers always
 * get the full sentence.
 */
export function Typed({ text, go, speed = 22, onDone }: { text: string; go: boolean; speed?: number; onDone?: () => void }) {
  const still = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!go) return;
    if (still) {
      setN(text.length);
      onDone?.();
      return;
    }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // onDone is deliberately left out: a new function each render must not restart the typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, text, speed, still]);

  const typing = go && n < text.length;
  return (
    <span aria-label={text}>
      <span aria-hidden>{text.slice(0, n)}</span>
      {typing && <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-current" />}
      {/* Holds the bubble at its final size, so nothing jumps while it types. */}
      <span aria-hidden className="invisible">
        {text.slice(n)}
      </span>
    </span>
  );
}

/** Three dots, while Cheeku "reads the records". */
export function Dots() {
  return (
    <span className="inline-flex items-center gap-1 py-1.5" aria-label="Cheeku is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
