create table profiles (id uuid primary key, username text);
alter table profiles enable row level security;
