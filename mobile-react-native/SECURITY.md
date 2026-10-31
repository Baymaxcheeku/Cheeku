# Security

Baymax stores medical records. This document is what the build actually
enforces, what it deliberately does not, and how to verify both.

## The isolation boundary

Every table carries `user_id` and is protected by Row Level Security keyed on
`auth.uid()`. No policy uses `using (true)`.

Two layers, and they are not redundant:

- **Between accounts**, RLS is the boundary. Nothing in the application layer is
  trusted to filter one family's records away from another's.
- **Within one account**, the active profile scopes every query. The family
  shares a `user_id`, so RLS cannot separate Amma's records from Athar's — that
  is the app's job, and it is why the chat grounds on
  `listProfileRecords(profile.id)` rather than the account.

Verified two ways:

| Check | Where |
|---|---|
| Static — every table has RLS, every policy references `auth.uid()`, no `using(true)`, append-only tables stay append-only | `tests/db/rls.test.ts` |
| Runtime — two real users, every query path for one returns zero rows of the other's, including cross-user read, write, update, delete and signed-URL attempts | `tests/db/profile-isolation.test.ts` |

The runtime test **must not be allowed to skip in CI**. It reports "skipped, no
project configured" when credentials are absent, which for two phases looked
like it was waiting and in fact could never have run — vitest does not load
`.env.local` on its own. That is fixed in `vitest.config.ts`; the lesson is that
a skipped safety test reads exactly like a passing one.

## The service-role key

The key bypasses RLS entirely and never ships in the mobile app. Since the
Next.js app was removed (2026-10-30) it is used only server-side, in the
Supabase Edge Functions (`supabase/functions/delete-account` for the account
delete, which must remove what the cascade cannot reach), and by local tooling
(`scripts/seed.ts`, `tests/db/profile-isolation.test.ts`). The list below was
written for the web app's `src/lib/supabase/admin.ts`; the rules still apply
to any function that holds the key.

Rules for anything that imports it:

1. Every call filters by a `family_id` or `user_id` derived from
   `requireUser()`, never from a request parameter. There is no net.
2. Never use it to read what the anon client could read. The account **export**
   deliberately uses the anon client so RLS decides what comes back — the one
   place a bug would hand over another family's records is the place that hands
   data out.

Audit it with:

```bash
grep -rn "createAdminSupabase" src --include="*.ts" | grep -v "admin.ts"
```

## Documents

- The `documents` bucket is **private**. There is no `getPublicUrl` call
  anywhere in `src` — verify with `grep -rn "getPublicUrl" src`.
- Originals are reachable only through a **60-second signed URL**, minted
  server-side after an auth check, in `signedDocumentUrl`.
- Object keys are **server-generated** as `<user_id>/<profile_id>/<uuid>.<ext>`.
  The storage policies match on that first segment, so a client-supplied name
  would be a client-supplied authorisation decision. It also keeps the original
  filename — routinely `Ananya_CBC_Fortis.jpg` — out of paths that appear in
  logs.
- **EXIF is stripped in the browser**, before upload. A phone photo of a
  prescription carries the GPS coordinates of the house it was taken in. Doing
  it client-side means those coordinates never cross the network at all.
  HEIC passes through unstripped because canvas cannot decode it in most
  browsers, and silently uploading a blank canvas would destroy the document.

## Errors and logs

- **No `console.*` in `src`.** Verify with
  `grep -rn "console\." src --include="*.ts" --include="*.tsx" | grep -v test`.
- The safety gate's `matched` field returns a **rule id only**, never user text,
  so an escalation can be logged without logging a symptom.
- Error boundaries **never render the error message**. A database error can
  carry column names, ids and occasionally a fragment of a row. Verified against
  a production build with a deliberately incriminating message.
- **Dev builds do inline the message** into the HTML — that is Next's overlay,
  not a production leak, but do not screenshot a dev error into a ticket.

## Headers

**Removed with the Next.js app on 2026-10-30.** This section describes what
`next.config.ts` set for the web build; the mobile app has no server of its
own, and the Expo web export's headers are Vercel's to set. Kept as the
standard to meet if a web surface returns:

- CSP with **no third-party origins** — `default-src 'self'`, Supabase allowed
  for `img-src`/`connect-src` and nothing else. No analytics, no fonts CDN, no
  error reporter. `frame-ancestors 'none'`, `object-src 'none'`.
- HSTS with `preload`, `X-Frame-Options: DENY`, `nosniff`,
  `strict-origin-when-cross-origin`, and a permissions policy that disables
  everything except camera/mic/geolocation for self.

`script-src` still carries `'unsafe-inline'` because Next injects an inline
bootstrap. Moving to a nonce is outstanding.

## Payments

**No payment credential is ever collected.** The checkout UI reproduces the
frames' UPI-and-card chooser, but choosing a method is as far as it goes.
Authorisation belongs in the provider's own sheet, where it is their PCI scope.
`activateTier` is the only function that moves a family onto a plan, so a real
provider's webhook calls that and nothing else changes.

## Deletion

`deleteAccountData` removes **storage objects before rows**, and aborts before
touching a row if storage fails. The object keys live on the document rows;
deleting rows first orphans every file in the bucket with no way left to find
them — the user is told their data is gone while their documents stay on disk.

The typed `DELETE` confirmation is re-checked **server-side**. A destructive
action guarded only by a client-side string comparison is one fetch away from
being unguarded.

`consent_log` survives deliberately. It is the record that consent was given and
withdrawn, which is what a regulator asks for, and it carries no health data.

## Known gaps

These are real and unfixed. They are listed rather than quietly omitted.

| Gap | Impact |
|---|---|
| **No rate limiting** on auth or AI endpoints | The chat quota bounds free-tier cost, but paid tiers and the auth endpoints are unbounded. Needs a durable store. |
| **`'unsafe-inline'` in `script-src`** | Required by Next's inline bootstrap until a nonce-based CSP lands. |
| **Email confirmation is off** | Turned off for development. Anyone can currently register an address they do not own. Must be re-enabled with real SMTP before launch. |
| **Supabase minimum password length is 6** | The app's Zod schema enforces 10, which is what people meet — but the database would accept 6 if anything bypassed the form. |
| **No audit log for reads** | Writes are traceable; nobody can currently answer "who opened this record and when". |
| **Service key and DB password were pasted into a chat transcript** during setup | Both should be rotated before real data exists. |

## Verifying a deployment

```bash
npx tsc --noEmit && npx vitest run
npm run test:db                 # RLS audit + runtime isolation proof
```

RLS coverage can be re-checked live against the database by querying
`pg_class.relrowsecurity` and `pg_policies` for the `public` schema; every table
must have RLS on with at least one policy, and `schema_migrations` must have RLS
on with **zero** policies (deny-all).
