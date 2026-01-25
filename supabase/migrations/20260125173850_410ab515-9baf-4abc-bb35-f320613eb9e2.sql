-- Add last_active_family_id to track user's preferred family
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Create family switch audit log
CREATE TABLE IF NOT EXISTS public.family_switch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  to_family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  switched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.family_switch_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own switch logs
CREATE POLICY "Users can view own switch logs"
ON public.family_switch_log FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own switch logs
CREATE POLICY "Users can insert own switch logs"
ON public.family_switch_log FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all switch logs
CREATE POLICY "Admins can view all switch logs"
ON public.family_switch_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'admin_master', 'cs', 'customer_success')
  )
);

-- Function to get all families for a user
CREATE OR REPLACE FUNCTION public.get_user_families(_user_id uuid)
RETURNS TABLE (
  family_id uuid,
  family_name text,
  member_role text,
  members_count integer,
  last_active_at timestamptz,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id as family_id,
    f.name as family_name,
    fm.role::text as member_role,
    f.members_count,
    fm.last_active_at,
    fm.role = 'owner' as is_owner
  FROM public.family_members fm
  JOIN public.families f ON f.id = fm.family_id
  WHERE fm.user_id = _user_id
  ORDER BY fm.last_active_at DESC NULLS LAST, f.created_at ASC
$$;

-- Function to switch active family
CREATE OR REPLACE FUNCTION public.switch_active_family(_user_id uuid, _to_family_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_family_id uuid;
  v_is_member boolean;
BEGIN
  -- Check if user is a member of the target family
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND family_id = _to_family_id
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User is not a member of this family';
  END IF;
  
  -- Get current active family (most recently active)
  SELECT family_id INTO v_from_family_id
  FROM public.family_members
  WHERE user_id = _user_id
  ORDER BY last_active_at DESC NULLS LAST
  LIMIT 1;
  
  -- Update last_active_at for the new family
  UPDATE public.family_members
  SET last_active_at = now()
  WHERE user_id = _user_id AND family_id = _to_family_id;
  
  -- Log the switch (if switching to a different family)
  IF v_from_family_id IS DISTINCT FROM _to_family_id THEN
    INSERT INTO public.family_switch_log (user_id, from_family_id, to_family_id)
    VALUES (_user_id, v_from_family_id, _to_family_id);
  END IF;
  
  RETURN true;
END;
$$;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_user_active 
ON public.family_members(user_id, last_active_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_family_switch_log_user 
ON public.family_switch_log(user_id, switched_at DESC);