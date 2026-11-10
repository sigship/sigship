create table profiles (id uuid primary key);
alter table profiles enable row level security;
create temp table import_buffer (line text);
