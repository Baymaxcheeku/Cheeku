-- Profile pictures.
--
-- `avatar_url` is null for almost everyone: the app generates a deterministic
-- illustrated avatar from the profile's id, so a family has distinct faces from
-- the moment it is created without anyone being asked to upload anything.
--
-- The column exists so that "until they change their profile picture" is a real
-- seam rather than a promise. When a custom picture is uploaded it goes to the
-- private documents bucket like everything else and this holds its object key —
-- never a public URL, because a face is personal data and a permanent link to
-- one is a permanent leak.
alter table profiles
add column avatar_url text;

comment on column profiles.avatar_url is 'Storage object key for a custom picture. Null means use the generated avatar.';
