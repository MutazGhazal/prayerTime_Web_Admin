# Web Admin (React)

## Setup
1) Copy config:
- `web-admin/config.example.js` → `web-admin/config.js`
- `web-admin/public_config.example.js` → `web-admin/public_config.js`

2) Fill keys:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (admin login required)
- `SUPABASE_ANON_KEY` (public referral page)

## Run
Open `web-admin/index.html` in a browser.

## Admin login
Use a Supabase Auth admin user (mapped in `admin_users`).

## Client portal
Open `web-client/index.html` for client editing (sections 1-3).
Clients must login with Supabase Auth.

### Enable Google login
In Supabase:
1) Authentication → Providers → Google → Enable.
2) Add OAuth credentials (Client ID/Secret).
3) Add Redirect URL:
   - `https://YOUR_DOMAIN/web-client/index.html`
   - For local testing: `http://localhost:5501/index.html`

## Referral link
Use:
```
web-admin/referral.html?ref=REFCODE
```
This records the visit in `referral_visits`.
