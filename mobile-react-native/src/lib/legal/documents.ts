import { LEGAL_ENTITY as E } from "./entity";
import { OPTIONAL_PURPOSES, PURPOSE_COPY, REQUIRED_PURPOSES } from "./purposes";

/*
 * The legal texts, as data.
 *
 * WHY THEY SHIP IN THE APP. A consent is only worth something if you can show
 * the exact words the person saw. Text fetched from a server at sign-up can
 * change between the screen and the record. Text compiled into the build
 * cannot, and its SHA-256 is written next to every consent (consent_log
 * .text_sha256) and published in `legal_documents`, so the two can always be
 * matched.
 *
 * HOW TO CHANGE ONE.
 *   1. Edit the text.
 *   2. Bump its `version` (the date it takes effect) and `effectiveOn`.
 *   3. Run `npx vitest run src/lib/legal` and copy the new hash it prints
 *      into DOCUMENT_HASHES.
 *   4. Add a row for the new version to `legal_documents` in a migration.
 *   5. Set `material: true` if people must agree again (anything that widens
 *      what is collected or who it is shared with). The app then asks every
 *      signed-in person once, on their next launch. A fix that changes no
 *      right or use (a typo, a contact address) is `material: false`: new
 *      sign-ups agree to it, and nobody already signed in is asked again.
 * The tests fail at step 3 and step 4 if either is forgotten.
 *
 * WRITING RULES. Plain words, short sentences, second person. Say what
 * happens, not how much we care. No claim the code does not keep: if a
 * sentence here stops being true, the code or the sentence has a bug.
 */

export type LegalKind = "terms" | "privacy" | "health_consent" | "storage";

export type LegalBlock =
  | { p: string }
  | { list: string[] }
  /** A highlighted line, for the things people most need to see. */
  | { note: string };

export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };

export type LegalDocument = {
  kind: LegalKind;
  title: string;
  /** Used in links and the documents list. */
  short: string;
  /** The date this version takes effect, YYYY-MM-DD. Also its version id. */
  version: string;
  effectiveOn: string;
  /** Agreeing again is required when this version is published. */
  material: boolean;
  /** Two sentences, shown above the full text and in the re-consent sheet. */
  summary: string;
  /** What changed from the previous version. Empty for a first version. */
  changes: string[];
  sections: LegalSection[];
};

const requiredList = REQUIRED_PURPOSES.map((p) => `${PURPOSE_COPY[p].title}. ${PURPOSE_COPY[p].detail} Data used: ${PURPOSE_COPY[p].data}`);
const optionalList = OPTIONAL_PURPOSES.map((p) => `${PURPOSE_COPY[p].title}. ${PURPOSE_COPY[p].detail} Data used: ${PURPOSE_COPY[p].data}`);

// ------------------------------------------------------------------ terms --

