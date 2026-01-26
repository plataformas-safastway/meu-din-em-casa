import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from './useUserRole';
import type { Json } from '@/integrations/supabase/types';

interface DashboardAuditLog {
  id: string;
  actor_admin_id: string;
  actor_role: string;
  event_type: string;
  family_ref: string | null;
  target_user_ref: string | null;
  ip_ref: string | null;
  metadata_safe: Record<string, unknown>;
  created_at: string;
}

type EventType = 
  | 'FAMILY_PROFILE_VIEWED'
  | 'REPORT_VIEWED'
  | 'EXPORT_REQUESTED'
  | 'LGPD_REQUEST_VIEWED'
  | 'LGPD_REQUEST_UPDATED'
  | 'BREAKGLASS_REQUESTED'
  | 'BREAKGLASS_APPROVED'
  | 'BREAKGLASS_DENIED'
  | 'VAULT_VIEWED'
  | 'EXPORT_CREATED';

export function useDashboardAuditLogs(options?: {
  eventType?: string;
  limit?: number;
}) {
  const { user } = useAuth();
  const limit = options?.limit ?? 100;

  return useQuery({
    queryKey: ['dashboard-audit-logs', options?.eventType, limit],
    queryFn: async (): Promise<DashboardAuditLog[]> => {
      let query = supabase
        .from('dashboard_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.eventType) {
        query = query.ilike('event_type', `${options.eventType}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useDashboardAuditLogs] Error:', error);
        throw error;
      }

      return data as DashboardAuditLog[];
    },
    enabled: !!user,
  });
}

export function useLogDashboardAccess() {
  const { user } = useAuth();
  const { data: role } = useUserRole();

  return useMutation({
    mutationFn: async (params: {
      eventType: EventType;
      familyId?: string;
      targetUserId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('log_dashboard_access', {
        _actor_id: user.id,
        _actor_role: role || 'unknown',
        _event_type: params.eventType,
        _family_id: params.familyId ?? null,
        _target_user_id: params.targetUserId ?? null,
        _ip_address: null,
        _metadata: (params.metadata ?? {}) as Json,
      });

      if (error) throw error;
      return data;
    },
  });
}
