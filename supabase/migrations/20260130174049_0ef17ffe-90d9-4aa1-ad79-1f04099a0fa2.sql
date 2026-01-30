-- Fix the GROUP BY issue in get_ai_dashboard_metrics
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
  start_date := now() - (days_back || ' days')::INTERVAL;
  prev_start_date := start_date - (days_back || ' days')::INTERVAL;
  prev_end_date := start_date;

  SELECT COUNT(*) INTO total_convs FROM ai_conversations WHERE started_at >= start_date;
  SELECT COUNT(*) INTO prev_total_convs FROM ai_conversations WHERE started_at >= prev_start_date AND started_at < prev_end_date;
  SELECT COUNT(DISTINCT user_id) INTO active_users_count FROM ai_conversations WHERE started_at >= start_date;
  SELECT COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_ms)::INTEGER, 0) INTO response_p50
  FROM ai_messages WHERE role = 'assistant' AND response_ms IS NOT NULL AND created_at >= start_date;

  SELECT COALESCE(ROUND((COUNT(*) FILTER (WHERE rating = 'positive')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 1), 0)
  INTO satisfaction FROM ai_feedback WHERE created_at >= start_date;

  SELECT COALESCE(jsonb_agg(q ORDER BY (q->>'count')::int DESC), '[]'::JSONB) INTO top_questions
  FROM (
    SELECT jsonb_build_object('question', SUBSTRING(content, 1, 60), 'count', COUNT(*)) AS q
    FROM (SELECT DISTINCT ON (conversation_id) content FROM ai_messages WHERE role = 'user' AND created_at >= start_date ORDER BY conversation_id, created_at ASC) first_msgs
    GROUP BY SUBSTRING(content, 1, 60) ORDER BY COUNT(*) DESC LIMIT 5
  ) sub;

  SELECT COALESCE(jsonb_agg(d ORDER BY d->>'date' ASC), '[]'::JSONB) INTO daily_usage
  FROM (
    SELECT jsonb_build_object('date', to_char(day_date, 'YYYY-MM-DD'), 'day', to_char(day_date, 'Dy'), 'conversations', cnt) AS d
    FROM (SELECT started_at::DATE AS day_date, COUNT(*) AS cnt FROM ai_conversations WHERE started_at >= start_date GROUP BY started_at::DATE) daily
  ) sub;

  SELECT COALESCE(jsonb_agg(e ORDER BY e->>'timestamp' DESC), '[]'::JSONB) INTO recent_errors
  FROM (
    SELECT jsonb_build_object('timestamp', to_char(created_at, 'YYYY-MM-DD HH24:MI'), 'error', error_message, 'count', 1) AS e
    FROM ai_error_events WHERE created_at >= start_date ORDER BY created_at DESC LIMIT 10
  ) sub;

  SELECT COALESCE(SUM(tokens_in), 0), COALESCE(SUM(tokens_out), 0) INTO total_tokens_in, total_tokens_out
  FROM ai_messages WHERE created_at >= start_date;

  result := jsonb_build_object(
    'total_conversations', total_convs, 'prev_total_conversations', prev_total_convs,
    'active_users', active_users_count, 'response_p50_ms', response_p50,
    'satisfaction_rate', satisfaction, 'tokens_used', total_tokens_in + total_tokens_out,
    'tokens_in', total_tokens_in, 'tokens_out', total_tokens_out,
    'top_questions', top_questions, 'daily_usage', daily_usage, 'recent_errors', recent_errors,
    'period_days', days_back, 'calculated_at', now()
  );
  RETURN result;
END;
$$;