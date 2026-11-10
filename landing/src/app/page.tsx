import { BusinessSection } from "@/components/business";
import { AnnouncementBar, Nav, SmoothScroll } from "@/components/chrome";
import { FinalCTA } from "@/components/closing";
import { FamiliesSection } from "@/components/families";
import { Hero } from "@/components/hero";
import { InvestorSection } from "@/components/investors";
import { GapSection, HealthspanSection, ProofMarquee } from "@/components/problem";
import { DailySection, ProductSection, SafetySection } from "@/components/product";

export default function Page() {
  return (
    <>
      <SmoothScroll />
      <AnnouncementBar />
      <Nav />
      <main>
        <Hero />
        <ProofMarquee />
        <GapSection />
        <HealthspanSection />
        <FamiliesSection />
        <ProductSection />
        <DailySection />
        <SafetySection />
        <BusinessSection />
        <InvestorSection />
        <FinalCTA />
      </main>
    </>
  );
}
