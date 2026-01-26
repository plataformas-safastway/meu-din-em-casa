-- =============================================
-- ADMINISTRATIVE USERS SYSTEM
-- =============================================

-- 1. Create admin_role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('CS', 'ADMIN', 'LEGAL', 'MASTER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  admin_role public.admin_role NOT NULL DEFAULT 'CS',
  is_active BOOLEAN NOT NULL DEFAULT true,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

-- 3. Create admin_user_access_scopes table (future-ready)
CREATE TABLE IF NOT EXISTS public.admin_user_access_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'ALL_FAMILIES' CHECK (scope_type IN ('ALL_FAMILIES', 'SPECIFIC_FAMILIES')),
  family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_access_scopes ENABLE ROW LEVEL SECURITY;

-- 5. Helper function: get admin role for a user
CREATE OR REPLACE FUNCTION public.get_admin_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT admin_role::text
  FROM public.admin_users
  WHERE user_id = _user_id
    AND is_active = true
  LIMIT 1;
$$;

-- 6. Helper function: check if user has specific admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND is_active = true
      AND admin_role::text = _role
  );
$$;

-- 7. Helper function: check if user is any admin
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND is_active = true
  );
$$;

-- 8. Helper function: check if user can manage admins (MASTER or ADMIN only)
CREATE OR REPLACE FUNCTION public.can_manage_admins(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = _user_id
      AND is_active = true
      AND admin_role IN ('MASTER', 'ADMIN')
  );
$$;

-- 9. RLS Policies for admin_users

-- Policy: MASTER and ADMIN can view all admin users
CREATE POLICY "admin_users_select_policy" ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_admins(auth.uid())
    OR user_id = auth.uid()
  );

-- Policy: Only MASTER and ADMIN can insert
CREATE POLICY "admin_users_insert_policy" ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_admins(auth.uid())
  );

-- Policy: MASTER and ADMIN can update (with restrictions enforced in app)
CREATE POLICY "admin_users_update_policy" ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_admins(auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.can_manage_admins(auth.uid())
    OR user_id = auth.uid()
  );

-- Policy: Only MASTER can delete
CREATE POLICY "admin_users_delete_policy" ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (
    public.has_admin_role(auth.uid(), 'MASTER')
  );

-- 10. RLS Policies for admin_user_access_scopes
CREATE POLICY "scopes_select_policy" ON public.admin_user_access_scopes
  FOR SELECT
  TO authenticated
  USING (public.can_manage_admins(auth.uid()));

CREATE POLICY "scopes_insert_policy" ON public.admin_user_access_scopes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_admins(auth.uid()));

CREATE POLICY "scopes_delete_policy" ON public.admin_user_access_scopes
  FOR DELETE
  TO authenticated
  USING (public.can_manage_admins(auth.uid()));

-- 11. Function to log admin user changes
CREATE OR REPLACE FUNCTION public.log_admin_user_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_type TEXT;
  _metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _event_type := 'ADMIN_USER_CREATED';
    _metadata := jsonb_build_object(
      'admin_role', NEW.admin_role::text,
      'is_active', NEW.is_active
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine specific event type
    IF OLD.is_active = true AND NEW.is_active = false THEN
      _event_type := 'ADMIN_USER_DISABLED';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      _event_type := 'ADMIN_USER_ENABLED';
    ELSIF OLD.admin_role != NEW.admin_role THEN
      _event_type := 'ADMIN_ROLE_CHANGED';
    ELSIF OLD.must_change_password != NEW.must_change_password THEN
      _event_type := 'PASSWORD_RESET_REQUIRED';
    ELSIF OLD.mfa_required != NEW.mfa_required THEN
      _event_type := 'MFA_REQUIRED_CHANGED';
    ELSE
      _event_type := 'ADMIN_USER_UPDATED';
    END IF;
    
    _metadata := jsonb_build_object(
      'old_role', OLD.admin_role::text,
      'new_role', NEW.admin_role::text,
      'old_active', OLD.is_active,
      'new_active', NEW.is_active
    );
  ELSIF TG_OP = 'DELETE' THEN
    _event_type := 'ADMIN_USER_DELETED';
    _metadata := jsonb_build_object(
      'admin_role', OLD.admin_role::text
    );
  END IF;

  INSERT INTO public.dashboard_audit_logs (
    actor_admin_id,
    actor_role,
    event_type,
    target_user_ref,
    metadata_safe
  ) VALUES (
    auth.uid(),
    COALESCE(public.get_admin_role(auth.uid()), 'unknown'),
    _event_type,
    CASE 
      WHEN TG_OP = 'DELETE' THEN encode(digest(OLD.user_id::text, 'sha256'), 'hex')
      ELSE encode(digest(NEW.user_id::text, 'sha256'), 'hex')
    END,
    _metadata
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 12. Create trigger for audit logging
DROP TRIGGER IF EXISTS admin_users_audit_trigger ON public.admin_users;
CREATE TRIGGER admin_users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_admin_user_change();

-- 13. Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_admin_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_users_updated_at_trigger ON public.admin_users;
CREATE TRIGGER admin_users_updated_at_trigger
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_users_updated_at();

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_admins(UUID) TO authenticated;

-- 15. Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_admin_role ON public.admin_users(admin_role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_scopes_admin_user_id ON public.admin_user_access_scopes(admin_user_id);