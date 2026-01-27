-- Create enum for integration providers
CREATE TYPE public.integration_provider AS ENUM ('OPEN_FINANCE', 'ACQUIRER', 'RESEND');

-- Create enum for integration status
CREATE TYPE public.integration_status AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING', 'ERROR');

-- Create integrations config table
CREATE TABLE public.integrations_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider integration_provider NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  status integration_status DEFAULT 'PENDING',
  last_test_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create daily metrics table for integrations
CREATE TABLE public.integrations_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider integration_provider NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider, metric_date, metric_key)
);

-- Enable RLS
ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations_metrics_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for integrations_config (only ADMIN/MASTER can manage)
CREATE POLICY "Admin can view integrations config"
ON public.integrations_config FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND admin_role IN ('ADMIN', 'MASTER')
  )
);

CREATE POLICY "Admin can insert integrations config"
ON public.integrations_config FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND admin_role IN ('ADMIN', 'MASTER')
  )
);

CREATE POLICY "Admin can update integrations config"
ON public.integrations_config FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND admin_role IN ('ADMIN', 'MASTER')
  )
);

-- CS can view metrics but not edit
CREATE POLICY "CS can view integrations metrics"
ON public.integrations_metrics_daily FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

CREATE POLICY "Admin can manage integrations metrics"
ON public.integrations_metrics_daily FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
    AND is_active = true
    AND admin_role IN ('ADMIN', 'MASTER')
  )
);

-- Insert default configs for each provider
INSERT INTO public.integrations_config (provider, is_enabled, status)
VALUES 
  ('OPEN_FINANCE', false, 'PENDING'),
  ('ACQUIRER', false, 'PENDING'),
  ('RESEND', false, 'PENDING');

-- Trigger to update updated_at
CREATE TRIGGER update_integrations_config_updated_at
  BEFORE UPDATE ON public.integrations_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for metrics queries
CREATE INDEX idx_integrations_metrics_provider_date 
ON public.integrations_metrics_daily(provider, metric_date DESC);

COMMENT ON TABLE public.integrations_config IS 'Central configuration for all external integrations';
COMMENT ON TABLE public.integrations_metrics_daily IS 'Daily aggregated metrics for integrations';