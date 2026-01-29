-- ========================================
-- P0 SECURITY FIX: Complete RLS cleanup for remaining tables
-- ========================================

-- Drop existing policies on alerts table that are conflicting
DROP POLICY IF EXISTS "Family members can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "Service role can insert alerts" ON public.alerts;

-- Recreate alerts policies properly
CREATE POLICY "Family members can view alerts"
ON public.alerts FOR SELECT
TO authenticated
USING (public.is_family_member(family_id));

CREATE POLICY "Family members can insert alerts"
ON public.alerts FOR INSERT
TO authenticated
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family members can update alerts"
ON public.alerts FOR UPDATE
TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family members can delete alerts"
ON public.alerts FOR DELETE
TO authenticated
USING (public.is_family_member(family_id));

-- 5. BANK ACCOUNTS - Fix policies
DROP POLICY IF EXISTS "Family members can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Family members can insert bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Family members can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Family admins can delete bank accounts" ON public.bank_accounts;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view bank accounts"
ON public.bank_accounts FOR SELECT
TO authenticated
USING (public.is_family_member(family_id));

CREATE POLICY "Family members can insert bank accounts"
ON public.bank_accounts FOR INSERT
TO authenticated
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family members can update bank accounts"
ON public.bank_accounts FOR UPDATE
TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family admins can delete bank accounts"
ON public.bank_accounts FOR DELETE
TO authenticated
USING (public.user_is_family_admin(auth.uid(), family_id));

-- 6. CREDIT CARDS - Fix policies
DROP POLICY IF EXISTS "Family members can view credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can insert credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family members can update credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Family admins can delete credit cards" ON public.credit_cards;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view credit cards"
ON public.credit_cards FOR SELECT
TO authenticated
USING (public.is_family_member(family_id));

CREATE POLICY "Family members can insert credit cards"
ON public.credit_cards FOR INSERT
TO authenticated
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family members can update credit cards"
ON public.credit_cards FOR UPDATE
TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

CREATE POLICY "Family admins can delete credit cards"
ON public.credit_cards FOR DELETE
TO authenticated
USING (public.user_is_family_admin(auth.uid(), family_id));

-- 7. AUDIT LOGS SAFE VIEW - Create secure function and view
CREATE OR REPLACE FUNCTION public.can_view_audit_log(log_family_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'admin_master', 'cs')
    ) THEN true
    WHEN log_family_id IS NOT NULL THEN public.is_family_member(log_family_id)
    ELSE true
  END;
$$;

DROP VIEW IF EXISTS public.audit_logs_safe;

CREATE VIEW public.audit_logs_safe
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id,
  user_id,
  family_id,
  action,
  entity_type,
  entity_id,
  module,
  severity,
  created_at
FROM public.audit_logs
WHERE public.can_view_audit_log(family_id);

REVOKE ALL ON public.audit_logs_safe FROM anon;
REVOKE ALL ON public.audit_logs_safe FROM public;
GRANT SELECT ON public.audit_logs_safe TO authenticated;

-- Revoke anon access from all sensitive tables
REVOKE ALL ON public.pix_keys FROM anon;
REVOKE ALL ON public.imports FROM anon;
REVOKE ALL ON public.family_members FROM anon;
REVOKE ALL ON public.alerts FROM anon;
REVOKE ALL ON public.bank_accounts FROM anon;
REVOKE ALL ON public.credit_cards FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;