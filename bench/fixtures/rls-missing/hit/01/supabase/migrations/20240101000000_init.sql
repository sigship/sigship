create table profiles (
  id uuid primary key references auth.users(id),
  username text unique,
  created_at timestamptz default now()
);
