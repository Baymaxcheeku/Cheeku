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

commit;
