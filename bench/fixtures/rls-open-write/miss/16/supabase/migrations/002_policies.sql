create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
drop policy if exists "open" on posts;
