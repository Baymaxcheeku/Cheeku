-- 0031 step 1 of 6. Run the steps in order, each in a new query. Safe to run again.
begin;

create table if not exists legal_documents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('terms', 'privacy', 'health_consent', 'storage')),
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  effective_on date not null,
  material boolean not null default true,
  summary text not null check (char_length(summary) <= 600),
  text_sha256 text not null check (text_sha256 ~ '^[0-9a-f]{64}$'),
  published_at timestamptz not null default now(),
  unique (kind, version)
);

alter table legal_documents enable row level security;

drop policy if exists "signed-in users read legal documents" on legal_documents;
create policy "signed-in users read legal documents" on legal_documents for select using (auth.uid() is not null);

insert into legal_documents (kind, version, effective_on, material, summary, text_sha256) values
  ('terms', '2026-10-08', '2026-10-08', true,
   'These terms are the agreement between you and us for using Cheeku AI. Cheeku helps you understand and organise health information; it does not diagnose, prescribe or replace a doctor.',
   '8270910757f13fa373ecd94f1e99b039727f1763867f906d025b795ef5e0b2c2'),
  ('privacy', '2026-10-08', '2026-10-08', true,
   'We collect what Cheeku needs to keep your family''s health records and answer your questions, and nothing for advertising. We never sell your data, and you can see, correct, export or delete it at any time.',
   'fb3f50715e1b565df45ddfa3c6741d7fb165e9f9c15948cb2eada519ca5db5b4'),
  ('health_consent', '2026-10-08', '2026-10-08', true,
   'This is the consent notice under India''s DPDP Act. It lists exactly what Cheeku does with your family''s health data when you tick the box, and the optional uses that stay off unless you turn them on.',
   'f2d3608573bcc82426941ce699189d2c728cf6e1cac951c28fdec7b955e54756'),
  ('storage', '2026-10-08', '2026-10-08', false,
   'Cheeku uses no advertising cookies, no tracking pixels and no third-party analytics. It keeps a small amount of data on your phone so the app works, opens fast and can show your records without a signal.',
   '51dee9ee8cb660445b6fd5ee7b8f5d391b9963cfa6b9bfaa4e35720b51f3f4bf')
on conflict (kind, version) do nothing;

create or replace function current_material_versions () returns jsonb
stable
set
  search_path = public as $$
  select coalesce(jsonb_object_agg(kind, version), '{}'::jsonb)
  from (
    select distinct on (kind) kind, version
    from legal_documents
    where material and effective_on <= current_date and kind in ('terms', 'privacy', 'health_consent')
    order by kind, effective_on desc, published_at desc
  ) d;
$$ language sql;

commit;
