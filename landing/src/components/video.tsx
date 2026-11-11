"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
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

/*
 * The product film, served from this site: no other company's player, name
 * or logo on it. It starts muted when it scrolls into view (browsers only
 * allow sound after a tap) and pauses when it scrolls away. Two controls,
 * ours: play or pause, and sound.
 */
export function LocalFilm({ src, poster, title }: { src: string; poster: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const userPaused = useRef(false);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          if (!userPaused.current) void v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      void v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  };
  const sound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && v.paused) void v.play().catch(() => {});
  };

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-[24px] bg-[#e9e7f0]">
      <video
        ref={video}
        className="absolute inset-0 h-full w-full cursor-pointer object-cover"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={title}
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
      />
      {!playing && (
        <button type="button" onClick={toggle} aria-label="Play the film" className="absolute left-1/2 top-1/2 grid h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white text-purple-700 shadow-[var(--shadow-lg)] transition-transform duration-200 ease-[var(--ease)] hover:scale-105 active:scale-[0.97] sm:h-[92px] sm:w-[92px]">
          <Play size={30} fill="currentColor" strokeWidth={0} className="translate-x-0.5" />
        </button>
      )}
      <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 sm:inset-x-4 sm:bottom-4">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause the film" : "Play the film"} className="glass-white grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-ink">
          {playing ? <Pause size={15} fill="currentColor" strokeWidth={0} /> : <Play size={15} fill="currentColor" strokeWidth={0} className="translate-x-px" />}
        </button>
        <button type="button" onClick={sound} aria-label={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} className="glass-white flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 text-[14px] font-medium text-ink">
          {muted ? <VolumeX size={16} strokeWidth={1.75} /> : <Volume2 size={16} strokeWidth={1.75} />}
          {muted ? "Tap for sound" : "Sound on"}
        </button>
        <div className="ml-1 h-1 flex-1 overflow-hidden rounded-full bg-white/60" aria-hidden>
          <div className="h-full origin-left rounded-full bg-purple-600" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </div>
  );
}
