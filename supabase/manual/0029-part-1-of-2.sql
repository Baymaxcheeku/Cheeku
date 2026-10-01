-- MIGRATION 0029, PART 1 OF 2: article categories, summaries and questions.
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

-- Worth knowing gets an editorial structure, and the health file gets one
-- read that the database answers.
--
-- 1. ARTICLES. Each now has a category (the app owns its colour), an icon
--    (the app owns the drawing), an "In short" list read before the body, a
--    byline, and an optional featured flag for the top of the library. Bodies
--    gain a "questions" block: things to ask at the appointment. The nine
--    published articles are backfilled; none of their claims change. One
--    paragraph is corrected because the app now does what it said it didn't
--    (remind you of a next-dose date your clinic gave you).
--
-- 2. READING HISTORY. `article_reads`, one row per person per article: how
--    far they got, whether they saved it, when they finished. Private to the
--    account like everything else; editorial stays shared.
--
-- 3. THE HEALTH FILE. `health_file_bundle(profile)` returns one member's
--    profile, records and read values in a single call, and only for a member
--    of the caller's own family that the plan covers. The app shapes it
--    (lib/health/file.ts); the database decides who may see it.
--
-- Safe to run more than once.

-- ------------------------------------------------------------- articles --

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

-- Appends a "questions" block once; running again changes nothing.
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

update articles set category = 'reports', icon = 'droplet', key_points = array[
  'HbA1c reflects roughly the last three months, not one morning.',
  'One high fasting reading is not the same as a high HbA1c.',
  'The direction across a year says more than any single result.'
] where slug = 'what-hba1c-is-measuring';
select add_questions_block('what-hba1c-is-measuring', array[
  'How does this compare with my earlier results?',
  'When should it be checked again?',
  'Could anything else affect this reading for me?'
]);

update articles set category = 'prevention', icon = 'syringe', key_points = array[
  'It is the record you will be asked for at school, for travel and sometimes by an employer, years later.',
  'Rebuilding a lost card means contacting every clinic that gave a dose.',
  'Photograph both sides after every visit, batch numbers included.'
] where slug = 'why-the-vaccine-card-matters-more-than-you-think';

-- The app now keeps next-dose dates and can remind you of one, so the
-- paragraph that said it couldn't is rewritten. Matched on its opening words.
update articles
set body = (
  select jsonb_agg(
    case when e ->> 'text' like 'Which vaccines are due%'
      then jsonb_build_object('type', 'p', 'text', 'Which vaccines are due, and when, is set by your paediatrician and your national schedule. Cheeku keeps what has already happened, legible and in one place, and can remind you of a next-dose date your clinic gave you. It does not decide what is due.')
      else e end
    order by i)
  from jsonb_array_elements(body) with ordinality as t (e, i)
)
where slug = 'why-the-vaccine-card-matters-more-than-you-think';

update articles set category = 'reports', icon = 'ruler', key_points = array[
  'BMI is weight divided by height squared, built to describe populations rather than one person.',
  'It cannot tell muscle from fat or see where weight sits.',
  'Thresholds differ between populations, including for adults of South Asian descent.'
] where slug = 'what-bmi-does-and-does-not-tell-you';
select add_questions_block('what-bmi-does-and-does-not-tell-you', array[
  'Which other measurements should be read alongside this one?',
  'Which thresholds apply to me?'
]);

update articles set category = 'reports', icon = 'heart', key_points = array[
  'Most panels show total cholesterol, HDL, LDL and triglycerides.',
  'LDL is often calculated rather than measured, so a high triglyceride result can move it.',
  'Most routine panels no longer need fasting, though a clinic may still ask.'
] where slug = 'making-sense-of-a-lipid-panel';
select add_questions_block('making-sense-of-a-lipid-panel', array[
  'Was this sample fasting or non-fasting?',
  'Is the LDL on this report measured or calculated?',
  'How does this fit with my blood pressure and family history?'
]);

update articles set category = 'reports', icon = 'activity', key_points = array[
  'TSH comes from the pituitary, so it rises when the thyroid makes less.',
  'TSH and free T4 are read together, not one without the other.',
  'Ranges vary between labs, and pregnancy uses its own.'
] where slug = 'what-a-thyroid-panel-reports';
select add_questions_block('what-a-thyroid-panel-reports', array[
  'Should this be repeated before reading much into it?',
  'Was free T4 checked alongside the TSH?'
]);

update articles set category = 'reports', icon = 'gauge', key_points = array[
  'Systolic is the pressure as the heart pushes; diastolic is the pressure between beats.',
  'A single clinic reading is the least reliable kind. Patterns over time matter.',
  'Same arm, seated and rested, time noted: that is what makes home readings comparable.'
] where slug = 'the-two-numbers-in-a-blood-pressure-reading';
select add_questions_block('the-two-numbers-in-a-blood-pressure-reading', array[
  'Should I keep a log of readings at home?',
  'How many readings would you like to see, and at what time of day?'
]);

update articles set category = 'family', icon = 'shield', key_points = array[
  'A record shows what was given, when, and which dose in a series it was.',
  'Schedules are national, so a move between countries can make a record look out of step.',
  'Photograph the card, the clinic stamps and the batch numbers, and keep it all in one place.'
] where slug = 'reading-your-childs-vaccination-record';
select add_questions_block('reading-your-childs-vaccination-record', array[
  'Is anything on this card due under our schedule?',
  'Do doses given in another country need checking?'
]);

update articles set category = 'family', icon = 'home', featured = true, key_points = array[
  'A new doctor will ask for the medicine list, the latest discharge summary and recent reports in full.',
  'Pass records on exactly as they are. Never summarise or edit them.',
  'Settle your parent''s consent with the hospital once, before you need it.'
] where slug = 'organising-a-parents-records-from-another-city';
select add_questions_block('organising-a-parents-records-from-another-city', array[
  'Can you share the full discharge summary and the recent reports?',
  'Who should we call if something changes between visits?'
]);

drop function add_questions_block (text, text[]);


commit;
