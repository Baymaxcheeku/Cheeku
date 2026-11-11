import { Img } from "./img";

/*
 * A real app screen in a true iPhone frame.
 *
 * The screenshots are the app itself, 393 points wide, captured without the
 * status bar (393 x 778). The frame adds the 74-point status bar back, so the
 * screen is 393 x 852: an iPhone 15's exact proportions. Nothing is stretched.
 * Every size is in em, with 1em = 1% of the phone's width, so the frame keeps
 * its shape at any size.
 */
export function Phone({ src, alt, width = 300, className = "", priority = false }: { src: string; alt: string; width?: number; className?: string; priority?: boolean }) {
  return (
    <div className={`relative shrink-0 ${className}`} style={{ fontSize: width / 100, width: "100em" }}>
      <div className="rounded-[15.6em] bg-[#1b1a2b] p-[2.6em] shadow-[0_0_0_0.35em_#2e2c44,0_30px_60px_-24px_rgb(16_15_46/0.5)]">
        <div className="relative overflow-hidden rounded-[13em] bg-[#ece8ff]">
          {/* Status bar: 74 / 393 of the width. */}
          <div className="relative flex h-[17.85em] items-center justify-between px-[8em] pt-[2.4em] text-[#100f2e]">
            <span className="text-[4.1em] font-semibold tracking-tight">9:41</span>
            <span className="absolute left-1/2 top-[2.9em] h-[8.9em] w-[30em] -translate-x-1/2 rounded-full bg-[#0b0a14]" />
            <span className="flex items-center gap-[1.4em]" aria-hidden>
              <svg viewBox="0 0 18 12" className="h-[3em] w-[4.5em]" fill="currentColor">
                <rect x="0" y="8" width="3" height="4" rx="0.8" />
                <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
                <rect x="10" y="3" width="3" height="9" rx="0.8" />
                <rect x="15" y="0" width="3" height="12" rx="0.8" />
              </svg>
              <svg viewBox="0 0 16 12" className="h-[3em] w-[4em]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1.2 4.2a10 10 0 0 1 13.6 0M3.6 6.8a6.4 6.4 0 0 1 8.8 0" />
                <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none" />
              </svg>
              <svg viewBox="0 0 26 12" className="h-[3em] w-[6.5em]" fill="none">
                <rect x="0.6" y="0.6" width="21.8" height="10.8" rx="3.2" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" />
                <rect x="2.2" y="2.2" width="18.6" height="7.6" rx="1.9" fill="currentColor" />
                <rect x="23.6" y="4" width="1.8" height="4" rx="0.9" fill="currentColor" fillOpacity="0.45" />
              </svg>
            </span>
          </div>
          <div className="relative aspect-[393/778] w-full">
            <Img src={src} alt={alt} priority={priority} fit="fill" />
          </div>
        </div>
      </div>
    </div>
  );
}
