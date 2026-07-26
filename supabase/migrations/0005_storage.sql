-- Private document storage.
--
-- `public = false` is the whole point: objects are only ever reachable through
-- a 60s signed URL minted server-side after an auth check. There is no path
-- that returns a permanent URL for a medical document.
--
-- Object keys are server-generated as `<user_id>/<profile_id>/<uuid>.<ext>`,
-- never the client's filename. The policies below lean on that first segment,
-- so the key format is load-bearing, not cosmetic.

insert into
  storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documents',
    'documents',
    false,
    10485760, -- 10MB, matching the app-layer cap in the upload validator
    array['image/jpeg', 'image/png', 'image/heic', 'application/pdf']
  )
on conflict (id) do nothing;

create policy "users read own document objects" on storage.objects for select using (
  bucket_id = 'documents'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);

create policy "users upload own document objects" on storage.objects for insert
with
  check (
    bucket_id = 'documents'
    and (storage.foldername (name)) [1] = auth.uid ()::text
  );

create policy "users update own document objects" on storage.objects
for update
  using (
    bucket_id = 'documents'
    and (storage.foldername (name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "users delete own document objects" on storage.objects for delete using (
  bucket_id = 'documents'
  and (storage.foldername (name)) [1] = auth.uid ()::text
);
