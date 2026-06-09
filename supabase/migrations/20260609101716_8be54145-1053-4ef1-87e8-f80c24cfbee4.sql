
-- 1. App role enum + user_roles table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- 2. Plan enum + profiles
create type public.plan_tier as enum ('free', 'pro');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  plan public.plan_tier not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- 3. Reports
create type public.report_status as enum ('queued', 'running', 'done', 'error');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  ticker text,
  company_name text,
  status public.report_status not null default 'queued',
  memo_md text,
  sources jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "users manage own reports" on public.reports
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index reports_user_created_idx on public.reports(user_id, created_at desc);

-- 4. Report events (agent trace)
create table public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  step text not null,
  status text not null default 'info',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.report_events to authenticated;
grant all on public.report_events to service_role;
alter table public.report_events enable row level security;
create policy "users read own report events" on public.report_events
  for select to authenticated using (
    exists (select 1 from public.reports r where r.id = report_id and r.user_id = auth.uid())
  );
create index report_events_report_idx on public.report_events(report_id, created_at);

-- 5. Usage tracking
create table public.usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- 'YYYY-MM'
  reports_run integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month)
);
grant select on public.usage to authenticated;
grant all on public.usage to service_role;
alter table public.usage enable row level security;
create policy "users read own usage" on public.usage
  for select to authenticated using (auth.uid() = user_id);

-- 6. updated_at trigger fn
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.tg_set_updated_at();
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.tg_set_updated_at();

-- 7. Auto-create profile + user role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
