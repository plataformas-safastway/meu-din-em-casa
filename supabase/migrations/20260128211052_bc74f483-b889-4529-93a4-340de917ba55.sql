-- =====================================================
-- STEP 8: CREATE RLS POLICIES FOR REMAINING TABLES (PART 4)
-- =====================================================

-- =====================================================
-- CASHFLOW_FORECASTS
-- =====================================================
DROP POLICY IF EXISTS "cashflow_forecasts_select" ON public.cashflow_forecasts;
CREATE POLICY "cashflow_forecasts_select"
ON public.cashflow_forecasts FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cashflow_forecasts_insert" ON public.cashflow_forecasts;
CREATE POLICY "cashflow_forecasts_insert"
ON public.cashflow_forecasts FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cashflow_forecasts_update" ON public.cashflow_forecasts;
CREATE POLICY "cashflow_forecasts_update"
ON public.cashflow_forecasts FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cashflow_forecasts_delete" ON public.cashflow_forecasts;
CREATE POLICY "cashflow_forecasts_delete"
ON public.cashflow_forecasts FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- CATEGORY_CHANGE_LOGS
-- =====================================================
DROP POLICY IF EXISTS "category_change_logs_select" ON public.category_change_logs;
CREATE POLICY "category_change_logs_select"
ON public.category_change_logs FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_change_logs_insert" ON public.category_change_logs;
CREATE POLICY "category_change_logs_insert"
ON public.category_change_logs FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

-- =====================================================
-- CATEGORY_IMPORT_MAPPINGS
-- =====================================================
DROP POLICY IF EXISTS "category_import_mappings_select" ON public.category_import_mappings;
CREATE POLICY "category_import_mappings_select"
ON public.category_import_mappings FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_import_mappings_insert" ON public.category_import_mappings;
CREATE POLICY "category_import_mappings_insert"
ON public.category_import_mappings FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_import_mappings_update" ON public.category_import_mappings;
CREATE POLICY "category_import_mappings_update"
ON public.category_import_mappings FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_import_mappings_delete" ON public.category_import_mappings;
CREATE POLICY "category_import_mappings_delete"
ON public.category_import_mappings FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- CATEGORY_RULES
-- =====================================================
DROP POLICY IF EXISTS "category_rules_select" ON public.category_rules;
CREATE POLICY "category_rules_select"
ON public.category_rules FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_rules_insert" ON public.category_rules;
CREATE POLICY "category_rules_insert"
ON public.category_rules FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_rules_update" ON public.category_rules;
CREATE POLICY "category_rules_update"
ON public.category_rules FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "category_rules_delete" ON public.category_rules;
CREATE POLICY "category_rules_delete"
ON public.category_rules FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- CPF_PASSWORD_PATTERNS
-- =====================================================
DROP POLICY IF EXISTS "cpf_password_patterns_select" ON public.cpf_password_patterns;
CREATE POLICY "cpf_password_patterns_select"
ON public.cpf_password_patterns FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cpf_password_patterns_insert" ON public.cpf_password_patterns;
CREATE POLICY "cpf_password_patterns_insert"
ON public.cpf_password_patterns FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cpf_password_patterns_update" ON public.cpf_password_patterns;
CREATE POLICY "cpf_password_patterns_update"
ON public.cpf_password_patterns FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "cpf_password_patterns_delete" ON public.cpf_password_patterns;
CREATE POLICY "cpf_password_patterns_delete"
ON public.cpf_password_patterns FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- GOAL_CONTRIBUTIONS
-- =====================================================
DROP POLICY IF EXISTS "goal_contributions_select" ON public.goal_contributions;
CREATE POLICY "goal_contributions_select"
ON public.goal_contributions FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "goal_contributions_insert" ON public.goal_contributions;
CREATE POLICY "goal_contributions_insert"
ON public.goal_contributions FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "goal_contributions_update" ON public.goal_contributions;
CREATE POLICY "goal_contributions_update"
ON public.goal_contributions FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "goal_contributions_delete" ON public.goal_contributions;
CREATE POLICY "goal_contributions_delete"
ON public.goal_contributions FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- IMPORT_CATEGORY_RULES
-- =====================================================
DROP POLICY IF EXISTS "import_category_rules_select" ON public.import_category_rules;
CREATE POLICY "import_category_rules_select"
ON public.import_category_rules FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_category_rules_insert" ON public.import_category_rules;
CREATE POLICY "import_category_rules_insert"
ON public.import_category_rules FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_category_rules_update" ON public.import_category_rules;
CREATE POLICY "import_category_rules_update"
ON public.import_category_rules FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_category_rules_delete" ON public.import_category_rules;
CREATE POLICY "import_category_rules_delete"
ON public.import_category_rules FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- IMPORT_DETECTED_SOURCES
-- =====================================================
DROP POLICY IF EXISTS "import_detected_sources_select" ON public.import_detected_sources;
CREATE POLICY "import_detected_sources_select"
ON public.import_detected_sources FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_detected_sources_insert" ON public.import_detected_sources;
CREATE POLICY "import_detected_sources_insert"
ON public.import_detected_sources FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_detected_sources_update" ON public.import_detected_sources;
CREATE POLICY "import_detected_sources_update"
ON public.import_detected_sources FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_detected_sources_delete" ON public.import_detected_sources;
CREATE POLICY "import_detected_sources_delete"
ON public.import_detected_sources FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- IMPORT_PENDING_TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "import_pending_transactions_select" ON public.import_pending_transactions;
CREATE POLICY "import_pending_transactions_select"
ON public.import_pending_transactions FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_pending_transactions_insert" ON public.import_pending_transactions;
CREATE POLICY "import_pending_transactions_insert"
ON public.import_pending_transactions FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_pending_transactions_update" ON public.import_pending_transactions;
CREATE POLICY "import_pending_transactions_update"
ON public.import_pending_transactions FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "import_pending_transactions_delete" ON public.import_pending_transactions;
CREATE POLICY "import_pending_transactions_delete"
ON public.import_pending_transactions FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- INSTALLMENTS
-- =====================================================
DROP POLICY IF EXISTS "installments_select" ON public.installments;
CREATE POLICY "installments_select"
ON public.installments FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "installments_insert" ON public.installments;
CREATE POLICY "installments_insert"
ON public.installments FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "installments_update" ON public.installments;
CREATE POLICY "installments_update"
ON public.installments FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "installments_delete" ON public.installments;
CREATE POLICY "installments_delete"
ON public.installments FOR DELETE TO authenticated
USING (public.is_family_member(family_id));

