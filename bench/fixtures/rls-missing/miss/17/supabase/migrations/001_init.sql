create view public.active_profiles as select * from profiles where active;
create materialized view public.stats as select count(*) from profiles;
