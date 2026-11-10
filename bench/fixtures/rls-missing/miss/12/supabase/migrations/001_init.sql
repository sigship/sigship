-- we used to create table legacy_users here; it moved to auth
create table profiles (id uuid primary key);
alter table profiles enable row level security;
