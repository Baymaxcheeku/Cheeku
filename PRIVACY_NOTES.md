# Privacy notes

Written for whoever maintains this next, and for anyone reviewing it against
India's DPDP Act. It describes what the code does — not what a policy page says.

## What is collected, and why

| Data | Why it exists | Optional? |
|---|---|---|
| Email + password | Account identity | No |
| Profile name | Naming whose records these are | No |
| Date of birth, sex | Age/sex context on a record | **Yes** |
| Phone, email on a profile | Contact detail the user chooses to keep | **Yes** |
| Height, weight, blood group, conditions | Health context | **Yes** |
| Uploaded documents | The product | User-initiated |
| Extracted values | What makes documents searchable | Derived |
| Chat transcripts | Continuity, and a safety audit trail | Derived |
| Consent record | Proof under DPDP | No |

Every field on the profile intake screen **except the name is genuinely
optional**, and the screen says so. This is health data; collecting it because a
form has room is the opposite of data minimisation.

## Consent

DPDP requires consent to be specific, informed and freely given, and
withdrawal to be as easy as giving it. Built 2026-10-08 in the app and in
migration 0031.

**One box, five named uses.** Sign-up has a single unticked checkbox: "I'm 18
or older, and I agree to the Terms of Use, Privacy Policy and Health Data
Consent." It covers only the uses the service cannot run without (account,
health records, AI answers, family profiles, bookings), and a "What this
covers" line expands to list them in plain words. The full documents are one
tap away (`/legal/[doc]`, readable without an account). The goal is that
nobody has to read them to sign up, and anyone who later asks "what did I
agree to" has the exact text.

**Optional uses are separate and off.** Product improvement, research
insights and marketing are never part of the box. They are individual
switches in Settings, Privacy & consent, default off, and need the core
consent first (the database refuses them otherwise).

**The ledger.** `consent_log` is append-only (no update or delete policy) and
now records, per row: purpose, granted or withdrawn, method (sign-up,
re-consent sheet, privacy settings, withdrawal), the document versions agreed
to, a SHA-256 fingerprint of the exact text, a `bundle_id` tying one decision's
rows together, platform, app version and locale. Writes go through
`record_consent()` only; the sign-up decision is written by a trigger on
`auth.users` inside the same insert that creates the account, from the
metadata the form sends.

**Versioned documents.** Texts are bundled in the app
(`src/lib/legal/documents.ts`) and mirrored in `legal_documents` with the same
hash. A test fails if the two drift. A change marked `material` makes everyone
agree again through a full-screen sheet that names what changed; a wording fix
does not.

**Enforced at the database, not the screen.** With `app_flags.enforce_consent`
on, a trigger refuses new documents, chat messages, memory facts and lab
bookings from anyone without current core consent (hint `consent_required`).
The app catches that and shows the consent sheet at once.

**Withdrawal.** Settings, Privacy & consent, "Withdraw consent and pause". The
account and records stay; the app stops reading, answering and saving until
the person agrees again. The sheet they then see offers "Download my data" and
"Sign out" next to "Agree", so not agreeing never costs anyone their records.

**People who signed up before this** see the same box once, framed as "one
quick thing", the next time they open the app.

## What never leaves the device

- **EXIF, including GPS.** Stripped on the phone before upload by re-encoding
  the image (`src/lib/upload/strip-exif.ts`). A photo of a prescription carries
  the coordinates of where it was taken, usually someone's home. **One gap:** if
  the re-encode fails, the original is uploaded rather than losing the
  document. The single-photo screen says so; bulk upload does not yet.
- **The original filename.** Replaced server-side. `Ananya_CBC_Fortis.jpg` names
  a patient, a test and a hospital in one string.
- **Payment credentials.** Never collected — see SECURITY.md.
- **Avatars.** Generated locally from the profile id and inlined as a data URI.
  No request goes to an avatar service, so nobody's family composition is
  inferable from a CDN's logs.

## No third parties

The CSP allows `'self'` and Supabase. Nothing else. There is no analytics SDK,
no error reporter, no font CDN, no tag manager, no session replay. A session
replay tool on these screens would record someone's lab results.

