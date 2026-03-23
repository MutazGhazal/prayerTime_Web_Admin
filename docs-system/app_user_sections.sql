create table if not exists public.app_user_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section int not null default 1,
  title text,
  body text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_user_sections_user on public.app_user_sections(user_id);

alter table public.app_user_sections enable row level security;

create policy "app user read own sections"
  on public.app_user_sections
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "app user insert own sections"
  on public.app_user_sections
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "app user update own sections"
  on public.app_user_sections
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "app user delete own sections"
  on public.app_user_sections
  for delete
  to authenticated
  using (user_id = auth.uid());

create policy "admin manage app user sections"
  on public.app_user_sections
  for all
  to authenticated
  using (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );
