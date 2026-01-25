-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Family members can view active members of their family" ON public.family_members;
DROP POLICY IF EXISTS "Admins can view all family members including removed" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can update member status" ON public.family_members;

-- Create a SECURITY DEFINER function to check family membership without recursion
CREATE OR REPLACE FUNCTION public.user_belongs_to_family(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE user_id = _user_id 
    AND family_id = _family_id
    AND status IN ('ACTIVE', 'INVITED')
  )
$$;

-- Create a function to check if user is owner/admin of a family
CREATE OR REPLACE FUNCTION public.user_is_family_admin(_user_id UUID, _family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members fm
    LEFT JOIN member_permissions mp ON mp.member_id = fm.id
    WHERE fm.user_id = _user_id 
    AND fm.family_id = _family_id
    AND fm.status = 'ACTIVE'
    AND (fm.role = 'owner' OR mp.can_manage_family = true)
  )
$$;

-- Recreate SELECT policy using the security definer function (no recursion)
CREATE POLICY "Family members can view their family members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  public.user_belongs_to_family(auth.uid(), family_id)
  OR public.has_cs_access(auth.uid())
);

-- Recreate UPDATE policy for soft delete using security definer function
CREATE POLICY "Admins can update family members"
ON public.family_members
FOR UPDATE
TO authenticated
USING (
  public.user_is_family_admin(auth.uid(), family_id)
);