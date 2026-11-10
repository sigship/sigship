create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "Enable insert for all users"
  on public.posts
  for insert
  with check (true);
