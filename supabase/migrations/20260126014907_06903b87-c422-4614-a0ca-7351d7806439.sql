-- =============================================
-- USER CUSTOM CATEGORIES WITH VERSIONING
-- =============================================

-- User/family custom categories (extends default OIK categories)
CREATE TABLE IF NOT EXISTS user_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL, -- lucide icon name e.g., 'home', 'car', 'utensils'
  color TEXT, -- optional HSL color
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  source TEXT NOT NULL DEFAULT 'USER_CUSTOM' CHECK (source IN ('DEFAULT_OIK', 'IMPORTED_SPREADSHEET', 'USER_CUSTOM')),
  replaced_by_category_id UUID REFERENCES user_categories(id),
  display_order INTEGER DEFAULT 100,
  transaction_count INTEGER DEFAULT 0, -- denormalized for quick checks
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID
);

-- User/family custom subcategories
CREATE TABLE IF NOT EXISTS user_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES user_categories(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  replaced_by_subcategory_id UUID REFERENCES user_subcategories(id),
  display_order INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID,
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID
);

-- Category change log for audit trail
CREATE TABLE IF NOT EXISTS category_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES user_categories(id),
  subcategory_id UUID REFERENCES user_subcategories(id),
  action TEXT NOT NULL CHECK (action IN ('CREATED', 'RENAMED', 'ARCHIVED', 'RESTORED', 'DUPLICATED', 'BULK_RECLASSIFIED')),
  old_name TEXT,
  new_name TEXT,
  old_category_id UUID,
  new_category_id UUID,
  affected_transaction_count INTEGER DEFAULT 0,
  performed_by_user_id UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_categories_family ON user_categories(family_id);
CREATE INDEX IF NOT EXISTS idx_user_categories_status ON user_categories(family_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subcategories_category ON user_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategories_family ON user_subcategories(family_id);
CREATE INDEX IF NOT EXISTS idx_category_change_logs_family ON category_change_logs(family_id);

-- RLS Policies
ALTER TABLE user_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_change_logs ENABLE ROW LEVEL SECURITY;

-- User Categories Policies (using is_family_member function)
CREATE POLICY "Users can view categories for their families"
ON user_categories FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Users can create categories for their families"
ON user_categories FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Users can update categories for their families"
ON user_categories FOR UPDATE
USING (is_family_member(family_id));

-- User Subcategories Policies
CREATE POLICY "Users can view subcategories for their families"
ON user_subcategories FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Users can create subcategories for their families"
ON user_subcategories FOR INSERT
WITH CHECK (is_family_member(family_id));

CREATE POLICY "Users can update subcategories for their families"
ON user_subcategories FOR UPDATE
USING (is_family_member(family_id));

-- Category Change Logs Policies
CREATE POLICY "Users can view category logs for their families"
ON category_change_logs FOR SELECT
USING (is_family_member(family_id));

CREATE POLICY "Users can insert category logs for their families"
ON category_change_logs FOR INSERT
WITH CHECK (is_family_member(family_id));

-- Function to count transactions for a category
CREATE OR REPLACE FUNCTION get_category_transaction_count(p_category_id TEXT, p_family_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM transactions
  WHERE family_id = p_family_id 
    AND category_id = p_category_id;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to bulk reclassify transactions
CREATE OR REPLACE FUNCTION bulk_reclassify_transactions(
  p_family_id UUID,
  p_old_category_id TEXT,
  p_new_category_id TEXT,
  p_old_subcategory_id TEXT DEFAULT NULL,
  p_new_subcategory_id TEXT DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_old_subcategory_id IS NOT NULL AND p_new_subcategory_id IS NOT NULL THEN
    UPDATE transactions
    SET 
      category_id = p_new_category_id,
      subcategory_id = p_new_subcategory_id
    WHERE family_id = p_family_id
      AND category_id = p_old_category_id
      AND subcategory_id = p_old_subcategory_id;
  ELSE
    UPDATE transactions
    SET category_id = p_new_category_id
    WHERE family_id = p_family_id
      AND category_id = p_old_category_id;
  END IF;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Log the bulk reclassification
  INSERT INTO category_change_logs (
    family_id, action, old_name, new_name,
    affected_transaction_count, performed_by_user_id, metadata
  ) VALUES (
    p_family_id, 'BULK_RECLASSIFIED', p_old_category_id, p_new_category_id,
    v_count, p_performed_by,
    jsonb_build_object(
      'old_category_id', p_old_category_id,
      'new_category_id', p_new_category_id,
      'old_subcategory_id', p_old_subcategory_id,
      'new_subcategory_id', p_new_subcategory_id
    )
  );
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;