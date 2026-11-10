import { WaitlistForm } from "./waitlist-form";

export function Closing() {
  return (
    <>
      <section className="mx-auto max-w-[1280px] px-3 py-20 sm:px-6 sm:py-28">
        <div className="stage relative overflow-hidden rounded-[28px] px-5 py-16 text-center sm:rounded-[40px] sm:px-10 sm:py-24">
          <h2 className="h-display mx-auto max-w-[760px] text-[36px] text-white sm:text-[60px]">Next time someone at home is unwell, don&apos;t be alone with it</h2>
          <p className="mx-auto mt-5 max-w-[480px] text-[18px] leading-relaxed text-purple-100">We are letting families in a few at a time. Join now and you go first.</p>
          <div className="mt-8">
            <WaitlistForm source="footer" onPurple center />
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-[1200px] px-5 pb-10 sm:px-8">
        <div className="flex flex-col gap-6 border-t border-hair pt-8 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mascot/face.png" alt="" width={24} height={24} className="h-6 w-6 rounded-full bg-purple-100" />
            <span className="text-[16px] font-semibold tracking-tight">Cheeku</span>
          </div>
          <p className="max-w-[640px] text-[13px] leading-relaxed text-ink-3">
            Cheeku does not diagnose, prescribe or replace your doctor. In an emergency, call 112 or go to the nearest hospital. App screens show sample data. Bookings in the screens are previews.
          </p>
        </div>
        <p className="mt-6 text-[13px] text-ink-3">© 2026 Cheeku AI. Made in India</p>
      </footer>
    </>
  );
}
