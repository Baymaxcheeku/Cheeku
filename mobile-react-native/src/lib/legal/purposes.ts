/*
 * What people are asked to agree to, one purpose at a time.
 *
 * WHY PURPOSES AND NOT ONE "I AGREE". India's DPDP Act (section 6) asks for
 * consent that is specific to a purpose and limited to the data that purpose
 * needs. One tick box is fine for the friction we want at sign-up, but only if
 * what sits behind it is itemised, each item is necessary for the service, and
 * anything that is NOT necessary is asked separately and left off by default.
 *
 * So there are two kinds:
 *
 *   REQUIRED  The service cannot work without them. They are agreed together
 *             by the one sign-up box, and the box lists them. Withdrawing any
 *             of them pauses the service rather than quietly carrying on.
 *
 *   OPTIONAL  Nice to have, never needed. Off until the person turns them on
 *             in Privacy, and turning them off is as easy as turning them on.
 *
 * The keys are stored in `consent_log.consent_type` and checked by the
 * database (migration 0031). Renaming one is a migration, not a refactor.
 */

export const REQUIRED_PURPOSES = [
  "account",
  "health_records",
  "ai_assistance",
  "family_profiles",
  "care_bookings",
] as const;

export const OPTIONAL_PURPOSES = ["product_improvement", "research_insights", "marketing"] as const;

export type RequiredPurpose = (typeof REQUIRED_PURPOSES)[number];
export type OptionalPurpose = (typeof OPTIONAL_PURPOSES)[number];
export type Purpose = RequiredPurpose | OptionalPurpose;

export const ALL_PURPOSES: readonly Purpose[] = [...REQUIRED_PURPOSES, ...OPTIONAL_PURPOSES];

export type PurposeCopy = {
  /** Short label for a list row. */
  title: string;
  /** One line, plain language. What happens, not why it is good for you. */
  line: string;
  /** The fuller statement used in the Health Data Consent notice. */
  detail: string;
  /** What data the purpose uses. DPDP asks for this to be named. */
  data: string;
};

export const PURPOSE_COPY: Record<Purpose, PurposeCopy> = {
  account: {
    title: "Run your account",
    line: "Sign-in, security, billing and support.",
    detail:
      "Create and secure your account, keep you signed in, process your plan and payments through the app store or payment partner, and answer you when you contact support.",
    data: "Email address, password (stored only as a one-way hash), device and app version, plan and payment status, support messages.",
  },
  health_records: {
    title: "Keep your health records",
    line: "Store, read and organise the reports, readings and medicines you add.",
    detail:
      "Store the documents, photos, readings, medicines and notes you add, read them to pull out values such as test results and doses, and organise them into a timeline and health file for each family member.",
    data: "Documents and photos you upload, values read from them, readings and symptoms you type or say, medicines, appointments, and the dates of all of these.",
  },
  ai_assistance: {
    title: "Answer from memory",
    line: "Read your questions against that person's records to answer and triage.",
    detail:
      "Read the questions you ask against the records and readings of the person they are about, so that Cheeku can answer, say how urgent something looks, and write out what to tell a doctor. This may involve AI service providers who process the data only on our instructions and may not keep or reuse it.",
    data: "Your questions and Cheeku's replies, and the parts of that family member's records needed to answer.",
  },
  family_profiles: {
    title: "Look after your family",
    line: "Hold records for the family members you add, on their behalf.",
    detail:
      "Hold records for each family member you add. You confirm that you are the parent or lawful guardian of any child you add, and that any adult you add has agreed to you managing their health records here, or that you are otherwise authorised to do so.",
    data: "Each family member's name, relationship to you, and the health information you add for them.",
  },
  care_bookings: {
    title: "Book care you ask for",
    line: "Share only what a booking needs with the partner who fulfils it.",
    detail:
      "When you book a test, a consultation, medicines or another service, share with the care partner who fulfils it only what that booking needs: usually the patient's name, age, contact number, address and the test or service requested, and anything you choose to attach.",
    data: "The booking details above, for the one booking you make, and the result or report the partner sends back.",
  },
  product_improvement: {
    title: "Help improve Cheeku",
    line: "Use de-identified chats and usage to make answers safer and better.",
    detail:
      "Use de-identified copies of conversations and usage patterns to evaluate and improve Cheeku's answers, safety checks and models. Names, contact details and other direct identifiers are removed first, and the data is never sold.",
    data: "De-identified conversations, answer ratings and usage events.",
  },
  research_insights: {
    title: "Contribute to health research",
    line: "Include de-identified, grouped data in health research and insights.",
    detail:
      "Include your family's data, de-identified and combined with many others, in health research and in population-level insights we may share with research, public-health or insurance partners. Nobody receives data that identifies you, and no decision about you is made from it.",
    data: "De-identified and aggregated health values, conditions and age bands.",
  },
  marketing: {
    title: "Offers and news",
    line: "Tips, product news and offers by email or notification.",
    detail: "Send you health tips, product news and offers from Cheeku and its care partners by email or notification.",
    data: "Email address and notification token.",
  },
};

export function isRequired(p: Purpose): p is RequiredPurpose {
  return (REQUIRED_PURPOSES as readonly string[]).includes(p);
}

export function isPurpose(value: string): value is Purpose {
  return (ALL_PURPOSES as readonly string[]).includes(value);
}
