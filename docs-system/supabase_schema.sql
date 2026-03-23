-- Core tables
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  referral_code text unique not null,
  commission_rate numeric(5,2) not null default 10.00,
  created_at timestamptz not null default now()
);

create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'client',
  created_at timestamptz not null default now(),
  unique (client_id, user_id)
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.client_sections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  client_slug text not null references public.clients(slug) on delete cascade,
  section int not null check (section between 1 and 3),
  title text,
  body text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_sections (
  id uuid primary key default gen_random_uuid(),
  section int not null check (section between 4 and 5),
  title text,
  body text,
  image_url text,
  link_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.referral_visits (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  referrer_client_slug text,
  visitor_id text,
  landing_url text,
  created_at timestamptz not null default now()
);

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

-- Indexes
create index if not exists idx_client_sections_slug on public.client_sections(client_slug);
create index if not exists idx_client_sections_section on public.client_sections(section);
create index if not exists idx_admin_sections_section on public.admin_sections(section);
create index if not exists idx_referral_visits_code on public.referral_visits(referral_code);
create index if not exists idx_client_users_user on public.client_users(user_id);
create index if not exists idx_admin_users_user on public.admin_users(user_id);
create index if not exists idx_ramadan_year_city on public.ramadan_imsakiyah(year, city);

-- RLS
alter table public.client_sections enable row level security;
alter table public.admin_sections enable row level security;
alter table public.referral_visits enable row level security;
alter table public.client_users enable row level security;
alter table public.clients enable row level security;
alter table public.admin_users enable row level security;
alter table public.ramadan_imsakiyah enable row level security;

-- Public read for content
create policy "public read client sections"
  on public.client_sections
  for select
  using (true);

create policy "public read admin sections"
  on public.admin_sections
  for select
  using (true);

-- Public insert for referral visits
create policy "public insert referral visits"
  on public.referral_visits
  for insert
  with check (true);

create policy "public read ramadan imsakiyah"
  on public.ramadan_imsakiyah
  for select
  using (true);

create policy "client can read own profile"
  on public.clients
  for select
  to authenticated
  using (
    exists (
      select 1 from public.client_users cu
      where cu.user_id = auth.uid()
      and cu.client_id = public.clients.id
    )
  );

create policy "client can read own mapping"
  on public.client_users
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "client manage own sections"
  on public.client_sections
  for all
  to authenticated
  using (
    exists (
      select 1 from public.client_users cu
      where cu.user_id = auth.uid()
      and cu.client_id = public.client_sections.client_id
    )
  )
  with check (
    exists (
      select 1 from public.client_users cu
      where cu.user_id = auth.uid()
      and cu.client_id = public.client_sections.client_id
    )
  );

create policy "admin can manage clients"
  on public.clients
  for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create policy "admin can manage client sections"
  on public.client_sections
  for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create policy "admin can manage admin sections"
  on public.admin_sections
  for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create policy "admin can read referrals"
  on public.referral_visits
  for select
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create policy "admin can manage ramadan imsakiyah"
  on public.ramadan_imsakiyah
  for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create policy "admin read own mapping"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

