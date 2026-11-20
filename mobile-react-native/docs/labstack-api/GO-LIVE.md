# Switching on the partner network (labs, medicines, doctors)

Everything is built and works today in **preview** (sample data, nothing booked with anyone). These steps turn on the real UAT sandbox. Do them in order. Nobody pastes a key into chat; keys go only into Supabase.

## What's pending, in one list

| # | What | File | Where it goes |
| --- | --- | --- | --- |
| 0 | See which migrations you already have | `supabase/manual/0000-check-what-is-applied.sql` (and `0044-check.sql`) | SQL Editor |
| 1 | Migration 0045 (partner tables) | `supabase/manual/0045-step-1-of-1.sql` | SQL Editor |
| 2 | Check 0045 | `supabase/manual/0045-check.sql` (8 rows, all "yes") | SQL Editor |
| 3 | Edge Function `labstack` | `supabase/manual/0045-labstack-function-paste.ts` | Edge Functions, Via Editor |
| 4 | Edge Function `labstack-webhook` | `supabase/manual/0045-labstack-webhook-function-paste.ts` | Edge Functions, Via Editor, JWT check OFF |
| 5 | Secrets | the 4 below | Edge Functions, Secrets |

If `0044-check.sql` shows any "NO", run the 0044 step first (and older ones the same way); 0045 needs 0027 and 0036.

## 1. Run the migration (2 minutes)

1. Open supabase.com, then your project.
2. Left menu: **SQL Editor**, then **New query**.
3. Open `supabase/manual/0045-step-1-of-1.sql`, copy all of it, paste it in, press **Run**. "Success" means done. Running it twice is safe.
4. New query again, paste `supabase/manual/0045-check.sql`, **Run**. Every row should say **yes**.

## 2. Add the secrets (3 minutes)

1. Left menu: **Edge Functions**, then **Secrets** (or Project Settings, Edge Functions).
2. Add these, one by one, with **Add new secret**:

