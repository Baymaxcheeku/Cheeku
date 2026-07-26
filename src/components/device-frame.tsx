import { BatteryFull, Wifi } from "lucide-react";

/**
 * Wraps the app in an iPhone 16 shell on anything wider than a phone.
 *
 * Baymax is only ever shipped as a phone app, so a desktop browser is a review
 * surface rather than a target: reviewers should be looking at the thing at the
 * size it will be used, not at a stretched web page. Below 480px — a real phone —
 * the frame is pure `display: contents` and adds nothing to the layout.
 *
 * All the geometry lives in globals.css so the breakpoint is expressed once, as
 * a media query. Deciding this in JavaScript would render one way on the server
 * and another on the client, and hydrate mismatched.
 */
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="device-stage">
      <div className="device-body">
        <div className="device-screen">{children}</div>

        {/*
         * The chrome sits outside the scrolling display, so it stays put while
         * the screen scrolls under it, and takes no pointer events so it can
         * never swallow a tap meant for the app.
         */}
        <div className="device-chrome pointer-events-none absolute inset-x-3 top-3 h-[59px]">
          {/* Opaque, like iOS: without this the app scrolls up behind the clock
              and the status bar becomes unreadable. Every screen so far puts the
              canvas colour at the top, so the strip matches it. */}
          <div
            className="flex h-full items-center justify-between rounded-t-[56px] bg-canvas px-[34px] pt-2 text-[15px] font-semibold text-ink-900"
            aria-hidden
          >
            {/* The time Apple puts in every device mockup. It is frame dressing,
                not a clock — a live one would just be a distraction. */}
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                {[5, 7, 9, 11].map((h) => (
                  <span
                    key={h}
                    style={{ height: h }}
                    className="w-[3px] rounded-[1px] bg-ink-900"
                  />
                ))}
              </span>
              <Wifi size={16} strokeWidth={2.5} />
              <BatteryFull size={22} strokeWidth={2} />
            </span>
          </div>

          {/* Painted after the strip so it sits on top of it, not under. */}
          <div
            className="absolute left-1/2 top-[11px] h-9 w-[125px] -translate-x-1/2 rounded-pill bg-black"
            aria-hidden
          />
        </div>

        <div
          className="device-chrome pointer-events-none absolute bottom-5 left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-pill bg-ink-900/85"
          aria-hidden
        />
      </div>
    </div>
  );
}
