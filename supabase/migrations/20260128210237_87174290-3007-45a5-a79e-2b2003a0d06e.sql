-- =====================================================
-- STEP 5: CREATE RLS POLICIES FOR CORE TABLES (PART 1)
-- =====================================================

-- =====================================================
-- FAMILIES
-- =====================================================
DROP POLICY IF EXISTS "families_select" ON public.families;
CREATE POLICY "families_select"
ON public.families FOR SELECT TO authenticated
USING (public.is_family_member(id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS','LEGAL']));

DROP POLICY IF EXISTS "families_insert" ON public.families;
CREATE POLICY "families_insert"
ON public.families FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "families_update" ON public.families;
CREATE POLICY "families_update"
ON public.families FOR UPDATE TO authenticated
USING (public.is_family_member(id) OR public.has_admin_role(ARRAY['MASTER','ADMIN']))
WITH CHECK (public.is_family_member(id) OR public.has_admin_role(ARRAY['MASTER','ADMIN']));

DROP POLICY IF EXISTS "families_delete" ON public.families;
CREATE POLICY "families_delete"
ON public.families FOR DELETE TO authenticated
USING (public.has_admin_role(ARRAY['MASTER']));

-- =====================================================
-- FAMILY_MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "family_members_select" ON public.family_members;
CREATE POLICY "family_members_select"
ON public.family_members FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS','LEGAL']));

DROP POLICY IF EXISTS "family_members_insert" ON public.family_members;
CREATE POLICY "family_members_insert"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_family_owner_or_manager(family_id));

DROP POLICY IF EXISTS "family_members_update" ON public.family_members;
CREATE POLICY "family_members_update"
ON public.family_members FOR UPDATE TO authenticated
USING (
  (user_id = auth.uid() AND public.is_family_member(family_id))
  OR public.is_family_owner_or_manager(family_id)
  OR public.has_admin_role(ARRAY['MASTER','ADMIN'])
)
WITH CHECK (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN']));

DROP POLICY IF EXISTS "family_members_delete" ON public.family_members;
CREATE POLICY "family_members_delete"
ON public.family_members FOR DELETE TO authenticated
USING (public.is_family_owner_or_manager(family_id) OR public.has_admin_role(ARRAY['MASTER']));

-- =====================================================
-- TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "transactions_select" ON public.transactions;
CREATE POLICY "transactions_select"
ON public.transactions FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "transactions_insert" ON public.transactions;
CREATE POLICY "transactions_insert"
ON public.transactions FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "transactions_update" ON public.transactions;
CREATE POLICY "transactions_update"
ON public.transactions FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "transactions_delete" ON public.transactions;
CREATE POLICY "transactions_delete"
ON public.transactions FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- BANK_ACCOUNTS
-- =====================================================
DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select"
ON public.bank_accounts FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "bank_accounts_insert" ON public.bank_accounts;
CREATE POLICY "bank_accounts_insert"
ON public.bank_accounts FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "bank_accounts_update" ON public.bank_accounts;
CREATE POLICY "bank_accounts_update"
ON public.bank_accounts FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "bank_accounts_delete" ON public.bank_accounts;
CREATE POLICY "bank_accounts_delete"
ON public.bank_accounts FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- CREDIT_CARDS
-- =====================================================
DROP POLICY IF EXISTS "credit_cards_select" ON public.credit_cards;
CREATE POLICY "credit_cards_select"
ON public.credit_cards FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "credit_cards_insert" ON public.credit_cards;
CREATE POLICY "credit_cards_insert"
ON public.credit_cards FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "credit_cards_update" ON public.credit_cards;
CREATE POLICY "credit_cards_update"
ON public.credit_cards FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "credit_cards_delete" ON public.credit_cards;
CREATE POLICY "credit_cards_delete"
ON public.credit_cards FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- PIX_KEYS
-- =====================================================
DROP POLICY IF EXISTS "pix_keys_select" ON public.pix_keys;
CREATE POLICY "pix_keys_select"
ON public.pix_keys FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "pix_keys_insert" ON public.pix_keys;
CREATE POLICY "pix_keys_insert"
ON public.pix_keys FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "pix_keys_update" ON public.pix_keys;
CREATE POLICY "pix_keys_update"
ON public.pix_keys FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "pix_keys_delete" ON public.pix_keys;
CREATE POLICY "pix_keys_delete"
ON public.pix_keys FOR DELETE TO authenticated
USING (public.is_family_member(family_id));