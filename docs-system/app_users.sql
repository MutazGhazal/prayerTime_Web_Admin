create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  provider text,
  last_login timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.app_users enable row level security;

create policy "app users read own row"
  on public.app_users
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "app users insert own row"
  on public.app_users
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "app users update own row"
  on public.app_users
  for update
  to authenticated
  using (user_id = auth.uid());

create policy "admin read app users"
  on public.app_users
  for select
  to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create policy "admin manage app users"
  on public.app_users
  for all
  to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
