"use client";

import { Play } from "lucide-react";
import { useState } from "react";

// Off only in the hosted preview copy, whose sandbox cannot embed other sites.
const CAN_EMBED = process.env.NEXT_PUBLIC_EMBED !== "off";

/*
 * A YouTube film that costs nothing until it is played: a poster and a play
 * button first, the player only after the tap. Where a player cannot be
 * embedded, the same button opens the film on YouTube.
 */
export function Film({ id, title, caption, compact = false }: { id: string; title: string; caption: string; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const watch = `https://www.youtube.com/watch?v=${id}`;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[20px] bg-purple-950">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <a
          href={watch}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Play: ${title}`}
          onClick={(e) => {
            if (!CAN_EMBED) return;
            e.preventDefault();
            setPlaying(true);
          }}
          className="group absolute inset-0 block cursor-pointer"
        >
          {/* The poster is YouTube's own still. If it can't load, the purple behind it stands in. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ease)] group-hover:scale-[1.02]"
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
          <span className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-purple-700 shadow-[var(--shadow-lg)] transition-transform duration-200 ease-[var(--ease)] group-hover:scale-105 group-active:scale-[0.97] ${compact ? "h-14 w-14" : "h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]"}`}>
            <Play size={compact ? 20 : 28} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />
          </span>
          <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 ${compact ? "p-3.5" : "p-4 sm:p-6"}`}>
            <span className={`text-left font-medium text-white ${compact ? "text-[14px]" : "text-[15px] sm:text-[17px]"}`}>{caption}</span>
          </span>
        </a>
      )}
    </div>
  );
}