`robots: { index: false, follow: false }` is set globally.

## On the phone (cookies and storage)

The app sets **no cookies** and has no advertising ID access, analytics,
crash reporter or session recording. What it does keep on the phone is listed
in full in Settings, Storage & cache, from `src/lib/privacy/storage-registry.ts`.
A test scans the source for storage keys and fails if one is missing from that
list, so the screen cannot fall behind the code.

- **Sign-out wipes the phone.** `signOutAndWipe` clears the query cache, the
  offline copy, every account-scoped key, the app's temporary files (picked
  and cropped photos, exports), scheduled reminders and the in-memory booking
  stores. Before this, saved addresses, appointment notes and reminders
  survived a sign-out.
- **Offline copy is the person's call.** On by default for 7 days; can be
  switched off (the copy is deleted at once) or shortened to 1 or 3 days.
- **Clear cache** removes the offline copy and temporary files without signing
  out. Nothing on the server is touched.

## What the AI does and does not see

- The chat is grounded **only in the active profile's records**. Scoping to the
  account would let one family member's results shape an answer given under
  another's name.
- V1 ships **no live model**. Answers come from a deterministic mock reading the
  user's own extracted values. Nothing is sent to any inference provider.
- When a real provider is added, the boundary to preserve is the same: the
  grounding set is one profile, and the safety gate runs before the call.
- **Grounded or silent.** When no record covers a question the app says so
  rather than answering from general knowledge, and says why.

## Rights

| Right | Status |
|---|---|
| **Access / portability** | Built. Profile → Export my data. Produces a JSON file of every profile, document record, extracted value, timeline event, conversation, message and the consent log. Read through the anon client, so RLS bounds it to the caller's own data. |
| **Erasure** | Built. Profile → Delete all my data. Removes storage objects first, then cascades every row. Verified: no orphaned files. |
| **Correction** | Partial. Extracted values are editable at review; profile fields are editable. Anything else goes through a correction request (below). |
| **Withdraw consent** | Built 2026-10-08. Optional uses switch off individually; the core consent can be withdrawn without deleting the account, which pauses the service. |
| **Requests** | Built 2026-10-08. Privacy & consent sends access, correction, nomination and grievance requests to `privacy_requests`, each due 90 days out, with status visible to the person. Nobody works the queue yet. |
| **Grievance** | Officer named in every document and on the Privacy screen. Currently a placeholder (see Known gaps). |

The export names storage objects rather than inlining them. A JSON file with a
dozen base64 PDFs in it is unusable, and the originals are downloadable from
each record's own screen.

## Retention

There is **no retention policy and no automatic deletion**. Data persists until
the user deletes it. This is a gap worth closing before launch: DPDP expects
personal data to be erased when the purpose is served.

`consent_log` deliberately survives account deletion. It records that consent
was given and withdrawn, carries no health data, and is the thing a regulator
asks for.

## Known gaps

- **No retention or auto-deletion policy.**
- **No read audit log.** Nobody can answer "who opened this record and when".
- **Legal entity details are placeholders.** `src/lib/legal/entity.ts` holds
  the company name, address, grievance officer and contact emails in
  [brackets], and every document shows a "draft" banner while it does. The
  texts themselves need a lawyer's read before launch.
- **Nobody works `privacy_requests` yet.** The table and the 90-day clock
  exist; an admin view or an email to the grievance officer does not.
- **Bulk upload does not warn when the EXIF strip fails** (see above).
- **No correction path** for a filed record's extracted values.
- **Email confirmation is currently off** (development), so an address can be
  registered by someone who does not own it.
- **Breach notification process** is undefined.

## The safety trade-off worth knowing about

Escalated messages — the ones that trip the emergency gate — are **written to the
transcript and kept**, with `safety_status = 'escalated'` and no reply. This is
deliberate: a safety audit that cannot see what was said is not an audit.

It does mean the most sensitive sentence a user ever types is also one that is
retained. `messages` is append-only, so it cannot be quietly edited, and account
deletion removes it along with everything else. Anyone changing this should
weigh both sides rather than only one.
