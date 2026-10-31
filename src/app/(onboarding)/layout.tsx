/*
 * The onboarding column. Framing and centring belong to the device frame now,
 * so this owns only what the screens themselves cannot: filling the app
 * viewport, and holding content clear of the status bar and the home indicator.
 *
 * The insets live here rather than on each screen's header because two of the
 * six roll their own header, and one of them was rendering underneath the
 * Dynamic Island. A single owner cannot be forgotten by the next screen added.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-app flex-col bg-canvas pb-[var(--safe-bottom)] pt-[var(--safe-top)]">
      {children}
    </div>
  );
}
