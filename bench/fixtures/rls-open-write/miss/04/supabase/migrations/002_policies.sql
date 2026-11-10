create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "service" on posts for all to service_role using (true) with check (true);
