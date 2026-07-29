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

DPDP requires consent to be specific, informed and freely given.

- The checkbox is **unticked by default** and is `z.literal(true)` in the schema,
  so an unticked box is a *parse* failure rather than a check somebody can
  forget to write.
- The copy names what is being consented to rather than linking away.
- It is written to `consent_log` **in the same request that creates the
  account**, with `CONSENT_VERSION` exported from the schema that enforced it —
  so the logged version can never drift from what was actually agreed.
- `consent_log` has no update or delete policy. An editable consent record is
  not evidence.

Verified: submitting Create account with the box unticked returns *"Please
accept the privacy terms to continue"* and creates nothing.

## What never leaves the device

- **EXIF, including GPS.** Stripped in the browser before upload. A photo of a
  prescription carries the coordinates of where it was taken, usually someone's
  home. Client-side stripping means those coordinates never cross the network.
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
| **Correction** | Partial. Extracted values are editable at review; profile fields are editable. There is no way to correct a filed record's values after the fact. |
| **Withdraw consent** | Partial. Deleting data is available; a standalone withdrawal that keeps the account is not built. |

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
- **No standalone consent withdrawal** short of deleting everything.
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
