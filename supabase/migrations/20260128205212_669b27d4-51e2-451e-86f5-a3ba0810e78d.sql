-- =====================================================
-- STEP 1: DROP ALL EXISTING POLICIES THAT DEPEND ON is_family_member
-- =====================================================

-- FAMILIES
DROP POLICY IF EXISTS "Users can view their own families" ON public.families;

-- FAMILY_MEMBERS
DROP POLICY IF EXISTS "Members can view family members" ON public.family_members;

-- BANK_ACCOUNTS
DROP POLICY IF EXISTS "Members can view bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Members can create bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Members can update bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Members can delete bank accounts" ON public.bank_accounts;

-- CREDIT_CARDS
DROP POLICY IF EXISTS "Members can view credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Members can create credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Members can update credit cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Members can delete credit cards" ON public.credit_cards;

-- TRANSACTIONS
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON public.transactions;

-- IMPORT_HISTORY
DROP POLICY IF EXISTS "Members can view import history" ON public.import_history;
DROP POLICY IF EXISTS "Members can create import history" ON public.import_history;
DROP POLICY IF EXISTS "Members can update import history" ON public.import_history;
DROP POLICY IF EXISTS "Members can delete import history" ON public.import_history;

-- STORAGE.OBJECTS
DROP POLICY IF EXISTS "Members can view their family imports" ON storage.objects;
DROP POLICY IF EXISTS "Members can upload to their family folder" ON storage.objects;
DROP POLICY IF EXISTS "Members can delete their family imports" ON storage.objects;

-- IMPORTS
DROP POLICY IF EXISTS "Users can view their family imports" ON public.imports;
DROP POLICY IF EXISTS "Users can update their family imports" ON public.imports;
DROP POLICY IF EXISTS "Members can delete their family imports" ON public.imports;

-- BUDGETS
DROP POLICY IF EXISTS "Members can view budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can create budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Members can delete budgets" ON public.budgets;

-- RECURRING_TRANSACTIONS
DROP POLICY IF EXISTS "Members can view recurring_transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can create recurring_transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can update recurring_transactions" ON public.recurring_transactions;
DROP POLICY IF EXISTS "Members can delete recurring_transactions" ON public.recurring_transactions;

-- NOTIFICATIONS_LOG
DROP POLICY IF EXISTS "Members can view notifications" ON public.notifications_log;
DROP POLICY IF EXISTS "Members can create notifications" ON public.notifications_log;

-- CATEGORY_RULES
DROP POLICY IF EXISTS "Members can view rules" ON public.category_rules;
DROP POLICY IF EXISTS "Members can create rules" ON public.category_rules;
DROP POLICY IF EXISTS "Members can update rules" ON public.category_rules;
DROP POLICY IF EXISTS "Members can delete rules" ON public.category_rules;

-- CATEGORY_IMPORT_MAPPINGS
DROP POLICY IF EXISTS "Members can view mappings" ON public.category_import_mappings;
DROP POLICY IF EXISTS "Members can create mappings" ON public.category_import_mappings;
DROP POLICY IF EXISTS "Members can update mappings" ON public.category_import_mappings;
DROP POLICY IF EXISTS "Members can delete mappings" ON public.category_import_mappings;

-- MONTHLY_AI_REPORTS
DROP POLICY IF EXISTS "Members can view reports" ON public.monthly_ai_reports;
DROP POLICY IF EXISTS "Members can create reports" ON public.monthly_ai_reports;

-- INSTALLMENTS
DROP POLICY IF EXISTS "Members can view installments" ON public.installments;
DROP POLICY IF EXISTS "Members can create installments" ON public.installments;
DROP POLICY IF EXISTS "Members can update installments" ON public.installments;
DROP POLICY IF EXISTS "Members can delete installments" ON public.installments;

-- CASHFLOW_FORECASTS
DROP POLICY IF EXISTS "Members can view forecasts" ON public.cashflow_forecasts;
DROP POLICY IF EXISTS "Members can manage forecasts" ON public.cashflow_forecasts;

-- ALERTS
DROP POLICY IF EXISTS "Members can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Members can create alerts" ON public.alerts;
DROP POLICY IF EXISTS "Members can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Members can delete alerts" ON public.alerts;

-- OPENFINANCE_CONNECTIONS
DROP POLICY IF EXISTS "Members can view connections" ON public.openfinance_connections;
DROP POLICY IF EXISTS "Members can create connections" ON public.openfinance_connections;
DROP POLICY IF EXISTS "Members can update connections" ON public.openfinance_connections;
DROP POLICY IF EXISTS "Members can delete connections" ON public.openfinance_connections;

