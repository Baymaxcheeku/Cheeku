# wearables-google

Fitbit and Pixel Watch data for Cheeku through the Google Health API. The app
holds no Google key and no token; this function does the sign-in and returns
only daily totals.

The app keeps it switched off until `EXPO_PUBLIC_WEARABLES_GOOGLE=on`.

## Setup (once)

1. Run `supabase/manual/0044-step-1-of-1.sql` in the SQL editor.
2. Google Cloud console: new project, enable "Google Health API", set up the
   OAuth consent screen (External, Testing), add your test accounts (up to 100).
3. Credentials > Create OAuth client > Web application. Authorised redirect URI:
   `https://<project-ref>.supabase.co/functions/v1/wearables-google`
4. Supabase > Edge Functions > Secrets: add `GOOGLE_HEALTH_CLIENT_ID` and
   `GOOGLE_HEALTH_CLIENT_SECRET`.
5. Deploy with JWT verification OFF (the function checks the caller itself,
   because Google's redirect back has no Supabase token):
   `supabase functions deploy wearables-google --no-verify-jwt`

## Before going live

All three scopes are restricted. Public users need Google's verification and a
security assessment of the project. Until then only listed test users can link.

The roll-up field names in `rollup.ts` are read defensively. Check one real
response with a test account and tighten the key lists if Google names a field
differently.
