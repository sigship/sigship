create table bookings (
  id uuid primary key,
  user_id uuid,
  starts_at timestamptz
);
-- TODO: enable RLS before launch
