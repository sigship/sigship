create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "anyone can delete" on posts for delete using (true);
