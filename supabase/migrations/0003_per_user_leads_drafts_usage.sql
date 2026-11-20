-- Each lead belongs to one user
alter table leads add column user_id uuid references auth.users(id) on delete cascade;

-- Existing rows are the public demo leads
update leads
set user_id = (select id from auth.users where email = 'demo@leadgenie.dev')
where user_id is null;

alter table leads alter column user_id set not null;

-- Duplicate check is now per user, not global
alter table leads drop constraint leads_email_key;
alter table leads add constraint leads_user_email_key unique (user_id, email);
create index leads_user_created_idx on leads (user_id, created_at desc);

-- Extra context for better AI drafts
alter table leads add column role text;
alter table leads add column notes text;

-- Drafts are stored on the server, and Send uses the stored draft
alter table leads add column draft_subject text;
alter table leads add column draft_body text;
alter table leads add column drafted_at timestamptz;

-- One row per AI draft, used for the daily limit
create table ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ai_usage_user_created_idx on ai_usage (user_id, created_at desc);

-- Only the server (service role) touches these tables
alter table ai_usage enable row level security;
