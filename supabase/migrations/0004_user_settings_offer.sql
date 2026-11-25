-- What each user sells, so AI drafts pitch their own product
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  offer text,
  updated_at timestamptz not null default now()
);

-- Only the server (service role) touches this table
alter table user_settings enable row level security;

-- The public demo account pitches LeadGenie itself
insert into user_settings (user_id, offer)
select id, 'LeadGenie AI, a tool that helps small sales teams keep track of leads and send personal first emails faster.'
from auth.users where email = 'demo@leadgenie.dev'
on conflict (user_id) do nothing;
