-- 0036 step 5 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function notify_document_change () returns trigger
security definer
set
  search_path = public as $$
declare
  v_title text := document_display_title(new);
  v_whose text := coalesce(whose_file(new.profile_id), 'your');
begin
  if new.extraction ->> 'source' = 'cheeku' then
    return null;
  end if;

  if new.status = 'needs_review'
     and (tg_op = 'INSERT' or old.status is distinct from 'needs_review') then
    perform notify_user(
      new.user_id, new.profile_id, new.id, 'report_review',
      'Quick check on ' || v_title,
      'A few lines were hard to read. Confirm them in a minute?',
      '/records/' || new.id,
      'review:' || new.id
    );
  elsif new.status = 'filed' then
    if tg_op = 'INSERT' or old.status = 'processing' then
      perform notify_user(
        new.user_id, new.profile_id, new.id, 'report_ready',
        v_title || ' is filed',
        'It''s in ' || v_whose || ' health file. Ask me anything about it.',
        '/records/' || new.id,
        'ready:' || new.id
      );
    end if;

    if tg_op = 'UPDATE' and old.status = 'needs_review' then
      update notifications
      set read_at = coalesce(read_at, now())
      where user_id = new.user_id and dedupe_key = 'review:' || new.id;
    end if;
  end if;

  return null;
end;
$$ language plpgsql;

commit;
