create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "public read" on posts for select using (true);
