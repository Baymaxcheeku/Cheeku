import { OfflineBanner } from "@/components/app/screen-states";
import { TabBar } from "@/components/app/tab-bar";

/*
 * The signed-in shell. Everything past onboarding lives here and shares the tab
 * bar, so no screen has to remember to render it.
 *
 * The scroll is on this column rather than the document: the tab bar is
 * `sticky bottom-0` and needs a scrolling ancestor to stick to, and pinning it
 * here means a long records list scrolls under the bar instead of pushing it
 * off screen. The top inset is owned here for the same reason the onboarding
 * layout owns its own — a screen that rolls its own header would otherwise
 * render underneath the Dynamic Island.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-app flex-col bg-canvas pt-[var(--safe-top)]">
      {children}
      {/* Above the tab bar, not replacing the screen: cached records stay
          readable offline, and blanking them removes the one thing the app can
          still usefully do. */}
      <OfflineBanner />
      <TabBar />
    </div>
  );
}
