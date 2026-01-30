-- =====================================================
-- OIK AI Analytics Infrastructure
-- Tabelas e RPC para métricas reais do dashboard OIK AI
-- =====================================================

-- 1. Conversas de IA
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Mensagens de IA
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  response_ms INTEGER, -- tempo de resposta em ms (apenas para assistant)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Feedback de IA
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.ai_messages(id) ON DELETE SET NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Eventos de erro de IA
CREATE TABLE IF NOT EXISTS public.ai_error_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
  user_id UUID,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  route TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_family ON public.ai_conversations(family_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_started_at ON public.ai_conversations(started_at);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON public.ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_conversation ON public.ai_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_error_events_created_at ON public.ai_error_events(created_at);

-- RLS
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_error_events ENABLE ROW LEVEL SECURITY;

-- Políticas para admins
CREATE POLICY "Admins podem ver conversas de IA"
  ON public.ai_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

CREATE POLICY "Admins podem ver mensagens de IA"
  ON public.ai_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

CREATE POLICY "Admins podem ver feedback de IA"
  ON public.ai_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

CREATE POLICY "Admins podem ver erros de IA"
  ON public.ai_error_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.user_id = auth.uid() AND au.is_active = true
    )
  );

-- Políticas para inserção (service role e usuários autenticados)
CREATE POLICY "Usuários podem criar conversas"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem adicionar mensagens"
  ON public.ai_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem dar feedback"
  ON public.ai_feedback FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Sistema pode registrar erros"
  ON public.ai_error_events FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- RPC: get_ai_dashboard_metrics
-- Retorna todas as métricas consolidadas em 1 payload
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_ai_dashboard_metrics(days_back INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  start_date TIMESTAMPTZ;
  prev_start_date TIMESTAMPTZ;
  prev_end_date TIMESTAMPTZ;
  total_convs BIGINT;
  prev_total_convs BIGINT;
  active_users_count BIGINT;
  response_p50 INTEGER;
  satisfaction NUMERIC;
  top_questions JSONB;
  daily_usage JSONB;
  recent_errors JSONB;
  total_tokens_in BIGINT;
  total_tokens_out BIGINT;
BEGIN
  -- Definir janelas de tempo
  start_date := now() - (days_back || ' days')::INTERVAL;
  prev_start_date := start_date - (days_back || ' days')::INTERVAL;
  prev_end_date := start_date;

  -- Total de conversas no período
  SELECT COUNT(*) INTO total_convs
  FROM ai_conversations
  WHERE started_at >= start_date;

  -- Total de conversas no período anterior (para comparação)
  SELECT COUNT(*) INTO prev_total_convs
  FROM ai_conversations
  WHERE started_at >= prev_start_date AND started_at < prev_end_date;

  -- Usuários ativos únicos no período
  SELECT COUNT(DISTINCT user_id) INTO active_users_count
  FROM ai_conversations
  WHERE started_at >= start_date;

  -- P50 do tempo de resposta (mediana)
  SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_ms)::INTEGER, 0)
  INTO response_p50
  FROM ai_messages
  WHERE role = 'assistant' 
    AND response_ms IS NOT NULL
    AND created_at >= start_date;

  -- Taxa de satisfação
  SELECT COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE rating = 'positive')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      1
    ),
    0
  ) INTO satisfaction
  FROM ai_feedback
  WHERE created_at >= start_date;

  -- Top perguntas (primeiras mensagens do usuário em cada conversa)
  SELECT COALESCE(jsonb_agg(q ORDER BY q->>'count' DESC), '[]'::JSONB)
  INTO top_questions
  FROM (
    SELECT jsonb_build_object(
      'question', SUBSTRING(content, 1, 60),
      'count', COUNT(*)
    ) AS q
    FROM (
      SELECT DISTINCT ON (conversation_id) content
      FROM ai_messages
      WHERE role = 'user'
        AND created_at >= start_date
      ORDER BY conversation_id, created_at ASC
    ) first_msgs
    GROUP BY SUBSTRING(content, 1, 60)
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) sub;

  -- Uso diário (últimos N dias)
  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'date' ASC), '[]'::JSONB)
  INTO daily_usage
  FROM (
    SELECT jsonb_build_object(
      'date', to_char(started_at::DATE, 'YYYY-MM-DD'),
      'day', to_char(started_at, 'Dy'),
      'conversations', COUNT(*)
    ) AS d
    FROM ai_conversations
    WHERE started_at >= start_date
    GROUP BY started_at::DATE
    ORDER BY started_at::DATE ASC
  ) sub;

  -- Erros recentes
  SELECT COALESCE(jsonb_agg(e ORDER BY e->>'timestamp' DESC), '[]'::JSONB)
  INTO recent_errors
  FROM (
    SELECT jsonb_build_object(
      'timestamp', to_char(created_at, 'YYYY-MM-DD HH24:MI'),
      'error', error_message,
      'count', COUNT(*) OVER (PARTITION BY error_code)
    ) AS e
    FROM ai_error_events
    WHERE created_at >= start_date
    ORDER BY created_at DESC
    LIMIT 10
  ) sub;

  -- Tokens usados no período
  SELECT 
    COALESCE(SUM(tokens_in), 0),
    COALESCE(SUM(tokens_out), 0)
  INTO total_tokens_in, total_tokens_out
  FROM ai_messages
  WHERE created_at >= start_date;

  -- Montar resultado
  result := jsonb_build_object(
    'total_conversations', total_convs,
    'prev_total_conversations', prev_total_convs,
    'active_users', active_users_count,
    'response_p50_ms', response_p50,
    'satisfaction_rate', satisfaction,
    'tokens_used', total_tokens_in + total_tokens_out,
    'tokens_in', total_tokens_in,
    'tokens_out', total_tokens_out,
    'top_questions', top_questions,
    'daily_usage', daily_usage,
    'recent_errors', recent_errors,
    'period_days', days_back,
    'calculated_at', now()
  );

  RETURN result;
END;
$$;

-- Permitir que admins chamem a RPC
GRANT EXECUTE ON FUNCTION public.get_ai_dashboard_metrics(INTEGER) TO authenticated;