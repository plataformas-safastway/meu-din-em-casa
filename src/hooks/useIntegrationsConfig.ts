import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import type { Json } from '@/integrations/supabase/types';

// =====================================================
// Types
// =====================================================

export type IntegrationProvider = 'OPEN_FINANCE' | 'ACQUIRER' | 'RESEND' | 'ENOTAS';
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'ERROR';

export interface IntegrationConfig {
  id: string;
  provider: IntegrationProvider;
  is_enabled: boolean;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_test_at: string | null;
  last_success_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface IntegrationMetric {
  id: string;
  provider: IntegrationProvider;
  metric_date: string;
  metric_key: string;
  metric_value: number;
  created_at: string;
}

export interface IntegrationLogEntry {
  id: string;
  event_type: string;
  created_at: string;
  metadata_safe: Record<string, unknown> | null;
  actor_role?: string;
}

// Provider-specific config types
export interface OpenFinanceConfig {
  pluggy_client_id?: string;
  pluggy_client_secret_configured?: boolean;
  webhook_url?: string;
}

export interface AcquirerConfig {
  provider_name?: string;
  merchant_id?: string;
  api_key_configured?: boolean;
}

export interface ResendConfig {
  api_key_configured?: boolean;
  from_email?: string;
  from_name?: string;
}

export interface EnotasConfig {
  api_key_configured?: boolean;
  empresa_id?: string;
  ambiente?: 'producao' | 'homologacao';
}

// =====================================================
// Queries
// =====================================================

export function useIntegrationsConfig() {
  return useQuery({
    queryKey: ['integrations-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .order('provider');

      if (error) throw error;
      return (data || []) as IntegrationConfig[];
    },
    staleTime: 30 * 1000,
  });
}

export function useIntegrationConfig(provider: IntegrationProvider) {
  return useQuery({
    queryKey: ['integration-config', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations_config')
        .select('*')
        .eq('provider', provider)
        .maybeSingle();

      if (error) throw error;
      return data as IntegrationConfig | null;
    },
    staleTime: 30 * 1000,
  });
}

export function useIntegrationMetrics(
  provider: IntegrationProvider,
  period: 'today' | '7d' | '30d' | 'month' = '7d'
) {
  return useQuery({
    queryKey: ['integration-metrics', provider, period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('integrations_metrics_daily')
        .select('*')
        .eq('provider', provider)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (error) throw error;
      return (data || []) as IntegrationMetric[];
    },
    staleTime: 60 * 1000,
  });
}

export function useIntegrationLogs(provider?: IntegrationProvider) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['integration-logs', provider],
    queryFn: async () => {
      let query = supabase
        .from('dashboard_audit_logs')
        .select('*')
        .ilike('event_type', 'INTEGRATION_%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (provider) {
        query = query.contains('metadata_safe', { provider });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as IntegrationLogEntry[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

// =====================================================
// Mutations
// =====================================================

export function useUpdateIntegrationConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: role } = useUserRole();

  return useMutation({
    mutationFn: async ({
      provider,
      config,
      is_enabled,
    }: {
      provider: IntegrationProvider;
      config?: Record<string, unknown>;
      is_enabled?: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const updateData: Record<string, unknown> = {
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      if (config !== undefined) {
        updateData.config = config;
      }
      if (is_enabled !== undefined) {
        updateData.is_enabled = is_enabled;
        updateData.status = is_enabled ? 'ACTIVE' : 'INACTIVE';
      }

      const { data, error } = await supabase
        .from('integrations_config')
        .update(updateData)
        .eq('provider', provider)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_dashboard_access', {
        _actor_id: user.id,
        _actor_role: role || 'unknown',
        _event_type: 'INTEGRATION_CONFIG_UPDATED',
        _family_id: null,
        _target_user_id: null,
        _ip_address: null,
        _metadata: {
          provider,
          fields_updated: Object.keys(updateData).filter(k => k !== 'updated_by' && k !== 'updated_at'),
        } as Json,
      });

      return data;
    },
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: ['integrations-config'] });
      queryClient.invalidateQueries({ queryKey: ['integration-config', provider] });
    },
  });
}

