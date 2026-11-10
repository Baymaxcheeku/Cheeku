"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Off only in the hosted preview copy, whose sandbox cannot embed other sites.
const CAN_EMBED = process.env.NEXT_PUBLIC_EMBED !== "off";

/*
 * The film, embedded. It starts playing on its own, muted, when it scrolls
 * into view (browsers only allow sound after a tap, so the viewer unmutes
 * from the player's own controls). Until then nothing is loaded from YouTube.
 * Where a player cannot be embedded, a button opens the film on YouTube.
 */
export function Film({ id, title, caption }: { id: string; title: string; caption: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${id}`;

  useEffect(() => {
    if (!CAN_EMBED || playing || !box.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [playing]);

  return (
    <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-[24px] bg-purple-950">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${id}`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <a href={watch} target="_blank" rel="noopener noreferrer" aria-label={`Play: ${title}`} onClick={(e) => { if (!CAN_EMBED) return; e.preventDefault(); setPlaying(true); }} className="group absolute inset-0 block cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.dataset.fallback) img.style.display = "none";
              else {
                img.dataset.fallback = "1";
                img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
              }
            }}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-purple-950/70 via-purple-950/10 to-transparent" />
          <span className="absolute left-1/2 top-1/2 grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-purple-700 shadow-[var(--shadow-lg)] transition-transform duration-200 ease-[var(--ease)] group-hover:scale-105 group-active:scale-[0.97] sm:h-[88px] sm:w-[88px]">
            <Play size={28} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />
          </span>
          <span className="absolute inset-x-0 bottom-0 p-4 text-left text-[15px] font-medium text-white sm:p-6 sm:text-[17px]">{caption}</span>
        </a>
      )}
    </div>
  );
}
