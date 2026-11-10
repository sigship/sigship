create table payments (id uuid primary key, user_id uuid, amount int);
alter table payments force row level security;
