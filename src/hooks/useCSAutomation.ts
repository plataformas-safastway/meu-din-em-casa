import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// =====================================================
// Types for CS Automation
// =====================================================

export interface CSBehaviorSignal {
  id: string;
  family_id: string;
  signal_type: 'risk' | 'activation';
  signal_code: string;
  signal_value: Record<string, unknown>;
  detected_at: string;
  is_active: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export interface CSAISuggestion {
  id: string;
  family_id: string;
  suggestion_type: 'education' | 'onboarding' | 'notification' | 'task' | 'follow_up';
  title: string;
  description: string;
  reason: string;
  confidence_score: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'rejected' | 'executed' | 'expired';
  suggested_action: Record<string, unknown>;
  related_signals: string[];
  accepted_by: string | null;
  accepted_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  executed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CSAutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_signal: string;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
  requires_consent: boolean;
  cooldown_hours: number;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CSAutomationExecution {
  id: string;
  family_id: string;
  rule_id: string | null;
  suggestion_id: string | null;
  action_type: string;
  action_payload: Record<string, unknown>;
  triggered_by: 'rule' | 'ai' | 'manual';
  executed_by: string | null;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  result: Record<string, unknown>;
  error_message: string | null;
  consent_verified: boolean;
  created_at: string;
  executed_at: string | null;
}

export interface CSUserPreferences {
  id: string;
  family_id: string;
  allow_smart_tips: boolean;
  allow_notifications: boolean;
  allow_ai_analysis: boolean;
  allow_proactive_contact: boolean;
  updated_at: string;
  updated_by: string | null;
}

// =====================================================
// Queries
// =====================================================

/**
 * Get behavior signals for a family
 */
export function useCSBehaviorSignals(familyId: string | null, activeOnly = true) {
  return useQuery({
    queryKey: ['cs-behavior-signals', familyId, activeOnly],
    queryFn: async () => {
      if (!familyId) return [];

      let query = supabase
        .from('cs_behavior_signals')
        .select('*')
        .eq('family_id', familyId)
        .order('detected_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CSBehaviorSignal[];
    },
    enabled: !!familyId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get AI suggestions for CS team
 */
export function useCSAISuggestions(
  filters: {
    familyId?: string;
    status?: CSAISuggestion['status'];
    priority?: CSAISuggestion['priority'];
  } = {},
  page = 0,
  pageSize = 20
) {
  return useQuery({
    queryKey: ['cs-ai-suggestions', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('cs_ai_suggestions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.familyId) {
        query = query.eq('family_id', filters.familyId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        suggestions: (data || []) as CSAISuggestion[],
        total: count || 0,
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get pending AI suggestions count
 */
export function useCSPendingSuggestionsCount() {
  return useQuery({
    queryKey: ['cs-pending-suggestions-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('cs_ai_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get automation rules
 */
export function useCSAutomationRules(activeOnly = true) {
  return useQuery({
    queryKey: ['cs-automation-rules', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('cs_automation_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CSAutomationRule[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get automation execution history
 */
export function useCSAutomationExecutions(
  filters: { familyId?: string; status?: string } = {},
  page = 0,
  pageSize = 50
) {
  return useQuery({
    queryKey: ['cs-automation-executions', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('cs_automation_executions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters.familyId) {
        query = query.eq('family_id', filters.familyId);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        executions: (data || []) as CSAutomationExecution[],
        total: count || 0,
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get user CS preferences (for current family)
 */
export function useCSUserPreferences(familyId: string | null) {
  return useQuery({
    queryKey: ['cs-user-preferences', familyId],
    queryFn: async () => {
      if (!familyId) return null;

      const { data, error } = await supabase
        .from('cs_user_preferences')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      if (error) throw error;
      return data as CSUserPreferences | null;
    },
    enabled: !!familyId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// Mutations
// =====================================================

/**
 * Trigger AI analysis for a user
 */
export function useTriggerAIAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (familyId: string) => {
      const { data, error } = await supabase.functions.invoke('cs-ai-analyze', {
        body: { familyId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, familyId) => {
      queryClient.invalidateQueries({ queryKey: ['cs-behavior-signals', familyId] });
      queryClient.invalidateQueries({ queryKey: ['cs-ai-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['cs-pending-suggestions-count'] });
      toast.success('Análise IA concluída');
    },
    onError: (error) => {
      console.error('[useTriggerAIAnalysis] Error:', error);
      toast.error('Erro na análise IA');
    },
  });
}

/**
 * Accept an AI suggestion
 */
export function useAcceptSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      suggestionId, 
      customMessage 
    }: { 
      suggestionId: string; 
      customMessage?: string;
    }) => {
      const { data, error } = await supabase
        .from('cs_ai_suggestions')
        .update({
          status: 'accepted',
          accepted_by: user?.id,
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .select()
        .single();

      if (error) throw error;

      // Log the acceptance
      await supabase.from('cs_audit_log').insert({
        user_id: user?.id || '',
        action: 'suggestion_accepted',
        target_family_id: data.family_id,
        details: { suggestion_id: suggestionId, custom_message: customMessage },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-ai-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['cs-pending-suggestions-count'] });
      toast.success('Sugestão aceita');
    },
    onError: (error) => {
      console.error('[useAcceptSuggestion] Error:', error);
      toast.error('Erro ao aceitar sugestão');
    },
  });
}

/**
 * Reject an AI suggestion
 */
export function useRejectSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      suggestionId, 
      reason 
    }: { 
      suggestionId: string; 
      reason: string;
    }) => {
      const { data, error } = await supabase
        .from('cs_ai_suggestions')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .select()
        .single();

      if (error) throw error;

      // Log the rejection
      await supabase.from('cs_audit_log').insert({
        user_id: user?.id || '',
        action: 'suggestion_rejected',
        target_family_id: data.family_id,
        details: { suggestion_id: suggestionId, reason },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-ai-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['cs-pending-suggestions-count'] });
      toast.success('Sugestão ignorada');
    },
    onError: (error) => {
      console.error('[useRejectSuggestion] Error:', error);
      toast.error('Erro ao ignorar sugestão');
    },
  });
}

/**
 * Execute a suggestion action
 */
export function useExecuteSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      suggestionId,
      familyId,
      actionType,
      actionPayload,
    }: { 
      suggestionId: string;
      familyId: string;
      actionType: string;
      actionPayload: Record<string, unknown>;
    }) => {
      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('cs_automation_executions')
        .insert({
          family_id: familyId,
          suggestion_id: suggestionId,
          action_type: actionType,
          action_payload: actionPayload as never,
          triggered_by: 'manual',
          executed_by: user?.id,
          status: 'executed',
          consent_verified: true,
          executed_at: new Date().toISOString(),
        } as never)
        .select()
        .single();

      if (execError) throw execError;

      // Update suggestion status
      await supabase
        .from('cs_ai_suggestions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', suggestionId);

      // Log the execution
      await supabase.from('cs_audit_log').insert({
        user_id: user?.id || '',
        action: 'suggestion_executed',
        target_family_id: familyId,
        details: { suggestion_id: suggestionId, action_type: actionType },
      });

      return execution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-ai-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['cs-automation-executions'] });
      queryClient.invalidateQueries({ queryKey: ['cs-pending-suggestions-count'] });
      toast.success('Ação executada');
    },
    onError: (error) => {
      console.error('[useExecuteSuggestion] Error:', error);
      toast.error('Erro ao executar ação');
    },
  });
}

/**
 * Update automation rule
 */
export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ruleId, 
      updates 
    }: { 
      ruleId: string; 
      updates: Partial<CSAutomationRule>;
    }) => {
      const { data, error } = await supabase
        .from('cs_automation_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-automation-rules'] });
      toast.success('Regra atualizada');
    },
    onError: (error) => {
      console.error('[useUpdateAutomationRule] Error:', error);
      toast.error('Erro ao atualizar regra');
    },
  });
}

/**
 * Update user CS preferences (LGPD consent management)
 */
export function useUpdateCSPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      familyId, 
      preferences 
    }: { 
      familyId: string; 
      preferences: Partial<CSUserPreferences>;
    }) => {
      const { data, error } = await supabase
        .from('cs_user_preferences')
        .upsert({
          family_id: familyId,
          ...preferences,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }, { onConflict: 'family_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { familyId }) => {
      queryClient.invalidateQueries({ queryKey: ['cs-user-preferences', familyId] });
      toast.success('Preferências atualizadas');
    },
    onError: (error) => {
      console.error('[useUpdateCSPreferences] Error:', error);
      toast.error('Erro ao atualizar preferências');
    },
  });
}

/**
 * Resolve a behavior signal
 */
export function useResolveSignal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      signalId, 
      notes 
    }: { 
      signalId: string; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('cs_behavior_signals')
        .update({
          is_active: false,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: notes,
        })
        .eq('id', signalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cs-behavior-signals', data.family_id] });
      toast.success('Sinal resolvido');
    },
    onError: (error) => {
      console.error('[useResolveSignal] Error:', error);
      toast.error('Erro ao resolver sinal');
    },
  });
}
