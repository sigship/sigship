create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "read" on posts for select using (true);
create policy "write" on posts for update using (true);
