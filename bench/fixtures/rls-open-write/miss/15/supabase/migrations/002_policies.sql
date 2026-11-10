create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "published" on posts for select using (published = true);
create policy "edit own" on posts for update using (auth.uid() = user_id);
