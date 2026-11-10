create table feature_flags (key text primary key, enabled boolean default false);
insert into feature_flags values ('beta', true);
