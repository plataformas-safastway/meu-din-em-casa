-- FASE 5: Performance Optimization Indices and Consolidated Access RPC
-- ===========================================================================

-- 1. Index para goals (99.95% seq scan)
CREATE INDEX IF NOT EXISTS idx_goals_family_id ON public.goals(family_id);
CREATE INDEX IF NOT EXISTS idx_goals_family_status ON public.goals(family_id, status);

-- 2. Index para imports (97.55% seq scan)
CREATE INDEX IF NOT EXISTS idx_imports_family_id ON public.imports(family_id);
CREATE INDEX IF NOT EXISTS idx_imports_family_status ON public.imports(family_id, status);

-- 3. Index composto para transactions (otimizar paginação por data)
CREATE INDEX IF NOT EXISTS idx_transactions_family_date_desc 
ON public.transactions(family_id, date DESC, created_at DESC);

-- 4. Index para installments (usando credit_card_id e family_id)
CREATE INDEX IF NOT EXISTS idx_installments_credit_card ON public.installments(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_installments_family_id ON public.installments(family_id);
CREATE INDEX IF NOT EXISTS idx_installments_family_active ON public.installments(family_id, is_active) WHERE is_active = true;

-- 5. Index para ebook_ctas
CREATE INDEX IF NOT EXISTS idx_ebook_ctas_active ON public.ebook_ctas(is_active) WHERE is_active = true;

-- 6. Index para import_history
CREATE INDEX IF NOT EXISTS idx_import_history_family_id ON public.import_history(family_id);

-- 7. Index otimizado para family_members (RLS check)
CREATE INDEX IF NOT EXISTS idx_family_members_user_status 
ON public.family_members(user_id, status) WHERE status IN ('ACTIVE', 'INVITED');

-- ===========================================================================
-- 8. CONSOLIDATED ACCESS RPC - Substitui 7 chamadas por 1
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_user_access_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'role', (
      SELECT role
      FROM public.user_roles
      WHERE user_id = _user_id
      ORDER BY 
        CASE role 
          WHEN 'admin_master' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'diretoria' THEN 3
          WHEN 'gestao_estrategica' THEN 4
          WHEN 'financeiro' THEN 5
          WHEN 'tecnologia' THEN 6
          WHEN 'customer_success' THEN 7
          WHEN 'suporte' THEN 8
          WHEN 'legal' THEN 9
          WHEN 'cs' THEN 10
          WHEN 'user' THEN 11
        END
      LIMIT 1
    ),
    'has_cs_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin_master', 'customer_success')
    ),
    'has_financial_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin', 'admin_master', 'financeiro')
    ),
    'has_tech_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin', 'admin_master', 'tecnologia')
    ),
    'has_support_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin_master', 'suporte')
    ),
    'has_legal_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role::text IN ('legal', 'admin_master', 'admin')
    ),
    'has_executive_access', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin_master', 'diretoria', 'gestao_estrategica')
    ),
    'is_admin', EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
      AND role IN ('admin', 'admin_master', 'cs')
    )
  )
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_access_profile(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_access_profile IS 'Consolidated access check - replaces 7 separate RPC calls with 1';