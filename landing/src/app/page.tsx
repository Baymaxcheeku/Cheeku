import { Ask } from "@/components/ask";
import { CareRing } from "@/components/care-ring";
import { Closing, Trust } from "@/components/closing";
import { Compare } from "@/components/compare";
import { FollowThrough } from "@/components/follow";
import { FilmSection, How } from "@/components/how";
import { Journeys } from "@/components/journeys";
import { Memory } from "@/components/memory";
import { People } from "@/components/people";
import { Hero, Nav } from "@/components/top";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <How />
        <FilmSection />
        <People />
        <Journeys />
        <CareRing />
        <Ask />
        <FollowThrough />
        <Memory />
        <Compare />
        <Trust />
        <Closing />
      </main>
    </>
  );
}
