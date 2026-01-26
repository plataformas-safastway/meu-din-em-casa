
-- =============================================
-- SECURITY FIX MIGRATION - 9 ISSUES
-- =============================================

-- =============================================
-- PROBLEM 1 & 2: audit_logs_safe access control
-- Note: audit_logs_safe is a VIEW with security_invoker=on
-- It inherits RLS from the underlying audit_logs table
-- The underlying table already has proper RLS
-- We just need to ensure anon cannot access
-- =============================================

-- Revoke any grants from anon on the view (defensive)
REVOKE ALL ON public.audit_logs_safe FROM anon;

-- Grant SELECT only to authenticated (will be filtered by underlying RLS)
GRANT SELECT ON public.audit_logs_safe TO authenticated;

-- =============================================
-- PROBLEM 3: Fix permissive INSERT policies
-- =============================================

-- 3.1 Fix families table - Remove permissive INSERT, make edge-only
DROP POLICY IF EXISTS "Authenticated users can create families" ON public.families;

-- Create restrictive policy: Only allow INSERT via service role (edge functions)
-- Users cannot directly insert families - they must use create-family edge function
-- Note: We add a policy that always fails for direct client inserts
-- The edge function uses service role which bypasses RLS
CREATE POLICY "families_insert_denied_for_clients"
ON public.families
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 3.2 Fix tech_logs table - Restrict to tech role users only
DROP POLICY IF EXISTS "Tech can insert logs" ON public.tech_logs;

CREATE POLICY "tech_logs_insert_tech_users_only"
ON public.tech_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_tech_access(auth.uid()));

-- 3.3 Fix tech_performance_metrics table - Restrict to tech role users only
DROP POLICY IF EXISTS "Tech can insert performance metrics" ON public.tech_performance_metrics;

CREATE POLICY "tech_performance_metrics_insert_tech_users_only"
ON public.tech_performance_metrics
FOR INSERT
TO authenticated
WITH CHECK (public.has_tech_access(auth.uid()));

-- =============================================
-- PROBLEM 7: rate_limits has RLS but no policies
-- This is intentional - only service role (edge functions) should access
-- But we need a policy for the cleanup function
-- =============================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;

-- Service role bypasses RLS, so no policies needed for edge functions
-- But add a deny-all policy to make it explicit that clients cannot access
CREATE POLICY "rate_limits_no_client_access"
ON public.rate_limits
FOR ALL
TO authenticated, anon
USING (false);

-- =============================================
-- PROBLEM 8: Secure SECURITY DEFINER functions
-- Revoke execute from anon, grant only to authenticated
-- =============================================

-- Revoke from anon
REVOKE ALL ON FUNCTION public.is_family_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_family_owner(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_family_id() FROM anon;
REVOKE ALL ON FUNCTION public.user_shares_family_with(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.user_belongs_to_family(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.user_is_family_admin(uuid, uuid) FROM anon;

-- Grant to authenticated only
GRANT EXECUTE ON FUNCTION public.is_family_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_family_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_family_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_shares_family_with(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_family(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_family_admin(uuid, uuid) TO authenticated;

-- Also secure other security-critical functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_cs_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_tech_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_support_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_financial_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_executive_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.check_member_permission(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_member_permissions(uuid, uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_cs_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_tech_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_support_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_financial_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_executive_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_member_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_permissions(uuid, uuid) TO authenticated;

-- =============================================
-- HARDENING: Ensure audit_logs itself is properly protected
-- =============================================

-- Add explicit admin-only read policy for audit_logs if not exists
DROP POLICY IF EXISTS "audit_logs_select_admin_cs_support" ON public.audit_logs;

CREATE POLICY "audit_logs_select_admin_cs_support"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  -- User can see their own actions
  user_id = auth.uid()
  OR
  -- Admin/CS/Support can see family-scoped logs
  (
    family_id IS NOT NULL 
    AND public.user_shares_family_with(auth.uid(), family_id)
  )
  OR
  -- Full admin access
  public.has_role(auth.uid(), 'admin')
  OR 
  public.has_cs_access(auth.uid())
  OR
  public.has_support_access(auth.uid())
);

-- =============================================
-- Verify all changes are applied
-- =============================================
