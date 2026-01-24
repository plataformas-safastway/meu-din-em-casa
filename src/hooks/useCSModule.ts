import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// =====================================================
// Types
// =====================================================

export type CSStatus = 'active' | 'onboarding' | 'at_risk' | 'churned' | 'inactive';
export type RiskLevel = 'low' | 'medium' | 'high';
export type CSActionType = 
  | 'status_change' 
  | 'contact_made' 
  | 'guidance_sent' 
  | 'material_shared' 
  | 'campaign_added' 
  | 'note_added' 
  | 'nudge_sent' 
  | 'followup_scheduled';

export interface CSUserStatus {
  id: string;
  family_id: string;
  status: CSStatus;
  assigned_to: string | null;
  risk_level: RiskLevel | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CSAction {
  id: string;
  family_id: string;
  performed_by: string;
  action_type: CSActionType;
  action_details: Record<string, unknown>;
  notes: string | null;
  created_at: string;
}

export interface CSEngagementMetrics {
  id: string;
  family_id: string;
  score: number;
  score_breakdown: {
    login_recency?: number;
    login_frequency?: number;
    has_import?: number;
    has_budget?: number;
    has_goals?: number;
    has_manual_transactions?: number;
  };
  last_login_at: string | null;
  total_logins_30d: number;
  has_import: boolean;
  has_budget: boolean;
  has_goals: boolean;
  has_manual_transactions: boolean;
  calculated_at: string;
}

export interface CSUserData {
  family_id: string;
  family_name: string;
  owner_name: string;
  owner_email?: string;
  created_at: string;
  members_count: number;
  status?: CSUserStatus;
  metrics?: CSEngagementMetrics;
}

export interface CSAuditLog {
  id: string;
  user_id: string;
  action: string;
  target_family_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CSOverviewStats {
  total_users: number;
  active_7d: number;
  active_30d: number;
  inactive: number;
  onboarding: number;
  at_risk: number;
  churned: number;
  no_import: number;
  no_budget: number;
  no_goals: number;
  activation_rate: number;
}

// =====================================================
// Queries
// =====================================================

/**
 * Get CS overview statistics
 */
export function useCSOverview() {
  return useQuery({
    queryKey: ['cs-overview'],
    queryFn: async (): Promise<CSOverviewStats> => {
      // Get all families with their metrics
      const { data: families, error: familiesError } = await supabase
        .from('families')
        .select('id, created_at');

      if (familiesError) throw familiesError;

      const totalUsers = families?.length || 0;

      // Get engagement metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('cs_engagement_metrics')
        .select('*');

      // Get user statuses
      const { data: statuses, error: statusesError } = await supabase
        .from('cs_user_status')
        .select('*');

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Calculate stats
      const metricsMap = new Map((metrics || []).map(m => [m.family_id, m]));
      const statusMap = new Map((statuses || []).map(s => [s.family_id, s]));

      let active7d = 0;
      let active30d = 0;
      let noImport = 0;
      let noBudget = 0;
      let noGoals = 0;
      let inactive = 0;
      let onboarding = 0;
      let atRisk = 0;
      let churned = 0;

      families?.forEach(family => {
        const metric = metricsMap.get(family.id);
        const status = statusMap.get(family.id);

        // Activity based on last login
        if (metric?.last_login_at) {
          const lastLogin = new Date(metric.last_login_at);
          if (lastLogin >= sevenDaysAgo) active7d++;
          if (lastLogin >= thirtyDaysAgo) active30d++;
          else inactive++;
        } else {
          inactive++;
        }

        // Feature usage
        if (!metric?.has_import) noImport++;
        if (!metric?.has_budget) noBudget++;
        if (!metric?.has_goals) noGoals++;

        // CS status
        if (status) {
          if (status.status === 'onboarding') onboarding++;
          if (status.status === 'at_risk') atRisk++;
          if (status.status === 'churned') churned++;
        }
      });

      // Activation = users with at least 1 import or manual transaction
      const activated = (metrics || []).filter(m => m.has_import || m.has_manual_transactions).length;
      const activationRate = totalUsers > 0 ? Math.round((activated / totalUsers) * 100) : 0;

      return {
        total_users: totalUsers,
        active_7d: active7d,
        active_30d: active30d,
        inactive,
        onboarding,
        at_risk: atRisk,
        churned,
        no_import: noImport,
        no_budget: noBudget,
        no_goals: noGoals,
        activation_rate: activationRate,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get users list with engagement data for CS
 */
export function useCSUsersList(
  filters: {
    status?: CSStatus;
    search?: string;
    sortBy?: 'score' | 'last_login' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  } = {},
  page: number = 0,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: ['cs-users-list', filters, page, pageSize],
    queryFn: async () => {
      // Get families with owner info
      let query = supabase
        .from('families')
        .select(`
          id,
          name,
          created_at,
          members_count,
          family_members!inner (
            user_id,
            display_name,
            role
          )
        `, { count: 'exact' })
        .eq('family_members.role', 'owner');

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      // Apply sorting
      const sortField = filters.sortBy === 'score' ? 'created_at' : (filters.sortBy || 'created_at');
      query = query.order(sortField, { ascending: filters.sortOrder === 'asc' });

      // Pagination
      query = query.range(page * pageSize, (page + 1) * pageSize - 1);

      const { data: families, error: familiesError, count } = await query;

      if (familiesError) throw familiesError;

      // Get statuses and metrics for these families
      const familyIds = (families || []).map(f => f.id);
      
      const [statusesResult, metricsResult] = await Promise.all([
        supabase.from('cs_user_status').select('*').in('family_id', familyIds),
        supabase.from('cs_engagement_metrics').select('*').in('family_id', familyIds),
      ]);

      const statusMap = new Map((statusesResult.data || []).map(s => [s.family_id, s]));
      const metricsMap = new Map((metricsResult.data || []).map(m => [m.family_id, m]));

      // Build user data
      const users: CSUserData[] = (families || []).map(family => {
        const owner = Array.isArray(family.family_members) 
          ? family.family_members[0] 
          : family.family_members;
        
        return {
          family_id: family.id,
          family_name: family.name,
          owner_name: owner?.display_name || 'Sem nome',
          created_at: family.created_at,
          members_count: family.members_count,
          status: statusMap.get(family.id) as CSUserStatus | undefined,
          metrics: metricsMap.get(family.id) as CSEngagementMetrics | undefined,
        };
      });

      // Filter by status if specified
      let filteredUsers = users;
      if (filters.status) {
        filteredUsers = users.filter(u => u.status?.status === filters.status);
      }

      // Sort by score if needed
      if (filters.sortBy === 'score') {
        filteredUsers.sort((a, b) => {
          const scoreA = a.metrics?.score || 0;
          const scoreB = b.metrics?.score || 0;
          return filters.sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        });
      }

      return {
        users: filteredUsers,
        total: count || 0,
      };
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get user details for CS view (no sensitive financial data)
 */
export function useCSUserDetails(familyId: string | null) {
  return useQuery({
    queryKey: ['cs-user-details', familyId],
    queryFn: async () => {
      if (!familyId) return null;

      // Get family info
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select(`
          id,
          name,
          created_at,
          members_count,
          family_members (
            id,
            user_id,
            display_name,
            role,
            created_at
          )
        `)
        .eq('id', familyId)
        .single();

      if (familyError) throw familyError;

      // Get CS status
      const { data: status } = await supabase
        .from('cs_user_status')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      // Get engagement metrics
      const { data: metrics } = await supabase
        .from('cs_engagement_metrics')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();

      // Get CS actions history
      const { data: actions } = await supabase
        .from('cs_actions')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Get usage counts (no financial details, just counts)
      const [transactionsResult, importsResult, budgetsResult, goalsResult] = await Promise.all([
        supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
        supabase.from('imports').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
        supabase.from('budgets').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
        supabase.from('goals').select('id', { count: 'exact', head: true }).eq('family_id', familyId),
      ]);

      return {
        family,
        status: status as CSUserStatus | null,
        metrics: metrics as CSEngagementMetrics | null,
        actions: (actions || []) as CSAction[],
        usage: {
          transactions_count: transactionsResult.count || 0,
          imports_count: importsResult.count || 0,
          budgets_count: budgetsResult.count || 0,
          goals_count: goalsResult.count || 0,
        },
      };
    },
    enabled: !!familyId,
  });
}

/**
 * Get CS audit logs (for admin/tech only)
 */
export function useCSAuditLogs(
  filters: { userId?: string; action?: string } = {},
  page: number = 0,
  pageSize: number = 50
) {
  return useQuery({
    queryKey: ['cs-audit-logs', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('cs_audit_log')
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
      return { logs: (data || []) as CSAuditLog[], total: count || 0 };
    },
    staleTime: 30 * 1000,
  });
}

// =====================================================
// Mutations
// =====================================================

/**
 * Update user status (CS workflow)
 */
export function useUpdateCSStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      familyId, 
      status, 
      riskLevel, 
      notes 
    }: { 
      familyId: string; 
      status: CSStatus; 
      riskLevel?: RiskLevel; 
      notes?: string;
    }) => {
      // Upsert status
      const { data, error } = await supabase
        .from('cs_user_status')
        .upsert({
          family_id: familyId,
          status,
          risk_level: riskLevel ?? null,
          notes: notes ?? null,
          assigned_to: user?.id ?? null,
        } as never, { onConflict: 'family_id' })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await supabase.from('cs_actions').insert({
        family_id: familyId,
        performed_by: user?.id ?? '',
        action_type: 'status_change',
        action_details: { new_status: status, risk_level: riskLevel },
        notes,
      } as never);

      // Audit log
      await supabase.from('cs_audit_log').insert({
        user_id: user?.id ?? '',
        action: 'status_change',
        target_family_id: familyId,
        details: { new_status: status, risk_level: riskLevel },
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-users-list'] });
      queryClient.invalidateQueries({ queryKey: ['cs-user-details'] });
      queryClient.invalidateQueries({ queryKey: ['cs-overview'] });
    },
  });
}

/**
 * Register a CS action
 */
export function useRegisterCSAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      familyId,
      actionType,
      details,
      notes,
    }: {
      familyId: string;
      actionType: CSActionType;
      details?: Record<string, unknown>;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('cs_actions')
        .insert({
          family_id: familyId,
          performed_by: user?.id ?? '',
          action_type: actionType,
          action_details: details || {},
          notes,
        } as never)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await supabase.from('cs_audit_log').insert({
        user_id: user?.id ?? '',
        action: `action_${actionType}`,
        target_family_id: familyId,
        details: { action_type: actionType, ...details },
      } as never);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-user-details'] });
    },
  });
}

/**
 * Log CS audit event
 */
export function useLogCSAudit() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      familyId,
      details,
    }: {
      action: string;
      familyId?: string;
      details?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('cs_audit_log').insert({
        user_id: user?.id ?? '',
        action,
        target_family_id: familyId ?? null,
        details: details || {},
      } as never);

      if (error) throw error;
    },
  });
}

