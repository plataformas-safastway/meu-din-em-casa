-- =====================================================
-- Fix infinite recursion in admin_users RLS policies
-- =====================================================

-- Drop all existing RLS policies on admin_users
DROP POLICY IF EXISTS "admin_users_manage_for_master" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_for_master" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_select_self" ON public.admin_users;
DROP POLICY IF EXISTS "admin_users_update_self" ON public.admin_users;

-- Drop existing functions to recreate them
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_master_admin(uuid);

-- Create a SECURITY DEFINER function to check if user is admin
-- This bypasses RLS and prevents recursion
CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = p_user_id
      AND is_active = true
  )
$$;

-- Create a SECURITY DEFINER function to check if user is MASTER admin
CREATE OR REPLACE FUNCTION public.is_master_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_users
    WHERE user_id = p_user_id
      AND is_active = true
      AND admin_role = 'MASTER'
  )
$$;

-- =====================================================
-- New non-recursive RLS policies
-- =====================================================

-- 1. Every authenticated admin can read their own row (self)
CREATE POLICY "admin_users_select_own"
ON public.admin_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2. MASTER admins can read all admin_users 
-- Uses security definer function to avoid recursion
CREATE POLICY "admin_users_select_all_for_master"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_master_admin(auth.uid()));

-- 3. Admins can update their own row (self-service profile)
CREATE POLICY "admin_users_update_own"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. MASTER admins can insert new admin users
CREATE POLICY "admin_users_insert_master"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.is_master_admin(auth.uid()));

-- 5. MASTER admins can update any admin user
CREATE POLICY "admin_users_update_master"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

-- 6. MASTER admins can delete admin users
CREATE POLICY "admin_users_delete_master"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.is_master_admin(auth.uid()));