const TERMS: LegalDocument = {
  kind: "terms",
  title: "Terms of Use",
  short: "Terms",
  version: "2026-10-27",
  effectiveOn: "2026-10-27",
  material: false,
  summary:
    "These terms are the agreement between you and us for using Cheeku AI. Cheeku helps you understand and organise health information; it does not diagnose, prescribe or replace a doctor.",
  changes: ["Contact details: our Grievance Officer is named, with privacy and support email addresses."],
  sections: [
    {
      id: "who",
      heading: "1. Who we are and what this covers",
      blocks: [
        { p: `${E.brand} is provided by ${E.legalName}, ${E.registeredAddress} ("we", "us"). These Terms of Use apply to the ${E.brand} mobile app, its website and any related service (together, "Cheeku").` },
        { p: "By creating an account or using Cheeku you agree to these terms and to our Privacy Policy. If you do not agree, please do not use Cheeku." },
      ],
    },
    {
      id: "not-medical",
      heading: "2. Cheeku is not a doctor",
      blocks: [
        { note: "In an emergency, call 112 or go to the nearest hospital. Do not wait for an answer in the app." },
        { p: "Cheeku reads what you describe against the records you have added and general health information, tells you how urgent something looks, and helps you prepare for a doctor. It does not diagnose conditions, prescribe or change medicines, or create a doctor and patient relationship." },
        { p: "Always follow the advice of a qualified medical professional. Never ignore professional advice, or delay seeking it, because of something you read in Cheeku. Information read from your documents can be wrong; check important values against the original report." },
      ],
    },
    {
      id: "eligibility",
      heading: "3. Your account",
      blocks: [
        { p: "You must be 18 or older to create an account. You can add children and other family members to your account as described in section 5." },
        { p: "Keep your password and device secure. You are responsible for what happens under your account, and you should tell us straight away if you think someone else has used it." },
        { p: "Give accurate information when you sign up and keep it up to date." },
      ],
    },
    {
      id: "your-content",
      heading: "4. Your records stay yours",
      blocks: [
        { p: "You own the documents, readings and other content you add. You give us a limited licence to store, copy, read and process that content only to provide Cheeku to you and as described in the Privacy Policy and the consents you give." },
        { p: "Only add content you have the right to add. Do not upload anything unlawful, or anyone else's records without their permission or lawful authority." },
      ],
    },
    {
      id: "family",
      heading: "5. Family members",
      blocks: [
        { p: "You may add family members and manage their records. When you do, you confirm that you are the parent or lawful guardian of any child you add, and that any adult you add has agreed to you managing their records, or that you are otherwise authorised to." },
        { p: "Everyone on your plan shares your account. Do not add someone whose records they would not want you to see." },
      ],
    },
    {
      id: "care",
      heading: "6. Booking care through partners",
      blocks: [
        { p: "Tests, consultations, medicines and other services booked in Cheeku are provided by independent, licensed care partners, not by us. The partner is responsible for the service, the clinical care, and the report or advice they give." },
        { p: "We share with the partner only what a booking needs. Prices, availability and cancellation rules are shown before you confirm and may be set by the partner." },
      ],
    },
    {
      id: "plans",
      heading: "7. Plans and payments",
      blocks: [
        { p: "Some features need a paid plan. Prices and what each plan includes are shown in the app before you buy. Subscriptions bought through the App Store or Google Play renew automatically until you cancel, and are managed and refunded under that store's rules." },
        { p: "If you cancel or downgrade, you keep access until the end of the period you paid for. Your records are never deleted because a plan ends; family members a smaller plan does not cover are kept and locked until you choose otherwise." },
      ],
    },
    {
      id: "use",
      heading: "8. Fair use",
      blocks: [
        {
          list: [
            "Do not try to access another person's account or data.",
            "Do not interfere with, overload, reverse engineer or scrape Cheeku.",
            "Do not use Cheeku to give medical services to other people or as part of a clinical system.",
            "Do not use Cheeku for anything unlawful, harmful or misleading.",
          ],
        },
        { p: "We may suspend or close an account that breaks these rules, with notice where the law and the situation allow. You can export your data before an account is closed unless the law prevents it." },
      ],
    },
    {
      id: "ip",
      heading: "9. Our software",
      blocks: [
        { p: `Cheeku's software, design, brand and content (other than yours) belong to ${E.legalName} or its licensors. You may use them only to use Cheeku as these terms allow.` },
      ],
    },
    {
      id: "liability",
      heading: "10. Responsibility and limits",
      blocks: [
        { p: "We work hard to keep Cheeku accurate, available and secure, but it is provided as it is. Health information is complex and Cheeku can be wrong or unavailable." },
        { p: "To the extent the law allows, we are not liable for indirect or consequential loss, or for decisions taken without professional medical advice. Our total liability to you for any claim is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited by law." },
      ],
    },
    {
      id: "changes",
      heading: "11. Changes and ending",
      blocks: [
        { p: "We may update these terms. If a change matters, we will tell you in the app before it takes effect and ask you to agree again where needed. You can stop using Cheeku and delete your account at any time from Settings." },
      ],
    },
    {
      id: "law",
      heading: "12. Law and disputes",
      blocks: [
        { p: `These terms are governed by the laws of India. Courts at ${E.jurisdiction} have jurisdiction, without affecting any right you have to bring a claim where you live. Please contact us first at ${E.supportEmail}; most problems are solved faster that way.` },
      ],
    },
  ],
};

// ---------------------------------------------------------------- privacy --

