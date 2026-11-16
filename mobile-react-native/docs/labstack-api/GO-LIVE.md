# Switching on the partner network (labs, medicines, doctors)

Everything is built and works today in **preview** (sample data, nothing booked with anyone). These steps turn on the real UAT sandbox. Do them in order. Nobody pastes a key into chat; keys go only into Supabase.

## 1. Run the migration (2 minutes)

1. Open supabase.com, then your project.
2. Left menu: **SQL Editor**, then **New query**.
3. Open `supabase/migrations/0045_labstack.sql` from the repo, copy all of it, paste it in, press **Run**.
4. You should see "Success". Running it twice is safe.

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

## 3. Deploy the two functions (5 minutes)

From a computer with the Supabase CLI, in `mobile-react-native/`:

```
supabase functions deploy labstack
supabase functions deploy labstack-webhook --no-verify-jwt
```

(Or ask me in a session that can reach your project and I'll walk it with you.)

## 4. Sync the lab catalogue (1 minute)

1. **Edge Functions**, open `labstack`, then **Test** (top right).
2. Role: **service_role**. Method POST. Body:
   ```
   {"op":"admin.syncCatalogue","input":{"pincode":"560038"}}
   ```
3. Press **Send**. The answer lists how many of our tests were linked, any it couldn't find (`notFound`), and how many packages came in. Send me the `notFound` list and I'll map those by hand.

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
3. **Doctors**: book a video visit, open "Join", cancel. Then "Talk to a doctor now" and cancel the request.
4. **Webhooks**: ask LabStack to fire `testWebhook` on a lab order and an appointment. Supabase, Table Editor, `partner_events` should get a row each.

## Still open

- **Payment** (your decision tonight): pay after collection, the partner's 16-minute payment link, or our own gateway, and how our margin is settled against the wallet. Until decided, every order is placed with `isPaymentRequired: false`.
- Production base URL (only the sandbox is documented).
- Doctor list in live mode still shows our sample doctors; the gateway's `consult.providers` is ready, the list screen switches over once the payment model is set.
