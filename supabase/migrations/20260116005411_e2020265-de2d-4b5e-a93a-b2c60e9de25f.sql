-- 1. Metas de orçamento com projeção
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS projected_amount NUMERIC;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS average_spending NUMERIC;

-- 2. Mapeamento de categorias importadas
CREATE TABLE public.category_import_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  imported_name TEXT NOT NULL,
  mapped_category_id TEXT NOT NULL,
  mapped_subcategory_id TEXT,
  imported_limit NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, imported_name)
);

ALTER TABLE public.category_import_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view mappings" ON public.category_import_mappings FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create mappings" ON public.category_import_mappings FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update mappings" ON public.category_import_mappings FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete mappings" ON public.category_import_mappings FOR DELETE USING (is_family_member(family_id));

-- 3. Relatórios mensais por IA
CREATE TABLE public.monthly_ai_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  report_content JSONB NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_recipient TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, month, year)
);

ALTER TABLE public.monthly_ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reports" ON public.monthly_ai_reports FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create reports" ON public.monthly_ai_reports FOR INSERT WITH CHECK (is_family_member(family_id));

-- 4. Parcelas futuras (installments)
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  current_installment INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view installments" ON public.installments FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create installments" ON public.installments FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update installments" ON public.installments FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete installments" ON public.installments FOR DELETE USING (is_family_member(family_id));

CREATE TRIGGER update_installments_updated_at BEFORE UPDATE ON public.installments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Projeções de fluxo de caixa
CREATE TABLE public.cashflow_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  projected_income NUMERIC NOT NULL DEFAULT 0,
  projected_expenses NUMERIC NOT NULL DEFAULT 0,
  projected_installments NUMERIC NOT NULL DEFAULT 0,
  projected_balance NUMERIC NOT NULL DEFAULT 0,
  alert_level TEXT CHECK (alert_level IN ('ok', 'warning', 'danger')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(family_id, forecast_date)
);

ALTER TABLE public.cashflow_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view forecasts" ON public.cashflow_forecasts FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can manage forecasts" ON public.cashflow_forecasts FOR ALL USING (is_family_member(family_id));

-- 6. Preferências de relatório por e-mail
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS email_report_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS email_report_day INTEGER DEFAULT 1;
ALTER TABLE public.families ADD COLUMN IF NOT EXISTS email_report_recipient TEXT;

-- 7. Alertas emitidos
CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view alerts" ON public.alerts FOR SELECT USING (is_family_member(family_id));
CREATE POLICY "Members can create alerts" ON public.alerts FOR INSERT WITH CHECK (is_family_member(family_id));
CREATE POLICY "Members can update alerts" ON public.alerts FOR UPDATE USING (is_family_member(family_id));
CREATE POLICY "Members can delete alerts" ON public.alerts FOR DELETE USING (is_family_member(family_id));

CREATE INDEX idx_alerts_family_unread ON public.alerts (family_id, is_read, created_at DESC);