const PRIVACY: LegalDocument = {
  kind: "privacy",
  title: "Privacy Policy",
  short: "Privacy",
  version: "2026-10-27",
  effectiveOn: "2026-10-27",
  material: false,
  summary:
    "We collect what Cheeku needs to keep your family's health records and answer your questions, and nothing for advertising. We never sell your data, and you can see, correct, export or delete it at any time.",
  changes: [
    "Location: if you allow it, where your phone is while the app is open, and places you pick for family members, so we can show care nearby and fill in addresses.",
    "Contact details: our Grievance Officer is named, with privacy and support email addresses.",
  ],
  sections: [
    {
      id: "scope",
      heading: "1. Who is responsible",
      blocks: [
        { p: `${E.legalName} ("we") is the Data Fiduciary for personal data processed through ${E.brand}, under India's Digital Personal Data Protection Act, 2023 and its Rules ("DPDP Act").` },
        { p: `Questions and requests go to our Grievance Officer, ${E.grievanceOfficer}, at ${E.privacyEmail}, or through Settings, Privacy in the app.` },
      ],
    },
    {
      id: "collect",
      heading: "2. What we collect",
      blocks: [
        {
          list: [
            "Account details: email address, a one-way hash of your password, your plan, and your consent choices.",
            "Family profiles: names, relationship to you, and optional details such as date of birth, sex, blood group, height, weight, conditions, allergies and medicines.",
            "Health records: documents and photos you upload, the values read from them, readings and symptoms you enter, appointments and bookings.",
            "Conversations: the questions you ask Cheeku and its replies, including the urgency it gave.",
            "Location, only if you allow it: where your phone is while the app is open, and places you pick for family members. We keep the latest place for each person, not a history, and use it to show care nearby and fill in addresses for home visits.",
            "Device and security data: device type, operating system, app version, notification token, sign-in times and security events such as a password reset.",
            "Support messages you send us.",
          ],
        },
        { p: "Most profile details are optional; leave out what you do not want to share. We remove location (GPS) data from photos on your phone before they are uploaded, and we do not keep the original file name." },
        { note: "We do not collect your contacts, advertising ID, or browsing activity in other apps. We never read your location in the background, and you can turn it off or wipe it in Profile, Location." },
      ],
    },
    {
      id: "why",
      heading: "3. Why we use it",
      blocks: [
        { p: "We use your data only for the purposes you agree to in the Health Data Consent:" },
        { list: REQUIRED_PURPOSES.map((p) => `${PURPOSE_COPY[p].title}: ${PURPOSE_COPY[p].line}`) },
        { p: "And, only if you turn them on in Settings, Privacy:" },
        { list: OPTIONAL_PURPOSES.map((p) => `${PURPOSE_COPY[p].title}: ${PURPOSE_COPY[p].line}`) },
        { p: "We may also process data without consent where the DPDP Act allows, for example to comply with a law or court order, or to respond to a medical emergency involving a threat to someone's life." },
      ],
    },
    {
      id: "share",
      heading: "4. Who we share it with",
      blocks: [
        { note: "We never sell your personal data, and we never use your health data to show you advertising." },
        {
          list: [
            "Service providers (Data Processors) who host our database and files, run AI models, send notifications, turn a map point into an address and process payments. They act only on our written instructions, under contract, and may not use your data for themselves. A map point is sent from our server, never with your name.",
            "Care partners, only for a booking you make, and only what that booking needs.",
            "Research, public-health or insurance partners, only if you turn on research and insights, and only de-identified and aggregated data that does not identify you.",
            "Authorities, when the law requires it.",
            "A buyer or successor, if our business is transferred, under the same protections.",
          ],
        },
        { p: "A current list of our main processors is available from the Grievance Officer on request." },
      ],
    },
    {
      id: "where",
      heading: "5. Where it is stored",
      blocks: [
        { p: `Your data is stored on servers in ${E.hostingRegion}. Some processors may handle data outside India; where they do, we only transfer to places the Government of India has not restricted, under contracts that protect it.` },
      ],
    },
    {
      id: "security",
      heading: "6. How we protect it",
      blocks: [
        {
          list: [
            "Encryption in transit (TLS) and at rest.",
            "Database rules that tie every record to your account, enforced by the database itself, not only the app.",
            "Your session is kept in your phone's secure keychain. You can add a Face ID, fingerprint or passcode lock.",
            "Records kept on your phone for offline reading are cleared when you sign out, and you can turn offline copies off.",
            "Our staff access production data only for support or safety work.",
          ],
        },
        { p: "No system is perfectly secure. If a breach affects your personal data, we will tell you and the Data Protection Board of India as the DPDP Act requires, with what happened and what you can do." },
      ],
    },
    {
      id: "retention",
      heading: "7. How long we keep it",
      blocks: [
        { p: "We keep your data while your account is open. When you delete your account, your records, files and conversations are deleted from our live systems straight away and from backups within 90 days." },
        { p: "We keep a record of your consents and withdrawals after your account is closed, for as long as the law requires us to be able to show how your data was handled. It contains no health information." },
      ],
    },
    {
      id: "rights",
      heading: "8. Your rights",
      blocks: [
        {
          list: [
            "Access: see a summary of your data and how it is used, and export a copy (Settings, Download my data).",
            "Correction: fix or complete anything that is wrong, in the app or by asking us.",
            "Erasure: delete your account and everything in it (Settings, Delete all my data).",
            "Withdraw consent: at any time, as easily as you gave it, in Settings, Privacy. This does not undo processing before you withdrew.",
            "Grievance: raise a concern with our Grievance Officer. We respond within the time the DPDP Rules set.",
            "Nominate: name someone to exercise these rights for you if you die or become unable to.",
          ],
        },
        { p: "If you are not satisfied with our response to a grievance, you may complain to the Data Protection Board of India." },
      ],
    },
    {
      id: "children",
      heading: "9. Children",
      blocks: [
        { p: "Accounts are for adults. A child's records can only be added by a parent or lawful guardian, whose consent covers that child. We do not track children's behaviour, profile them, or show them targeted advertising." },
      ],
    },
    {
      id: "changes",
      heading: "10. Changes to this policy",
      blocks: [
        { p: "When we change this policy we update the date above. If the change widens what we collect or who we share it with, we will ask you to agree again in the app before it applies to you." },
      ],
    },
  ],
};

