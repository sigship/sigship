create table invoices (id uuid primary key, user_id uuid, amount int);
alter table invoices enable row level security;
-- temporarily off while debugging the dashboard
alter table invoices disable row level security;
