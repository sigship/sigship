create table todos (id uuid primary key);
alter table if exists todos enable row level security;
