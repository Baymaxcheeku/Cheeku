/*
 * Baymax is a mobile app. The frames map to a 390x844 CSS viewport; the cap is
 * 430 so current iPhones (16 at 393, 16 Pro Max at 430) fill edge to edge
 * rather than sitting letterboxed in a 390px column. The layout is
 * padding-based, so it absorbs the extra width without any frame measurement
 * drifting. Past 430 it centres — full-bleed desktop is a design we do not have.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-brand-50/40">
      <div className="relative flex min-h-dvh w-full max-w-[430px] flex-col bg-canvas shadow-e2">
        {children}
      </div>
    </div>
  );
}
