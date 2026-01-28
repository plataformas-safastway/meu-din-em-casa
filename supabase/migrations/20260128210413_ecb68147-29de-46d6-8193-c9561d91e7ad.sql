-- =====================================================
-- STEP 6: CREATE RLS POLICIES FOR MORE TABLES (PART 2)
-- =====================================================

-- =====================================================
-- GOALS
-- =====================================================
DROP POLICY IF EXISTS "goals_select" ON public.goals;
CREATE POLICY "goals_select"
ON public.goals FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "goals_insert" ON public.goals;
CREATE POLICY "goals_insert"
ON public.goals FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "goals_update" ON public.goals;
CREATE POLICY "goals_update"
ON public.goals FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "goals_delete" ON public.goals;
CREATE POLICY "goals_delete"
ON public.goals FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- BUDGETS
-- =====================================================
DROP POLICY IF EXISTS "budgets_select" ON public.budgets;
CREATE POLICY "budgets_select"
ON public.budgets FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "budgets_insert" ON public.budgets;
CREATE POLICY "budgets_insert"
ON public.budgets FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "budgets_update" ON public.budgets;
CREATE POLICY "budgets_update"
ON public.budgets FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "budgets_delete" ON public.budgets;
CREATE POLICY "budgets_delete"
ON public.budgets FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- IMPORTS
-- =====================================================
DROP POLICY IF EXISTS "imports_select" ON public.imports;
CREATE POLICY "imports_select"
ON public.imports FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN','CS']));

DROP POLICY IF EXISTS "imports_insert" ON public.imports;
CREATE POLICY "imports_insert"
ON public.imports FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "imports_update" ON public.imports;
CREATE POLICY "imports_update"
ON public.imports FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "imports_delete" ON public.imports;
CREATE POLICY "imports_delete"
ON public.imports FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- USER_CATEGORIES
-- =====================================================
DROP POLICY IF EXISTS "user_categories_select" ON public.user_categories;
CREATE POLICY "user_categories_select"
ON public.user_categories FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN']));

DROP POLICY IF EXISTS "user_categories_insert" ON public.user_categories;
CREATE POLICY "user_categories_insert"
ON public.user_categories FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "user_categories_update" ON public.user_categories;
CREATE POLICY "user_categories_update"
ON public.user_categories FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "user_categories_delete" ON public.user_categories;
CREATE POLICY "user_categories_delete"
ON public.user_categories FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- USER_SUBCATEGORIES
-- =====================================================
DROP POLICY IF EXISTS "user_subcategories_select" ON public.user_subcategories;
CREATE POLICY "user_subcategories_select"
ON public.user_subcategories FOR SELECT TO authenticated
USING (public.is_family_member(family_id) OR public.has_admin_role(ARRAY['MASTER','ADMIN']));

DROP POLICY IF EXISTS "user_subcategories_insert" ON public.user_subcategories;
CREATE POLICY "user_subcategories_insert"
ON public.user_subcategories FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "user_subcategories_update" ON public.user_subcategories;
CREATE POLICY "user_subcategories_update"
ON public.user_subcategories FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "user_subcategories_delete" ON public.user_subcategories;
CREATE POLICY "user_subcategories_delete"
ON public.user_subcategories FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- ALERTS
-- =====================================================
DROP POLICY IF EXISTS "alerts_select" ON public.alerts;
CREATE POLICY "alerts_select"
ON public.alerts FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "alerts_insert" ON public.alerts;
CREATE POLICY "alerts_insert"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "alerts_update" ON public.alerts;
CREATE POLICY "alerts_update"
ON public.alerts FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "alerts_delete" ON public.alerts;
CREATE POLICY "alerts_delete"
ON public.alerts FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- BANKS (reference table - public readable)
-- =====================================================
DROP POLICY IF EXISTS "banks_public_select" ON public.banks;
CREATE POLICY "banks_public_select"
ON public.banks FOR SELECT
USING (true);