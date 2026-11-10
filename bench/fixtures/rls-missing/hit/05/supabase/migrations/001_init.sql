create table posts (id uuid primary key, body text);
create table comments (id uuid primary key, post_id uuid references posts(id), body text);
alter table posts enable row level security;
