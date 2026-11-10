create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "block banned" on posts as restrictive for all using (not exists (select 1 from banned where banned.user_id = auth.uid()));
