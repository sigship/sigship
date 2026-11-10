create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "soft delete only" on posts for update using (auth.uid() = user_id) with check (deleted_at is not null);
