-- =============================================
-- FIX family_members RLS RECURSION
-- =============================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can read own family" ON public.family_members;

-- Create a SECURITY DEFINER function to check family membership without recursion
CREATE OR REPLACE FUNCTION public.user_shares_family_with(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = _family_id
      AND user_id = _user_id
      AND status IN ('ACTIVE', 'INVITED')
  )
$$;

-- Create safe RLS policy using the SECURITY DEFINER function
CREATE POLICY "Members can read own family"
ON public.family_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Can always see own record
    user_id = auth.uid()
    OR
    -- Can see members of families user belongs to (using SECURITY DEFINER function)
    public.user_shares_family_with(auth.uid(), family_id)
  )
);