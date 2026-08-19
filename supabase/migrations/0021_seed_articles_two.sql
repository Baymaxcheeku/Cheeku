-- Six more articles, so the knowledge rail has something to be dynamic with.
--
-- The rail already picks by journey and declared condition, but with only
-- three articles on the shelf almost every reader saw almost the same three.
-- Personalisation is a function of the catalogue as much as the query: these
-- six cover the journeys and the conditions people most often type in, so a
-- match is a genuine match rather than the only thing available.
--
-- ┌─ THESE NEED A CLINICIAN'S EYES BEFORE LAUNCH ────────────────────────────┐
-- │                                                                          │
-- │ Same standing rule as 0017. Written against the cited sources and kept   │
-- │ to explanation, never advice: what a term means, what a range is, what   │
-- │ a number measures. No article tells anyone to take, stop or change       │
-- │ anything, and none names a drug or a dose.                               │
-- │                                                                          │
-- │ They are still drafted by an engineer. `reviewed_on` is the date the     │
-- │ text was checked against its sources, NOT a medical review. A clinician  │
-- │ must read all nine before the store build.                               │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘

insert into articles (slug, title, standfirst, journeys, conditions, tint, read_minutes, reviewed_on, published_at, sources, body) values

-- ------------------------------------------- weight, and how it is measured --
(
  'what-bmi-does-and-does-not-tell-you',
  'What BMI does and does not tell you',
  'It is a ratio of weight to height, calculated in seconds and never designed to describe one person. Here is what it can and cannot say.',
  '{optimiser,other}',
  '{obesity,overweight,weight,bmi}',
  'teal',
  4,
  '2026-08-19',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Obesity and overweight","year":"2024","url":"https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"},
    {"publisher":"NHS","title":"What is the body mass index (BMI)?","year":"2023","url":"https://www.nhs.uk/common-health-questions/lifestyle/what-is-the-body-mass-index-bmi/"},
    {"publisher":"National Institute for Health and Care Excellence","title":"Obesity: identification, assessment and management (CG189)","year":"2023","url":"https://www.nice.org.uk/guidance/cg189"}
  ]'::jsonb,
  '[
    {"type":"p","text":"BMI is your weight in kilograms divided by your height in metres squared. That is the whole calculation. It was built in the nineteenth century to describe populations, and it is still useful for that."},
    {"type":"h","text":"What it cannot see"},
    {"type":"p","text":"The formula has two inputs, so everything else is invisible to it. It cannot distinguish muscle from fat, it does not know where on the body that weight sits, and it does not know your age or your build."},
    {"type":"p","text":"This is why guidance treats BMI as a starting point rather than a conclusion, and why clinicians read it next to other measurements — a waist measurement, blood pressure, a lipid panel — instead of on its own."},
    {"type":"callout","text":"A number outside a category boundary is a prompt for a conversation, not a verdict on your health. Nothing on this page can tell you what yours means for you."},
    {"type":"h","text":"Thresholds are not universal"},
    {"type":"p","text":"The World Health Organization notes that the relationship between BMI and health risk differs between populations, and several countries use lower thresholds for adults of South Asian descent as a result. Two reports can therefore place the same number in two different categories, correctly."},
    {"type":"h","text":"Reading your own reports over time"},
    {"type":"list","items":[
      "Direction over time usually carries more information than any single reading",
      "Compare each result against the range printed on its own report",
      "Bring the whole panel to an appointment, not the one line that was flagged"
    ]},
    {"type":"p","text":"Baymax keeps the measurements together and readable so you can see how they have moved. What they mean, and what should follow, is your doctor''s call."}
  ]'::jsonb
),

-- --------------------------------------------------------- lipid profile --
(
  'making-sense-of-a-lipid-panel',
  'Making sense of a lipid panel',
  'Four or five numbers, two of them calculated rather than measured, and a fasting rule that has quietly changed.',
  '{optimiser,caregiver,other}',
  '{cholesterol,lipid,heart,obesity,overweight,diabetes}',
  'indigo',
  5,
  '2026-08-19',
  now(),
  '[
    {"publisher":"NHS","title":"High cholesterol","year":"2024","url":"https://www.nhs.uk/conditions/high-cholesterol/"},
    {"publisher":"European Atherosclerosis Society","title":"Fasting is not routinely required for determination of a lipid profile","year":"2016","url":"https://academic.oup.com/eurheartj/article/37/25/1944/1748858"},
    {"publisher":"Centers for Disease Control and Prevention","title":"Cholesterol testing","year":"2024","url":"https://www.cdc.gov/cholesterol/testing.htm"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A lipid panel measures fats carried in the blood. Most reports print total cholesterol, HDL, LDL and triglycerides, and some add a ratio."},
    {"type":"h","text":"What each line is"},
    {"type":"list","items":[
      "Total cholesterol: everything the panel counts together",
      "HDL: carried back toward the liver, which is why reports often note it separately",
      "LDL: on many reports this is calculated from the other three rather than measured directly",
      "Triglycerides: a different type of fat, and the number most affected by a recent meal"
    ]},
    {"type":"callout","text":"Because LDL is often derived rather than measured, a very high triglyceride result can change the LDL figure on the same page. That is arithmetic, not a second finding."},
    {"type":"h","text":"The fasting rule has changed"},
    {"type":"p","text":"Fasting before a lipid test was standard for decades. Guidance from the European Atherosclerosis Society and others now holds that routine panels do not require it in most cases, though a specific clinic may still ask."},
    {"type":"p","text":"For reading old reports this matters: a non-fasting sample and a fasting one are not perfectly comparable, and the report usually says which it was."},
    {"type":"h","text":"What to take to the appointment"},
    {"type":"p","text":"The full panel and any earlier ones. Cholesterol is read as part of overall cardiovascular risk, alongside blood pressure, family history and other factors — never as a single number in isolation."},
    {"type":"p","text":"Baymax will read your panels back to you and show which report each figure came from. It does not interpret them, and it will never suggest a medicine."}
  ]'::jsonb
),

