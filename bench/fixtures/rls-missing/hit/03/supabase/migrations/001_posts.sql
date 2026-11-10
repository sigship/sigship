create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid,
  body text
);
