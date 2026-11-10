create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "anyone can insert" on posts for insert with check (true);
