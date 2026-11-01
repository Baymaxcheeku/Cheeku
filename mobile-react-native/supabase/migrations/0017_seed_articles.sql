-- Three articles, so the knowledge section is live rather than an empty state.
--
-- ┌─ THESE NEED A CLINICIAN'S EYES BEFORE LAUNCH ────────────────────────────┐
-- │                                                                          │
-- │ Written against the cited sources and deliberately kept to explanation,  │
-- │ never advice: what a term means, what a range is, what a number is       │
-- │ measuring. No article here tells anyone to take, stop or change          │
-- │ anything.                                                                │
-- │                                                                          │
-- │ They are still drafted by an engineer, not a doctor. `reviewed_on` is    │
-- │ the date the text was checked against its sources, NOT a medical review. │
-- │ Have a clinician read all three before the store build, and add a        │
-- │ reviewer field when one is willing to be named.                          │
-- │                                                                          │
-- └──────────────────────────────────────────────────────────────────────────┘

insert into articles (slug, title, standfirst, journeys, conditions, tint, read_minutes, reviewed_on, published_at, sources, body) values

-- ------------------------------------------------------------- expecting --
(
  'reading-your-anaemia-numbers-in-pregnancy',
  'Reading your haemoglobin result in pregnancy',
  'Why the number your lab flags changes trimester by trimester, and what the range on the page is actually comparing you to.',
  '{expecting,fertility}',
  '{anaemia,pregnancy}',
  'rose',
  4,
  '2026-08-09',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Haemoglobin concentrations for the diagnosis of anaemia and assessment of severity","year":"2011","url":"https://www.who.int/publications/i/item/WHO-NMH-NHD-MNM-11.1"},
    {"publisher":"World Health Organization","title":"WHO recommendations on antenatal care for a positive pregnancy experience","year":"2016","url":"https://www.who.int/publications/i/item/9789241549912"},
    {"publisher":"NHS","title":"Vitamins, supplements and nutrition in pregnancy","year":"2023","url":"https://www.nhs.uk/pregnancy/keeping-well/vitamins-supplements-and-nutrition/"}
  ]'::jsonb,
  '[
    {"type":"p","text":"Haemoglobin is the protein in red blood cells that carries oxygen. A pregnancy blood panel reports it in grams per decilitre, written g/dL, and it is one of the numbers most likely to come back flagged."},
    {"type":"h","text":"The range moves during pregnancy"},
    {"type":"p","text":"Blood volume rises through pregnancy, and plasma rises faster than red cells do. The same person can have more haemoglobin in total and a lower concentration on paper, because the measurement is a concentration rather than an amount."},
    {"type":"p","text":"This is why the World Health Organization sets a different threshold for pregnancy than for non-pregnant adults, and why a result your lab flags may sit inside what your obstetrician expects for the trimester you are in."},
    {"type":"callout","text":"A flag on a report means the number fell outside the range that lab printed. It does not mean something is wrong, and it does not mean nothing is."},
    {"type":"h","text":"What the reference range on your page is"},
    {"type":"p","text":"The range beside your result belongs to the laboratory that ran it. Labs set their own ranges from their own equipment and population, which is why two reports from two hospitals can flag the same value differently."},
    {"type":"p","text":"When you compare results over time, compare them against the range printed on each report rather than against each other."},
    {"type":"h","text":"What to bring to your appointment"},
    {"type":"list","items":[
      "The full report, not just the flagged line, since haemoglobin is read alongside ferritin and red cell indices",
      "Any earlier results, so the direction of travel is visible",
      "Anything you are already taking, including supplements bought without a prescription"
    ]},
    {"type":"p","text":"Your obstetrician decides what a result means for you and what, if anything, follows from it. Baymax keeps the reports together and readable so that conversation starts from the full picture."}
  ]'::jsonb
),

