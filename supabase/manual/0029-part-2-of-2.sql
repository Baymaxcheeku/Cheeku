-- MIGRATION 0029, PART 2 OF 2: reading history and the health file.
--
-- For the Supabase SQL Editor. Run part 1, then part 2. Needs 0028 first.
--
-- 1. On GitHub, open this file and press "Copy raw file" (the two-squares
--    icon above the code). Don't select the text by hand.
-- 2. In the SQL Editor, click New query, paste, and press Run.
--
-- Safe to run again if anything went wrong. The source of truth is
-- supabase/migrations/0029_learn_and_health_file.sql.

begin;

-- -------------------------------------------------------- reading history --

create table if not exists article_reads (
  user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
  article_id uuid not null references articles (id) on delete cascade,
  progress numeric not null default 0 check (progress between 0 and 1),
  saved boolean not null default false,
  opened_at timestamptz not null default now(),
  finished_at timestamptz,
  primary key (user_id, article_id)
);

alter table article_reads enable row level security;

drop policy if exists "users read own article reads" on article_reads;
create policy "users read own article reads" on article_reads for select using (auth.uid () = user_id);
drop policy if exists "users write own article reads" on article_reads;
create policy "users write own article reads" on article_reads for insert with check (auth.uid () = user_id);
drop policy if exists "users update own article reads" on article_reads;
create policy "users update own article reads" on article_reads for update using (auth.uid () = user_id) with check (auth.uid () = user_id);
drop policy if exists "users delete own article reads" on article_reads;
create policy "users delete own article reads" on article_reads for delete using (auth.uid () = user_id);

-- Progress only ever moves forward, so scrolling back up doesn't undo
-- "finished". Finished means 90% of the way down.
create or replace function record_article_read (p_article uuid, p_progress numeric) returns void
set
  search_path = public as $$
  insert into article_reads (user_id, article_id, progress, finished_at)
  values (auth.uid(), p_article, least(1, greatest(0, p_progress)), case when p_progress >= 0.9 then now() end)
  on conflict (user_id, article_id) do update
  set progress = greatest(article_reads.progress, excluded.progress),
      opened_at = now(),
      finished_at = coalesce(article_reads.finished_at, excluded.finished_at);
$$ language sql;

create or replace function set_article_saved (p_article uuid, p_saved boolean) returns void
set
  search_path = public as $$
  insert into article_reads (user_id, article_id, saved)
  values (auth.uid(), p_article, p_saved)
  on conflict (user_id, article_id) do update set saved = excluded.saved;
$$ language sql;

revoke execute on function record_article_read (uuid, numeric) from public, anon;
grant execute on function record_article_read (uuid, numeric) to authenticated;
revoke execute on function set_article_saved (uuid, boolean) from public, anon;
grant execute on function set_article_saved (uuid, boolean) to authenticated;

-- ------------------------------------------------------------ health file --

create or replace function health_file_bundle (p_profile uuid) returns jsonb
security definer
set
  search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'sign in first' using errcode = 'insufficient_privilege';
  end if;
  -- Someone else's member, or one the plan no longer covers: nothing, the
  -- same answer as a member that doesn't exist.
  if not exists (select 1 from profiles where id = p_profile and user_id = v_user)
     or p_profile not in (select covered_profile_ids(v_user)) then
    return null;
  end if;

  return jsonb_build_object(
    'profile', (
      select to_jsonb(p) from (
        select id, name, relationship, is_primary, dob, sex, blood_group, height_cm, weight_kg,
               conditions, allergies, medications
        from profiles where id = p_profile
      ) p
    ),
    'documents', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.event_date desc nulls last, d.created_at desc)
      from (
        select id, doc_type, status, event_date, facility, doctor, created_at,
               extraction ->> 'title' as title,
               extraction -> 'details' as details,
               extraction ->> 'source' as source
        from documents
        where profile_id = p_profile and user_id = v_user
      ) d
    ), '[]'::jsonb),
    'entities', coalesce((
      select jsonb_agg(to_jsonb(e))
      from (
        select id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date
        from entities
        where profile_id = p_profile and user_id = v_user
        order by event_date nulls last
        limit 3000
      ) e
    ), '[]'::jsonb)
  );
end;
$$ language plpgsql stable;

revoke execute on function health_file_bundle (uuid) from public, anon;
grant execute on function health_file_bundle (uuid) to authenticated;

alter table schema_migrations enable row level security;

insert into schema_migrations (filename) values ('0029_learn_and_health_file.sql') on conflict do nothing;

commit;
