"use client";

import { useEffect, useRef, useState } from "react";

/*
 * An image that never pops in. Until it has loaded there is a soft grey
 * placeholder in its place, already the right size; the picture then fades in
 * over it. Use it wherever a photograph or app screen fills a box.
 */
export function Img({ src, alt, className = "", priority = false, fit = "cover", position = "" }: { src: string; alt: string; className?: string; priority?: boolean; fit?: "cover" | "fill"; position?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  // An image already in the browser's cache finishes before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setReady(true);
  }, [src]);
  return (
    <span className={`absolute inset-0 block overflow-hidden bg-[#d9d7e2] ${className}`}>
      {!ready && <span aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#e6e4ee] to-[#cfccdb]" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setReady(true)}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ease-[var(--ease)] ${fit === "cover" ? "object-cover" : ""} ${position} ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