-- =====================================================
-- MONTHLY_AI_REPORTS
-- =====================================================
DROP POLICY IF EXISTS "monthly_ai_reports_select" ON public.monthly_ai_reports;
CREATE POLICY "monthly_ai_reports_select"
ON public.monthly_ai_reports FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "monthly_ai_reports_insert" ON public.monthly_ai_reports;
CREATE POLICY "monthly_ai_reports_insert"
ON public.monthly_ai_reports FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

-- =====================================================
-- NOTIFICATIONS_LOG
-- =====================================================
DROP POLICY IF EXISTS "notifications_log_select" ON public.notifications_log;
CREATE POLICY "notifications_log_select"
ON public.notifications_log FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "notifications_log_insert" ON public.notifications_log;
CREATE POLICY "notifications_log_insert"
ON public.notifications_log FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

-- =====================================================
-- RECURRING_TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "recurring_transactions_select" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions_select"
ON public.recurring_transactions FOR SELECT TO authenticated
USING (public.is_family_member(family_id));

DROP POLICY IF EXISTS "recurring_transactions_insert" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions_insert"
ON public.recurring_transactions FOR INSERT TO authenticated
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "recurring_transactions_update" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions_update"
ON public.recurring_transactions FOR UPDATE TO authenticated
USING (public.is_family_member(family_id))
WITH CHECK (public.is_family_member(family_id));

DROP POLICY IF EXISTS "recurring_transactions_delete" ON public.recurring_transactions;
CREATE POLICY "recurring_transactions_delete"
ON public.recurring_transactions FOR DELETE TO authenticated
USING (public.is_family_member(family_id));