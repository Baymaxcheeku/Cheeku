-- 0029 step 2 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function add_questions_block (p_slug text, p_items text[]) returns void
set
  search_path = public as $$
  update articles
  set body = body || jsonb_build_array(jsonb_build_object('type', 'questions', 'items', to_jsonb(p_items)))
  where slug = p_slug
    and not exists (select 1 from jsonb_array_elements(body) b where b ->> 'type' = 'questions');
$$ language sql;
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

commit;
