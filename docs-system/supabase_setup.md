# Supabase Setup

## 1) Create project
Create a Supabase project and get:
- Project URL
- Anon public key
- Service role key (admin only)

## 2) Run schema
Use the SQL editor in Supabase and run `docs/supabase_schema.sql`.

## 3) Seed example client
```sql
insert into public.clients (name, slug, logo_url, referral_code)
values ('Demo Company', 'default-client', '', 'DEMO123');
```

## 3.1) Create client user
Create a Supabase Auth user (email/password), then link it:
```sql
insert into public.client_users (client_id, user_id, role)
select c.id, u.id, 'client'
from public.clients c
join auth.users u on u.email = 'client@example.com'
where c.slug = 'default-client';
```

## 3.2) Create admin user
Create a Supabase Auth user (email/password), then mark it as admin:
```sql
insert into public.admin_users (user_id)
select u.id
from auth.users u
where u.email = 'admin@example.com';
```

## 3.2) Storage bucket for images
Create a public bucket `client-media`.
Then add policies on `storage.objects` to allow authenticated uploads and public reads.

## 3.3) Ramadan imsakiyah data
Insert rows into `ramadan_imsakiyah` for 2026. Example:
```sql
insert into public.ramadan_imsakiyah
(year, city, date, fajr, sunrise, dhuhr, asr, maghrib, isha)
values
(2026, 'Amman', '2026-02-17', '05:10', '06:25', '12:20', '15:35', '18:05', '19:20');
```

## 3.4) App users table (mobile login)
Run `docs/app_users.sql` to create the `app_users` table and policies.

## 3.5) App user sections (personalized content)
Run `docs/app_user_sections.sql` to create the `app_user_sections` table and policies.

## 4) Update Flutter config
Edit `mobile/lib/data/app_config.dart`:
- `supabaseUrl`
- `supabaseAnonKey`
- `clientSlug`
- `supabaseRedirectUrl` (must be added in Supabase Auth redirect URLs)

## 5) Admin web config
Create `web-admin/config.js` based on `web-admin/config.example.js` and fill:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 6) Client web config
Create `web-client/config.js` based on `web-client/config.example.js` and fill:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

