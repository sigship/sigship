create table if not exists todos (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  title text not null,
  done boolean default false
);
