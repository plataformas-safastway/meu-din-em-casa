-- =========================================
-- PARCELAMENTO INTELIGENTE - Schema
-- =========================================

-- 1. Enums for installment tracking
CREATE TYPE public.card_charge_type AS ENUM ('ONE_SHOT', 'INSTALLMENT', 'RECURRENT');
CREATE TYPE public.installment_status AS ENUM ('POSTED', 'PLANNED', 'RECONCILED', 'CANCELLED');
CREATE TYPE public.confidence_level AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- 2. Installment groups table (links parent transaction to all installments)
CREATE TABLE public.installment_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  parent_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  installments_total INTEGER NOT NULL CHECK (installments_total > 0),
  installment_value NUMERIC(12,2) NOT NULL,
  first_due_date DATE NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  confidence_level public.confidence_level DEFAULT 'HIGH',
  needs_user_confirmation BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Planned installments table
CREATE TABLE public.planned_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  installment_group_id UUID NOT NULL REFERENCES public.installment_groups(id) ON DELETE CASCADE,
  installment_index INTEGER NOT NULL CHECK (installment_index > 0),
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status public.installment_status NOT NULL DEFAULT 'PLANNED',
  reconciled_transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(installment_group_id, installment_index)
);

-- 4. Add installment tracking fields to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS card_charge_type public.card_charge_type,
  ADD COLUMN IF NOT EXISTS installment_group_id UUID REFERENCES public.installment_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_index INTEGER,
  ADD COLUMN IF NOT EXISTS installments_total INTEGER,
  ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT;

-- 5. Installment pattern rules
CREATE TABLE public.installment_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert common Brazilian installment patterns
INSERT INTO public.installment_patterns (pattern, pattern_type, description, priority) VALUES
  ('(\d{1,2})[/\\-](\d{1,2})', 'INSTALLMENT', 'Pattern: 01/10, 3-12', 100),
  ('PARC\s*(\d{1,2})[/\\-]?(\d{1,2})?', 'INSTALLMENT', 'Pattern: PARC 3/12, PARC3', 90),
  ('PARCELA\s*(\d{1,2})', 'INSTALLMENT', 'Pattern: PARCELA 1', 85),
  ('(\d{1,2})X\s*R?\$?\s*[\d,\.]+', 'INSTALLMENT', 'Pattern: 10x R$ 99,90', 80),
  ('CRED\s*PARC', 'INSTALLMENT', 'Pattern: CRED PARC / CRÉDITO PARCELADO', 75),
  ('COMPRA\s*PARC', 'INSTALLMENT', 'Pattern: COMPRA PARCELADA', 70);

-- 6. Installment audit log
CREATE TABLE public.installment_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_group_id UUID REFERENCES public.installment_groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable RLS
ALTER TABLE public.installment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planned_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_audit_log ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for installment_groups (using ACTIVE uppercase)
CREATE POLICY "Family members can view their installment groups"
  ON public.installment_groups FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can insert installment groups"
  ON public.installment_groups FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can update their installment groups"
  ON public.installment_groups FOR UPDATE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can delete their installment groups"
  ON public.installment_groups FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

-- 9. RLS Policies for planned_installments
CREATE POLICY "Family members can view their planned installments"
  ON public.planned_installments FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can insert planned installments"
  ON public.planned_installments FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can update their planned installments"
  ON public.planned_installments FOR UPDATE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

CREATE POLICY "Family members can delete their planned installments"
  ON public.planned_installments FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id FROM public.family_members fm 
      WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
    )
  );

-- 10. RLS for installment_patterns (public read)
CREATE POLICY "Anyone can read installment patterns"
  ON public.installment_patterns FOR SELECT
  USING (true);

-- 11. RLS for installment_audit_log
CREATE POLICY "Family members can view their installment audit logs"
  ON public.installment_audit_log FOR SELECT
  USING (
    installment_group_id IN (
      SELECT ig.id FROM public.installment_groups ig
      WHERE ig.family_id IN (
        SELECT fm.family_id FROM public.family_members fm 
        WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
      )
    )
  );

CREATE POLICY "Family members can insert installment audit logs"
  ON public.installment_audit_log FOR INSERT
  WITH CHECK (
    installment_group_id IN (
      SELECT ig.id FROM public.installment_groups ig
      WHERE ig.family_id IN (
        SELECT fm.family_id FROM public.family_members fm 
        WHERE fm.user_id = auth.uid() AND fm.status = 'ACTIVE'
      )
    )
  );

-- 12. Indexes
CREATE INDEX idx_installment_groups_family_id ON public.installment_groups(family_id);
CREATE INDEX idx_installment_groups_credit_card_id ON public.installment_groups(credit_card_id);
CREATE INDEX idx_planned_installments_family_id ON public.planned_installments(family_id);
CREATE INDEX idx_planned_installments_group_id ON public.planned_installments(installment_group_id);
CREATE INDEX idx_planned_installments_due_date ON public.planned_installments(due_date);
CREATE INDEX idx_planned_installments_status ON public.planned_installments(status);
CREATE INDEX idx_transactions_installment_group ON public.transactions(installment_group_id);

-- 13. Function to create planned installments
CREATE OR REPLACE FUNCTION public.create_planned_installments(
  p_group_id UUID,
  p_start_index INTEGER DEFAULT 2
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_due_date DATE;
  i INTEGER;
BEGIN
  SELECT * INTO v_group FROM installment_groups WHERE id = p_group_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Installment group not found';
  END IF;
  
  FOR i IN p_start_index..v_group.installments_total LOOP
    v_due_date := v_group.first_due_date + ((i - 1) * INTERVAL '1 month');
    
    INSERT INTO planned_installments (
      family_id,
      installment_group_id,
      installment_index,
      amount,
      due_date,
      status
    ) VALUES (
      v_group.family_id,
      p_group_id,
      i,
      v_group.installment_value,
      v_due_date,
      'PLANNED'
    ) ON CONFLICT (installment_group_id, installment_index) DO NOTHING;
  END LOOP;
END;
$$;

-- 14. Function to reconcile installment
CREATE OR REPLACE FUNCTION public.reconcile_installment(
  p_planned_id UUID,
  p_transaction_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_planned RECORD;
  v_group RECORD;
BEGIN
  SELECT * INTO v_planned FROM planned_installments WHERE id = p_planned_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  SELECT * INTO v_group FROM installment_groups WHERE id = v_planned.installment_group_id;
  
  UPDATE planned_installments
  SET 
    status = 'RECONCILED',
    reconciled_transaction_id = p_transaction_id,
    reconciled_at = now(),
    updated_at = now()
  WHERE id = p_planned_id;
  
  UPDATE transactions
  SET 
    installment_group_id = v_planned.installment_group_id,
    installment_index = v_planned.installment_index,
    installments_total = v_group.installments_total,
    card_charge_type = 'INSTALLMENT'
  WHERE id = p_transaction_id;
  
  INSERT INTO installment_audit_log (installment_group_id, action, performed_by, details)
  VALUES (
    v_planned.installment_group_id,
    'RECONCILED',
    auth.uid(),
    jsonb_build_object(
      'planned_installment_id', p_planned_id,
      'transaction_id', p_transaction_id,
      'installment_index', v_planned.installment_index
    )
  );
  
  RETURN TRUE;
END;
$$;

-- 15. Triggers for updated_at
CREATE TRIGGER update_installment_groups_updated_at
  BEFORE UPDATE ON public.installment_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planned_installments_updated_at
  BEFORE UPDATE ON public.planned_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();