// -------------------------------------------------------- health consent --

const HEALTH_CONSENT: LegalDocument = {
  kind: "health_consent",
  title: "Health Data Consent",
  short: "Health data consent",
  version: "2026-10-27",
  effectiveOn: "2026-10-27",
  material: false,
  summary:
    "This is the consent notice under India's DPDP Act. It lists exactly what Cheeku does with your family's health data when you tick the box, and the optional uses that stay off unless you turn them on.",
  changes: ["Contact details: our Grievance Officer is named, with privacy and support email addresses."],
  sections: [
    {
      id: "notice",
      heading: "1. About this notice",
      blocks: [
        { p: `This notice is given by ${E.legalName} under section 5 of the Digital Personal Data Protection Act, 2023. It explains the personal data we will process and why, so that your consent is informed. It is available in the app at any time under Settings, Privacy.` },
      ],
    },
    {
      id: "required",
      heading: "2. What you agree to when you tick the box",
      blocks: [
        { p: "These uses are needed for Cheeku to work. Ticking the box at sign-up agrees to all of them together:" },
        { list: requiredList },
        { p: "You also confirm that you are 18 or older." },
      ],
    },
    {
      id: "optional",
      heading: "3. Optional uses, off unless you turn them on",
      blocks: [
        { p: "These are never needed for Cheeku to work, are not part of the sign-up box, and stay off until you choose them in Settings, Privacy:" },
        { list: optionalList },
      ],
    },
    {
      id: "withdraw",
      heading: "4. Changing your mind",
      blocks: [
        { p: "You can withdraw any consent at any time in Settings, Privacy, and it takes effect straight away for anything that relies on it." },
        { p: "Withdrawing an optional use simply switches it off. Withdrawing a required use pauses Cheeku for your account, because it cannot work without it: your records stay safe and are not used, you can still export or delete them, and you can resume by agreeing again." },
      ],
    },
    {
      id: "rights",
      heading: "5. Your rights and complaints",
      blocks: [
        { p: `You can ask to access, correct, complete or erase your data, nominate someone to act for you, and raise a grievance with our Grievance Officer, ${E.grievanceOfficer}, at ${E.privacyEmail}. If you are not satisfied with our response you may complain to the Data Protection Board of India.` },
      ],
    },
    {
      id: "record",
      heading: "6. Our record of your consent",
      blocks: [
        { p: "We keep a record of each consent and withdrawal: which uses, which version of this notice, when, and from which app version. You can see it in Settings, Privacy, and it is included in your data export." },
      ],
    },
  ],
};

