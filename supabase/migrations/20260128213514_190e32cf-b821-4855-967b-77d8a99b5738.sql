
-- =====================================================
-- P0 PERFORMANCE FIX: is_family_member() + optimal index
-- =====================================================

-- Step 1: Create optimal index FIRST (before updating function)
-- Using (family_id, user_id, status) to match the query pattern in RLS
-- This is a partial index for ACTIVE members only - most common case
CREATE INDEX IF NOT EXISTS idx_family_members_family_user_active 
ON public.family_members (family_id, user_id) 
WHERE status = 'ACTIVE'::member_status;

-- Also create a covering index for the full predicate (non-partial)
-- This helps when we need to check specific status values
CREATE INDEX IF NOT EXISTS idx_family_members_family_user_status 
ON public.family_members (family_id, user_id, status);

-- Step 2: Update is_family_member() to filter by ACTIVE status
-- This prevents REMOVED, DISABLED, BLOCKED, INVITED members from having access
CREATE OR REPLACE FUNCTION public.is_family_member(f_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_members
    WHERE family_id = f_id
      AND user_id = auth.uid()
      AND status = 'ACTIVE'::member_status
  )
$$;

-- Step 3: Also update user_belongs_to_family to be consistent
-- Currently it checks for ACTIVE or INVITED - keep that behavior for invite flows
CREATE OR REPLACE FUNCTION public.user_belongs_to_family(_user_id uuid, _family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id 
      AND family_id = _family_id
      AND status IN ('ACTIVE'::member_status, 'INVITED'::member_status)
  )
$$;

-- Add a comment explaining the security model
COMMENT ON FUNCTION public.is_family_member(uuid) IS 
'Returns true if the current authenticated user is an ACTIVE member of the specified family. 
Used by RLS policies to restrict data access. INVITED, REMOVED, DISABLED, and BLOCKED members return false.';

COMMENT ON FUNCTION public.user_belongs_to_family(uuid, uuid) IS 
'Returns true if the specified user belongs to the family with ACTIVE or INVITED status.
Used for invite acceptance flows where INVITED users need partial access.';