export function useTestIntegrationConnection() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: role } = useUserRole();

  return useMutation({
    mutationFn: async (provider: IntegrationProvider) => {
      if (!user) throw new Error('User not authenticated');

      // Test connection based on provider
      let success = false;
      let errorMessage: string | null = null;

      try {
        switch (provider) {
          case 'OPEN_FINANCE':
            // Call pluggy-check-config edge function
            const { data: pluggyResult, error: pluggyError } = await supabase.functions.invoke('pluggy-check-config');
            if (pluggyError) throw pluggyError;
            success = pluggyResult?.configured ?? false;
            if (!success) errorMessage = 'Credenciais Pluggy não configuradas';
            break;

          case 'RESEND':
            // Check if RESEND_API_KEY is configured by calling a test edge function
            // For now, mark as needing configuration
            success = false;
            errorMessage = 'Teste de conexão não implementado';
            break;

          case 'ACQUIRER':
            // Check acquirer configuration
            success = false;
            errorMessage = 'Teste de conexão não implementado';
            break;

          case 'ENOTAS':
            // Check eNotas configuration
            success = false;
            errorMessage = 'Teste de conexão não implementado';
            break;
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      }

      // Update config with test result
      const { data, error } = await supabase
        .from('integrations_config')
        .update({
          last_test_at: new Date().toISOString(),
          last_success_at: success ? new Date().toISOString() : undefined,
          status: success ? 'ACTIVE' : 'ERROR',
          error_message: errorMessage,
        })
        .eq('provider', provider)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_dashboard_access', {
        _actor_id: user.id,
        _actor_role: role || 'unknown',
        _event_type: 'INTEGRATION_TEST_RUN',
        _family_id: null,
        _target_user_id: null,
        _ip_address: null,
        _metadata: {
          provider,
          success,
        } as Json,
      });

      return { success, errorMessage, data };
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ['integrations-config'] });
      queryClient.invalidateQueries({ queryKey: ['integration-config', provider] });
    },
  });
}

export function useToggleIntegration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: role } = useUserRole();

  return useMutation({
    mutationFn: async ({
      provider,
      enabled,
    }: {
      provider: IntegrationProvider;
      enabled: boolean;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('integrations_config')
        .update({
          is_enabled: enabled,
          status: enabled ? 'ACTIVE' : 'INACTIVE',
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('provider', provider)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.rpc('log_dashboard_access', {
        _actor_id: user.id,
        _actor_role: role || 'unknown',
        _event_type: enabled ? 'INTEGRATION_ENABLED' : 'INTEGRATION_DISABLED',
        _family_id: null,
        _target_user_id: null,
        _ip_address: null,
        _metadata: { provider } as Json,
      });

      return data;
    },
    onSuccess: (_, { provider }) => {
      queryClient.invalidateQueries({ queryKey: ['integrations-config'] });
      queryClient.invalidateQueries({ queryKey: ['integration-config', provider] });
    },
  });
}

// =====================================================
// Utility functions
// =====================================================

export function getIntegrationStatusColor(status: IntegrationStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'INACTIVE':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'ERROR':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getIntegrationStatusLabel(status: IntegrationStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Ativo';
    case 'INACTIVE':
      return 'Inativo';
    case 'PENDING':
      return 'Configuração pendente';
    case 'ERROR':
      return 'Erro';
    default:
      return status;
  }
}

export function getProviderDisplayName(provider: IntegrationProvider): string {
  switch (provider) {
    case 'OPEN_FINANCE':
      return 'Open Finance';
    case 'ACQUIRER':
      return 'Adquirentes';
    case 'RESEND':
      return 'Resend (E-mail)';
    case 'ENOTAS':
      return 'eNotas';
    default:
      return provider;
  }
}

// Aggregate metrics by key
export function aggregateMetrics(metrics: IntegrationMetric[]): Record<string, number> {
  return metrics.reduce((acc, m) => {
    acc[m.metric_key] = (acc[m.metric_key] || 0) + Number(m.metric_value);
    return acc;
  }, {} as Record<string, number>);
}

// Get latest metric value for each key
export function getLatestMetrics(metrics: IntegrationMetric[]): Record<string, { value: number; date: string }> {
  const sorted = [...metrics].sort((a, b) => 
    new Date(b.metric_date).getTime() - new Date(a.metric_date).getTime()
  );
  
  const latest: Record<string, { value: number; date: string }> = {};
  for (const m of sorted) {
    if (!latest[m.metric_key]) {
      latest[m.metric_key] = { value: Number(m.metric_value), date: m.metric_date };
    }
  }
  return latest;
}
