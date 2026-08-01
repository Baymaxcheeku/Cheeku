-- Backing fields for the full Profile section (personal info, health profile,
-- notification preferences). Nothing here changes the isolation boundary —
-- profiles and families already carry RLS from 0001, and these are just new
-- columns on existing rows.

-- height/weight/blood group were collected on the onboarding form (A5) and
-- silently discarded — saveProfile() never wrote them. That is a real bug:
-- someone fills in a health snapshot and it is gone. Add the columns so the
-- Health profile screen has something honest to show and edit.
alter table profiles
  add column height_cm integer check (height_cm between 30 and 260),
  add column weight_kg numeric(5, 1) check (weight_kg between 1 and 400),
  add column blood_group text check (
    blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  );

-- Notification preferences are account-level (one inbox, one set of choices),
-- not per-profile, so they live on families rather than profiles. Defaults
-- mirror the states shown in the Notifications frame: everything on except
-- report notifications and promotions.
alter table families
  add column notification_prefs jsonb not null default '{
    "accountSecurity": true,
    "productUpdates": true,
    "tipsReminders": true,
    "checkinReminders": true,
    "healthInsights": true,
    "reportNotifications": false,
    "familyActivity": true,
    "invitations": true,
    "promotions": false
  }'::jsonb;
