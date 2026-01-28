-- =====================================================
-- STEP 2B: DROP REMAINING POLICIES THAT DEPEND ON is_family_member
-- =====================================================

-- IMPORT_DETECTED_SOURCES
DROP POLICY IF EXISTS "Members can update detected sources" ON public.import_detected_sources;
DROP POLICY IF EXISTS "Members can delete detected sources" ON public.import_detected_sources;

-- TRANSACTION_CHANGE_LOGS
DROP POLICY IF EXISTS "Users can view change logs for their family" ON public.transaction_change_logs;
DROP POLICY IF EXISTS "Users can insert change logs for their family" ON public.transaction_change_logs;

-- USER_CATEGORIES (different names)
DROP POLICY IF EXISTS "Users can view categories for their families" ON public.user_categories;
DROP POLICY IF EXISTS "Users can create categories for their families" ON public.user_categories;
DROP POLICY IF EXISTS "Users can update categories for their families" ON public.user_categories;

-- USER_SUBCATEGORIES (different names)
DROP POLICY IF EXISTS "Users can view subcategories for their families" ON public.user_subcategories;
DROP POLICY IF EXISTS "Users can create subcategories for their families" ON public.user_subcategories;
DROP POLICY IF EXISTS "Users can update subcategories for their families" ON public.user_subcategories;

-- CATEGORY_CHANGE_LOGS
DROP POLICY IF EXISTS "Users can view category logs for their families" ON public.category_change_logs;
DROP POLICY IF EXISTS "Users can insert category logs for their families" ON public.category_change_logs;