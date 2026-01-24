import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// =====================================================
// Types
// =====================================================

export type SystemStatus = 'ok' | 'warning' | 'incident';
export type LogLevel = 'error' | 'warning' | 'info' | 'debug';
export type LogOrigin = 'frontend' | 'backend' | 'edge_function' | 'database';
export type IntegrationStatus = 'active' | 'unstable' | 'inactive' | 'maintenance';
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

export interface SystemHealth {
  id: string;
  status: SystemStatus;
  message: string | null;
  uptime_percentage: number;
  avg_response_ms: number;
  errors_last_hour: number;
  errors_last_24h: number;
  last_incident_at: string | null;
  checked_at: string;
}

export interface TechLog {
  id: string;
  environment: string;
  origin: LogOrigin;
  level: LogLevel;
  service: string;
  module: string | null;
  message: string;
  stack_trace: string | null;
  correlation_id: string | null;
  request_id: string | null;
  route: string | null;
  user_id_masked: string | null;
  family_id_masked: string | null;
  context: Record<string, unknown>;
  created_at: string;
}

export interface Integration {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  status: IntegrationStatus;
  environment: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  success_rate: number;
  total_calls: number;
  failed_calls: number;
  config: Record<string, unknown>;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  name: string;
  service: string;
  key_prefix: string;
  key_suffix: string;
  environment: string;
  status: ApiKeyStatus;
  expires_at: string | null;
  last_used_at: string | null;
  created_by: string;
  revoked_by: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_enabled: boolean;
  environment: string;
  target_roles: string[];
  target_families: string[];
  rollout_percentage: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetric {
  id: string;
  metric_type: string;
  name: string;
  environment: string;
  avg_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  call_count: number;
  error_count: number;
  period_start: string;
  period_end: string;
}

export interface TechAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// =====================================================
// Queries
// =====================================================

export function useSystemHealth() {
  return useQuery({
    queryKey: ['tech-system-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Return default if no health check exists
      if (!data) {
        return {
          id: 'default',
          status: 'ok' as SystemStatus,
          message: null,
          uptime_percentage: 100,
          avg_response_ms: 0,
          errors_last_hour: 0,
          errors_last_24h: 0,
          last_incident_at: null,
          checked_at: new Date().toISOString(),
        };
      }
      
      return data as SystemHealth;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useTechLogs(
  filters: {
    level?: LogLevel;
    origin?: LogOrigin;
    service?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  page: number = 0,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ['tech-logs', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('tech_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.level) query = query.eq('level', filters.level);
      if (filters.origin) query = query.eq('origin', filters.origin);
      if (filters.service) query = query.eq('service', filters.service);
      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error, count } = await query;
      if (error) throw error;
      return { logs: (data || []) as TechLog[], total: count || 0 };
    },
    staleTime: 15 * 1000,
  });
}

export function useIntegrations() {
  return useQuery({
    queryKey: ['tech-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_integrations')
        .select('*')
        .order('is_critical', { ascending: false })
        .order('display_name');

      if (error) throw error;
      return (data || []) as Integration[];
    },
    staleTime: 60 * 1000,
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['tech-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ApiKey[];
    },
    staleTime: 60 * 1000,
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ['tech-feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tech_feature_flags')
        .select('*')
        .order('name');

      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
    staleTime: 60 * 1000,
  });
}

export function usePerformanceMetrics(period: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['tech-performance-metrics', period],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('tech_performance_metrics')
        .select('*')
        .gte('period_start', startDate.toISOString())
        .order('avg_duration_ms', { ascending: false });

      if (error) throw error;
      return (data || []) as PerformanceMetric[];
    },
    staleTime: 60 * 1000,
  });
}

export function useTechAuditLogs(page: number = 0, pageSize: number = 50) {
  return useQuery({
    queryKey: ['tech-audit-logs', page, pageSize],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('tech_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { logs: (data || []) as TechAuditLog[], total: count || 0 };
    },
    staleTime: 30 * 1000,
  });
}

// =====================================================
// Mutations
// =====================================================

export function useUpdateIntegrationStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: IntegrationStatus }) => {
      const { data: oldData } = await supabase
        .from('tech_integrations')
        .select('status')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('tech_integrations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('tech_audit_log').insert({
        user_id: user?.id ?? '',
        action: 'update_integration_status',
        resource_type: 'integration',
        resource_id: id,
        old_value: { status: oldData?.status },
        new_value: { status },
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-integrations'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const { data, error } = await supabase
        .from('tech_api_keys')
        .update({
          status: 'revoked',
          revoked_by: user?.id,
          revoked_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('tech_audit_log').insert({
        user_id: user?.id ?? '',
        action: 'revoke_api_key',
        resource_type: 'api_key',
        resource_id: keyId,
        old_value: { status: 'active' },
        new_value: { status: 'revoked' },
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-api-keys'] });
    },
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
      const { data, error } = await supabase
        .from('tech_feature_flags')
        .update({
          is_enabled: isEnabled,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('tech_audit_log').insert({
        user_id: user?.id ?? '',
        action: 'toggle_feature_flag',
        resource_type: 'feature_flag',
        resource_id: id,
        old_value: { is_enabled: !isEnabled },
        new_value: { is_enabled: isEnabled },
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-feature-flags'] });
    },
  });
}

export function useCreateFeatureFlag() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (flag: {
      name: string;
      display_name: string;
      description?: string;
      is_enabled?: boolean;
      environment?: string;
      rollout_percentage?: number;
    }) => {
      const { data, error } = await supabase
        .from('tech_feature_flags')
        .insert({
          ...flag,
          created_by: user?.id ?? '',
        } as never)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('tech_audit_log').insert({
        user_id: user?.id ?? '',
        action: 'create_feature_flag',
        resource_type: 'feature_flag',
        resource_id: (data as FeatureFlag).id,
        new_value: flag,
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tech-feature-flags'] });
    },
  });
}

// =====================================================
// Utility functions
// =====================================================

export function getStatusColor(status: SystemStatus | IntegrationStatus): string {
  switch (status) {
    case 'ok':
    case 'active':
      return 'text-green-600 bg-green-100';
    case 'warning':
    case 'unstable':
      return 'text-yellow-600 bg-yellow-100';
    case 'incident':
    case 'inactive':
      return 'text-red-600 bg-red-100';
    case 'maintenance':
      return 'text-blue-600 bg-blue-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function getLevelColor(level: LogLevel): string {
  switch (level) {
    case 'error':
      return 'text-red-600 bg-red-100';
    case 'warning':
      return 'text-yellow-600 bg-yellow-100';
    case 'info':
      return 'text-blue-600 bg-blue-100';
    case 'debug':
      return 'text-gray-600 bg-gray-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}
