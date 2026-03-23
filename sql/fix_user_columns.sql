-- Adding missing columns for roles and approval status to app_users
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.app_users(user_id);

-- Add a comment for documentation
COMMENT ON COLUMN public.app_users.role IS 'User roles: user, supervisor, admin';

-- Ensure the admin_users can manage these columns (RLS should already allow this, but for verification)
-- The existing "admin manage app users" policy covers this.