| Name | Value |
| --- | --- |
| `LABSTACK_API_KEY` | the sandbox key LabStack gave you |
| `LABSTACK_BASE_URL` | the sandbox base URL (`https://integration.labstack.in` unless they said otherwise) |
| `LABSTACK_SIGNING_SECRET` | the signing secret for doctor and instant-consult webhooks (ask LabStack if you don't have one) |
| `LABSTACK_WEBHOOK_SECRET` | the store key for lab and pharmacy webhooks (agree it with LabStack) |

Only if LabStack says its lab webhook header is not called `key`: add `LABSTACK_WEBHOOK_HEADER` with the name they give.

## 3. Deploy the two functions (5 minutes, no CLI needed)

1. Left menu: **Edge Functions**, then **Deploy a new function**, then **Via Editor**.
2. Name it exactly `labstack`. Delete the sample code, paste all of `supabase/manual/0045-labstack-function-paste.ts`, press **Deploy**. Leave "Enforce JWT verification" ON.
3. Again: **Deploy a new function**, **Via Editor**, name `labstack-webhook`, paste `supabase/manual/0045-labstack-webhook-function-paste.ts`. Turn **Enforce JWT verification OFF** (LabStack has no Supabase login; the function checks LabStack's signature itself). **Deploy**.

With the CLI instead: `supabase functions deploy labstack` and `supabase functions deploy labstack-webhook --no-verify-jwt`.

## 4. Sync the lab catalogue (2 minutes)

1. Make up a long password (20+ letters and numbers; it's only for you). In **Edge Functions**, **Secrets**, add it as `LABSTACK_ADMIN_TOKEN`.
2. **Edge Functions**, open `labstack`, then **Test** (top right). Method **POST**.
3. Request Body:
   ```
   {"op":"admin.syncCatalogue","input":{"pincode":"560038"}}
   ```
4. Headers: name `x-admin-token`, value: the same password.
5. **Send Request**. The answer lists how many of our tests were linked, any it couldn't find (`notFound`), and how many packages came in. Send me the `notFound` list and I'll map those by hand.

## 5. Give LabStack our webhook addresses

Replace `<project>` with your project's address (Project Settings, API, Project URL):

| What | Address |
| --- | --- |
| Diagnostics (lab orders) | `https://<project>.supabase.co/functions/v1/labstack-webhook?source=labs` |
| Pharmacy orders | `https://<project>.supabase.co/functions/v1/labstack-webhook?source=pharma` |
| Doctor appointments and instant consults | `https://<project>.supabase.co/functions/v1/labstack-webhook?source=provider` |

## 6. Turn the app to live

In the build's environment (EAS, or `.env.local` for a local run) set:

```
EXPO_PUBLIC_LABSTACK=live
```

Rebuild or restart the app. The "Preview" notes disappear and every booking goes through the gateway.

## 7. Test, in this order

1. **Labs**: book a home collection for tomorrow. Then in UAT move it on with `triggerOrderLifecycle` (I can run these) up to REPORT_DELIVERED. The booking screen should walk the steps, and the report should appear in Records with its values.
2. **Medicines**: search metformin, pick a pharmacy, attach a prescription, place, then cancel.
3. **Doctors**: in chat say "book a doctor for me". The card offers the pre-consultation (questions, note, then partner doctors and live times) and, for a GP on video, "Talk to a doctor in minutes". Book a video visit, open "Join", cancel. Then "Talk to a doctor now" and cancel the request.
4. **Webhooks**: ask LabStack to fire `testWebhook` on a lab order and an appointment. Supabase, Table Editor, `partner_events` should get a row each.

## 8. Health check: is every partner call answering? (1 minute)

Do this whenever something looks empty (for example "0 doctors").

1. **Edge Functions**, open `labstack`, then **Test**. Method **POST**.
2. Request Body:
   ```
   {"op":"admin.probe","input":{"pincode":"560038"}}
   ```
3. Headers: `x-admin-token` = your `LABSTACK_ADMIN_TOKEN` password.
4. **Send Request**. The answer lists, step by step:
   - `partner.host`: which LabStack environment this deploy talks to (`integration.labstack.in` is the test sandbox, with very little real supply).
   - `specialities`: every doctor department the partner has, with how many doctors.
   - `doctors_*`: general physician, gastroenterology, dermatology and paediatrics, online and at a clinic.
   - `labTests`, `labPackages`, `labServiceability`: whether labs serve the pincode.
   - `medicineSearch`, `pharmacies_delivery`, `pharmacies_pickup`: whether medicines can be found and delivered.
   - `summary`: any step that failed. A count of 0 with `ok: true` means the call works and the partner has no supply there.

## 9. Payment through the partner's link (5 minutes)

The partner takes the money. Each order gets a secure payment link that lives 16 minutes; unpaid orders are cancelled on their side. The app opens the link right after booking, shows "Pay to confirm" on the order until it's paid, and checks every few seconds while it waits.

1. **SQL Editor**: run `supabase/manual/0046-step-1-of-1.sql`, then `supabase/manual/0046-check.sql` (3 rows, all "yes").
2. **Edge Functions**, `labstack`: paste the new `supabase/manual/0045-labstack-function-paste.ts` over the old code and **Deploy**. (Same for `labstack-webhook` with its paste file.)
3. **Secrets**: add `LABSTACK_PAYMENT` with the value `link`.

Remove that secret (or set it to `off`) to go back to booking without payment.

## Still open

- **Webhooks**: no webhook key yet, so the app does not wait for LabStack to call us. Instead it asks LabStack for the latest state whenever an order is open on screen (every 10 seconds while payment is pending, every minute otherwise). Lab reports are filed the next time the booking is opened. Once LabStack gives a key, add it as `LABSTACK_WEBHOOK_SECRET` (labs and pharmacy) and `LABSTACK_SIGNING_SECRET` (doctors) and updates arrive on their own.
- **Margin**: with the partner's link, the customer pays the partner's price. Any Cheeku margin has to be agreed with LabStack (store discounts) rather than added on our side.
- Production base URL (only the sandbox is documented).
