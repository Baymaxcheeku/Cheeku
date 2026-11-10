import { Closing } from "@/components/closing";
import { How, Medicines } from "@/components/how";
import { Journeys } from "@/components/journeys";
import { Hero, Nav, TopLine } from "@/components/top";
import { Questions, Trust } from "@/components/trust";
import { Worries } from "@/components/worries";

export default function Page() {
  return (
    <>
      <TopLine />
      <Nav />
      <main>
        <Hero />
        <Worries />
        <Journeys />
        <How />
        <Medicines />
        <Trust />
        <Questions />
        <Closing />
      </main>
    </>
  );
}
