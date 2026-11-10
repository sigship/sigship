create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "own rows" on posts for insert with check (auth.uid() = user_id);