-- ------------------------------------------------------- thyroid --
(
  'what-a-thyroid-panel-reports',
  'What a thyroid panel reports',
  'TSH is a message from the pituitary, not from the thyroid, which is why it moves in the opposite direction to what people expect.',
  '{optimiser,fertility,other}',
  '{thyroid,hypothyroidism,hyperthyroidism,tsh,pcos}',
  'violet',
  4,
  '2026-08-19',
  now(),
  '[
    {"publisher":"NHS","title":"Underactive thyroid (hypothyroidism)","year":"2024","url":"https://www.nhs.uk/conditions/underactive-thyroid-hypothyroidism/"},
    {"publisher":"National Institute of Diabetes and Digestive and Kidney Diseases","title":"Thyroid tests","year":"2017","url":"https://www.niddk.nih.gov/health-information/diagnostic-tests/thyroid"},
    {"publisher":"British Thyroid Foundation","title":"Thyroid function tests","year":"2023","url":"https://www.btf-thyroid.org/thyroid-function-tests"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A thyroid panel usually reports TSH, and often free T4 alongside it. The order they appear in on the page is not the order they happen in the body."},
    {"type":"h","text":"TSH comes from the pituitary"},
    {"type":"p","text":"Thyroid stimulating hormone is produced by the pituitary gland to ask the thyroid to work harder. So when the thyroid is producing less, the pituitary asks louder and TSH rises — the number goes up as thyroid output goes down."},
    {"type":"p","text":"That inversion is the single most common source of confusion when somebody reads their own report, and it is why TSH and T4 are read together rather than separately."},
    {"type":"callout","text":"A TSH slightly outside a lab range is a common finding and a common reason to simply repeat the test. What it means is a clinical judgement, and this page cannot make it."},
    {"type":"h","text":"Ranges differ, and so does the context"},
    {"type":"p","text":"Reference ranges vary between laboratories and between assays. They also differ in pregnancy, where guidance uses trimester-specific ranges, so a result compared against a general range can read very differently against the right one."},
    {"type":"h","text":"Comparing your own results"},
    {"type":"list","items":[
      "Note which laboratory ran each test, and read each result against its own printed range",
      "Keep the free T4 line with the TSH line; one without the other is half the picture",
      "Bring the dates. Timing and direction are often what the appointment turns on"
    ]},
    {"type":"p","text":"Baymax keeps every panel together and can read the values back with the date and the source. Your doctor decides what follows."}
  ]'::jsonb
),

-- ------------------------------------------------------- blood pressure --
(
  'the-two-numbers-in-a-blood-pressure-reading',
  'The two numbers in a blood pressure reading',
  'One is the push, one is the rest in between, and a single reading in a clinic is the least reliable version of both.',
  '{caregiver,optimiser,other}',
  '{blood pressure,hypertension,heart,obesity}',
  'amber',
  4,
  '2026-08-19',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Hypertension","year":"2023","url":"https://www.who.int/news-room/fact-sheets/detail/hypertension"},
    {"publisher":"NHS","title":"What is blood pressure?","year":"2023","url":"https://www.nhs.uk/common-health-questions/lifestyle/what-is-blood-pressure/"},
    {"publisher":"National Institute for Health and Care Excellence","title":"Hypertension in adults: diagnosis and management (NG136)","year":"2023","url":"https://www.nice.org.uk/guidance/ng136"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A reading is written as one number over another, in millimetres of mercury: mmHg. The first is systolic, the pressure as the heart pushes blood out. The second is diastolic, the pressure between beats."},
    {"type":"h","text":"Why one reading is rarely the answer"},
    {"type":"p","text":"Blood pressure moves constantly — with the time of day, with what you have just done, and notably with being in a clinic at all. Guidance therefore leans on readings repeated over time, and often on readings taken at home, rather than on a single measurement."},
    {"type":"callout","text":"A high reading on one afternoon is a reason to measure again, not a diagnosis. Diagnosis follows a pattern, and a clinician is the one who reads the pattern."},
    {"type":"h","text":"What makes a home reading comparable"},
    {"type":"list","items":[
      "The same arm each time, supported at roughly heart height",
      "A few minutes sitting still first, feet on the floor",
      "The time of day noted, because morning and evening readings differ"
    ]},
    {"type":"p","text":"None of that changes what the numbers mean. It changes whether two readings can honestly be compared, which is what makes a record worth keeping."},
    {"type":"h","text":"Keeping the record"},
    {"type":"p","text":"Baymax will store the readings you record and read them back with their dates. It does not set targets, does not judge a reading, and will never suggest a medicine or a change to one."}
  ]'::jsonb
),

