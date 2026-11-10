create table docs (id uuid primary key, owner uuid, body text);
create policy "own docs" on docs for all using (auth.uid() = owner);
