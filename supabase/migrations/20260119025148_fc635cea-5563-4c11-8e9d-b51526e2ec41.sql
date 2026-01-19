-- ========================================
-- 1) ADD CATEGORY/SUBCATEGORY LINK TO GOALS
-- ========================================
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS category_id text DEFAULT 'objetivos',
ADD COLUMN IF NOT EXISTS subcategory_id text;

-- ========================================
-- 2) ADD CHECK NUMBER TO TRANSACTIONS
-- ========================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS check_number text;

-- ========================================
-- 3) ADD 'cheque' TO PAYMENT_METHOD ENUM
-- ========================================
-- First check if 'cheque' already exists in the enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cheque' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_method')) THEN
    ALTER TYPE public.payment_method ADD VALUE 'cheque';
  END IF;
END$$;

-- ========================================
-- 4) CREATE INDEX FOR GOAL-SUBCATEGORY LOOKUP
-- ========================================
CREATE INDEX IF NOT EXISTS idx_goals_subcategory_id ON public.goals(subcategory_id);

-- ========================================
-- 5) ADD GOAL_ID REFERENCE TO TRANSACTIONS (for bidirectional sync)
-- ========================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_goal_id ON public.transactions(goal_id);