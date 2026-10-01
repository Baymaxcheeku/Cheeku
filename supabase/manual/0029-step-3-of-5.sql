-- 0029 step 3 of 5. Run the steps in order, each in a new query. Safe to run again.
begin;

create or replace function add_questions_block (p_slug text, p_items text[]) returns void
set
  search_path = public as $$
  update articles
  set body = body || jsonb_build_array(jsonb_build_object('type', 'questions', 'items', to_jsonb(p_items)))
  where slug = p_slug
    and not exists (select 1 from jsonb_array_elements(body) b where b ->> 'type' = 'questions');
$$ language sql;
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

commit;