-- OPENFINANCE_ACCOUNTS
DROP POLICY IF EXISTS "Members can view accounts" ON public.openfinance_accounts;
DROP POLICY IF EXISTS "Members can insert accounts" ON public.openfinance_accounts;
DROP POLICY IF EXISTS "Members can update accounts" ON public.openfinance_accounts;
DROP POLICY IF EXISTS "Members can delete accounts" ON public.openfinance_accounts;

-- OPENFINANCE_CARDS
DROP POLICY IF EXISTS "Members can view cards" ON public.openfinance_cards;
DROP POLICY IF EXISTS "Members can insert cards" ON public.openfinance_cards;
DROP POLICY IF EXISTS "Members can update cards" ON public.openfinance_cards;
DROP POLICY IF EXISTS "Members can delete cards" ON public.openfinance_cards;

-- OPENFINANCE_TRANSACTIONS_RAW
DROP POLICY IF EXISTS "Members can view raw transactions" ON public.openfinance_transactions_raw;
DROP POLICY IF EXISTS "Members can insert raw transactions" ON public.openfinance_transactions_raw;
DROP POLICY IF EXISTS "Members can update raw transactions" ON public.openfinance_transactions_raw;
DROP POLICY IF EXISTS "Members can delete raw transactions" ON public.openfinance_transactions_raw;

-- OPENFINANCE_SYNC_LOGS
DROP POLICY IF EXISTS "Members can view sync logs" ON public.openfinance_sync_logs;
DROP POLICY IF EXISTS "Members can insert sync logs" ON public.openfinance_sync_logs;
DROP POLICY IF EXISTS "Members can update sync logs" ON public.openfinance_sync_logs;
DROP POLICY IF EXISTS "Members can delete sync logs" ON public.openfinance_sync_logs;

-- GOALS
DROP POLICY IF EXISTS "Members can view goals" ON public.goals;
DROP POLICY IF EXISTS "Members can create goals" ON public.goals;
DROP POLICY IF EXISTS "Members can update goals" ON public.goals;
DROP POLICY IF EXISTS "Members can delete goals" ON public.goals;

-- IMPORT_CATEGORY_RULES
DROP POLICY IF EXISTS "Members can view their family rules" ON public.import_category_rules;
DROP POLICY IF EXISTS "Members can create rules" ON public.import_category_rules;
DROP POLICY IF EXISTS "Members can update their family rules" ON public.import_category_rules;
DROP POLICY IF EXISTS "Members can delete their family rules" ON public.import_category_rules;

-- IMPORT_PENDING_TRANSACTIONS
DROP POLICY IF EXISTS "Members can view pending transactions" ON public.import_pending_transactions;
DROP POLICY IF EXISTS "Members can create pending transactions" ON public.import_pending_transactions;
DROP POLICY IF EXISTS "Members can update pending transactions" ON public.import_pending_transactions;
DROP POLICY IF EXISTS "Members can delete pending transactions" ON public.import_pending_transactions;

-- PIX_KEYS
DROP POLICY IF EXISTS "Members can view pix keys" ON public.pix_keys;
DROP POLICY IF EXISTS "Members can create pix keys" ON public.pix_keys;
DROP POLICY IF EXISTS "Members can update pix keys" ON public.pix_keys;
DROP POLICY IF EXISTS "Members can delete pix keys" ON public.pix_keys;

-- GOAL_CONTRIBUTIONS
DROP POLICY IF EXISTS "Users can view their family goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can create goal contributions for their family" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can update their family goal contributions" ON public.goal_contributions;
DROP POLICY IF EXISTS "Users can delete their family goal contributions" ON public.goal_contributions;

-- CPF_PASSWORD_PATTERNS
DROP POLICY IF EXISTS "Members can view their family patterns" ON public.cpf_password_patterns;
DROP POLICY IF EXISTS "Members can create patterns" ON public.cpf_password_patterns;
DROP POLICY IF EXISTS "Members can update their family patterns" ON public.cpf_password_patterns;
DROP POLICY IF EXISTS "Members can delete their family patterns" ON public.cpf_password_patterns;

-- IMPORT_DETECTED_SOURCES
DROP POLICY IF EXISTS "Members can view detected sources" ON public.import_detected_sources;
DROP POLICY IF EXISTS "Members can create detected sources" ON public.import_detected_sources;

-- Additional tables that might have policies
DROP POLICY IF EXISTS "Members can view user categories" ON public.user_categories;
DROP POLICY IF EXISTS "Members can create user categories" ON public.user_categories;
DROP POLICY IF EXISTS "Members can update user categories" ON public.user_categories;
DROP POLICY IF EXISTS "Members can delete user categories" ON public.user_categories;

DROP POLICY IF EXISTS "Members can view user subcategories" ON public.user_subcategories;
DROP POLICY IF EXISTS "Members can create user subcategories" ON public.user_subcategories;
DROP POLICY IF EXISTS "Members can update user subcategories" ON public.user_subcategories;
DROP POLICY IF EXISTS "Members can delete user subcategories" ON public.user_subcategories;