// =====================================================
// Score Calculation (Transparent)
// =====================================================

/**
 * Calculate engagement score for a family
 * Score is 0-100, based on clear criteria
 */
export function calculateEngagementScore(metrics: Partial<CSEngagementMetrics> | null): {
  score: number;
  breakdown: Record<string, number>;
  explanation: string[];
} {
  if (!metrics) {
    return {
      score: 0,
      breakdown: {},
      explanation: ['Sem dados de engajamento'],
    };
  }

  const breakdown: Record<string, number> = {};
  const explanation: string[] = [];

  // Login recency (max 25 points)
  if (metrics.last_login_at) {
    const daysSinceLogin = Math.floor(
      (Date.now() - new Date(metrics.last_login_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLogin <= 1) {
      breakdown.login_recency = 25;
      explanation.push('Login hoje ou ontem (+25)');
    } else if (daysSinceLogin <= 7) {
      breakdown.login_recency = 20;
      explanation.push('Login nos últimos 7 dias (+20)');
    } else if (daysSinceLogin <= 30) {
      breakdown.login_recency = 10;
      explanation.push('Login nos últimos 30 dias (+10)');
    } else {
      breakdown.login_recency = 0;
      explanation.push('Sem login recente (0)');
    }
  }

  // Login frequency (max 15 points)
  const logins30d = metrics.total_logins_30d || 0;
  if (logins30d >= 20) {
    breakdown.login_frequency = 15;
    explanation.push('Alta frequência de uso (+15)');
  } else if (logins30d >= 10) {
    breakdown.login_frequency = 10;
    explanation.push('Frequência moderada de uso (+10)');
  } else if (logins30d >= 4) {
    breakdown.login_frequency = 5;
    explanation.push('Uso esporádico (+5)');
  } else {
    breakdown.login_frequency = 0;
  }

  // Has import (20 points)
  if (metrics.has_import) {
    breakdown.has_import = 20;
    explanation.push('Realizou importação (+20)');
  } else {
    breakdown.has_import = 0;
    explanation.push('Sem importações (0)');
  }

  // Has budget (15 points)
  if (metrics.has_budget) {
    breakdown.has_budget = 15;
    explanation.push('Configurou orçamentos (+15)');
  } else {
    breakdown.has_budget = 0;
    explanation.push('Sem orçamentos (0)');
  }

  // Has goals (15 points)
  if (metrics.has_goals) {
    breakdown.has_goals = 15;
    explanation.push('Criou metas (+15)');
  } else {
    breakdown.has_goals = 0;
    explanation.push('Sem metas (0)');
  }

  // Has manual transactions (10 points)
  if (metrics.has_manual_transactions) {
    breakdown.has_manual_transactions = 10;
    explanation.push('Lançamentos manuais (+10)');
  } else {
    breakdown.has_manual_transactions = 0;
  }

  const score = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return {
    score: Math.min(100, score),
    breakdown,
    explanation,
  };
}

/**
 * Get score label and color
 */
export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'Engajado', color: 'text-green-600' };
  if (score >= 40) return { label: 'Moderado', color: 'text-yellow-600' };
  if (score >= 20) return { label: 'Baixo', color: 'text-orange-600' };
  return { label: 'Crítico', color: 'text-red-600' };
}
