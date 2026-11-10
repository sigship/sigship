create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "anon update" on posts for update to anon using (true);
