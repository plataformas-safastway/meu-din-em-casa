-- Add phone and avatar columns to admin_users for profile management
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS phone_country VARCHAR(5) DEFAULT '+55',
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_users.phone_country IS 'Country code for phone number (e.g., +55 for Brazil)';
COMMENT ON COLUMN public.admin_users.phone_number IS 'Phone number without country code';
COMMENT ON COLUMN public.admin_users.avatar_url IS 'URL of admin user profile photo';

-- Drop existing policy if exists, then create new one
DROP POLICY IF EXISTS "Admins can update their own profile" ON public.admin_users;

CREATE POLICY "Admins can update their own profile"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());