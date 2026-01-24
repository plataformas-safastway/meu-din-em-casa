import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// =====================================================
// Types
// =====================================================

export interface SupportError {
  id: string;
  family_id: string | null;
  user_id: string | null;
  error_type: string;
  error_code: string | null;
  error_message: string;
  error_stack: string | null;
  module: string | null;
  screen: string | null;
  user_action: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  status: 'new' | 'analyzing' | 'resolved' | 'wont_fix';
  resolved_at: string | null;
  resolved_by: string | null;
  internal_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SupportSession {
  id: string;
  support_user_id: string;
  target_family_id: string;
  target_user_id: string | null;
  session_type: 'view_only' | 'assisted_edit';
  reason: string;
  screens_visited: string[];
  actions_performed: unknown[];
  started_at: string;
  ended_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface SupportNote {
  id: string;
  family_id: string;
  created_by: string;
  note: string;
  note_type: 'general' | 'error' | 'followup' | 'resolved';
  is_pinned: boolean;
  created_at: string;
}

export interface SupportAuditLog {
  id: string;
  user_id: string;
  action: string;
  target_family_id: string | null;
  target_error_id: string | null;
  target_session_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ErrorFilters {
  status?: string;
  error_type?: string;
  module?: string;
  family_id?: string;
  startDate?: string;
  endDate?: string;
}

// =====================================================
// Queries
// =====================================================

export function useSupportErrors(filters: ErrorFilters = {}, page: number = 0, pageSize: number = 20) {
  return useQuery({
    queryKey: ['support-errors', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('support_errors')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.error_type) {
        query = query.eq('error_type', filters.error_type);
      }
      if (filters.module) {
        query = query.eq('module', filters.module);
      }
      if (filters.family_id) {
        query = query.eq('family_id', filters.family_id);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { errors: data as SupportError[], total: count ?? 0 };
    },
    staleTime: 30 * 1000,
  });
}

export function useSupportError(errorId: string | null) {
  return useQuery({
    queryKey: ['support-error', errorId],
    queryFn: async () => {
      if (!errorId) return null;

      const { data, error } = await supabase
        .from('support_errors')
        .select('*')
        .eq('id', errorId)
        .single();

      if (error) throw error;
      return data as SupportError;
    },
    enabled: !!errorId,
  });
}

export function useSupportSessions(familyId?: string) {
  return useQuery({
    queryKey: ['support-sessions', familyId],
    queryFn: async () => {
      let query = supabase
        .from('support_sessions')
        .select('*')
        .order('started_at', { ascending: false });

      if (familyId) {
        query = query.eq('target_family_id', familyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SupportSession[];
    },
    staleTime: 30 * 1000,
  });
}

export function useSupportNotes(familyId: string | null) {
  return useQuery({
    queryKey: ['support-notes', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('support_notes')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportNote[];
    },
    enabled: !!familyId,
  });
}

export function useSupportAuditLogs(filters: { userId?: string; action?: string } = {}, page: number = 0, pageSize: number = 50) {
  return useQuery({
    queryKey: ['support-audit-logs', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('support_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { logs: data as SupportAuditLog[], total: count ?? 0 };
    },
    staleTime: 30 * 1000,
  });
}

// Query active users with recent activity for support list
export function useSupportUsersList(page: number = 0, pageSize: number = 20, search?: string) {
  return useQuery({
    queryKey: ['support-users-list', page, pageSize, search],
    queryFn: async () => {
      let query = supabase
        .from('family_members')
        .select(`
          id,
          user_id,
          family_id,
          display_name,
          avatar_url,
          created_at,
          families!inner (
            id,
            name,
            created_at
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (search) {
        query = query.ilike('display_name', `%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { 
        users: data as Array<{
          id: string;
          user_id: string;
          family_id: string;
          display_name: string;
          avatar_url: string | null;
          created_at: string;
          families: {
            id: string;
            name: string;
            created_at: string;
          };
        }>, 
        total: count ?? 0 
      };
    },
    staleTime: 30 * 1000,
  });
}

// =====================================================
// Mutations
// =====================================================

export function useUpdateErrorStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ errorId, status, notes }: { errorId: string; status: string; notes?: string }) => {
      const updateData: Record<string, unknown> = {
        status,
        internal_notes: notes,
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { data, error } = await supabase
        .from('support_errors')
        .update(updateData)
        .eq('id', errorId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('support_audit_log').insert({
        user_id: user?.id,
        action: 'update_error',
        target_error_id: errorId,
        details: { status, notes },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-errors'] });
      queryClient.invalidateQueries({ queryKey: ['support-error'] });
    },
  });
}

export function useStartSupportSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ familyId, reason }: { familyId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('support_sessions')
        .insert({
          support_user_id: user?.id,
          target_family_id: familyId,
          reason,
          session_type: 'view_only',
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('support_audit_log').insert({
        user_id: user?.id,
        action: 'start_session',
        target_family_id: familyId,
        target_session_id: data.id,
        details: { reason },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-sessions'] });
    },
  });
}

export function useEndSupportSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sessionId, screensVisited }: { sessionId: string; screensVisited?: string[] }) => {
      const { data, error } = await supabase
        .from('support_sessions')
        .update({
          ended_at: new Date().toISOString(),
          screens_visited: screensVisited || [],
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('support_audit_log').insert({
        user_id: user?.id,
        action: 'end_session',
        target_session_id: sessionId,
        target_family_id: data.target_family_id,
        details: { screens_visited: screensVisited },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-sessions'] });
    },
  });
}

export function useAddSupportNote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ familyId, note, noteType, isPinned }: { 
      familyId: string; 
      note: string; 
      noteType?: string;
      isPinned?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('support_notes')
        .insert({
          family_id: familyId,
          created_by: user?.id,
          note,
          note_type: noteType || 'general',
          is_pinned: isPinned || false,
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('support_audit_log').insert({
        user_id: user?.id,
        action: 'add_note',
        target_family_id: familyId,
        details: { note_type: noteType },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['support-notes', variables.familyId] });
    },
  });
}

export function useLogSupportAudit() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ action, details, familyId, errorId, sessionId }: {
      action: string;
      details?: Record<string, unknown>;
      familyId?: string;
      errorId?: string;
      sessionId?: string;
    }) => {
      const { error } = await supabase.from('support_audit_log').insert({
        user_id: user?.id ?? '',
        action,
        target_family_id: familyId ?? null,
        target_error_id: errorId ?? null,
        target_session_id: sessionId ?? null,
        details: details ? JSON.parse(JSON.stringify(details)) : {},
      });

      if (error) throw error;
    },
  });
}

// =====================================================
// Error reporting utility (for frontend error capture)
// =====================================================

export async function reportError(options: {
  errorMessage: string;
  errorStack?: string;
  errorType?: string;
  errorCode?: string;
  module?: string;
  screen?: string;
  userAction?: string;
  metadata?: Record<string, unknown>;
}) {
  const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const browser = navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)/)?.[1] || 'Unknown';
  const os = navigator.platform;

  try {
    const insertData = {
      error_message: options.errorMessage,
      error_stack: options.errorStack?.substring(0, 5000) ?? null,
      error_type: options.errorType || 'ui',
      error_code: options.errorCode ?? null,
      module: options.module ?? null,
      screen: options.screen || window.location.pathname,
      user_action: options.userAction ?? null,
      device_type: deviceType,
      browser,
      os,
      metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : {},
    };

    const { error } = await supabase.from('support_errors').insert(insertData);

    if (error) {
      console.error('[reportError] Failed to report error:', error);
    }
  } catch (e) {
    console.error('[reportError] Exception while reporting:', e);
  }
}
