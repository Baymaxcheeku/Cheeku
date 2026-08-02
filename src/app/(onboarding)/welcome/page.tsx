import { castFaces } from "@/lib/profiles/avatar";
import { WelcomeCarousel } from "./welcome-carousel";

/**
 * A2 — the value carousel, before any account exists.
 *
 * A server component so the family faces can be generated here: the avatar
 * renderer needs `Buffer`, and the alternative is shipping a generator to the
 * browser to draw three decorative portraits.
 */
export default function WelcomePage() {
  return <WelcomeCarousel faces={castFaces(3)} />;
}
