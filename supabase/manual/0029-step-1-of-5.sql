-- 0029 step 1 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

alter table articles add column if not exists category text not null default 'reports';
alter table articles add column if not exists icon text not null default 'book';
alter table articles add column if not exists key_points text[] not null default '{}';
alter table articles add column if not exists author text not null default 'Cheeku health desk';
alter table articles add column if not exists featured boolean not null default false;
alter table articles drop constraint if exists articles_category_check;
alter table articles add constraint articles_category_check
  check (category in ('reports', 'family', 'prevention', 'pregnancy', 'living'));
alter table articles drop constraint if exists articles_icon_check;
alter table articles add constraint articles_icon_check
  check (icon in ('book', 'droplet', 'ruler', 'heart', 'activity', 'gauge', 'baby', 'syringe', 'shield', 'home', 'flask', 'pill', 'apple', 'moon'));
alter table articles drop constraint if exists articles_key_points_check;
alter table articles add constraint articles_key_points_check
  check (cardinality(key_points) <= 5);
create index if not exists articles_category_idx on articles (category) where published_at is not null;
create or replace function add_questions_block (p_slug text, p_items text[]) returns void
set
  search_path = public as $$
  update articles
  set body = body || jsonb_build_array(jsonb_build_object('type', 'questions', 'items', to_jsonb(p_items)))
  where slug = p_slug
    and not exists (select 1 from jsonb_array_elements(body) b where b ->> 'type' = 'questions');
$$ language sql;
update articles set category = 'pregnancy', icon = 'baby', key_points = array[
  'Haemoglobin is reported as a concentration, and it often reads lower in pregnancy because blood volume rises.',
  'The range beside your result belongs to the lab that ran it, so two labs can flag the same value differently.',
  'Take the full report and earlier results to your appointment. Your obstetrician decides what a result means.'
] where slug = 'reading-your-anaemia-numbers-in-pregnancy';
select add_questions_block('reading-your-anaemia-numbers-in-pregnancy', array[
  'Is this result what you would expect for my trimester?',
  'Should anything else on the panel, like ferritin, be read alongside it?',
  'When would you like this test repeated?'
]);

commit;
