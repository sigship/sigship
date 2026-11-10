create table public.applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid references auth.users(id) on delete cascade,
  job_id uuid,
  resume_url text,
  cover_letter text,
  status text default 'submitted',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index on public.applications(applicant_id);
