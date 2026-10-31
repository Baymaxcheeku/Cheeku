-- ONE-OFF COPY for pasting into the Supabase SQL Editor, for applying
-- migration 0026 without a terminal. Needs 0025 applied first. The file in
-- supabase/migrations is the source of truth; do not edit this one.
--
-- Paste all of it and press Run. It runs as one transaction: if anything
-- fails, nothing changes. "already exists" means it was applied before.

begin;

alter table schema_migrations enable row level security;

-- A fuller health profile per family member, and their own photo.
--
-- 1. Allergies get a column of their own. They were typed into "conditions"
--    when they were recorded at all, and an allergy is the one fact a doctor
--    must never have to dig for.
-- 2. The face catalogue grew (life stages, 24 faces, ids "f01".."f24"). The
--    old "p1".."p10" ids stay valid; the app maps them to the nearest new face.
-- 3. `avatar_url` (0006) finally gets used, for a real photo. It holds a
--    storage key in the private documents bucket, never a URL, and the key
--    must live under the owner's own folder for THIS profile, so a row can
--    never point at someone else's picture.

alter table profiles
add column allergies text[] not null default '{}';

comment on column profiles.allergies is 'Known allergies, as the reader wrote them. Shown before anything else to a doctor.';

alter table profiles drop constraint if exists profiles_avatar_seed_check;

alter table profiles
add constraint profiles_avatar_seed_check check (
  avatar_seed is null
  or avatar_seed ~ '^(p|f)[0-9]{1,2}$'
) not valid;

alter table profiles
add constraint profiles_avatar_url_check check (
  avatar_url is null
  or (
    split_part(avatar_url, '/', 1) = user_id::text
    and split_part(avatar_url, '/', 2) = id::text
    and avatar_url ~ '/avatar-[0-9a-f-]{36}\.jpg$'
  )
) not valid;

insert into schema_migrations (filename) values ('0026_member_health_and_photos.sql') on conflict do nothing;

commit;
