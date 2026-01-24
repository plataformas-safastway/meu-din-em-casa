-- =============================================
-- MÓDULO FINANCEIRO OIK - TABELAS E POLÍTICAS
-- =============================================

-- 1. CRIAR TABELA DE PLANOS DE ASSINATURA
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CRIAR TABELA DE ASSINATURAS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'trial',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    payment_method TEXT,
    external_customer_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CRIAR TABELA DE COBRANÇAS/PAGAMENTOS
CREATE TABLE IF NOT EXISTS public.subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    external_payment_id TEXT,
    paid_at TIMESTAMPTZ,
    due_date DATE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    failure_reason TEXT,
    refund_amount DECIMAL(10,2),
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CRIAR TABELA DE NOTAS FISCAIS
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES public.subscription_payments(id),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    invoice_number TEXT,
    external_invoice_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    amount DECIMAL(10,2) NOT NULL,
    service_description TEXT NOT NULL DEFAULT 'Assinatura OIK - Gestão Financeira Familiar',
    customer_name TEXT NOT NULL,
    customer_document TEXT NOT NULL,
    customer_email TEXT,
    pdf_url TEXT,
    xml_url TEXT,
    issued_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    error_message TEXT,
    error_code TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. EXPANDIR TABELA DE AUDIT LOGS COM NOVOS CAMPOS
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS module TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 6. CRIAR TABELA DE MÉTRICAS FINANCEIRAS (CACHE PARA PERFORMANCE)
CREATE TABLE IF NOT EXISTS public.financial_metrics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(metric_date, metric_type)
);

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_family_id ON public.user_subscriptions(family_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_due_date ON public.subscription_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_family_id ON public.invoices(family_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_financial_metrics_cache_date ON public.financial_metrics_cache(metric_date);

-- 8. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_metrics_cache ENABLE ROW LEVEL SECURITY;

-- 9. FUNÇÃO PARA VERIFICAR ACESSO AO MÓDULO FINANCEIRO
CREATE OR REPLACE FUNCTION public.has_financial_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'admin_master', 'financeiro')
  )
$$;

-- 10. FUNÇÃO PARA VERIFICAR ACESSO TECNOLOGIA
CREATE OR REPLACE FUNCTION public.has_tech_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'admin_master', 'tecnologia')
  )
$$;

-- 11. POLÍTICAS RLS PARA SUBSCRIPTION_PLANS
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Financial users can manage plans"
ON public.subscription_plans FOR ALL
TO authenticated
USING (public.has_financial_access(auth.uid()))
WITH CHECK (public.has_financial_access(auth.uid()));

-- 12. POLÍTICAS RLS PARA USER_SUBSCRIPTIONS
CREATE POLICY "Financial users can view all subscriptions"
ON public.user_subscriptions FOR SELECT
TO authenticated
USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can insert subscriptions"
ON public.user_subscriptions FOR INSERT
TO authenticated
WITH CHECK (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can update subscriptions"
ON public.user_subscriptions FOR UPDATE
TO authenticated
USING (public.has_financial_access(auth.uid()));

-- 13. POLÍTICAS RLS PARA SUBSCRIPTION_PAYMENTS (sem DELETE)
CREATE POLICY "Financial users can view all payments"
ON public.subscription_payments FOR SELECT
TO authenticated
USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create payments"
ON public.subscription_payments FOR INSERT
TO authenticated
WITH CHECK (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can update payments"
ON public.subscription_payments FOR UPDATE
TO authenticated
USING (public.has_financial_access(auth.uid()));

-- 14. POLÍTICAS RLS PARA INVOICES (sem DELETE)
CREATE POLICY "Financial users can view all invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can create invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (public.has_financial_access(auth.uid()));

-- 15. POLÍTICAS RLS PARA FINANCIAL_METRICS_CACHE
CREATE POLICY "Financial users can view metrics"
ON public.financial_metrics_cache FOR SELECT
TO authenticated
USING (public.has_financial_access(auth.uid()));

CREATE POLICY "Financial users can manage metrics"
ON public.financial_metrics_cache FOR ALL
TO authenticated
USING (public.has_financial_access(auth.uid()))
WITH CHECK (public.has_financial_access(auth.uid()));

-- 16. TRIGGERS PARA UPDATED_AT
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();