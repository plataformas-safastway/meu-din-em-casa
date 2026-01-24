import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

// Types for executive reports
export interface ExecutiveMetrics {
  period: { start: string; end: string };
  users: {
    total: number;
    active: number;
    new: number;
    growth_rate: number;
  };
  revenue: {
    mrr: number;
    mrr_growth: number;
  };
  engagement: {
    average_score: number;
    churn_rate: number;
  };
  calculated_at: string;
}

export interface GrowthMetric {
  month: string;
  new_users: number;
  activated_users: number;
  activation_rate: number;
}

export interface RevenueMetric {
  month: string;
  mrr: number;
  gross_revenue: number;
  overdue: number;
  plans: Record<string, number>;
}

export interface EngagementReport {
  user_status: Record<string, number>;
  average_engagement_score: number;
  cs_actions_30d: number;
  automation_impact: {
    total_executions: number;
    successful: number;
    pending: number;
  };
  calculated_at: string;
}

export interface ProductStabilityReport {
  errors: {
    import_errors_30d: number;
    import_success_rate: number;
  };
  integrations: {
    openfinance: {
      total: number;
      active: number;
      error: number;
    };
  };
  calculated_at: string;
}

// Hook to check executive access
export function useExecutiveAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['executive-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_executive_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useExecutiveAccess] Error:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for executive metrics (one-page view)
export function useExecutiveMetrics(periodStart?: Date, periodEnd?: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['executive-metrics', periodStart?.toISOString(), periodEnd?.toISOString()],
    queryFn: async (): Promise<ExecutiveMetrics | null> => {
      const params: Record<string, string> = {};
      if (periodStart) params._period_start = format(periodStart, 'yyyy-MM-dd');
      if (periodEnd) params._period_end = format(periodEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_executive_metrics', params);

      if (error) {
        console.error('[useExecutiveMetrics] Error:', error);
        return null;
      }

      return data as unknown as ExecutiveMetrics;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for growth metrics
export function useGrowthMetrics(months: number = 6) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['growth-metrics', months],
    queryFn: async (): Promise<GrowthMetric[]> => {
      const { data, error } = await supabase.rpc('get_growth_metrics', {
        _months: months
      });

      if (error) {
        console.error('[useGrowthMetrics] Error:', error);
        return [];
      }

      return (data as unknown as GrowthMetric[]).reverse();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for revenue metrics
export function useRevenueMetrics(months: number = 6) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['revenue-metrics', months],
    queryFn: async (): Promise<RevenueMetric[]> => {
      const { data, error } = await supabase.rpc('get_revenue_metrics', {
        _months: months
      });

      if (error) {
        console.error('[useRevenueMetrics] Error:', error);
        return [];
      }

      return (data as unknown as RevenueMetric[]).reverse();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for engagement/CS report
export function useEngagementReport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['engagement-report'],
    queryFn: async (): Promise<EngagementReport | null> => {
      const { data, error } = await supabase.rpc('get_engagement_metrics_report');

      if (error) {
        console.error('[useEngagementReport] Error:', error);
        return null;
      }

      return data as unknown as EngagementReport;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for product stability report
export function useProductStabilityReport() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['product-stability-report'],
    queryFn: async (): Promise<ProductStabilityReport | null> => {
      const { data, error } = await supabase.rpc('get_product_stability_metrics');

      if (error) {
        console.error('[useProductStabilityReport] Error:', error);
        return null;
      }

      return data as unknown as ProductStabilityReport;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to log report access (audit)
export function useLogReportAccess() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportType,
      action,
      periodStart,
      periodEnd,
      exportFormat,
    }: {
      reportType: string;
      action: 'view' | 'export_pdf' | 'export_csv' | 'export_xls';
      periodStart?: Date;
      periodEnd?: Date;
      exportFormat?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('executive_reports_audit')
        .insert({
          user_id: user.id,
          report_type: reportType,
          action,
          period_start: periodStart ? format(periodStart, 'yyyy-MM-dd') : null,
          period_end: periodEnd ? format(periodEnd, 'yyyy-MM-dd') : null,
          export_format: exportFormat,
        });

      if (error) throw error;
    },
  });
}

// Hook to get report audit history
export function useReportAuditHistory(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['report-audit-history', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('executive_reports_audit')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useReportAuditHistory] Error:', error);
        return [];
      }

      return data;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}
