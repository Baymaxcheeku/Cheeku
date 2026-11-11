# Secure sign-in map

Scope: sign-up, sign-in, code verification, password recovery, password change,
sessions. Nothing else. Written 2026-11-11 from a read of the mobile app as it is
on `feat/ai-api-on-baymax`.

**Status 2026-11-11.** Phase 1 client work is built (C1, C2, C3, C4, C6, C7):
`/verify`, `/reset-password`, sign-up/log-in/forgot-password wired to codes,
Settings' Change password on the same path, token refresh following the app,
and a revoked session signing the phone out. Templates are in
`supabase/templates/`. Still to do: the dashboard switch (PLAN.md Open), C5
(`reauthenticate()` + `secure_password_change`, Phase 2; Change password uses
the recovery code meanwhile), `config.toml`, SMTP, captcha, MFA. Sections 1 and
2 describe the app before this work.

## 1. Where it stands today

| Piece | State | Evidence |
|---|---|---|
| Sign-up | Email + password + consent tick → `signUp` | `app/sign-in.tsx:137-139` |
| Sign-in | Email + password → `signInWithPassword`, one enumeration-safe error | `app/sign-in.tsx:141-152` |
| Email verification | **Off.** `mailer_autoconfirm: true` since the 2/hour SMTP throttle | `SECURITY.md` known gaps, `PROGRESS.md:337-344` |
| Verification screen | **None.** No `verifyOtp`, no `resend`, no code input anywhere | grep: zero hits |
| Forgot password (signed out) | **None.** Reset exists only in Settings, which needs a session | `app/settings/security.tsx:101` |
| Reset completion | **Broken on native.** Sends a *link*; `detectSessionInUrl: false`, no `redirectTo`, no `PASSWORD_RECOVERY` handler | `src/lib/supabase/client.ts:79` |
| Change password | Re-auths with `signInWithPassword`, then `updateUser` | `src/lib/settings/actions.ts:290` |
| Sign out other devices | `signOut({ scope: "others" })` | `app/settings/security.tsx:136` |
| Token storage | SecureStore, chunked, fails closed | `src/lib/supabase/client.ts` (good) |
| App lock | Biometric gate around the navigator | `src/components/app/app-lock-gate.tsx` (good) |
| Auth config in repo | **None.** No `supabase/config.toml`; everything is dashboard-only | launch tracker `ops-auth-config` |
| Server password minimum | 6 (app enforces 10) | `SECURITY.md` known gaps |
| Rate limit / captcha | Supabase defaults only, no captcha | launch tracker `rl-auth` |
| MFA | None | — |

## 2. What breaks the moment confirmation is turned back on

These have to land together with the switch. Doing only one of them will break sign-up.

1. **Sign-up dead-ends.** With confirmation on, `signUp` returns a user and no
   session. `resolveLanding()` then calls `getUser()`, gets null, and returns
   `/welcome`. The new user ends up back on the carousel with no message. The web app handled this case
   (`PROGRESS.md:357`); the mobile port does not.
2. **Sign-in for an unconfirmed account** returns `email_not_confirmed`, which
   the form reports as "That email and password do not match an account". The password was right.
3. **Links do not complete on a phone.** The default emails carry
   `{{ .ConfirmationURL }}`. Nothing in the app catches `cheekuai://` auth
   callbacks, so clicking one confirms the address in a browser and leaves the
   app still signed out. **Codes avoid that whole problem.** Every email in this design is a
   6-digit code (`{{ .Token }}`), typed into the app.
4. **Sign-up errors are raw.** `authError.message` is shown as-is, so
   "User already registered" leaks whether an address has an account, and a
   429 reads as a mystery. `authFailureMessage()` exists in the web app
   (`src/lib/auth/actions.ts:49`) and was never ported.

## 3. The target flows

Every email carries a code, not a link. All codes are 6 digits, expire in 10
minutes, and can be resent once every 60 seconds.

### Sign-up
```
email + password + consent
  → auth.signUp({ email, password, options: { data: { consent } } })
  → /verify?email=…&purpose=signup            (always, whatever came back)
  → auth.verifyOtp({ email, token, type: "email" })
  → session → ensureSignupConsent() → logActivity("sign_in") → resolveLanding()
```
- Always go to `/verify`, even when the address is already registered. With
  confirmation on, Supabase returns an obfuscated user for an existing address
  and sends nothing. The screen looks the same either way, so there is no enumeration.
- Resend: `auth.resend({ type: "signup", email })`.

### Sign-in
```
email + password → signInWithPassword
  ok                    → resolveLanding()
  email_not_confirmed   → auth.resend({ type: "signup" }) → /verify?purpose=signup
  invalid_credentials   → the one generic message (unchanged)
  over_*_rate_limit     → "Too many attempts. Wait a minute and try again."
```
Optional second door, for people who forgot their password: "Email me a code instead".
It calls `signInWithOtp({ email, options: { shouldCreateUser: false } })`, then
goes to `/verify?purpose=login` and calls `verifyOtp({ type: "email" })`. `shouldCreateUser: false`
stops this from becoming a sign-up path that skips the consent tick.

### Forgot password (signed out)
```
"Forgot password?" on /sign-in
  → resetPasswordForEmail(email)               (same message whatever happens)
  → /verify?purpose=recovery
  → verifyOtp({ email, token, type: "recovery" })   → recovery session
  → /reset-password: new password (passwordSchema)
  → updateUser({ password }) → signOut({ scope: "others" }) → resolveLanding()
```
The settings-screen reset reuses the same `/verify` → `/reset-password` path,
so its broken link goes away too.

