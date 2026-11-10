create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
CREATE POLICY "public_read" ON posts FOR SELECT USING (TRUE);