-- ---------------------------------------------------------- new parent --
(
  'reading-your-childs-vaccination-record',
  'Reading your child''s vaccination record',
  'Schedules differ by country and get rewritten as children move. What matters is the dose, the date, and keeping every card in one place.',
  '{new_parent,caregiver}',
  '{vaccination,immunisation,paediatric}',
  'rose',
  3,
  '2026-08-19',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Immunization coverage","year":"2024","url":"https://www.who.int/news-room/fact-sheets/detail/immunization-coverage"},
    {"publisher":"UNICEF","title":"Immunization","year":"2024","url":"https://www.unicef.org/immunization"},
    {"publisher":"NHS","title":"NHS vaccinations and when to have them","year":"2024","url":"https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A vaccination record lists what was given, when, and usually which dose in a series it was. Those three facts are what any clinician, in any country, will ask for."},
    {"type":"h","text":"Schedules are national, not universal"},
    {"type":"p","text":"Countries set their own childhood schedules, so the same vaccine can be due at different ages in different places. A family that moves does not have a gap in their child''s record so much as a record written against a different timetable."},
    {"type":"callout","text":"Whether a dose is due, delayed or already covered is a decision for a clinician with the full card in front of them. Baymax keeps the card; it does not decide."},
    {"type":"h","text":"What is worth photographing"},
    {"type":"list","items":[
      "The card itself, both sides, including the clinic stamps",
      "Any batch or lot numbers printed beside a dose",
      "Discharge or well-visit notes that mention a vaccination given during a hospital stay"
    ]},
    {"type":"h","text":"Why one place matters"},
    {"type":"p","text":"Vaccination history is the record most likely to be spread across a paper card, a hospital app and a photograph on somebody''s phone. Keeping it in one file is the whole reason this app exists, and it is the record a school, a new clinic or a travel appointment will ask for first."}
  ]'::jsonb
),

-- ----------------------------------------------------------- caregiver --
(
  'organising-a-parents-records-from-another-city',
  'Organising a parent''s records from another city',
  'What to gather, what to ask for by name, and how to keep a file that a new doctor can read in five minutes.',
  '{caregiver,other}',
  '{}',
  'teal',
  4,
  '2026-08-19',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Continuity and coordination of care","year":"2018","url":"https://www.who.int/publications/i/item/9789241514033"},
    {"publisher":"NHS","title":"How to access your health records","year":"2024","url":"https://www.nhs.uk/nhs-services/gps/health-records/"},
    {"publisher":"Ministry of Health and Family Welfare, India","title":"Ayushman Bharat Digital Mission: health records","year":"2023","url":"https://abdm.gov.in/"}
  ]'::jsonb,
  '[
    {"type":"p","text":"Caring for a parent at a distance turns on one practical problem: the people treating them do not have the whole history, and neither do you. The fix is unglamorous — a complete file, in one place, that travels."},
    {"type":"h","text":"What a new doctor asks for"},
    {"type":"list","items":[
      "The current medicine list, exactly as written, including anything bought over the counter",
      "The most recent discharge summary, which usually carries the fullest picture",
      "Recent laboratory reports in full, not the flagged lines alone",
      "Allergies, and any past reaction to a medicine",
      "Contact details for the doctor who has been managing them"
    ]},
    {"type":"callout","text":"Never edit or summarise what a report says when passing it on. The value of a record is that it is the original."},
    {"type":"h","text":"Asking for records"},
    {"type":"p","text":"Most health systems give a patient a right of access to their own records, and many now offer a digital route. Where a relative is doing the asking, hospitals usually need the patient''s consent, so it is worth settling that once rather than at each request."},
    {"type":"h","text":"Keeping it usable"},
    {"type":"p","text":"Date everything, keep the source with the document, and keep one file per person. Baymax reads what the documents say and can answer from them with the record named, so a question at midnight does not have to wait for a phone call in the morning."},
    {"type":"p","text":"It does not diagnose, does not prescribe, and does not replace the doctor treating them."}
  ]'::jsonb
);
