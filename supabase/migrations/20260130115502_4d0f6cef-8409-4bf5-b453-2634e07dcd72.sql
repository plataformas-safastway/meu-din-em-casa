
-- ================================================================
-- P0 SECURITY AUDIT - RLS HARDENING
-- Date: 2026-01-30
-- Tables: invoices, alerts, category_rules, audit_logs
-- ================================================================

-- ================================================================
-- 1. INVOICES - Add family owner SELECT access (maintain admin access)
-- ================================================================

-- Add policy for family owners to view their own family's invoices
-- (They can see status/amount but not modify - that's admin only)
CREATE POLICY "Family owners can view own invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (
  is_family_owner_or_manager(family_id)
);

-- ================================================================
-- 2. ALERTS - Remove public role policies, consolidate to authenticated
-- ================================================================

-- Drop policies that use {public} role (security risk)
DROP POLICY IF EXISTS "Family members can read alerts" ON public.alerts;

-- Drop duplicate policies (keep only the cleaner ones)
DROP POLICY IF EXISTS "Family members can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can create alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can delete alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can delete own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Family members can update own alerts" ON public.alerts;

-- Keep these standardized policies:
-- alerts_select, alerts_insert, alerts_update, alerts_delete
-- (Already exist with is_family_member check and authenticated role)

-- ================================================================
-- 3. CATEGORY_RULES - Restrict mutations to family owner/manager
-- ================================================================

-- Drop permissive mutation policies
DROP POLICY IF EXISTS "category_rules_insert" ON public.category_rules;
DROP POLICY IF EXISTS "category_rules_update" ON public.category_rules;
DROP POLICY IF EXISTS "category_rules_delete" ON public.category_rules;

-- Create restricted policies for owner/manager only
CREATE POLICY "category_rules_insert_owner_manager"
ON public.category_rules FOR INSERT
TO authenticated
WITH CHECK (
  is_family_owner_or_manager(family_id)
);

CREATE POLICY "category_rules_update_owner_manager"
ON public.category_rules FOR UPDATE
TO authenticated
USING (is_family_owner_or_manager(family_id))
WITH CHECK (is_family_owner_or_manager(family_id));

CREATE POLICY "category_rules_delete_owner_manager"
ON public.category_rules FOR DELETE
TO authenticated
USING (is_family_owner_or_manager(family_id));

-- ================================================================
-- 4. AUDIT_LOGS - Restrict visibility (own logs + owners see family)
-- ================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Family members can read audit logs (safe)" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select_admin_cs_support" ON public.audit_logs;

-- Create new consolidated policies

-- Users can only see their OWN logs (LGPD privacy)
CREATE POLICY "audit_logs_select_own"
ON public.audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Family owners can see family logs (for support)
CREATE POLICY "audit_logs_select_family_owner"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  family_id IS NOT NULL 
  AND is_family_owner_or_manager(family_id)
);

-- Admin/CS/Support can view all logs (dashboard access)
CREATE POLICY "audit_logs_select_admin_staff"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_cs_access(auth.uid())
  OR has_support_access(auth.uid())
);

-- System can insert logs (service role OR authenticated user for their own)
CREATE POLICY "audit_logs_insert_system"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ================================================================
-- VALIDATION COMMENT
-- ================================================================
-- Run these queries to validate:
-- 1. SELECT * FROM invoices; (as anon - should fail)
-- 2. SELECT * FROM alerts; (as anon - should fail)  
-- 3. SELECT * FROM category_rules; (as regular member - should see own family only)
-- 4. INSERT INTO category_rules (...); (as regular member - should fail)
-- 5. SELECT * FROM audit_logs; (as regular member - should see only own logs)
