# DPDP readiness

The Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025 apply
to Cheeku as a Data Fiduciary: we decide why and how family health data is
processed. Most duties under the Rules apply 18 months after they were
notified in November 2025, so by about May 2027. We are building to them now
because the launch comes first.

## Where each duty stands

| Duty | Status | Where |
|---|---|---|
| Notice in plain language before consent, itemised by purpose | Built | Health Data Consent, `src/lib/legal/documents.ts` |
| Consent recorded with the exact text, per purpose, withdrawable | Built | `consent_log`, migration 0031 |
| Re-consent when a text changes materially | Built | Consent gate; 0040 used it for location |
| Access, correction, nomination, grievance requests | Built, answered | Settings, Privacy; `privacy_queue`, `answer_privacy_request`, migration 0041; `requests.md` |
| Export (portability) | Built | Download my data |
| Erasure | Built | Delete all my data, `delete-account` function |
| Grievance Officer named with contact | Done | Athar Ali, privacy@cheekuai.in, in every legal text |
| Answer within 90 days | Built | `due_by` on every request, `privacy_queue.days_left`, email on arrival |
| Breach notice to people and the Board | Written | `breach-runbook.md` |
| Security safeguards | Partly | Row level security everywhere, app lock, no health data in logs or push. Open: `sec-definer-review`, `sec-pentest`, `sec-secrets`, `ops-backups` |
| Children's data needs verifiable parental consent | Covered by design | Children exist only as family members added by an adult account holder; the sign-up box asks the person to confirm they are 18 or older. Ask the lawyer whether that is enough |
| Legal entity, registered address, jurisdiction | Waiting | On incorporation; `src/lib/legal/entity.ts` still has placeholders and the app says so |
| Lawyer review of all four texts | Waiting | See below |

## For the lawyer

Send these, and ask the questions under them:

1. Terms of Use, Privacy Policy, Health Data Consent, Storage and Cookies
   (the text is in `src/lib/legal/documents.ts`; Settings, Privacy shows each).
2. `requests.md` and `breach-runbook.md`.

Questions:

- Is the consent notice specific enough for health data, purpose by purpose?
- Care partners (labs, doctors, fitness studios) receive the booking details a
  person confirms. Are they processors for us, or fiduciaries in their own
  right, and what contract do we need with each?
- The AI model provider processes chat text. What do we need in that contract,
  and does hosting outside India need anything beyond the notice?
- Does adding a family member (a parent, a child) on someone's account need
  anything more from that family member?
- The Board's portal and form for breach intimation.
- Anything that should be in the Terms before payments go live.

## Still to do before launch

1. Incorporate, then fill `src/lib/legal/entity.ts` (name, address, city),
   publish the new versions (not material) and drop the placeholder note.
2. Create privacy@cheekuai.in and support@cheekuai.in, set the privacy-alert
   function's mail key, and send yourself a test request.
3. Lawyer review, then apply what they change.
4. The security items above, owned by Archit.
