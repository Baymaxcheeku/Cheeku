-- The face a person CHOSE, as opposed to the one they were dealt.
--
-- Until now every avatar was derived from the profile's id, which gives a
-- family distinct faces for free and asks nobody to upload anything. What it
-- cannot do is be right: the id is a uuid, so the face it produces is a coin
-- toss, and a man setting up his own profile could be handed a woman's face
-- with no way to change it. That is a small thing to read about and a
-- genuinely alienating thing to be shown on the first screen of a health app.
--
-- This holds the id of a pick from the app's own illustrated set. Null means
-- the derived-from-id behaviour, which stays the default for family members
-- added in a hurry, so nothing about the existing flow changes.
--
-- NOT `avatar_url`, which already exists for an uploaded photograph. That one
-- holds a private storage key for a real picture of a real face. This one
-- holds a short opaque identifier for a drawing that ships inside the app, so
-- it is not personal data and needs no bucket, no signing and no delete path.
alter table profiles
add column avatar_seed text;

comment on column profiles.avatar_seed is
  'Id of a chosen illustrated avatar. Null means generate one from the profile id.';
