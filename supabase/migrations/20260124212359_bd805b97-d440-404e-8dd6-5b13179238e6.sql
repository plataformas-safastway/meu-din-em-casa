-- =============================================
-- CS AUTOMATION + AI MODULE
-- Signals, Status, AI Suggestions, Actions
-- =============================================

-- 1. CS Behavior Signals Table (deterministic signals)
CREATE TABLE public.cs_behavior_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL, -- 'risk' or 'activation'
  signal_code TEXT NOT NULL, -- e.g., 'days_without_login', 'first_import', 'negative_balance_recurring'
  signal_value JSONB DEFAULT '{}', -- signal-specific data
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(family_id, signal_code, detected_at)
);

-- 2. CS AI Suggestions Table (explainable AI)
CREATE TABLE public.cs_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'education', 'onboarding', 'notification', 'task', 'follow_up'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT NOT NULL, -- AI explanation (always required)
  confidence_score NUMERIC(3,2) DEFAULT 0.5, -- 0.00 to 1.00
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'executed', 'expired')),
  suggested_action JSONB, -- action payload
  related_signals UUID[], -- references to cs_behavior_signals
  accepted_by UUID,
  accepted_at TIMESTAMPTZ,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  executed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CS Automation Rules Table (configurable rules)
CREATE TABLE public.cs_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_signal TEXT NOT NULL, -- signal_code that triggers this rule
  action_type TEXT NOT NULL, -- 'education_tip', 'onboarding_step', 'notification', 'cs_task', 'status_change'
  action_config JSONB NOT NULL, -- action-specific configuration
  is_active BOOLEAN DEFAULT true,
  requires_consent BOOLEAN DEFAULT true,
  cooldown_hours INTEGER DEFAULT 24, -- minimum hours between triggers
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CS Automation Executions Log (audit trail)
CREATE TABLE public.cs_automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.cs_automation_rules(id),
  suggestion_id UUID REFERENCES public.cs_ai_suggestions(id),
  action_type TEXT NOT NULL,
  action_payload JSONB,
  triggered_by TEXT NOT NULL, -- 'rule', 'ai', 'manual'
  executed_by UUID, -- CS user who executed (null if automatic)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed', 'cancelled')),
  result JSONB,
  error_message TEXT,
  consent_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ
);

-- 5. CS User Preferences Table (LGPD consent)
CREATE TABLE public.cs_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE UNIQUE,
  allow_smart_tips BOOLEAN DEFAULT true,
  allow_notifications BOOLEAN DEFAULT true,
  allow_ai_analysis BOOLEAN DEFAULT true,
  allow_proactive_contact BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- 6. Add AI analysis fields to existing cs_engagement_metrics
ALTER TABLE public.cs_engagement_metrics 
ADD COLUMN IF NOT EXISTS ai_risk_score NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_engagement_prediction TEXT,
ADD COLUMN IF NOT EXISTS ai_churn_probability NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_next_best_action TEXT,
ADD COLUMN IF NOT EXISTS ai_analysis_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.cs_behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_user_preferences ENABLE ROW LEVEL SECURITY;

-- Function to check CS access (reuse existing or create)
CREATE OR REPLACE FUNCTION public.has_cs_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin_master', 'customer_success')
  )
$$;

-- RLS Policies for cs_behavior_signals
CREATE POLICY "CS can view behavior signals"
ON public.cs_behavior_signals FOR SELECT
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can manage behavior signals"
ON public.cs_behavior_signals FOR ALL
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- RLS Policies for cs_ai_suggestions
CREATE POLICY "CS can view AI suggestions"
ON public.cs_ai_suggestions FOR SELECT
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can manage AI suggestions"
ON public.cs_ai_suggestions FOR ALL
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- RLS Policies for cs_automation_rules
CREATE POLICY "CS can view automation rules"
ON public.cs_automation_rules FOR SELECT
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can manage automation rules"
ON public.cs_automation_rules FOR ALL
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- RLS Policies for cs_automation_executions
CREATE POLICY "CS can view automation executions"
ON public.cs_automation_executions FOR SELECT
TO authenticated
USING (public.has_cs_access(auth.uid()));

CREATE POLICY "CS can manage automation executions"
ON public.cs_automation_executions FOR ALL
TO authenticated
USING (public.has_cs_access(auth.uid()));

-- RLS Policies for cs_user_preferences (users can manage their own)
CREATE POLICY "Users can view own CS preferences"
ON public.cs_user_preferences FOR SELECT
TO authenticated
USING (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
  OR public.has_cs_access(auth.uid())
);

CREATE POLICY "Users can update own CS preferences"
ON public.cs_user_preferences FOR UPDATE
TO authenticated
USING (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert own CS preferences"
ON public.cs_user_preferences FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (SELECT family_id FROM public.family_members WHERE user_id = auth.uid())
);

