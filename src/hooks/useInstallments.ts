import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addMonths, format } from "date-fns";

// ============================================
// Types for Installment System
// ============================================

export type CardChargeType = 'ONE_SHOT' | 'INSTALLMENT' | 'RECURRENT';
export type InstallmentStatus = 'POSTED' | 'PLANNED' | 'RECONCILED' | 'CANCELLED';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InstallmentGroup {
  id: string;
  family_id: string;
  parent_transaction_id: string | null;
  credit_card_id: string | null;
  bank_account_id: string | null;
  total_amount: number;
  installments_total: number;
  installment_value: number;
  first_due_date: string;
  description: string | null;
  category_id: string;
  subcategory_id: string | null;
  source: string;
  confidence_level: ConfidenceLevel;
  needs_user_confirmation: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlannedInstallment {
  id: string;
  family_id: string;
  installment_group_id: string;
  installment_index: number;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  reconciled_transaction_id: string | null;
  reconciled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  installment_group?: InstallmentGroup;
}

export interface InstallmentPattern {
  id: string;
  pattern: string;
  pattern_type: string;
  description: string | null;
  priority: number;
  is_active: boolean;
}

export interface InstallmentDetectionResult {
  isInstallment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
  confidence: ConfidenceLevel;
  patternMatched: string | null;
}

export interface CreateInstallmentGroupInput {
  credit_card_id?: string | null;
  bank_account_id?: string | null;
  total_amount: number;
  installments_total: number;
  installment_value: number;
  first_due_date: string;
  description?: string;
  category_id: string;
  subcategory_id?: string | null;
  source?: string;
  parent_transaction_id?: string | null;
  confidence_level?: ConfidenceLevel;
  needs_user_confirmation?: boolean;
}

// ============================================
// Installment Pattern Detection Engine
// ============================================

const INSTALLMENT_PATTERNS = [
  // Pattern: 01/10, 3-12, 1/12
  { 
    regex: /(\d{1,2})\s*[\/\\-]\s*(\d{1,2})(?!\d)/,
    extract: (match: RegExpMatchArray) => ({
      current: parseInt(match[1]),
      total: parseInt(match[2]),
    }),
    priority: 100,
  },
  // Pattern: PARC 3/12, PARC3/12, PARC 3-12
  {
    regex: /PARC(?:ELA?)?\s*(\d{1,2})\s*[\/\\-]?\s*(\d{1,2})?/i,
    extract: (match: RegExpMatchArray) => ({
      current: parseInt(match[1]),
      total: match[2] ? parseInt(match[2]) : null,
    }),
    priority: 90,
  },
  // Pattern: PARCELA 1, PARCELA 01
  {
    regex: /PARCELA\s*(\d{1,2})/i,
    extract: (match: RegExpMatchArray) => ({
      current: parseInt(match[1]),
      total: null,
    }),
    priority: 85,
  },
  // Pattern: 10x, 12X
  {
    regex: /(\d{1,2})\s*[xX]\s*(?:R?\$?\s*[\d,\.]+)?/,
    extract: (match: RegExpMatchArray) => ({
      current: 1,
      total: parseInt(match[1]),
    }),
    priority: 80,
  },
  // Pattern: CRED PARC, CRÉDITO PARCELADO
  {
    regex: /CR[EÉ]D(?:ITO)?\s*PARC/i,
    extract: () => ({
      current: null,
      total: null,
      isInstallmentIndicator: true,
    }),
    priority: 75,
  },
  // Pattern: COMPRA PARCELADA
  {
    regex: /COMPRA\s*PARC/i,
    extract: () => ({
      current: null,
      total: null,
      isInstallmentIndicator: true,
    }),
    priority: 70,
  },
];

/**
 * Detect if a transaction description indicates an installment payment
 */
export function detectInstallmentFromDescription(description: string): InstallmentDetectionResult {
  if (!description) {
    return { isInstallment: false, currentInstallment: null, totalInstallments: null, confidence: 'LOW', patternMatched: null };
  }

  const normalizedDesc = description.toUpperCase().trim();
  
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = normalizedDesc.match(pattern.regex);
    if (match) {
      const extracted = pattern.extract(match);
      
      // Validate extracted values
      if ('current' in extracted && extracted.current !== null) {
        if ('total' in extracted && extracted.total !== null) {
          // Full pattern match with both values
          if (extracted.current >= 1 && extracted.current <= extracted.total && extracted.total <= 48) {
            return {
              isInstallment: true,
              currentInstallment: extracted.current,
              totalInstallments: extracted.total,
              confidence: 'HIGH',
              patternMatched: pattern.regex.source,
            };
          }
        } else {
          // Only current installment found
          return {
            isInstallment: true,
            currentInstallment: extracted.current,
            totalInstallments: null,
            confidence: 'MEDIUM',
            patternMatched: pattern.regex.source,
          };
        }
      }
      
      // Indicator pattern (no numbers)
      if ('isInstallmentIndicator' in extracted) {
        return {
          isInstallment: true,
          currentInstallment: null,
          totalInstallments: null,
          confidence: 'LOW',
          patternMatched: pattern.regex.source,
        };
      }
    }
  }

  return { isInstallment: false, currentInstallment: null, totalInstallments: null, confidence: 'LOW', patternMatched: null };
}

