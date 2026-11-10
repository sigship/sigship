create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "members insert" on posts for insert to authenticated with check (true);
