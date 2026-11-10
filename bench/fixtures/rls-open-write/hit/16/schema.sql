create table comments (id uuid primary key, body text);
alter table comments enable row level security;
create policy "post comments" on comments for insert with check (true);
