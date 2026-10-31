begin;
insert into auth.users (id, email, phone, created_at) values ('a1111111-1111-4111-8111-111111111111','arjun@cheeku.demo','+919800000001','2023-02-01');
insert into families (id, owner_id, plan) values ('fa111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','family');
insert into subscriptions (family_id, tier, period_start) values ('fa111111-1111-4111-8111-111111111111','family', current_date - 10);
insert into profiles (id, family_id, user_id, name, dob, sex, relationship, is_primary, avatar_seed, journey, blood_group, height_cm, weight_kg, conditions, created_at, phone) values
 ('b1111111-1111-4111-8111-111111111111','fa111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','Arjun Sharma','1992-04-18','male','self',true,'f38','new_parent','B+',176,78.4,'{"Pre-diabetes"}','2023-02-01','+919800000001'),
 ('b2222222-2222-4222-8222-222222222222','fa111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','Meera Sharma','1995-08-02','female','spouse',false,'f37','new_parent','O+',162,61.0,'{"Hypothyroidism"}','2023-02-01','+919800000002'),
 ('b3333333-3333-4333-8333-333333333333','fa111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','Tara Sharma', current_date - 49,'female','daughter',false,'f40','other',null,54,4.6,'{}', now() - interval '49 days', null);
insert into consent_log (user_id, consent_type, version, granted, method, document_versions)
select 'a1111111-1111-4111-8111-111111111111', t, '2025-01', true, 'signup_checkbox', '{"privacy":"2025-01","terms":"2025-01"}'::jsonb from unnest(required_purposes()) t;
commit;
