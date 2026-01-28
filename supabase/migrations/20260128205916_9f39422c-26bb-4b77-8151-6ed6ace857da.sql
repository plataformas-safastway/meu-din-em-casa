-- =====================================================
-- STEP 3: DROP OLD FUNCTIONS AND CREATE NEW HELPER FUNCTIONS
-- =====================================================

-- Drop old functions with CASCADE
DROP FUNCTION IF EXISTS public.is_family_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_family_owner_or_manager(uuid) CASCADE;

-- 1.5 is_family_owner - Check if user is owner of family
CREATE FUNCTION public.is_family_owner(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = p_family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'owner'
      AND COALESCE(fm.status::text, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 1.6 is_family_owner_or_manager - Check if user is owner OR has manage_family permission
CREATE FUNCTION public.is_family_owner_or_manager(p_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = p_family_id
      AND fm.user_id = auth.uid()
      AND COALESCE(fm.status::text, 'ACTIVE') = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_manage_family, false) = true)
  );
$$;