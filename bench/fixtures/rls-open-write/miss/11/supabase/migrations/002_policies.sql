create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "team members" on posts for update using (exists (select 1 from members m where m.user_id = auth.uid() and m.team_id = posts.team_id));
