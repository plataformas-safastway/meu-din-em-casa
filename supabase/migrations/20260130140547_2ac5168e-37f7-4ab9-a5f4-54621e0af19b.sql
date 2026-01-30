
-- =========================================
-- OIK Security Hardening (RLS + Grants)
-- Tables: families, family_members, credit_cards, user_subscriptions, admin_users
-- =========================================

-- 0) Defensive: revoke public/anon grants on sensitive tables
REVOKE ALL ON TABLE public.families FROM anon, public;
REVOKE ALL ON TABLE public.family_members FROM anon, public;
REVOKE ALL ON TABLE public.credit_cards FROM anon, public;
REVOKE ALL ON TABLE public.user_subscriptions FROM anon, public;
REVOKE ALL ON TABLE public.admin_users FROM anon, public;

-- =========================================
-- 1) Enable + FORCE RLS
-- =========================================
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families FORCE ROW LEVEL SECURITY;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_cards FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- =========================================
-- 2) Drop ALL existing policies on these tables
-- =========================================
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('families','family_members','credit_cards','user_subscriptions','admin_users')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- =========================================
-- 3) Recreate secure policies
-- =========================================

-- 3.1) families: SELECT only active members of that family
CREATE POLICY "families_select_active_members"
ON public.families
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = families.id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- 3.2) family_members: SELECT only members of same family (ACTIVE)
CREATE POLICY "family_members_select_family_scope"
ON public.family_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members self
    WHERE self.family_id = family_members.family_id
      AND self.user_id = auth.uid()
      AND self.status = 'ACTIVE'
  )
);

-- family_members: INSERT via owner or with can_manage_family permission
CREATE POLICY "family_members_insert_authorized"
ON public.family_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_manage_family, false) = true)
  )
);

-- family_members: UPDATE own row OR owner/manager edits others
CREATE POLICY "family_members_update_self_or_manager"
ON public.family_members
FOR UPDATE
TO authenticated
USING (
  (family_members.user_id = auth.uid() AND family_members.status = 'ACTIVE')
  OR
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_manage_family, false) = true)
  )
)
WITH CHECK (
  (family_members.user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = family_members.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_manage_family, false) = true)
  )
);

-- 3.3) credit_cards: SELECT only active members of that family
CREATE POLICY "credit_cards_select_active_members"
ON public.credit_cards
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- credit_cards: INSERT by active family members
CREATE POLICY "credit_cards_insert_active_members"
ON public.credit_cards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
  )
);

-- credit_cards: UPDATE by owner or with can_edit_all permission
CREATE POLICY "credit_cards_update_authorized"
ON public.credit_cards
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_edit_all, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_edit_all, false) = true)
  )
);

-- credit_cards: DELETE by owner or with can_delete_transactions permission
CREATE POLICY "credit_cards_delete_authorized"
ON public.credit_cards
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    LEFT JOIN public.member_permissions mp ON mp.member_id = fm.id
    WHERE fm.family_id = credit_cards.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND (fm.role = 'owner' OR COALESCE(mp.can_delete_transactions, false) = true)
  )
);

-- 3.4) user_subscriptions: SELECT only OWNER of that family
CREATE POLICY "user_subscriptions_select_owner_only"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members fm
    WHERE fm.family_id = user_subscriptions.family_id
      AND fm.user_id = auth.uid()
      AND fm.status = 'ACTIVE'
      AND fm.role = 'owner'
  )
);

-- user_subscriptions: SELECT for active admin users (Dashboard access)
CREATE POLICY "user_subscriptions_select_admin_active"
ON public.user_subscriptions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  )
);

-- 3.5) admin_users: SELECT only own row (self-service)
CREATE POLICY "admin_users_select_self"
ON public.admin_users
FOR SELECT
TO authenticated
USING (admin_users.user_id = auth.uid());

-- admin_users: SELECT all for MASTER admins (manage team)
CREATE POLICY "admin_users_select_for_master"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.admin_role = 'MASTER'
  )
);

-- admin_users: UPDATE own profile
CREATE POLICY "admin_users_update_self"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (admin_users.user_id = auth.uid())
WITH CHECK (admin_users.user_id = auth.uid());

-- admin_users: INSERT/UPDATE/DELETE for MASTER admins only
CREATE POLICY "admin_users_manage_for_master"
ON public.admin_users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.admin_role = 'MASTER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
      AND au.admin_role = 'MASTER'
  )
);