/**
 * Group similar transactions that might be installments from the same purchase
 */
export function groupPotentialInstallments(
  transactions: Array<{ description: string; amount: number; date: string; id: string }>
): Map<string, typeof transactions> {
  const groups = new Map<string, typeof transactions>();
  
  transactions.forEach(tx => {
    // Normalize description for grouping (remove installment patterns)
    const baseDesc = tx.description
      .replace(/\d{1,2}\s*[\/\\-]\s*\d{1,2}/g, '')
      .replace(/PARC(?:ELA?)?\s*\d+/gi, '')
      .replace(/\d+\s*[xX]/g, '')
      .trim()
      .toUpperCase();
    
    const key = `${baseDesc}_${tx.amount.toFixed(2)}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  });
  
  return groups;
}

// ============================================
// React Query Hooks
// ============================================

/**
 * Fetch all installment groups for the family
 */
export function useInstallmentGroups() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["installment-groups", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("installment_groups")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InstallmentGroup[];
    },
    enabled: !!family,
  });
}

/**
 * Fetch planned installments with optional filters
 */
export function usePlannedInstallments(options?: { 
  status?: InstallmentStatus[];
  fromDate?: string;
  toDate?: string;
}) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["planned-installments", family?.id, options],
    queryFn: async () => {
      if (!family) return [];

      let query = supabase
        .from("planned_installments")
        .select(`
          *,
          installment_group:installment_groups(*)
        `)
        .eq("family_id", family.id);

      if (options?.status) {
        query = query.in("status", options.status);
      }
      if (options?.fromDate) {
        query = query.gte("due_date", options.fromDate);
      }
      if (options?.toDate) {
        query = query.lte("due_date", options.toDate);
      }

      const { data, error } = await query.order("due_date", { ascending: true });

      if (error) throw error;
      return data as PlannedInstallment[];
    },
    enabled: !!family,
  });
}

/**
 * Fetch installment patterns (system-wide)
 */
export function useInstallmentPatterns() {
  return useQuery({
    queryKey: ["installment-patterns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installment_patterns")
        .select("*")
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (error) throw error;
      return data as InstallmentPattern[];
    },
  });
}

/**
 * Create a new installment group with automatic planned installments
 */
export function useCreateInstallmentGroup() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateInstallmentGroupInput) => {
      if (!family) throw new Error("No family");

      // 1. Create the installment group
      const { data: group, error: groupError } = await supabase
        .from("installment_groups")
        .insert({
          family_id: family.id,
          credit_card_id: input.credit_card_id || null,
          bank_account_id: input.bank_account_id || null,
          total_amount: input.total_amount,
          installments_total: input.installments_total,
          installment_value: input.installment_value,
          first_due_date: input.first_due_date,
          description: input.description || null,
          category_id: input.category_id,
          subcategory_id: input.subcategory_id || null,
          source: input.source || 'MANUAL',
          parent_transaction_id: input.parent_transaction_id || null,
          confidence_level: input.confidence_level || 'HIGH',
          needs_user_confirmation: input.needs_user_confirmation || false,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // 2. Create planned installments using the database function
      // This creates installments starting from index 2 (assuming 1st is the parent transaction)
      const startIndex = input.parent_transaction_id ? 2 : 1;
      
      const { error: plannedError } = await supabase.rpc("create_planned_installments", {
        p_group_id: group.id,
        p_start_index: startIndex,
      });

      if (plannedError) {
        console.error("Error creating planned installments:", plannedError);
        // Don't throw - group was created successfully
      }

      // 3. Log audit
      await supabase.from("installment_audit_log").insert({
        installment_group_id: group.id,
        action: 'CREATED',
        details: { 
          source: input.source,
          installments_total: input.installments_total,
          total_amount: input.total_amount,
        },
      });

      return group as InstallmentGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
      queryClient.invalidateQueries({ queryKey: ["projection"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
    },
  });
}

/**
 * Confirm an installment group that was detected automatically
 */
export function useConfirmInstallmentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      groupId, 
      installmentsTotal 
    }: { 
      groupId: string; 
      installmentsTotal?: number;
    }) => {
      const updates: Partial<InstallmentGroup> = {
        confirmed_at: new Date().toISOString(),
        needs_user_confirmation: false,
      };

      if (installmentsTotal) {
        updates.installments_total = installmentsTotal;
      }

      const { error } = await supabase
        .from("installment_groups")
        .update(updates)
        .eq("id", groupId);

      if (error) throw error;

      // If total changed, recreate planned installments
      if (installmentsTotal) {
        // Delete existing planned
        await supabase
          .from("planned_installments")
          .delete()
          .eq("installment_group_id", groupId)
          .neq("status", "RECONCILED");

        // Recreate with new total
        await supabase.rpc("create_planned_installments", {
          p_group_id: groupId,
          p_start_index: 2,
        });
      }

      // Log audit
      await supabase.from("installment_audit_log").insert({
        installment_group_id: groupId,
        action: 'CONFIRMED',
        details: { installments_total: installmentsTotal },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
      queryClient.invalidateQueries({ queryKey: ["projection"] });
    },
  });
}

/**
 * Cancel an installment group
 */
export function useCancelInstallmentGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (groupId: string) => {
      // Cancel all PLANNED installments
      await supabase
        .from("planned_installments")
        .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
        .eq("installment_group_id", groupId)
        .eq("status", "PLANNED");

      // Log audit
      await supabase.from("installment_audit_log").insert({
        installment_group_id: groupId,
        action: 'CANCELLED',
        details: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
      queryClient.invalidateQueries({ queryKey: ["projection"] });
    },
  });
}

/**
 * Reconcile a planned installment with a real transaction
 */
export function useReconcileInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      plannedId, 
      transactionId 
    }: { 
      plannedId: string; 
      transactionId: string;
    }) => {
      const { data, error } = await supabase.rpc("reconcile_installment", {
        p_planned_id: plannedId,
        p_transaction_id: transactionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["projection"] });
    },
  });
}

/**
 * Get future installments for projection view
 */
export function useProjectedInstallments(months: number = 6) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["projected-installments", family?.id, months],
    queryFn: async () => {
      if (!family) return [];

      const today = new Date();
      const endDate = addMonths(today, months);

      const { data, error } = await supabase
        .from("planned_installments")
        .select(`
          *,
          installment_group:installment_groups(
            description,
            category_id,
            subcategory_id,
            credit_card_id,
            bank_account_id,
            installments_total,
            source
          )
        `)
        .eq("family_id", family.id)
        .eq("status", "PLANNED")
        .gte("due_date", format(today, "yyyy-MM-dd"))
        .lte("due_date", format(endDate, "yyyy-MM-dd"))
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as PlannedInstallment[];
    },
    enabled: !!family,
  });
}

/**
 * Get installments pending user confirmation
 */
export function usePendingConfirmationInstallments() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["pending-confirmation-installments", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("installment_groups")
        .select("*")
        .eq("family_id", family.id)
        .eq("needs_user_confirmation", true)
        .is("confirmed_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InstallmentGroup[];
    },
    enabled: !!family,
  });
}

// ============================================
// Legacy compatibility (deprecated)
// ============================================

/** @deprecated Use useInstallmentGroups instead */
export function useInstallments() {
  return useInstallmentGroups();
}

/** @deprecated Use useCreateInstallmentGroup instead */
export function useCreateInstallment() {
  const createGroup = useCreateInstallmentGroup();
  
  return {
    ...createGroup,
    mutateAsync: async (input: {
      credit_card_id?: string | null;
      description: string;
      total_amount: number;
      installment_amount: number;
      total_installments: number;
      current_installment?: number;
      start_date: string;
      category_id: string;
      subcategory_id?: string | null;
    }) => {
      return createGroup.mutateAsync({
        credit_card_id: input.credit_card_id,
        total_amount: input.total_amount,
        installments_total: input.total_installments,
        installment_value: input.installment_amount,
        first_due_date: input.start_date,
        description: input.description,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id,
        source: 'MANUAL',
      });
    },
  };
}

/** @deprecated */
export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("installment_groups")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
    },
  });
}

/** @deprecated */
export function useDeleteInstallment() {
  const cancelGroup = useCancelInstallmentGroup();
  return cancelGroup;
}

/** @deprecated Use useProjectedInstallments instead */
export function useFutureInstallments(months: number = 3) {
  return useProjectedInstallments(months);
}
