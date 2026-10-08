/*
 * Who "we" are in every legal text the app shows.
 *
 * ONE PLACE, ON PURPOSE. The company is not incorporated yet, so the legal
 * name, address and grievance officer are placeholders. They are written in
 * square brackets so nobody mistakes them for real details, and they live here
 * so filling them in is one edit rather than a hunt through four documents.
 *
 * Changing any value here changes the text of every legal document, which
 * changes its hash. `documents.test.ts` will fail until the versions and the
 * hashes are bumped, and migration 0031's `legal_documents` rows updated to
 * match. That is deliberate: a consent record is only evidence if the text it
 * points at is the text that was shown.
 */
export const LEGAL_ENTITY = {
  /** The brand people see. */
  brand: "Cheeku AI",
  /** The registered company name, once incorporated. */
  legalName: "[Legal entity name, on incorporation]",
  registeredAddress: "[Registered office address, India]",
  /** DPDP Act section 8(9): a person who answers questions about personal data. */
  grievanceOfficer: "[Grievance Officer name]",
  privacyEmail: "[privacy contact email]",
  supportEmail: "[support email]",
  /** Where the database and files are hosted. */
  hostingRegion: "[hosting region]",
  /** Courts named in the Terms. */
  jurisdiction: "[city], India",
} as const;

/** True while any placeholder above is still unfilled. Shown on the legal screens. */
export function hasPlaceholders(): boolean {
  return Object.values(LEGAL_ENTITY).some((v) => v.startsWith("["));
}
