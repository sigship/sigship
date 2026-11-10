create policy "avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() = owner);
