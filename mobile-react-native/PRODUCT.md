# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

(Expo / React Native. Android and the web export ship the same design; iPhone is the primary test device.)

## Users

The family health manager in India: usually a 25 to 45 year old adult who looks after their own health and their family's (most often their parents, also partner and children), on their phone, in short moments between other things. They keep everyone's reports in one place, ask what a result means, and book care for whoever needs it.

## Product Purpose

Cheeku is a family health memory. People snap or forward reports, prescriptions and bills; Cheeku reads and files them per person, remembers every value, answers questions from those records (never from general knowledge), and books doctors, lab tests and medicines through the same conversation.

Success for a new user: they ask Cheeku their first question on the first visit, then add their first record, and come back because the answers are about their own family.

## Positioning

A memory of the whole family's health that you talk to. Answers come only from the family's own records ("grounded or silent"), and booking care happens inside that same chat, with the history already attached.

## Operating Context

- First action for a new user (owner's decision, 17 Nov 2026): ask Cheeku a question. Adding the first report follows from the conversation and from Home.
- Booking is chat-first: services start a conversation, not a separate catalogue.
- Partner network (LabStack) supplies real labs, pharmacies and doctors; payment model still undecided.
- Free plan covers one person; Family plan up to four people.

## Capabilities and Constraints

- Never diagnoses, prescribes or gives dosages; safety gate runs before any AI call; profiles are isolated at the database; no analytics or third-party SDKs (see README.md "The five rules").
- India-first: ₹ pricing, UPI, Hindi/Hinglish, 112/108 emergency numbers.
- Customer-facing copy does not name partners (LabStack).

## Brand Commitments

- Name: Cheeku. Mascot: the lilac Cheeku character (assets in `assets/`, `src/components/illustrations`).
- Voice: warm, plain, human; no em dashes; never sounds like a generic AI.
- Service icons: Microsoft Fluent 3D emoji set (MIT licence), chosen by the owner 17 Nov 2026.
- Home shows the family as a row of photo avatars (owner's decision, 17 Nov 2026).

## Evidence on Hand

- Owner feedback after showing the app (17 Nov 2026): "the wow factor has gone", Home "looks too much happening", new users unsure what to do, black buttons and cards too heavy.
- References the owner likes: Alo (US health app: sky gradient, family photo row, 3D objects, airy) and Swish (Indian food app: bold, colourful, playful).
- No real testimonials, user counts or clinical claims exist; do not invent them.

## Product Principles

1. One clear next step at a time; the screen breathes.
2. Talk first: the conversation is the front door to records and care.
3. The family is always one tap away.
4. Grounded or silent: never imply knowledge the records don't hold.
5. Warmth without noise: delight in a few places, calm everywhere else.

## Accessibility & Inclusion

Users range from tech-comfortable adults to their older parents: large tap targets, readable type, respect for Reduce Motion, and plain English that works for Hinglish speakers.
