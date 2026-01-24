import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * User Stage Classification System
 * 
 * Stages:
 * 1. new - Cadastro recente, pouco ou nenhum dado
 * 2. activated - Importou extrato ou fez primeiros lançamentos
 * 3. engaged - Uso recorrente, criou orçamento ou projeção
 * 4. stagnant - Parou de usar, dados antigos
 * 5. churn_risk - Inatividade prolongada, sinais de frustração
 * 6. healthy_active - Uso recorrente, interage com recursos-chave
 */
export type UserStage = 
  | 'new' 
  | 'activated' 
  | 'engaged' 
  | 'stagnant' 
  | 'churn_risk' 
  | 'healthy_active';

export interface UserStageData {
  stage: UserStage;
  stageLabel: string;
  stageDescription: string;
  stageColor: string;
  stageBgColor: string;
  churnScore: number; // 0-100, higher = more risk
  churnLevel: 'low' | 'medium' | 'high';
  signals: StageSignal[];
  lastCalculated: Date;
}

export interface StageSignal {
  code: string;
  label: string;
  type: 'positive' | 'negative' | 'neutral';
  value: string | number;
  weight: number;
}

const STAGE_CONFIG: Record<UserStage, { label: string; description: string; color: string; bgColor: string }> = {
  new: {
    label: 'Novo',
    description: 'Cadastro recente, explorando a plataforma',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  activated: {
    label: 'Ativado',
    description: 'Já importou ou cadastrou transações',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  engaged: {
    label: 'Engajado',
    description: 'Usa com recorrência os principais recursos',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  stagnant: {
    label: 'Estagnado',
    description: 'Uso reduzido, pode precisar de ajuda',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  churn_risk: {
    label: 'Risco de Churn',
    description: 'Inatividade prolongada, atenção necessária',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  healthy_active: {
    label: 'Ativo Saudável',
    description: 'Engajamento consistente com a plataforma',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
};

interface UserMetrics {
  lastLoginAt: Date | null;
  daysWithoutLogin: number;
  totalLogins30d: number;
  hasImport: boolean;
  hasBudget: boolean;
  hasGoals: boolean;
  hasManualTransactions: boolean;
  transactionCount: number;
  accountAgeInDays: number;
  lastTransactionDate: Date | null;
}

/**
 * Calculate user stage and churn risk based on behavior signals
 */
function calculateUserStage(metrics: UserMetrics): UserStageData {
  const signals: StageSignal[] = [];
  let churnScore = 0;

  // Signal: Days without login
  if (metrics.daysWithoutLogin > 30) {
    signals.push({
      code: 'long_absence',
      label: `${metrics.daysWithoutLogin} dias sem login`,
      type: 'negative',
      value: metrics.daysWithoutLogin,
      weight: 30,
    });
    churnScore += 35;
  } else if (metrics.daysWithoutLogin > 14) {
    signals.push({
      code: 'medium_absence',
      label: `${metrics.daysWithoutLogin} dias sem login`,
      type: 'negative',
      value: metrics.daysWithoutLogin,
      weight: 20,
    });
    churnScore += 20;
  } else if (metrics.daysWithoutLogin > 7) {
    signals.push({
      code: 'short_absence',
      label: `${metrics.daysWithoutLogin} dias sem login`,
      type: 'neutral',
      value: metrics.daysWithoutLogin,
      weight: 10,
    });
    churnScore += 10;
  }

  // Signal: No import after signup
  if (!metrics.hasImport && metrics.accountAgeInDays > 7) {
    signals.push({
      code: 'no_import',
      label: 'Sem importação de extrato',
      type: 'negative',
      value: 0,
      weight: 15,
    });
    churnScore += 15;
  }

  // Signal: No budget
  if (!metrics.hasBudget && metrics.transactionCount > 10) {
    signals.push({
      code: 'no_budget',
      label: 'Sem orçamento configurado',
      type: 'neutral',
      value: 0,
      weight: 10,
    });
    churnScore += 8;
  }

  // Signal: No goals
  if (!metrics.hasGoals && metrics.accountAgeInDays > 14) {
    signals.push({
      code: 'no_goals',
      label: 'Sem metas definidas',
      type: 'neutral',
      value: 0,
      weight: 5,
    });
    churnScore += 5;
  }

  // Signal: Low login frequency
  if (metrics.totalLogins30d < 3 && metrics.accountAgeInDays > 30) {
    signals.push({
      code: 'low_frequency',
      label: 'Uso esporádico',
      type: 'negative',
      value: metrics.totalLogins30d,
      weight: 15,
    });
    churnScore += 15;
  }

  // Positive signals (reduce churn score)
  if (metrics.hasImport) {
    signals.push({
      code: 'has_import',
      label: 'Importou extrato',
      type: 'positive',
      value: 1,
      weight: -10,
    });
    churnScore -= 10;
  }

  if (metrics.hasBudget) {
    signals.push({
      code: 'has_budget',
      label: 'Orçamento configurado',
      type: 'positive',
      value: 1,
      weight: -8,
    });
    churnScore -= 8;
  }

  if (metrics.hasGoals) {
    signals.push({
      code: 'has_goals',
      label: 'Metas definidas',
      type: 'positive',
      value: 1,
      weight: -5,
    });
    churnScore -= 5;
  }

  if (metrics.totalLogins30d >= 10) {
    signals.push({
      code: 'high_frequency',
      label: 'Uso frequente',
      type: 'positive',
      value: metrics.totalLogins30d,
      weight: -15,
    });
    churnScore -= 15;
  }

  // Clamp churn score
  churnScore = Math.max(0, Math.min(100, churnScore));

  // Determine stage
  let stage: UserStage;

  if (metrics.accountAgeInDays <= 7 && !metrics.hasImport && metrics.transactionCount < 5) {
    stage = 'new';
  } else if (churnScore >= 50) {
    stage = 'churn_risk';
  } else if (metrics.daysWithoutLogin > 21 || (metrics.totalLogins30d < 2 && metrics.accountAgeInDays > 14)) {
    stage = 'stagnant';
  } else if (
    metrics.hasImport &&
    metrics.hasBudget &&
    metrics.totalLogins30d >= 8 &&
    churnScore < 20
  ) {
    stage = 'healthy_active';
  } else if (
    metrics.hasBudget || 
    metrics.hasGoals || 
    metrics.totalLogins30d >= 5
  ) {
    stage = 'engaged';
  } else if (metrics.hasImport || metrics.hasManualTransactions || metrics.transactionCount > 5) {
    stage = 'activated';
  } else {
    stage = 'new';
  }

  const config = STAGE_CONFIG[stage];
  const churnLevel: 'low' | 'medium' | 'high' = 
    churnScore >= 50 ? 'high' : 
    churnScore >= 25 ? 'medium' : 'low';

  return {
    stage,
    stageLabel: config.label,
    stageDescription: config.description,
    stageColor: config.color,
    stageBgColor: config.bgColor,
    churnScore,
    churnLevel,
    signals,
    lastCalculated: new Date(),
  };
}

/**
 * Hook to get user stage and churn risk for current family
 */
export function useUserStage() {
  const { family } = useAuth();

  const { data: rawMetrics, isLoading } = useQuery({
    queryKey: ['user-stage-metrics', family?.id],
    queryFn: async () => {
      if (!family?.id) return null;

      // Get engagement metrics
      const { data: metrics } = await supabase
        .from('cs_engagement_metrics')
        .select('*')
        .eq('family_id', family.id)
        .maybeSingle();

      // Get family info
      const { data: familyData } = await supabase
        .from('families')
        .select('created_at')
        .eq('id', family.id)
        .single();

      // Get transaction count
      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('family_id', family.id);

      // Get last transaction
      const { data: lastTransaction } = await supabase
        .from('transactions')
        .select('date')
        .eq('family_id', family.id)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const now = new Date();
      const lastLoginAt = metrics?.last_login_at ? new Date(metrics.last_login_at) : null;
      const createdAt = familyData?.created_at ? new Date(familyData.created_at) : now;

      return {
        lastLoginAt,
        daysWithoutLogin: lastLoginAt 
          ? Math.floor((now.getTime() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        totalLogins30d: metrics?.total_logins_30d ?? 0,
        hasImport: metrics?.has_import ?? false,
        hasBudget: metrics?.has_budget ?? false,
        hasGoals: metrics?.has_goals ?? false,
        hasManualTransactions: metrics?.has_manual_transactions ?? false,
        transactionCount: transactionCount ?? 0,
        accountAgeInDays: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        lastTransactionDate: lastTransaction?.date ? new Date(lastTransaction.date) : null,
      } as UserMetrics;
    },
    enabled: !!family?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const stageData = useMemo(() => {
    if (!rawMetrics) return null;
    return calculateUserStage(rawMetrics);
  }, [rawMetrics]);

  return {
    stageData,
    isLoading,
    metrics: rawMetrics,
  };
}

/**
 * Calculate stage for any family (admin use)
 */
export function calculateStageForFamily(metrics: {
  lastLoginAt: string | null;
  totalLogins30d: number;
  hasImport: boolean;
  hasBudget: boolean;
  hasGoals: boolean;
  hasManualTransactions: boolean;
  transactionCount: number;
  createdAt: string;
}): UserStageData {
  const now = new Date();
  const lastLoginAt = metrics.lastLoginAt ? new Date(metrics.lastLoginAt) : null;
  const createdAt = new Date(metrics.createdAt);

  return calculateUserStage({
    lastLoginAt,
    daysWithoutLogin: lastLoginAt 
      ? Math.floor((now.getTime() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      : Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    totalLogins30d: metrics.totalLogins30d,
    hasImport: metrics.hasImport,
    hasBudget: metrics.hasBudget,
    hasGoals: metrics.hasGoals,
    hasManualTransactions: metrics.hasManualTransactions,
    transactionCount: metrics.transactionCount,
    accountAgeInDays: Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    lastTransactionDate: null,
  });
}

export { STAGE_CONFIG };
