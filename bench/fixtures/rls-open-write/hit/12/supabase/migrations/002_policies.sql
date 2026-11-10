create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
create policy "Enable delete for all users" on "public"."posts" as permissive for delete to public using (true);
