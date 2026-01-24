-- =====================================================
-- MÓDULO DE TECNOLOGIA - SCHEMA
-- =====================================================

-- 1. System health status tracking
CREATE TABLE public.tech_system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'incident')),
  message TEXT,
  uptime_percentage NUMERIC(5,2) DEFAULT 100.00,
  avg_response_ms INTEGER DEFAULT 0,
  errors_last_hour INTEGER DEFAULT 0,
  errors_last_24h INTEGER DEFAULT 0,
  last_incident_at TIMESTAMPTZ,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Unified error/log tracking
CREATE TABLE public.tech_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  origin TEXT NOT NULL CHECK (origin IN ('frontend', 'backend', 'edge_function', 'database')),
  level TEXT NOT NULL CHECK (level IN ('error', 'warning', 'info', 'debug')),
  service TEXT NOT NULL,
  module TEXT,
  message TEXT NOT NULL,
  stack_trace TEXT,
  correlation_id TEXT,
  request_id TEXT,
  route TEXT,
  user_id_masked TEXT,
  family_id_masked TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Integration management
CREATE TABLE public.tech_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unstable', 'inactive', 'maintenance')),
  environment TEXT NOT NULL DEFAULT 'production',
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  total_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. API Keys management (secure)
CREATE TABLE public.tech_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_suffix TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  revoked_by UUID,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Feature flags
CREATE TABLE public.tech_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'all' CHECK (environment IN ('all', 'production', 'staging', 'development')),
  target_roles TEXT[] DEFAULT '{}',
  target_families TEXT[] DEFAULT '{}',
  rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Performance metrics cache
CREATE TABLE public.tech_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('endpoint', 'page', 'function', 'query')),
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  avg_duration_ms INTEGER DEFAULT 0,
  p95_duration_ms INTEGER DEFAULT 0,
  p99_duration_ms INTEGER DEFAULT 0,
  call_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Tech audit log (immutable)
CREATE TABLE public.tech_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable RLS
ALTER TABLE public.tech_system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tech_audit_log ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies using existing has_tech_access function
CREATE POLICY "Tech can view system health" ON public.tech_system_health FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can manage system health" ON public.tech_system_health FOR ALL TO authenticated USING (public.has_tech_access(auth.uid()));

CREATE POLICY "Tech can view logs" ON public.tech_logs FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can insert logs" ON public.tech_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Tech can view integrations" ON public.tech_integrations FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can manage integrations" ON public.tech_integrations FOR ALL TO authenticated USING (public.has_tech_access(auth.uid()));

CREATE POLICY "Tech can view api keys" ON public.tech_api_keys FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can manage api keys" ON public.tech_api_keys FOR ALL TO authenticated USING (public.has_tech_access(auth.uid()));

CREATE POLICY "Tech can view feature flags" ON public.tech_feature_flags FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can manage feature flags" ON public.tech_feature_flags FOR ALL TO authenticated USING (public.has_tech_access(auth.uid()));

CREATE POLICY "Tech can view performance metrics" ON public.tech_performance_metrics FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can insert performance metrics" ON public.tech_performance_metrics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Tech can view audit logs" ON public.tech_audit_log FOR SELECT TO authenticated USING (public.has_tech_access(auth.uid()));
CREATE POLICY "Tech can insert audit logs" ON public.tech_audit_log FOR INSERT TO authenticated WITH CHECK (public.has_tech_access(auth.uid()));

-- 10. Performance indexes
CREATE INDEX idx_tech_logs_created ON public.tech_logs(created_at DESC);
CREATE INDEX idx_tech_logs_level ON public.tech_logs(level);
CREATE INDEX idx_tech_logs_service ON public.tech_logs(service);
CREATE INDEX idx_tech_logs_correlation ON public.tech_logs(correlation_id);
CREATE INDEX idx_tech_integrations_status ON public.tech_integrations(status);
CREATE INDEX idx_tech_api_keys_service ON public.tech_api_keys(service);
CREATE INDEX idx_tech_feature_flags_name ON public.tech_feature_flags(name);
CREATE INDEX idx_tech_performance_period ON public.tech_performance_metrics(period_start, period_end);
CREATE INDEX idx_tech_audit_created ON public.tech_audit_log(created_at DESC);

-- 11. Updated_at triggers
CREATE TRIGGER update_tech_integrations_updated_at BEFORE UPDATE ON public.tech_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tech_api_keys_updated_at BEFORE UPDATE ON public.tech_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tech_feature_flags_updated_at BEFORE UPDATE ON public.tech_feature_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Insert default integrations
INSERT INTO public.tech_integrations (name, display_name, description, is_critical) VALUES
  ('openfinance', 'Open Finance', 'Integração com instituições financeiras via Pluggy', true),
  ('notifications', 'Notificações Push', 'Serviço de notificações push', false),
  ('email', 'E-mail (Resend)', 'Envio de e-mails transacionais', true),
  ('storage', 'Storage', 'Armazenamento de arquivos', true),
  ('ai_reports', 'Relatórios IA', 'Geração de relatórios com IA', false);