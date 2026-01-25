-- Create enum for member status
CREATE TYPE public.member_status AS ENUM ('INVITED', 'ACTIVE', 'REMOVED', 'DISABLED');

-- Add audit columns to family_members
ALTER TABLE public.family_members
ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS added_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS added_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS removed_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS removed_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Set added_at for existing members based on created_at
UPDATE public.family_members 
SET added_at = created_at 
WHERE added_at IS NULL;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_family_members_status ON public.family_members(family_id, status);

-- Update RLS policies to filter by active status for regular access
DROP POLICY IF EXISTS "Family members can view their own family members" ON public.family_members;

CREATE POLICY "Family members can view active members of their family"
ON public.family_members
FOR SELECT
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() AND status IN ('ACTIVE', 'INVITED')
  )
);

-- Allow admins/owners to view all members including removed
CREATE POLICY "Admins can view all family members including removed"
ON public.family_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = family_members.family_id
    AND fm.user_id = auth.uid()
    AND fm.status = 'ACTIVE'
    AND fm.role = 'owner'
  )
  OR public.has_cs_access(auth.uid())
);

-- Update policy for soft delete (only update status, not actual delete)
DROP POLICY IF EXISTS "Family owners can remove members" ON public.family_members;

CREATE POLICY "Family owners can update member status"
ON public.family_members
FOR UPDATE
USING (
  family_id IN (
    SELECT family_id FROM public.family_members 
    WHERE user_id = auth.uid() 
    AND status = 'ACTIVE'
    AND role = 'owner'
  )
  OR (
    EXISTS (
      SELECT 1 FROM public.member_permissions mp
      JOIN public.family_members fm ON fm.id = mp.member_id
      WHERE fm.user_id = auth.uid()
      AND fm.family_id = family_members.family_id
      AND fm.status = 'ACTIVE'
      AND mp.can_manage_family = true
    )
  )
);

-- Create function to soft delete member
CREATE OR REPLACE FUNCTION public.soft_delete_family_member(
  _member_id UUID,
  _removed_by UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family_id UUID;
  _target_role TEXT;
BEGIN
  -- Get member info
  SELECT family_id, role INTO _family_id, _target_role
  FROM family_members
  WHERE id = _member_id AND status = 'ACTIVE';

  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found or already removed';
  END IF;

  -- Cannot remove owner
  IF _target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove family owner';
  END IF;

  -- Check if requester has permission
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm
    LEFT JOIN member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = _family_id
    AND fm.user_id = _removed_by
    AND fm.status = 'ACTIVE'
    AND (fm.role = 'owner' OR mp.can_manage_family = true)
  ) THEN
    RAISE EXCEPTION 'No permission to remove members';
  END IF;

  -- Soft delete
  UPDATE family_members
  SET 
    status = 'REMOVED',
    removed_by_user_id = _removed_by,
    removed_at = now(),
    removed_reason = _reason,
    updated_at = now()
  WHERE id = _member_id;

  RETURN TRUE;
END;
$$;

-- Create function to restore member
CREATE OR REPLACE FUNCTION public.restore_family_member(
  _member_id UUID,
  _restored_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _family_id UUID;
BEGIN
  -- Get member info
  SELECT family_id INTO _family_id
  FROM family_members
  WHERE id = _member_id AND status = 'REMOVED';

  IF _family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found or not in removed status';
  END IF;

  -- Check if requester has permission
  IF NOT EXISTS (
    SELECT 1 FROM family_members fm
    LEFT JOIN member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = _family_id
    AND fm.user_id = _restored_by
    AND fm.status = 'ACTIVE'
    AND (fm.role = 'owner' OR mp.can_manage_family = true)
  ) THEN
    RAISE EXCEPTION 'No permission to restore members';
  END IF;

  -- Restore member
  UPDATE family_members
  SET 
    status = 'ACTIVE',
    removed_by_user_id = NULL,
    removed_at = NULL,
    removed_reason = NULL,
    updated_at = now()
  WHERE id = _member_id;

  RETURN TRUE;
END;
$$;