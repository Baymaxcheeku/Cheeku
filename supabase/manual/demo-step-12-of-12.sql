-- demo step 12 of 12: sample records for Athar, Nisha and Imaad. Run in order, each in a new query. Safe to run again.
-- To remove every sample later, run this on its own:
-- delete from documents where raw_text like 'DEMO-RECORDS %';
begin;

drop function if exists demo_load_records (text, text);

select p.name, count(d.id) as demo_records
from profiles p
join documents d on d.profile_id = p.id and d.raw_text like 'DEMO-RECORDS %'
group by p.name
order by p.name;

commit;