-- ------------------------------------------------------------- caregiver --
(
  'what-hba1c-is-measuring',
  'What HbA1c is actually measuring',
  'The number is not today''s sugar. It is closer to a three-month average, and knowing that changes how you read it.',
  '{caregiver,optimiser}',
  '{diabetes,prediabetes,type 2 diabetes}',
  'amber',
  4,
  '2026-08-09',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Use of glycated haemoglobin (HbA1c) in the diagnosis of diabetes mellitus","year":"2011","url":"https://www.who.int/publications/i/item/use-of-glycated-haemoglobin-(-hba1c)-in-diagnosis-of-diabetes-mellitus"},
    {"publisher":"NHS","title":"Type 2 diabetes: getting diagnosed","year":"2023","url":"https://www.nhs.uk/conditions/type-2-diabetes/getting-diagnosed/"},
    {"publisher":"Indian Council of Medical Research","title":"ICMR Guidelines for Management of Type 2 Diabetes","year":"2018","url":"https://main.icmr.nic.in/content/guidelines"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A fasting sugar test is a photograph: it captures one morning. HbA1c is closer to a time-lapse. It measures the share of your haemoglobin that has glucose attached to it, and because red blood cells live around three months, the result reflects roughly that span."},
    {"type":"h","text":"Why one high reading is not the same as a high HbA1c"},
    {"type":"p","text":"A single fasting number moves with a late dinner, an illness, a bad night. HbA1c is much harder to move in a day, which is exactly why clinicians use it to see a pattern rather than a moment."},
    {"type":"p","text":"It is usually reported as a percentage, and sometimes also in mmol/mol. Two units, one measurement — a report that shows both is not showing two results."},
    {"type":"callout","text":"HbA1c can read misleadingly in some conditions, including anaemia and after recent blood loss or transfusion. This is one of the reasons it is read beside other results rather than alone."},
    {"type":"h","text":"Reading it over time"},
    {"type":"p","text":"The direction matters more than any single value. Three results across a year say something a single result cannot, which is the case for keeping every report in one place instead of whichever one is on the fridge."},
    {"type":"list","items":[
      "Note the date of each test, not just the value",
      "Keep the lab''s own reference range with each result",
      "Take the sequence to appointments rather than the latest page"
    ]},
    {"type":"p","text":"What a given HbA1c means for a specific person, and what should happen next, is a decision for their doctor. Baymax will show you the numbers and where they came from; it will not tell you what to do about them."}
  ]'::jsonb
),

-- ------------------------------------------------------------ new parent --
(
  'why-the-vaccine-card-matters-more-than-you-think',
  'Why the vaccination card matters more than you think',
  'It is the one health record almost everyone is asked for years later, and the one most likely to be lost.',
  '{new_parent,expecting}',
  '{}',
  'teal',
  3,
  '2026-08-09',
  now(),
  '[
    {"publisher":"World Health Organization","title":"Immunization coverage","year":"2024","url":"https://www.who.int/news-room/fact-sheets/detail/immunization-coverage"},
    {"publisher":"Ministry of Health and Family Welfare, Government of India","title":"Universal Immunization Programme","year":"2023","url":"https://main.mohfw.gov.in/"},
    {"publisher":"NHS","title":"NHS vaccinations and when to have them","year":"2024","url":"https://www.nhs.uk/vaccinations/nhs-vaccinations-and-when-to-have-them/"}
  ]'::jsonb,
  '[
    {"type":"p","text":"A childhood immunisation record gets asked for at school admission, at travel visa applications, at a new paediatrician, and sometimes decades later by an employer. It is also a small piece of card that lives in a drawer."},
    {"type":"h","text":"What makes it hard to reconstruct"},
    {"type":"p","text":"Doses are given across years, often at different clinics, and the schedule differs between countries and between public and private programmes. Rebuilding a lost card usually means contacting every clinic that gave a dose, and clinics do not keep records forever."},
    {"type":"callout","text":"Photograph the card after every visit, both sides. It takes ten seconds and it is the cheapest insurance in this entire app."},
    {"type":"h","text":"What is worth capturing"},
    {"type":"list","items":[
      "Both sides of the card, including the batch numbers if they are printed",
      "The clinic name and the date, which are what a later provider will ask to verify",
      "Any doses given somewhere other than the usual clinic, since those are the ones that go missing"
    ]},
    {"type":"p","text":"Which vaccines are due, and when, is set by your paediatrician and your national schedule. Baymax does not schedule doses or remind you one is due — it keeps what already happened, legible and in one place, for the day somebody asks."}
  ]'::jsonb
);
