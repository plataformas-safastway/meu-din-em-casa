-- =====================================================
-- PARTE 2: Tabelas, Funções e RLS para Relatórios Executivos
-- =====================================================

-- 1. Tabela de cache para relatórios pesados
CREATE TABLE IF NOT EXISTS public.executive_reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(report_type, period_start, period_end)
);

-- 2. Tabela de auditoria de acesso a relatórios
CREATE TABLE IF NOT EXISTS public.executive_reports_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_type TEXT NOT NULL,
  action TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  export_format TEXT,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Função para verificar acesso executivo
CREATE OR REPLACE FUNCTION public.has_executive_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin_master', 'diretoria', 'gestao_estrategica')
  )
$$;

-- 4. Função para obter métricas executivas consolidadas
CREATE OR REPLACE FUNCTION public.get_executive_metrics(
  _period_start DATE DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  _period_end DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_users INTEGER;
  v_active_users INTEGER;
  v_new_users INTEGER;
  v_mrr NUMERIC;
  v_churn_rate NUMERIC;
  v_avg_engagement NUMERIC;
  v_prev_period_start DATE;
  v_prev_period_end DATE;
  v_prev_total_users INTEGER;
  v_prev_mrr NUMERIC;
BEGIN
  v_prev_period_end := _period_start - INTERVAL '1 day';
  v_prev_period_start := v_prev_period_end - (_period_end - _period_start);

  SELECT COUNT(*) INTO v_total_users FROM families;
  
  SELECT COUNT(*) INTO v_prev_total_users 
  FROM families 
  WHERE created_at < _period_start;
  
  SELECT COUNT(*) INTO v_new_users 
  FROM families 
  WHERE created_at BETWEEN _period_start AND _period_end;
  
  SELECT COUNT(DISTINCT family_id) INTO v_active_users
  FROM cs_engagement_metrics
  WHERE last_login_at >= _period_end - INTERVAL '30 days';
  
  SELECT COALESCE(SUM(
    CASE sp.plan_id
      WHEN 'premium' THEN 29.90
      WHEN 'familiar' THEN 19.90
      WHEN 'basico' THEN 9.90
      ELSE 0
    END
  ), 0) INTO v_mrr
  FROM user_subscriptions sp
  WHERE sp.status = 'active';
  
  SELECT COALESCE(SUM(
    CASE sp.plan_id
      WHEN 'premium' THEN 29.90
      WHEN 'familiar' THEN 19.90
      WHEN 'basico' THEN 9.90
      ELSE 0
    END
  ), 0) INTO v_prev_mrr
  FROM user_subscriptions sp
  WHERE sp.status = 'active'
    AND sp.created_at < _period_start;
  
  SELECT COALESCE(AVG(score), 0) INTO v_avg_engagement
  FROM cs_engagement_metrics;
  
  IF v_prev_total_users > 0 THEN
    v_churn_rate := ((v_prev_total_users + v_new_users - v_total_users)::NUMERIC / v_prev_total_users) * 100;
  ELSE
    v_churn_rate := 0;
  END IF;

  v_result := jsonb_build_object(
    'period', jsonb_build_object('start', _period_start, 'end', _period_end),
    'users', jsonb_build_object(
      'total', v_total_users,
      'active', v_active_users,
      'new', v_new_users,
      'growth_rate', CASE WHEN v_prev_total_users > 0 
        THEN ROUND(((v_total_users - v_prev_total_users)::NUMERIC / v_prev_total_users) * 100, 2)
        ELSE 0 END
    ),
    'revenue', jsonb_build_object(
      'mrr', ROUND(v_mrr, 2),
      'mrr_growth', CASE WHEN v_prev_mrr > 0 
        THEN ROUND(((v_mrr - v_prev_mrr) / v_prev_mrr) * 100, 2)
        ELSE 0 END
    ),
    'engagement', jsonb_build_object(
      'average_score', ROUND(v_avg_engagement, 1),
      'churn_rate', ROUND(GREATEST(v_churn_rate, 0), 2)
    ),
    'calculated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- 5. Função para métricas de crescimento
CREATE OR REPLACE FUNCTION public.get_growth_metrics(_months INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_month_data JSONB;
  v_month DATE;
  v_count INTEGER;
  v_activated INTEGER;
BEGIN
  FOR i IN 0..(_months - 1) LOOP
    v_month := date_trunc('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE;
    
    SELECT COUNT(*) INTO v_count
    FROM families
    WHERE date_trunc('month', created_at) = v_month;
    
    SELECT COUNT(DISTINCT f.id) INTO v_activated
    FROM families f
    WHERE date_trunc('month', f.created_at) = v_month
      AND (
        EXISTS (SELECT 1 FROM transactions t WHERE t.family_id = f.id)
        OR EXISTS (SELECT 1 FROM imports i WHERE i.family_id = f.id AND i.status = 'completed')
      );
    
    v_month_data := jsonb_build_object(
      'month', v_month,
      'new_users', v_count,
      'activated_users', v_activated,
      'activation_rate', CASE WHEN v_count > 0 
        THEN ROUND((v_activated::NUMERIC / v_count) * 100, 1)
        ELSE 0 END
    );
    
    v_result := v_result || v_month_data;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- 6. Função para métricas de receita
CREATE OR REPLACE FUNCTION public.get_revenue_metrics(_months INTEGER DEFAULT 6)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB := '[]'::JSONB;
  v_month_data JSONB;
  v_month DATE;
  v_mrr NUMERIC;
  v_gross NUMERIC;
  v_overdue NUMERIC;
  v_plan_breakdown JSONB;
BEGIN
  FOR i IN 0..(_months - 1) LOOP
    v_month := date_trunc('month', CURRENT_DATE - (i || ' months')::INTERVAL)::DATE;
    
    SELECT COALESCE(SUM(
      CASE plan_id
        WHEN 'premium' THEN 29.90
        WHEN 'familiar' THEN 19.90
        WHEN 'basico' THEN 9.90
        ELSE 0
      END
    ), 0) INTO v_mrr
    FROM user_subscriptions
    WHERE status = 'active'
      AND date_trunc('month', created_at) <= v_month;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_gross
    FROM subscription_payments
    WHERE status = 'paid'
      AND date_trunc('month', paid_at) = v_month;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_overdue
    FROM subscription_payments
    WHERE status = 'overdue'
      AND date_trunc('month', due_date) = v_month;
    
    SELECT jsonb_object_agg(COALESCE(plan_id, 'unknown'), cnt) INTO v_plan_breakdown
    FROM (
      SELECT plan_id, COUNT(*) as cnt
      FROM user_subscriptions
      WHERE status = 'active' AND date_trunc('month', created_at) <= v_month
      GROUP BY plan_id
    ) sub;
    
    v_month_data := jsonb_build_object(
      'month', v_month,
      'mrr', ROUND(v_mrr, 2),
      'gross_revenue', ROUND(v_gross, 2),
      'overdue', ROUND(v_overdue, 2),
      'plans', COALESCE(v_plan_breakdown, '{}'::JSONB)
    );
    
    v_result := v_result || v_month_data;
  END LOOP;
  
  RETURN v_result;
END;
$$;

-- 7. Função para métricas de engajamento/CS
CREATE OR REPLACE FUNCTION public.get_engagement_metrics_report()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_status_counts JSONB;
  v_avg_score NUMERIC;
  v_actions_count INTEGER;
  v_automation_impact JSONB;
BEGIN
  SELECT jsonb_object_agg(status, cnt) INTO v_status_counts
  FROM (SELECT status, COUNT(*) as cnt FROM cs_user_status GROUP BY status) sub;
  
  SELECT COALESCE(AVG(score), 0) INTO v_avg_score FROM cs_engagement_metrics;
  
  SELECT COUNT(*) INTO v_actions_count FROM cs_actions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  SELECT jsonb_build_object(
    'total_executions', COUNT(*),
    'successful', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO v_automation_impact
  FROM cs_automation_executions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  v_result := jsonb_build_object(
    'user_status', COALESCE(v_status_counts, '{}'::JSONB),
    'average_engagement_score', ROUND(v_avg_score, 1),
    'cs_actions_30d', v_actions_count,
    'automation_impact', v_automation_impact,
    'calculated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- 8. Função para métricas de produto/estabilidade
CREATE OR REPLACE FUNCTION public.get_product_stability_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_error_count INTEGER;
  v_import_success_rate NUMERIC;
  v_openfinance_status JSONB;
BEGIN
  SELECT COUNT(*) INTO v_error_count FROM imports WHERE status = 'error' AND created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  SELECT CASE WHEN COUNT(*) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)) * 100, 1)
    ELSE 100 END INTO v_import_success_rate
  FROM imports WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
  
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'error', COUNT(*) FILTER (WHERE status = 'error')
  ) INTO v_openfinance_status FROM openfinance_connections;
  
  v_result := jsonb_build_object(
    'errors', jsonb_build_object('import_errors_30d', v_error_count, 'import_success_rate', v_import_success_rate),
    'integrations', jsonb_build_object('openfinance', v_openfinance_status),
    'calculated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- 9. RLS para tabela de cache
ALTER TABLE public.executive_reports_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executive select cache"
  ON public.executive_reports_cache FOR SELECT TO authenticated
  USING (public.has_executive_access(auth.uid()));

CREATE POLICY "Executive insert cache"
  ON public.executive_reports_cache FOR INSERT TO authenticated
  WITH CHECK (public.has_executive_access(auth.uid()));

CREATE POLICY "Executive update cache"
  ON public.executive_reports_cache FOR UPDATE TO authenticated
  USING (public.has_executive_access(auth.uid()));

CREATE POLICY "Executive delete cache"
  ON public.executive_reports_cache FOR DELETE TO authenticated
  USING (public.has_executive_access(auth.uid()));

-- 10. RLS para tabela de auditoria
ALTER TABLE public.executive_reports_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Executive select audit"
  ON public.executive_reports_audit FOR SELECT TO authenticated
  USING (public.has_executive_access(auth.uid()));

CREATE POLICY "Executive insert audit"
  ON public.executive_reports_audit FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_executive_access(auth.uid()));

-- 11. Índices para performance
CREATE INDEX IF NOT EXISTS idx_exec_reports_cache_type_period 
  ON public.executive_reports_cache(report_type, period_start, period_end);
  
CREATE INDEX IF NOT EXISTS idx_exec_reports_audit_user_date 
  ON public.executive_reports_audit(user_id, accessed_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_exec_reports_audit_type 
  ON public.executive_reports_audit(report_type, accessed_at DESC);