-- =============================================
-- EMAIL SYSTEM v3: Preferências, Logs e Eventos
-- =============================================

-- 1. ENUM para tipos de evento de email
DO $$ BEGIN
  CREATE TYPE email_event_type AS ENUM (
    'user.account_created',
    'user.email_confirmed',
    'user.password_reset_requested',
    'user.password_changed',
    'user.login_new_device',
    'onboarding.completed',
    'onboarding.incomplete_24h',
    'onboarding.incomplete_72h',
    'budget.first_created',
    'budget.skipped',
    'family.invite_sent',
    'budget.category_exceeded',
    'budget.if_zeroed',
    'spending.decrease_detected',
    'spending.increase_detected',
    'spending.no_activity_7d',
    'goal.created',
    'goal.progress_25',
    'goal.progress_50',
    'goal.progress_75',
    'goal.completed',
    'goal.at_risk',
    'goal.abandoned',
    'behavior.pattern_changed',
    'behavior.low_activity',
    'behavior.month_balanced',
    'behavior.month_above_average',
    'family.invite_accepted',
    'family.invite_expired',
    'family.permission_changed',
    'family.member_removed',
    'family.sensitive_action',
    'education.content_released',
    'plan.upgraded',
    'plan.downgraded',
    'plan.payment_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. ENUM para categorias de preferência
DO $$ BEGIN
  CREATE TYPE email_preference_category AS ENUM (
    'security',
    'financial',
    'goals',
    'education'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tabela de preferências de email por usuário
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  security_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  financial_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  goals_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  education_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, family_id)
);

-- 4. Tabela de log de emails enviados
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  event_type email_event_type NOT NULL,
  category email_preference_category NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  blocked_reason TEXT,
  metadata JSONB DEFAULT '{}',
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- 5. Tabela de eventos pendentes (queue)
CREATE TABLE IF NOT EXISTS public.email_events_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  event_type email_event_type NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- 6. Índices
CREATE INDEX IF NOT EXISTS idx_email_preferences_user ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_family ON email_preferences(family_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON email_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_event_type ON email_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_queue_pending ON email_events_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_events_queue(user_id, event_type, created_at DESC);

-- 7. RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events_queue ENABLE ROW LEVEL SECURITY;

-- 8. Policies para email_preferences
DROP POLICY IF EXISTS "Users can view own email preferences" ON email_preferences;
DROP POLICY IF EXISTS "Users can update own email preferences" ON email_preferences;
DROP POLICY IF EXISTS "Users can insert own email preferences" ON email_preferences;

CREATE POLICY "Users can view own email preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND security_enabled = TRUE);

CREATE POLICY "Users can insert own email preferences"
  ON email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id AND security_enabled = TRUE);

-- 9. Policies para email_logs (usando valores corretos de admin_role: MASTER, CS, ADMIN, LEGAL)
DROP POLICY IF EXISTS "Users can view own email logs" ON email_logs;
DROP POLICY IF EXISTS "Admins can view family email logs" ON email_logs;

CREATE POLICY "Users can view own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view family email logs"
  ON email_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
      AND au.is_active = TRUE
      AND au.admin_role IN ('MASTER', 'CS', 'ADMIN')
    )
  );

-- 10. Policy para queue (apenas service role)
DROP POLICY IF EXISTS "System can manage email queue" ON email_events_queue;
CREATE POLICY "System can manage email queue"
  ON email_events_queue FOR ALL
  USING (FALSE) WITH CHECK (FALSE);

-- 11. Função de rate limiting
CREATE OR REPLACE FUNCTION check_email_rate_limit(
  p_user_id UUID,
  p_event_type email_event_type,
  p_category email_preference_category
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emails_this_week INT;
  v_last_same_event TIMESTAMPTZ;
BEGIN
  IF p_category = 'security' THEN
    RETURN jsonb_build_object('allowed', TRUE, 'reason', 'security_bypass');
  END IF;
  
  SELECT COUNT(*) INTO v_emails_this_week
  FROM email_logs
  WHERE user_id = p_user_id
    AND status = 'sent'
    AND category != 'security'
    AND created_at > now() - INTERVAL '7 days';
  
  IF v_emails_this_week >= 3 THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'weekly_limit_reached',
      'emails_sent_this_week', v_emails_this_week
    );
  END IF;
  
  SELECT MAX(sent_at) INTO v_last_same_event
  FROM email_logs
  WHERE user_id = p_user_id
    AND event_type = p_event_type
    AND status = 'sent'
    AND sent_at > now() - INTERVAL '7 days';
  
  IF v_last_same_event IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'reason', 'duplicate_within_7_days',
      'last_sent', v_last_same_event
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', TRUE,
    'emails_sent_this_week', v_emails_this_week
  );
END;
$$;

-- 12. Função para verificar preferências
CREATE OR REPLACE FUNCTION check_email_preference(
  p_user_id UUID,
  p_family_id UUID,
  p_category email_preference_category
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  IF p_category = 'security' THEN
    RETURN TRUE;
  END IF;
  
  SELECT
    CASE p_category
      WHEN 'financial' THEN financial_enabled
      WHEN 'goals' THEN goals_enabled
      WHEN 'education' THEN education_enabled
      ELSE TRUE
    END INTO v_enabled
  FROM email_preferences
  WHERE user_id = p_user_id
    AND (family_id = p_family_id OR p_family_id IS NULL);
  
  RETURN COALESCE(v_enabled, TRUE);
END;
$$;

-- 13. Função para mapear evento para categoria
CREATE OR REPLACE FUNCTION get_email_category(p_event_type email_event_type)
RETURNS email_preference_category
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN p_event_type IN (
      'user.account_created', 'user.email_confirmed',
      'user.password_reset_requested', 'user.password_changed',
      'user.login_new_device'
    ) THEN 'security'::email_preference_category
    WHEN p_event_type IN (
      'budget.category_exceeded', 'budget.if_zeroed',
      'spending.decrease_detected', 'spending.increase_detected',
      'spending.no_activity_7d', 'budget.first_created', 'budget.skipped'
    ) THEN 'financial'::email_preference_category
    WHEN p_event_type IN (
      'goal.created', 'goal.progress_25', 'goal.progress_50',
      'goal.progress_75', 'goal.completed', 'goal.at_risk',
      'goal.abandoned', 'behavior.pattern_changed', 'behavior.low_activity',
      'behavior.month_balanced', 'behavior.month_above_average'
    ) THEN 'goals'::email_preference_category
    ELSE 'education'::email_preference_category
  END;
END;
$$;

-- 14. Função para enfileirar evento
CREATE OR REPLACE FUNCTION queue_email_event(
  p_user_id UUID,
  p_family_id UUID,
  p_event_type email_event_type,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO email_events_queue (user_id, family_id, event_type, payload)
  VALUES (p_user_id, p_family_id, p_event_type, p_payload)
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- 15. Comentários
COMMENT ON TABLE email_preferences IS 'Preferências de email por usuário/família. Segurança sempre ativo.';
COMMENT ON TABLE email_logs IS 'Log de todos os emails enviados para auditoria e rate limiting.';
COMMENT ON TABLE email_events_queue IS 'Fila de eventos pendentes de processamento de email.';