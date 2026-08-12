create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);
