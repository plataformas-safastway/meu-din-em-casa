-- Add must_change_password tracking to user_roles or create a separate table
-- Using a dedicated table for user security settings

CREATE TABLE IF NOT EXISTS public.user_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    password_changed_at TIMESTAMPTZ,
    temp_password_created_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- Only allow users to read their own security settings
CREATE POLICY "Users can read own security settings"
ON public.user_security_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all security settings
CREATE POLICY "Admins can manage all security settings"
ON public.user_security_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_master'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_master'));

-- Function to check if user must change password
CREATE OR REPLACE FUNCTION public.user_must_change_password(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT must_change_password FROM public.user_security_settings WHERE user_id = _user_id),
        false
    )
$$;

-- Function to mark password as changed
CREATE OR REPLACE FUNCTION public.mark_password_changed(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.user_security_settings
    SET 
        must_change_password = false,
        password_changed_at = now(),
        updated_at = now()
    WHERE user_id = _user_id;
    
    -- Log the password change event
    INSERT INTO public.dashboard_audit_logs (
        actor_admin_id,
        actor_role,
        event_type,
        target_user_ref,
        metadata_safe
    ) VALUES (
        _user_id,
        'admin_master',
        'MASTER_PASSWORD_CHANGED',
        public.hash_identifier(_user_id::text),
        jsonb_build_object('changed_at', now())
    );
    
    RETURN TRUE;
END;
$$;

-- Add admin_master to app_role enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin_master' AND enumtypid = 'public.app_role'::regtype) THEN
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin_master';
    END IF;
END$$;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.user_must_change_password TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_password_changed TO authenticated;