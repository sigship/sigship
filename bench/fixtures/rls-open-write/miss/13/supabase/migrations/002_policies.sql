create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "anon read" on posts for select to anon using (true);
