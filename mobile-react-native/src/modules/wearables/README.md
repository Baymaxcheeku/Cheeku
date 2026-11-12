# Wearables module

Phones and watches feeding Cheeku: Apple Health (iPhone, Apple Watch, and any
app that writes to it), Health Connect (Android, Samsung, Fitbit, Pixel,
Garmin and others), Google Health API for Fitbit and Pixel Watch on an
iPhone, and Strava through either of the first two.

## What it feeds

| Where | How |
| --- | --- |
| Home | "Your body today" card through the `homeCard` extension slot |
| Profile | "Devices and wearables" row through `profileRow` |
| Ask (chat) | two or three short lines of real trends through `chatNotes` |
| Today's plan | today's steps written as a normal `daily_logs` steps row |
| Longevity engine | `wearable_days`, one row per member per day |

Sample data (Expo Go and web) is labelled on screen and never reaches the
database or the chat.

## Plug and play

The main app knows nothing about wearables. It exposes four slots in
`src/lib/extensions`, and this module fills them from `register.ts`.

**Switch off without deleting:** set `EXPO_PUBLIC_WEARABLES=off`.

**Remove completely:**

1. Delete the line `import "@/modules/wearables/register";` in `app/_layout.tsx`.
2. Delete `src/modules/wearables/` and `app/wearables/`.
3. In `app.json`, remove the `@kingstinct/react-native-healthkit`,
   `react-native-health-connect` and `expo-build-properties` plugins and the
   `android.permission.health.*` permissions.
4. `npm uninstall @kingstinct/react-native-healthkit react-native-nitro-modules react-native-health-connect expo-build-properties`
   (keep `expo-web-browser` if anything else uses it).

The tables from migration 0044 can stay; nothing else reads them.

## Adding a source

Write a `SourceAdapter` in `sources/`, add it to `registry.ts`. Merge, sync,
storage and every screen pick it up.

## Rules we follow

- Read only. Cheeku never writes to Apple Health or Health Connect.
- Strava: no direct API. Strava's API terms (1 June 2026) bar its data from
  any AI use, so it arrives only through Apple Health or Health Connect,
  where the person has chosen to share it.
- Google Health: off until Google approves the restricted scopes.
- Device readings (SpO2, blood pressure, blood sugar) are shown with a
  "consumer device, not a lab" note and never as a diagnosis.
