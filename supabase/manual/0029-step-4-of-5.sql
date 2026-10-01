-- 0029 step 4 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

drop function if exists add_questions_block (text, text[]);
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

commit;