-- Function to calculate behavior signals for a family
CREATE OR REPLACE FUNCTION public.calculate_cs_signals(_family_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signals JSONB := '[]'::jsonb;
  v_last_login TIMESTAMPTZ;
  v_days_since_login INTEGER;
  v_has_import BOOLEAN;
  v_has_budget BOOLEAN;
  v_has_goals BOOLEAN;
  v_transaction_count INTEGER;
  v_negative_balance_months INTEGER;
BEGIN
  -- Get last login from engagement metrics
  SELECT last_login_at INTO v_last_login
  FROM cs_engagement_metrics
  WHERE family_id = _family_id;
  
  IF v_last_login IS NOT NULL THEN
    v_days_since_login := EXTRACT(DAY FROM now() - v_last_login);
  ELSE
    v_days_since_login := 999;
  END IF;
  
  -- Check for data presence
  SELECT EXISTS(SELECT 1 FROM imports WHERE family_id = _family_id AND status = 'completed') INTO v_has_import;
  SELECT EXISTS(SELECT 1 FROM budgets WHERE family_id = _family_id AND is_active = true) INTO v_has_budget;
  SELECT EXISTS(SELECT 1 FROM goals WHERE family_id = _family_id) INTO v_has_goals;
  SELECT COUNT(*) INTO v_transaction_count FROM transactions WHERE family_id = _family_id;
  
  -- Risk signals
  IF v_days_since_login > 7 THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'risk',
      'code', 'days_without_login',
      'value', jsonb_build_object('days', v_days_since_login)
    );
  END IF;
  
  IF NOT v_has_import AND v_days_since_login > 3 THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'risk',
      'code', 'no_import_after_signup',
      'value', jsonb_build_object('days_active', v_days_since_login)
    );
  END IF;
  
  IF NOT v_has_budget AND v_transaction_count > 10 THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'risk',
      'code', 'no_budget_with_transactions',
      'value', jsonb_build_object('transaction_count', v_transaction_count)
    );
  END IF;
  
  IF NOT v_has_goals AND v_days_since_login > 14 THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'risk',
      'code', 'no_goals_defined',
      'value', jsonb_build_object('days_active', v_days_since_login)
    );
  END IF;
  
  -- Activation signals
  IF v_has_import THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'activation',
      'code', 'first_import_completed',
      'value', '{}'::jsonb
    );
  END IF;
  
  IF v_has_budget THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'activation',
      'code', 'first_budget_created',
      'value', '{}'::jsonb
    );
  END IF;
  
  IF v_has_goals THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'activation',
      'code', 'first_goal_created',
      'value', '{}'::jsonb
    );
  END IF;
  
  IF v_days_since_login <= 1 AND v_transaction_count > 0 THEN
    v_signals := v_signals || jsonb_build_object(
      'type', 'activation',
      'code', 'active_user',
      'value', jsonb_build_object('recent_login', true)
    );
  END IF;
  
  RETURN v_signals;
END;
$$;

-- Insert default automation rules
INSERT INTO public.cs_automation_rules (name, description, trigger_signal, action_type, action_config, requires_consent, cooldown_hours, priority) VALUES
('Dica após dias sem login', 'Envia dica educativa após 7 dias sem login', 'days_without_login', 'education_tip', '{"tip_key": "reactivation_welcome", "message": "Sentimos sua falta! Que tal dar uma olhada em como suas finanças estão?"}', true, 168, 1),
('Sugestão de orçamento', 'Sugere criar orçamento para quem tem transações mas não criou', 'no_budget_with_transactions', 'education_tip', '{"tip_key": "budget_suggestion", "message": "Você já tem várias transações. Que tal criar um orçamento para ter mais clareza?"}', true, 72, 2),
('Sugestão de meta', 'Sugere criar meta para usuários sem objetivos definidos', 'no_goals_defined', 'education_tip', '{"tip_key": "goal_suggestion", "message": "Definir uma meta simples pode ajudar a dar direção para suas finanças."}', true, 168, 3),
('Tarefa CS: usuário em risco', 'Cria tarefa para CS quando usuário está em risco', 'days_without_login', 'cs_task', '{"task_type": "follow_up", "priority": "high", "template": "Usuário sem login há {days} dias"}', false, 168, 10)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cs_behavior_signals_family ON public.cs_behavior_signals(family_id);
CREATE INDEX IF NOT EXISTS idx_cs_behavior_signals_active ON public.cs_behavior_signals(is_active, signal_type);
CREATE INDEX IF NOT EXISTS idx_cs_ai_suggestions_family ON public.cs_ai_suggestions(family_id);
CREATE INDEX IF NOT EXISTS idx_cs_ai_suggestions_status ON public.cs_ai_suggestions(status, priority);
CREATE INDEX IF NOT EXISTS idx_cs_automation_executions_family ON public.cs_automation_executions(family_id);
CREATE INDEX IF NOT EXISTS idx_cs_automation_executions_status ON public.cs_automation_executions(status);
