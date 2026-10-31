# Personal data breach runbook

Owner: Athar Ali, Grievance Officer. Second: Archit (backend and security).

A breach is any unauthorised access to, change to, loss of or sharing of
personal data we hold: a leaked key, a table readable by the wrong people, a
lost laptop with a database copy, a partner exposing booking details. When in
doubt, treat it as one and start here.

The clock starts when we become aware of it, not when we are sure.

## The first hour

1. **Write down the time** you found out and how. Start a private incident
   note (date, what was seen, who knows). Never put health data in it.
2. **Stop the leak.** Whichever applies:
   - Rotate the leaked key: Supabase (service role, anon key), the Ola Maps
     key, the push webhook secret, the privacy webhook secret, model API keys.
   - Turn off the leaking path: disable the Edge Function, revoke the grant,
     drop the policy, take the Vercel deployment down.
   - Sign everyone out if sessions are at risk (Supabase, Authentication).
3. **Keep the evidence.** Do not delete logs or rows. Export the Supabase
   logs for the window.
4. **Call Archit** and agree who does what.

## Within 6 hours: CERT-In

Cyber security incidents (unauthorised access, data leaks, compromised
systems) are reported to CERT-In within 6 hours of noticing, under its April
2022 directions: incident@cert-in.org.in, using the form on cert-in.org.in.
Send what is known; it can be updated.

## Without delay: the people affected

The DPDP Rules ask us to tell every affected person without delay, in plain
words, through the app and email:

- what happened, when, and how big it was
- what it could mean for them
- what we have done and are doing about it
- what they can do to protect themselves (change password, watch for calls
  claiming to be us)
- who to contact: Athar Ali, Grievance Officer, privacy@cheekuai.in

In the app, an inbox note to each affected account (SQL editor, one insert
per person through `notify_user`, kind `support_update`, route
`/settings/privacy`). The note itself says there is an important update and
to check email; the detail goes by email, not on a lock screen.

## Without delay, then within 72 hours: the Data Protection Board

1. Without delay: a short intimation to the Data Protection Board of India
   that a breach happened, with what is known.
2. Within 72 hours (or longer if the Board allows): the full report. What
   happened and why, what data and how many people, what we did to contain
   it, what we found about who caused it, what we changed so it cannot happen
   again, and copies of what we told the people affected.

The Board's portal and exact form: confirm with the lawyer while drafting
the policy (see dpdp-readiness.md). Do not wait for the lawyer to send the
first intimation.

## Afterwards

- A written post-mortem within two weeks: timeline, cause, fix, what we
  change in how we build. No blame, no health data.
- Update `PROGRESS.md` with the lesson, and this runbook if a step was wrong.
- Keep the incident note, the notices sent and the Board report for at least
  a year.

## Why it matters

Under the DPDP Act, failing to take reasonable security safeguards can cost
up to ₹250 crore, and failing to notify the Board or the people affected up
to ₹200 crore. Telling people quickly is also the only way to keep their
trust in an app that holds their family's health.
