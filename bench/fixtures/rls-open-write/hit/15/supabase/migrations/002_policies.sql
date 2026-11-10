create table a (id uuid primary key); alter table a enable row level security;
create table b (id uuid primary key); alter table b enable row level security;
create policy "a" on a for insert with check (auth.uid() is not null);
create policy "b" on b for insert with check (true);
