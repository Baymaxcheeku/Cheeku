begin;
delete from documents where profile_id='b3333333-3333-4333-8333-333333333333';
with v(id, d, title, details, ent_name, ent_val, ent_txt) as (values
 ('c3000000-0000-4000-8000-000000000001'::uuid, current_date-49, 'BCG, OPV and Hep B · At birth', '{"vaccine":"BCG, OPV-0, Hepatitis B-1","protectsAgainst":"TB, polio, hepatitis B","dose":1,"doses":1,"givenBy":"Sr. Rekha M.","centre":"Cloudnine Hospital, Indiranagar","site":"Left upper arm, oral, right thigh","batch":"BCG-2609-11","nextDue":null,"certificateId":null}'::jsonb, 'BCG', 1, 'At birth'),
 ('c3000000-0000-4000-8000-000000000002'::uuid, current_date-7, '6-week vaccines', '{"vaccine":"DTwP, IPV, Hib, Hep B, Rotavirus, PCV","protectsAgainst":"Six diseases, dose 1","dose":1,"doses":3,"givenBy":"Sr. Rekha M.","centre":"Little Steps Children''s Clinic","site":"Both thighs, oral","batch":"HEXA-2610-40","nextDue":"NEXT10","certificateId":null}'::jsonb, 'DTwP-IPV-Hib-HepB', 1, 'Dose 1 of 3')
)
insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, doctor, confidence, raw_text, extraction)
select id, 'b3333333-3333-4333-8333-333333333333', 'a1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111/b3333333-3333-4333-8333-333333333333/demo-'||id||'.pdf', 'application/pdf', 'vaccination', 'filed', d, details->>'centre', null, 0.97, 'DEMO-RECORDS tara', jsonb_build_object('title', title, 'details', jsonb_set(details, '{givenOn}', to_jsonb(d::text)) || case when details->>'nextDue'='NEXT10' then jsonb_build_object('nextDue', (current_date+21)::text) else '{}' end)
from v;
insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value, value_text, event_date)
values ('b3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','c3000000-0000-4000-8000-000000000001','vaccine','BCG','bcg',1,'At birth',current_date-49),
 ('b3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','c3000000-0000-4000-8000-000000000002','vaccine','DTwP-IPV-Hib-HepB','hexavalent',1,'Dose 1 of 3',current_date-7);
insert into documents (id, profile_id, user_id, storage_path, mime_type, doc_type, status, event_date, facility, doctor, confidence, raw_text, extraction) values
('c3000000-0000-4000-8000-000000000003','b3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111/b3333333-3333-4333-8333-333333333333/demo-rx.pdf','application/pdf','prescription','filed',current_date,'Little Steps Children''s Clinic, Indiranagar','Dr. Sameer Joshi',0.96,'DEMO-RECORDS tara',
 jsonb_build_object('title','Prescription · Dr. Sameer Joshi','details', jsonb_build_object(
  'doctor', jsonb_build_object('name','Dr. Sameer Joshi','qualification','MBBS, MD (Paediatrics)','regNo','KMC 51907','clinic','Little Steps Children''s Clinic, Indiranagar','phone',null),
  'complaints', jsonb_build_array('Fever 100.6 °F since 9 pm','Feeding well, active'),
  'diagnosis', jsonb_build_array('Fever, likely viral. Watch closely at 7 weeks'),
  'vitals', jsonb_build_array(jsonb_build_object('label','Temp','value','100.6 °F'), jsonb_build_object('label','Weight','value','4.6 kg')),
  'medicines', jsonb_build_array(jsonb_build_object('name','Paracetamol drops','strength','100 mg/mL','form','drops','dose','0.6 mL','schedule','1-1-1','timing','any','durationDays',2,'asNeeded',true,'note','Only if temperature is 100.4 °F or more. Not more than 4 times a day')),
  'tests', jsonb_build_array('Urine routine, if fever lasts past 24 hours'),
  'advice', jsonb_build_array('Keep feeding every 2 to 3 hours','Light clothes, no wrapping','Come in at once if she is drowsy, feeds poorly or breathes fast'),
  'followUp', (current_date+1)::text))),
('c3000000-0000-4000-8000-000000000004','b3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111/b3333333-3333-4333-8333-333333333333/demo-inv.pdf','application/pdf','consultation_invoice','filed',current_date,'Little Steps Children''s Clinic, Indiranagar','Dr. Sameer Joshi',0.99,'DEMO-RECORDS tara',
 jsonb_build_object('title','Video consultation · Dr. Sameer Joshi','details', jsonb_build_object('invoiceNo','CK-4F2B9','issuedAt',now()::text,'doctor',jsonb_build_object('name','Dr. Sameer Joshi','specialty','Paediatrician','clinic',null),'mode','online','appointment',jsonb_build_object('day',current_date::text,'slot','11:30 pm'),'lines',jsonb_build_array(jsonb_build_object('label','Consultation fee','amount',499),jsonb_build_object('label','Booking fee','amount',0)),'total',499,'status','paid','paymentMode','Paid in app','sample',false)));
insert into entities (profile_id, user_id, document_id, kind, name, canonical_name, value_text, event_date) values
('b3333333-3333-4333-8333-333333333333','a1111111-1111-4111-8111-111111111111','c3000000-0000-4000-8000-000000000003','medication','Paracetamol drops 100 mg/mL','paracetamol','0.6 mL if 100.4 °F or more, up to 4 times a day',current_date);
commit;
