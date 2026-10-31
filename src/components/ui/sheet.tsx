"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

/*
 * The app's bottom sheet, and the one place that decides where a sheet is
 * mounted in the DOM.
 *
 * WHY A PORTAL. Sheets used to render inline, wherever the component that owned
 * them happened to sit. That broke the moment `stagger` arrived: it puts an
 * `animation` on every child of a screen, and an element with a running or
 * filling animation on opacity/transform gets its own stacking context. A
 * `z-40` inside one of those only wins against that child's own descendants —
 * against its *siblings* the browser falls back to paint order, so every
 * section below the sheet's owner drew straight over the top of it. The family
 * switcher (second section on Home) was almost completely buried; the logout
 * sheet looked fine only because it happens to be the last section on Profile.
 * That is luck, not correctness, and the next sheet added anywhere near the top
 * of a screen would have hit it again.
 *
 * WHERE IT MOUNTS. Not `document.body` — inside the desktop device frame,
 * `position: fixed` must resolve against the simulated 393x852 display, not the
 * browser window, or the sheet spills out of the phone. So it mounts into the
 * nearest `.device-screen`, which is a containing block for fixed descendants
 * (globals.css gives it `transform: translateZ(0)` for exactly this). Below
 * 480px that element is `display: contents` and generates no box, so a fixed
 * child there resolves against the real viewport — which is the correct
 * behaviour on an actual phone. One target, right in both cases.
 *
 * As a direct child of `.device-screen` the sheet is a sibling of the whole
 * screen column rather than of one animated section, so its z-index is finally
 * compared against something meaningful.
 */

export function Sheet({
  onClose,
  label,
  children,
  className,
  /** Sheets that own their own scrolling (a long plan list) want this off. */
  scrollable = true,
}: {
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const host = anchor.current?.closest<HTMLElement>(".device-screen");
    setLayer(host ?? document.body);
  }, []);

  /*
   * Escape closes. A sheet that can only be dismissed by hitting a specific
   * target is a trap for anyone on a keyboard, and this one can cover the
   * screen someone opened to read a lab result.
   */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sheet = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* A button, not a div: the scrim is a real dismiss control and should be
          reachable without a pointer. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="scrim-in absolute inset-0 bg-ink-900/40"
      />

      <div
        role="dialog"
        aria-modal
        aria-label={label}
        className={cn(
          "sheet-rise relative max-h-[92%] rounded-t-sheet bg-canvas pb-[calc(var(--safe-bottom)+1rem)] pt-3 shadow-e2",
          scrollable && "overflow-y-auto",
          className,
        )}
      >
        <span className="mx-auto mb-1 block h-1 w-10 rounded-pill bg-line" aria-hidden />
        {children}
      </div>
    </div>
  );

  return (
    <>
      {/* Zero-size anchor: only there so the effect above can find which device
          frame this sheet belongs to before the portal is created. */}
      <span ref={anchor} className="hidden" aria-hidden />
      {layer ? createPortal(sheet, layer) : null}
    </>
  );
}
