"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Cheeku, the mascot, from the app's own Lottie files. The still image shows
 * first (and stays, with Reduce Motion on); the animation swaps in once the
 * player and the file have loaded, so nothing jumps.
 */
export function Mascot({ pose = "idle", still = "idle-still", className, loop = true }: { pose?: "idle" | "wave" | "cheer" | "think" | "working" | "celebrate"; still?: string; className?: string; loop?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let gone = false;
    let player: { destroy: () => void } | null = null;
    void import("lottie-web/build/player/lottie_light").then((m) => {
      if (gone || !box.current) return;
      const p = m.default.loadAnimation({ container: box.current, renderer: "svg", loop, autoplay: true, path: `/mascot/${pose}.json` });
      p.addEventListener("DOMLoaded", () => !gone && setLive(true));
      player = p;
    });
    return () => {
      gone = true;
      player?.destroy();
    };
  }, [pose, loop]);

  return (
    <div className={`relative ${className ?? ""}`} role="img" aria-label="Cheeku, a round purple mascot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/mascot/${still}.png`} alt="" className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${live ? "opacity-0" : "opacity-100"}`} />
      <div ref={box} className={`absolute inset-0 transition-opacity duration-300 ${live ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
