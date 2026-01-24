-- =====================================================
-- ONBOARDING & EDUCATION SYSTEM FOR OIK
-- Ativação • Clareza • Confiança • Autonomia • LGPD
-- =====================================================

-- 1. User Onboarding Progress
-- Tracks each user's onboarding journey
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  
  -- Welcome state
  has_seen_welcome BOOLEAN NOT NULL DEFAULT false,
  welcome_seen_at TIMESTAMP WITH TIME ZONE,
  
  -- Checklist steps (nullable = not started, timestamp = completed)
  step_account_created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  step_bank_account_at TIMESTAMP WITH TIME ZONE,
  step_import_at TIMESTAMP WITH TIME ZONE,
  step_budget_at TIMESTAMP WITH TIME ZONE,
  step_goal_at TIMESTAMP WITH TIME ZONE,
  step_family_invite_at TIMESTAMP WITH TIME ZONE,
  
  -- Computed progress (0-100)
  progress_percent INTEGER NOT NULL DEFAULT 17, -- 1/6 steps = 17%
  
  -- Preferences (LGPD)
  education_tips_enabled BOOLEAN NOT NULL DEFAULT true,
  contextual_hints_enabled BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Contextual Tips Shown
-- Tracks which tips have been shown to avoid repetition
CREATE TABLE public.education_tips_shown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  
  tip_key TEXT NOT NULL, -- e.g., 'import_first_time', 'budget_intro', 'negative_balance'
  shown_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dismissed_at TIMESTAMP WITH TIME ZONE, -- when user clicked "Entendi"
  
  -- Prevent showing same tip multiple times
  UNIQUE(user_id, tip_key)
);

-- 3. Education Content (for FAQ/Help integration)
CREATE TABLE public.education_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  module TEXT NOT NULL, -- 'extrato', 'orcamento', 'metas', 'projecao', 'onboarding'
  tip_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT, -- lucide icon name
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- When to show contextually
  trigger_condition TEXT, -- e.g., 'first_import', 'negative_balance', 'no_budget'
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_tips_shown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_onboarding
CREATE POLICY "Users can view their own onboarding" 
ON public.user_onboarding 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding" 
ON public.user_onboarding 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding" 
ON public.user_onboarding 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for education_tips_shown
CREATE POLICY "Users can view their own tips" 
ON public.education_tips_shown 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tips" 
ON public.education_tips_shown 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tips" 
ON public.education_tips_shown 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for education_content (public read)
CREATE POLICY "Anyone can read active education content" 
ON public.education_content 
FOR SELECT 
USING (is_active = true);

-- Indexes for performance
CREATE INDEX idx_user_onboarding_user_id ON public.user_onboarding(user_id);
CREATE INDEX idx_user_onboarding_family_id ON public.user_onboarding(family_id);
CREATE INDEX idx_education_tips_user ON public.education_tips_shown(user_id);
CREATE INDEX idx_education_tips_key ON public.education_tips_shown(tip_key);
CREATE INDEX idx_education_content_module ON public.education_content(module);
CREATE INDEX idx_education_content_trigger ON public.education_content(trigger_condition);

-- Trigger for updated_at
CREATE TRIGGER update_user_onboarding_updated_at
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_education_content_updated_at
BEFORE UPDATE ON public.education_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate onboarding progress
CREATE OR REPLACE FUNCTION public.calculate_onboarding_progress(onboarding_row user_onboarding)
RETURNS INTEGER AS $$
DECLARE
  total_steps INTEGER := 6;
  completed_steps INTEGER := 0;
BEGIN
  IF onboarding_row.step_account_created_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_bank_account_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_import_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_budget_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_goal_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  IF onboarding_row.step_family_invite_at IS NOT NULL THEN completed_steps := completed_steps + 1; END IF;
  
  RETURN ROUND((completed_steps::DECIMAL / total_steps) * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Function to auto-update progress on changes
CREATE OR REPLACE FUNCTION public.update_onboarding_progress()
RETURNS TRIGGER AS $$
BEGIN
  NEW.progress_percent := public.calculate_onboarding_progress(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_onboarding_progress
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_onboarding_progress();

-- Seed initial education content
INSERT INTO public.education_content (module, tip_key, title, content, icon, trigger_condition, display_order) VALUES
-- Onboarding
('onboarding', 'welcome', 'Bem-vindo ao OIK', 'Aqui, a economia começa em casa — no seu tempo. Não se preocupe em fazer tudo de uma vez.', 'Home', NULL, 0),

-- Import
('extrato', 'import_first_time', 'Primeira Importação', 'Você não precisa classificar tudo agora. Comece pelo essencial e ajuste depois.', 'Upload', 'first_import', 1),
('extrato', 'import_classification', 'Classificação Inteligente', 'O OIK aprende com suas escolhas. Quanto mais você usa, mais preciso fica.', 'Brain', NULL, 2),
('extrato', 'credit_vs_income', 'Crédito ≠ Receita', 'Nem todo crédito na conta é receita. Reembolsos e transferências são diferentes.', 'ArrowLeftRight', NULL, 3),

-- Budget
('orcamento', 'budget_intro', 'Orçamento é Clareza', 'Orçamento não é limite rígido. É uma ferramenta para você entender para onde vai o dinheiro.', 'PieChart', 'no_budget', 4),
('orcamento', 'budget_compare', 'Previsto vs Realizado', 'Comparar o planejado com o real ajuda a ajustar sem culpa.', 'BarChart3', NULL, 5),

-- Goals
('metas', 'goals_visibility', 'Metas Visíveis', 'Metas familiares funcionam melhor quando todos podem acompanhar o progresso.', 'Target', 'no_goal', 6),
('metas', 'goals_contribution', 'Contribuições', 'Cada pequena contribuição conta. O progresso visual motiva a continuar.', 'TrendingUp', NULL, 7),

-- Projection
('projecao', 'projection_intro', 'Projeção Financeira', 'O futuro financeiro não é previsão — é decisão. Use a projeção para planejar.', 'Calendar', NULL, 8),

-- Negative balance
('extrato', 'negative_balance', 'Saldo Negativo', 'Saldo negativo não é erro — é sinal. Vamos entender juntos o que aconteceu.', 'AlertCircle', 'negative_balance', 9),

-- Reactivation
('onboarding', 'reactivation', 'Sentimos sua falta', 'Quando estiver pronto, seu histórico continua aqui. Sem pressão.', 'Heart', 'inactive_user', 10);