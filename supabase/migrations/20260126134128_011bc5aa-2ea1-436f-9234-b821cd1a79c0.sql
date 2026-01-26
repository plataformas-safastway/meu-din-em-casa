-- =============================================
-- 1) PROTECT import_history TABLE
-- =============================================
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read import_history" ON public.import_history;
DROP POLICY IF EXISTS "Anyone can read import_history" ON public.import_history;
DROP POLICY IF EXISTS "Family members can read import_history" ON public.import_history;
DROP POLICY IF EXISTS "Family members can insert import_history" ON public.import_history;

CREATE POLICY "Family members can read import_history"
ON public.import_history
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = import_history.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

CREATE POLICY "Family members can insert import_history"
ON public.import_history
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = import_history.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- =============================================
-- 2) PROTECT family_members TABLE (multi-tenant)
-- =============================================
-- Drop any public policies
DROP POLICY IF EXISTS "Public read family_members" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can read family_members" ON public.family_members;
DROP POLICY IF EXISTS "Users can read family members" ON public.family_members;
DROP POLICY IF EXISTS "Members can read own family" ON public.family_members;

-- SELECT: Users can only see members of families they belong to
CREATE POLICY "Members can read own family"
ON public.family_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Can see own record
    user_id = auth.uid()
    OR
    -- Can see other members of families user belongs to
    EXISTS (
      SELECT 1 FROM public.family_members my_membership
      WHERE my_membership.family_id = family_members.family_id
        AND my_membership.user_id = auth.uid()
        AND my_membership.status IN ('ACTIVE', 'INVITED')
    )
  )
);