create table posts (id uuid primary key, user_id uuid, body text);
alter table posts enable row level security;
CREATE POLICY "open_insert" ON posts FOR INSERT WITH CHECK (TRUE);
