-- =====================================================
-- STEP 4A: CREATE MISSING HELPER FUNCTIONS
-- =====================================================

-- has_admin_role - Check if current user has specific admin roles
CREATE OR REPLACE FUNCTION public.has_admin_role(p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.admin_role::text = ANY(p_roles)
  );
$$;

-- is_admin_user - Check if current user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  );
$$;

-- has_cs_access_scoped - Check CS access with scope
CREATE OR REPLACE FUNCTION public.has_cs_access_scoped(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_admin_role(ARRAY['MASTER','ADMIN'])
    OR (
      public.has_admin_role(ARRAY['CS'])
      AND EXISTS (
        SELECT 1
        FROM public.admin_user_access_scopes s
        JOIN public.admin_users au ON au.id = s.admin_user_id
        WHERE au.user_id = auth.uid()
          AND (s.family_id = p_family_id OR s.scope_type = 'global')
      )
    );
$$;