// ---------------------------------------------------------------- storage --

const STORAGE: LegalDocument = {
  kind: "storage",
  title: "Cookie and On-device Storage Notice",
  short: "Cookies and storage",
  version: "2026-10-08",
  effectiveOn: "2026-10-08",
  material: false,
  summary:
    "Cheeku uses no advertising cookies, no tracking pixels and no third-party analytics. It keeps a small amount of data on your phone so the app works, opens fast and can show your records without a signal.",
  changes: [],
  sections: [
    {
      id: "no-trackers",
      heading: "1. No tracking, no advertising",
      blocks: [
        { note: "Cheeku contains no advertising SDK, no analytics or session-recording tool, and does not read your advertising ID." },
        { p: "The app does not use browser cookies. Where we use a website, it sets only the strictly necessary storage needed to keep you signed in, and no tracking cookies." },
      ],
    },
    {
      id: "what",
      heading: "2. What the app keeps on your phone",
      blocks: [
        {
          list: [
            "Your sign-in session, in the phone's secure keychain (iOS Keychain or Android Keystore). Needed to keep you signed in.",
            "Settings such as the family member you last viewed, the app lock switch and your notification choices. Needed so the app behaves as you set it.",
            "An offline copy of your records list and record details, for up to 7 days, so you can read them without a signal. You can switch this off or shorten it in Settings, Storage and cache.",
            "Addresses you saved for home collection or delivery, and recent booking reminders, so you do not have to type them again.",
            "Temporary files, such as a photo you are uploading or a data export you are sharing. These are removed after use and when you clear the cache.",
          ],
        },
      ],
    },
    {
      id: "control",
      heading: "3. Your control",
      blocks: [
        { p: "Signing out removes everything above except settings that are about the device rather than you. You can also clear the cache, switch off offline copies, and see exactly what is stored in Settings, Storage and cache." },
        { p: "Uninstalling the app removes all of it. Data on our servers is not affected by any of these; to delete that, use Delete all my data." },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalKind, LegalDocument> = {
  terms: TERMS,
  privacy: PRIVACY,
  health_consent: HEALTH_CONSENT,
  storage: STORAGE,
};

export const LEGAL_ORDER: readonly LegalKind[] = ["terms", "privacy", "health_consent", "storage"];

/** The documents the sign-up box and the re-consent sheet agree to. */
export const CONSENTED_KINDS: readonly LegalKind[] = ["terms", "privacy", "health_consent"];

/**
 * SHA-256 of `canonical(doc)` for each document, as published in
 * `legal_documents.text_sha256` (migrations 0031, 0040, 0041). Checked by documents.test.ts:
 * edit a text without updating this and the tests fail.
 */
export const DOCUMENT_HASHES: Record<LegalKind, string> = {
  terms: "d7d7256d59643bd576108a9db6a14be333b4f8e1f8b5190f89a8a24bcc6127a5",
  privacy: "70a3cca6408c880fde138f2ea42de5a15d441655310808c52a63b9ebecfc7579",
  health_consent: "6a98d33bc73a80f4d00b36fd4b7bbf6957b06f194c7997a818783cc05353f032",
  storage: "51dee9ee8cb660445b6fd5ee7b8f5d391b9963cfa6b9bfaa4e35720b51f3f4bf",
};

/** The exact bytes the hash is taken over. Stable key order, no whitespace. */
export function canonical(doc: LegalDocument): string {
  return JSON.stringify({
    kind: doc.kind,
    title: doc.title,
    version: doc.version,
    effectiveOn: doc.effectiveOn,
    summary: doc.summary,
    sections: doc.sections.map((s) => ({ id: s.id, heading: s.heading, blocks: s.blocks })),
  });
}

/** `{ terms: "2026-10-08", privacy: ..., health_consent: ... }` for the consent record. */
export function consentedVersions(): Record<string, string> {
  return Object.fromEntries(CONSENTED_KINDS.map((k) => [k, LEGAL_DOCUMENTS[k].version]));
}

/** One fingerprint for the bundle that was agreed: the three hashes, joined in order. */
export function consentedFingerprint(): string {
  return CONSENTED_KINDS.map((k) => `${k}:${DOCUMENT_HASHES[k]}`).join("|");
}
