-- =====================================================
-- STEP 7: CREATE RLS POLICIES FOR ADMIN/CS + OPENFINANCE TABLES
-- =====================================================

-- =====================================================
-- ADMIN_USERS
-- =====================================================
DROP POLICY IF EXISTS "admin_users_self_select" ON public.admin_users;
CREATE POLICY "admin_users_self_select"
ON public.admin_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_users_master_select" ON public.admin_users;
CREATE POLICY "admin_users_master_select"
ON public.admin_users FOR SELECT TO authenticated
USING (public.has_admin_role(ARRAY['MASTER']));

DROP POLICY IF EXISTS "admin_users_self_update" ON public.admin_users;
CREATE POLICY "admin_users_self_update"
ON public.admin_users FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_users_master_update" ON public.admin_users;
CREATE POLICY "admin_users_master_update"
ON public.admin_users FOR UPDATE TO authenticated
USING (public.has_admin_role(ARRAY['MASTER']))
WITH CHECK (public.has_admin_role(ARRAY['MASTER']));

-- =====================================================
-- USER_SUBSCRIPTIONS
-- =====================================================
DROP POLICY IF EXISTS "user_subscriptions_admin_select" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_admin_select"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (public.has_admin_role(ARRAY['MASTER','ADMIN','LEGAL']));

-- =====================================================
-- CS_USER_STATUS
-- =====================================================
DROP POLICY IF EXISTS "cs_user_status_select" ON public.cs_user_status;
CREATE POLICY "cs_user_status_select"
ON public.cs_user_status FOR SELECT TO authenticated
USING (public.has_cs_access_scoped(family_id));

DROP POLICY IF EXISTS "cs_user_status_insert" ON public.cs_user_status;
CREATE POLICY "cs_user_status_insert"
ON public.cs_user_status FOR INSERT TO authenticated
WITH CHECK (public.has_cs_access_scoped(family_id));

DROP POLICY IF EXISTS "cs_user_status_update" ON public.cs_user_status;
CREATE POLICY "cs_user_status_update"
ON public.cs_user_status FOR UPDATE TO authenticated
USING (public.has_cs_access_scoped(family_id))
WITH CHECK (public.has_cs_access_scoped(family_id));

-- =====================================================
-- OPENFINANCE_CONNECTIONS (has family_id)
-- =====================================================
DROP POLICY IF EXISTS "openfinance_connections_select" ON public.openfinance_connections;
CREATE POLICY "openfinance_connections_select"
ON public.openfinance_connections FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_connections_insert" ON public.openfinance_connections;
CREATE POLICY "openfinance_connections_insert"
ON public.openfinance_connections FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_connections_update" ON public.openfinance_connections;
CREATE POLICY "openfinance_connections_update"
ON public.openfinance_connections FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_connections_delete" ON public.openfinance_connections;
CREATE POLICY "openfinance_connections_delete"
ON public.openfinance_connections FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- OPENFINANCE_TRANSACTIONS_RAW (has family_id)
-- =====================================================
DROP POLICY IF EXISTS "openfinance_transactions_raw_select" ON public.openfinance_transactions_raw;
CREATE POLICY "openfinance_transactions_raw_select"
ON public.openfinance_transactions_raw FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_transactions_raw_insert" ON public.openfinance_transactions_raw;
CREATE POLICY "openfinance_transactions_raw_insert"
ON public.openfinance_transactions_raw FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_transactions_raw_update" ON public.openfinance_transactions_raw;
CREATE POLICY "openfinance_transactions_raw_update"
ON public.openfinance_transactions_raw FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "openfinance_transactions_raw_delete" ON public.openfinance_transactions_raw;
CREATE POLICY "openfinance_transactions_raw_delete"
ON public.openfinance_transactions_raw FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- OPENFINANCE_ACCOUNTS (via connection_id join)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_openfinance_connection_member(p_connection_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.openfinance_connections oc
    WHERE oc.id = p_connection_id
      AND public.is_family_member(oc.family_id)
  );
$$;

DROP POLICY IF EXISTS "openfinance_accounts_select" ON public.openfinance_accounts;
CREATE POLICY "openfinance_accounts_select"
ON public.openfinance_accounts FOR SELECT TO authenticated
USING (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_accounts_insert" ON public.openfinance_accounts;
CREATE POLICY "openfinance_accounts_insert"
ON public.openfinance_accounts FOR INSERT TO authenticated
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_accounts_update" ON public.openfinance_accounts;
CREATE POLICY "openfinance_accounts_update"
ON public.openfinance_accounts FOR UPDATE TO authenticated
USING (public.is_openfinance_connection_member(connection_id))
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_accounts_delete" ON public.openfinance_accounts;
CREATE POLICY "openfinance_accounts_delete"
ON public.openfinance_accounts FOR DELETE TO authenticated
USING (public.is_openfinance_connection_member(connection_id));

-- OPENFINANCE_CARDS (via connection_id)
DROP POLICY IF EXISTS "openfinance_cards_select" ON public.openfinance_cards;
CREATE POLICY "openfinance_cards_select"
ON public.openfinance_cards FOR SELECT TO authenticated
USING (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_cards_insert" ON public.openfinance_cards;
CREATE POLICY "openfinance_cards_insert"
ON public.openfinance_cards FOR INSERT TO authenticated
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_cards_update" ON public.openfinance_cards;
CREATE POLICY "openfinance_cards_update"
ON public.openfinance_cards FOR UPDATE TO authenticated
USING (public.is_openfinance_connection_member(connection_id))
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_cards_delete" ON public.openfinance_cards;
CREATE POLICY "openfinance_cards_delete"
ON public.openfinance_cards FOR DELETE TO authenticated
USING (public.is_openfinance_connection_member(connection_id));

-- OPENFINANCE_SYNC_LOGS (via connection_id)
DROP POLICY IF EXISTS "openfinance_sync_logs_select" ON public.openfinance_sync_logs;
CREATE POLICY "openfinance_sync_logs_select"
ON public.openfinance_sync_logs FOR SELECT TO authenticated
USING (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_sync_logs_insert" ON public.openfinance_sync_logs;
CREATE POLICY "openfinance_sync_logs_insert"
ON public.openfinance_sync_logs FOR INSERT TO authenticated
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_sync_logs_update" ON public.openfinance_sync_logs;
CREATE POLICY "openfinance_sync_logs_update"
ON public.openfinance_sync_logs FOR UPDATE TO authenticated
USING (public.is_openfinance_connection_member(connection_id))
WITH CHECK (public.is_openfinance_connection_member(connection_id));

DROP POLICY IF EXISTS "openfinance_sync_logs_delete" ON public.openfinance_sync_logs;
CREATE POLICY "openfinance_sync_logs_delete"
ON public.openfinance_sync_logs FOR DELETE TO authenticated
USING (public.is_openfinance_connection_member(connection_id));