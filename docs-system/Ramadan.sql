-- Ramadan Imsakiyah tables + policies

create table if not exists public.ramadan_imsakiyah (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  city text not null default 'Amman',
  date date not null,
  fajr text not null,
  sunrise text,
  dhuhr text not null,
  asr text not null,
  maghrib text not null,
  isha text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ramadan_year_city on public.ramadan_imsakiyah(year, city);

alter table public.ramadan_imsakiyah enable row level security;

create policy "public read ramadan imsakiyah"
  on public.ramadan_imsakiyah
  for select
  using (true);

create policy "admin can manage ramadan imsakiyah"
  on public.ramadan_imsakiyah
  for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

