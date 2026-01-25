-- Create enum for global user status (platform-wide)
CREATE TYPE public.user_account_status AS ENUM ('ACTIVE', 'DISABLED', 'BLOCKED');

-- Create table for global user status with full audit trail
CREATE TABLE public.user_account_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status user_account_status NOT NULL DEFAULT 'ACTIVE',
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_account_status_log ENABLE ROW LEVEL SECURITY;

-- Only admins/support can view and manage user status
CREATE POLICY "Admins can view user status"
  ON public.user_account_status_log FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_support_access(auth.uid())
    OR public.has_cs_access(auth.uid())
  );

CREATE POLICY "Admins can manage user status"
  ON public.user_account_status_log FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_support_access(auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_support_access(auth.uid())
  );

-- Create audit table for user status changes (immutable history)
CREATE TABLE public.user_status_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  old_status user_account_status,
  new_status user_account_status NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on audit
ALTER TABLE public.user_status_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit
CREATE POLICY "Admins can view status audit"
  ON public.user_status_audit FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_support_access(auth.uid())
    OR public.has_cs_access(auth.uid())
  );

-- Create function to change user status with audit
CREATE OR REPLACE FUNCTION public.change_user_account_status(
  _user_id UUID,
  _new_status user_account_status,
  _reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_status user_account_status;
  _changed_by UUID := auth.uid();
BEGIN
  -- Check permission
  IF NOT (
    has_role(_changed_by, 'admin') 
    OR has_support_access(_changed_by)
  ) THEN
    RAISE EXCEPTION 'No permission to change user status';
  END IF;

  -- Get current status
  SELECT status INTO _old_status
  FROM user_account_status_log
  WHERE user_id = _user_id;

  -- Insert or update status
  INSERT INTO user_account_status_log (user_id, status, changed_by, changed_at, reason)
  VALUES (_user_id, _new_status, _changed_by, now(), _reason)
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    changed_by = EXCLUDED.changed_by,
    changed_at = EXCLUDED.changed_at,
    reason = EXCLUDED.reason;

  -- Log audit trail
  INSERT INTO user_status_audit (user_id, old_status, new_status, changed_by, reason)
  VALUES (_user_id, _old_status, _new_status, _changed_by, _reason);

  RETURN TRUE;
END;
$$;

-- Function to get user account status
CREATE OR REPLACE FUNCTION public.get_user_account_status(_user_id UUID)
RETURNS user_account_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status FROM user_account_status_log WHERE user_id = _user_id),
    'ACTIVE'::user_account_status
  )
$$;

-- Function to check if user is blocked/disabled
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT status IN ('BLOCKED', 'DISABLED') FROM user_account_status_log WHERE user_id = _user_id),
    false
  )
$$;

-- Add BLOCKED to member_status enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'BLOCKED' AND enumtypid = 'member_status'::regtype) THEN
    ALTER TYPE member_status ADD VALUE 'BLOCKED';
  END IF;
END $$;

-- Add blocked_by and blocked_at columns to family_members for family-level blocks
ALTER TABLE public.family_members 
ADD COLUMN IF NOT EXISTS blocked_by_user_id UUID,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_account_status_user ON user_account_status_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_status_audit_user ON user_status_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_status ON family_members(status);