### Change password (signed in)
```
auth.reauthenticate()          → code emailed
  → enter code → updateUser({ password, nonce: code })
  → notify + logActivity("password_changed") → signOut({ scope: "others" })
```
Turn on `secure_password_change` so the server enforces this, not just the
client. This replaces the current `signInWithPassword` re-auth. That call also mints
a fresh session as a side effect, and nothing on the server requires it.

### Change email (later, same pattern)
`updateUser({ email })` with double confirmation. The old address and the new one each get a code.

## 4. Server settings (`supabase/config.toml` + dashboard)

`config.toml` only drives local dev until `supabase config push` is run. Both
places need the same values, and the file is the record of what they should be.

```toml
[auth]
site_url = "https://cheekuai.in"
additional_redirect_urls = ["cheekuai://"]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
minimum_password_length = 10
password_requirements = ""            # length over composition (NIST); app agrees

[auth.rate_limit]
email_sent = 30                       # per hour, needs custom SMTP
sign_in_sign_ups = 30                 # per 5 min per IP
token_verifications = 30              # per 5 min per IP — caps code guessing
token_refresh = 150

[auth.email]
enable_signup = true
enable_confirmations = true           # ← the switch
double_confirm_changes = true
secure_password_change = true
max_frequency = "60s"
otp_length = 6
otp_expiry = 600

[auth.email.smtp]                     # Resend, cheekuai.in verified
enabled = true
host = "smtp.resend.com"
port = 465
user = "resend"
pass = "env(RESEND_API_KEY)"
admin_email = "no-reply@cheekuai.in"
sender_name = "Cheeku AI"

[auth.email.template.confirmation]    # each template shows {{ .Token }}, no link
subject = "Your Cheeku AI code"
content_path = "./supabase/templates/code.html"
# same for: magic_link, recovery, reauthentication, email_change

[auth.sessions]
inactivity_timeout = "720h"           # 30 days unused → sign in again

[auth.captcha]                        # phase 3
enabled = true
provider = "turnstile"
secret = "env(TURNSTILE_SECRET)"
```

Dashboard-only items that the file can't hold: leaked-password protection
(HaveIBeenPwned, paid plan) and rotating the service key and DB password that
`SECURITY.md` says were pasted into a transcript.

## 5. Client work

| # | Change | Where |
|---|---|---|
| C1 | `authFailureMessage(error)` keyed on `error.code`, ported from web. Credential errors stay identical, everything unknown falls through to the generic message | `src/lib/auth/errors.ts` (+ test) |
| C2 | `/verify` screen: 6 boxes, `textContentType="oneTimeCode"` / `autoComplete="one-time-code"` so iOS and Android autofill the code from the email. Paste fills all six. Resend countdown, wrong-code and expired-code messages | `app/verify.tsx`, `src/lib/auth/verify.ts` |
| C3 | Sign-up always goes to `/verify`. Sign-in handles `email_not_confirmed` | `app/sign-in.tsx` |
| C4 | "Forgot password?" link → `/verify?purpose=recovery` → `/reset-password` | `app/sign-in.tsx`, `app/reset-password.tsx` |
| C5 | Settings reset and change password both go through `reauthenticate()` + nonce | `src/lib/settings/actions.ts`, `app/settings/security.tsx` |
| C6 | `AppState` → `startAutoRefresh()` / `stopAutoRefresh()`, as Supabase says React Native apps should | `app/_layout.tsx` |
| C7 | One root `onAuthStateChange`. `SIGNED_OUT` (including a refresh token revoked on the server) → `signOutAndWipe` → `/welcome` | `app/_layout.tsx` |
| C8 | Zod: `otpSchema = z.string().regex(/^\d{6}$/)` | `src/lib/auth/schemas.ts` |
| C9 | Activity log kinds: `verify_sent`, `verify_ok`, `password_reset_done` | `src/lib/privacy/activity.ts` |

## 6. Order of work

**Phase 1 — codes work end to end (P0, blocks launch)**
1. Custom SMTP (Resend) + code templates + `config.toml` (§4, minus captcha).
2. C1, C8, C2, C3, C6, C7.
3. Turn `enable_confirmations` on **in the same release** as C2/C3.
4. Verify on a real device: new sign-up, unconfirmed sign-in, a wrong code,
   an expired code, resend cooldown, iOS code autofill, a second sign-up with the same
   email (it should look the same as the first).

**Phase 2 — recovery and credential changes**
C4, C5, `secure_password_change`, `double_confirm_changes`, signing out other devices after a reset.

**Phase 3 — abuse**
Captcha on sign-up, recovery and code-login (Turnstile through a WebView,
token passed as `options.captchaToken`). Tuned rate limits. Leaked-password check.

**Phase 4 — optional, stronger**
TOTP MFA (`auth.mfa.enroll/challenge/verify`, AAL2 required for export and
delete). Google and Apple sign-in. Passkeys once Supabase supports them natively.

## 7. Tests to add
- `errors.test.ts`: every known code maps to its message, credential codes are
  identical, and an unknown code → generic.
- `verify.test.ts`: purpose → `verifyOtp` type mapping, cooldown maths.
- `tests/db`: consent row still written by the 0031 trigger when the account is
  confirmed later rather than at insert (the user row is inserted at
  `signUp`, so it should be. Prove it).
- Manual device checklist (Phase 1 step 4) recorded in `PROGRESS.md`.
