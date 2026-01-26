import { useInfiniteQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STALE_TIMES, invalidateQueryGroup } from "@/lib/queryConfig";
import { TransactionFilters } from "@/components/extrato";

const PAGE_SIZE = 50;

export interface PaginatedTransaction {
  id: string;
  type: string;
  amount: number;
  category_id: string;
  subcategory_id: string | null;
  date: string;
  description: string | null;
  payment_method: string;
  created_at: string;
  // Audit fields
  source: string | null;
  created_by_user_id: string | null;
  created_by_name: string | null;
  last_edited_by_user_id: string | null;
  last_edited_at: string | null;
  // Goal reference
  goal_id: string | null;
  // Financial instrument
  bank_account_id: string | null;
  credit_card_id: string | null;
}

interface TransactionsPage {
  data: PaginatedTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

// Calculate date range from filter settings
function getDateRange(filters: TransactionFilters): { startDate?: string; endDate?: string } {
  const now = new Date();
  
  switch (filters.periodType) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    case 'last-month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    case 'last-30': {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    case 'last-90': {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };
    }
    case 'month-select': {
      if (filters.selectedMonth) {
        const [year, month] = filters.selectedMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        };
      }
      return {};
    }
    case 'custom': {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
    }
    default:
      return {};
  }
}

export function useTransactionsPaginated(
  filterType?: 'all' | 'income' | 'expense',
  advancedFilters?: TransactionFilters
) {
  const { family } = useAuth();

  return useInfiniteQuery({
    queryKey: ['transactions-paginated', filterType, advancedFilters],
    queryFn: async ({ pageParam }): Promise<TransactionsPage> => {
      if (!family?.id) throw new Error("No family");

      let query = supabase
        .from("transactions")
        .select(`
          id, type, amount, category_id, subcategory_id, date, description, payment_method, created_at,
          source, created_by_user_id, created_by_name, last_edited_by_user_id, last_edited_at,
          goal_id, bank_account_id, credit_card_id, goals(title)
        `)
        .eq("family_id", family.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE + 1);

      // Apply type filter (basic)
      const effectiveType = advancedFilters?.type || filterType;
      if (effectiveType && effectiveType !== 'all') {
        query = query.eq("type", effectiveType);
      }

      // Apply advanced filters
      if (advancedFilters) {
        // Date range
        const { startDate, endDate } = getDateRange(advancedFilters);
        if (startDate) {
          query = query.gte("date", startDate);
        }
        if (endDate) {
          query = query.lte("date", endDate);
        }

        // Categories
        if (advancedFilters.onlyUnclassified) {
          query = query.eq("category_id", "desconhecidas");
        } else if (advancedFilters.categoryIds.length > 0) {
          query = query.in("category_id", advancedFilters.categoryIds);
        }

        // Bank accounts
        if (advancedFilters.bankAccountIds.length > 0) {
          query = query.in("bank_account_id", advancedFilters.bankAccountIds);
        }

        // Credit cards
        if (advancedFilters.creditCardIds.length > 0) {
          query = query.in("credit_card_id", advancedFilters.creditCardIds);
        }

        // Payment methods (cast to any for type compatibility with new payment methods)
        if (advancedFilters.paymentMethods.length > 0) {
          query = query.in("payment_method", advancedFilters.paymentMethods as any);
        }

        // Sources
        if (advancedFilters.sources.length > 0) {
          query = query.in("source", advancedFilters.sources);
        }

        // Search query (description)
        if (advancedFilters.searchQuery && advancedFilters.searchQuery.length >= 2) {
          query = query.ilike("description", `%${advancedFilters.searchQuery}%`);
        }
      }

      // Cursor-based pagination using (date, created_at, id)
      if (pageParam) {
        const [cursorDate, cursorCreatedAt, cursorId] = pageParam.split('|');
        query = query.or(
          `date.lt.${cursorDate},` +
          `and(date.eq.${cursorDate},created_at.lt.${cursorCreatedAt}),` +
          `and(date.eq.${cursorDate},created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      const hasMore = (data?.length || 0) > PAGE_SIZE;
      const pageData = hasMore ? data!.slice(0, PAGE_SIZE) : (data || []);
      
      // Build next cursor from last item
      const lastItem = pageData[pageData.length - 1];
      const nextCursor = hasMore && lastItem 
        ? `${lastItem.date}|${lastItem.created_at}|${lastItem.id}`
        : null;

      return {
        data: pageData,
        nextCursor,
        hasMore,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!family?.id,
    staleTime: STALE_TIMES.transactions,
  });
}

// Helper to get all transactions from paginated data
export function flattenPaginatedTransactions(
  pages: TransactionsPage[] | undefined
): PaginatedTransaction[] {
  if (!pages) return [];
  return pages.flatMap(page => page.data);
}

// Bulk delete mutation
export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      if (!family?.id) throw new Error("No family");
      if (transactionIds.length === 0) throw new Error("No transactions to delete");

      // Delete in batches of 100 to avoid timeout
      const BATCH_SIZE = 100;
      let deletedCount = 0;

      for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
        const batch = transactionIds.slice(i, i + BATCH_SIZE);
        
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("family_id", family.id)
          .in("id", batch);

        if (error) throw error;
        deletedCount += batch.length;
      }

      // Log audit entry
      await supabase.from("audit_logs").insert({
        action: "bulk_delete_transactions",
        entity_type: "transaction",
        user_id: (await supabase.auth.getUser()).data.user?.id || "",
        family_id: family.id,
        metadata: {
          deleted_count: deletedCount,
          transaction_ids_sample: transactionIds.slice(0, 5), // Only log first 5 for privacy
        },
      });

      return { deletedCount };
    },
    onSuccess: () => {
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

// Bulk update category mutation
export function useBulkUpdateCategory() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async ({
      transactionIds,
      categoryId,
      subcategoryId,
    }: {
      transactionIds: string[];
      categoryId: string;
      subcategoryId: string | null;
    }) => {
      if (!family?.id) throw new Error("No family");
      if (transactionIds.length === 0) throw new Error("No transactions to update");

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const now = new Date().toISOString();
      const BATCH_SIZE = 100;
      let updatedCount = 0;

      for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
        const batch = transactionIds.slice(i, i + BATCH_SIZE);

        // Get old values for audit
        const { data: oldTransactions } = await supabase
          .from("transactions")
          .select("id, category_id, subcategory_id")
          .eq("family_id", family.id)
          .in("id", batch);

        // Update transactions
        const { error } = await supabase
          .from("transactions")
          .update({
            category_id: categoryId,
            subcategory_id: subcategoryId,
            last_edited_by_user_id: userId,
            last_edited_at: now,
          })
          .eq("family_id", family.id)
          .in("id", batch);

        if (error) throw error;

        // Log individual changes to transaction_change_logs
        if (oldTransactions) {
          const changeLogs = oldTransactions.flatMap(old => {
            const logs: any[] = [];
            if (old.category_id !== categoryId) {
              logs.push({
                transaction_id: old.id,
                family_id: family.id,
                field_name: 'category_id',
                old_value: old.category_id,
                new_value: categoryId,
                changed_by_user_id: userId,
                change_source: 'BULK_UPDATE',
              });
            }
            if (old.subcategory_id !== subcategoryId) {
              logs.push({
                transaction_id: old.id,
                family_id: family.id,
                field_name: 'subcategory_id',
                old_value: old.subcategory_id,
                new_value: subcategoryId,
                changed_by_user_id: userId,
                change_source: 'BULK_UPDATE',
              });
            }
            return logs;
          });

          if (changeLogs.length > 0) {
            await supabase.from("transaction_change_logs").insert(changeLogs);
          }
        }

        updatedCount += batch.length;
      }

      // Log batch audit entry
      await supabase.from("audit_logs").insert({
        action: "bulk_update_category",
        entity_type: "transaction",
        user_id: userId || "",
        family_id: family.id,
        metadata: {
          updated_count: updatedCount,
          new_category_id: categoryId,
          new_subcategory_id: subcategoryId,
          transaction_ids_sample: transactionIds.slice(0, 5),
        },
      });

      return { updatedCount };
    },
    onSuccess: () => {
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

export function useFilteredTransactionCount(filters?: TransactionFilters) {
  const { family } = useAuth();

  return useInfiniteQuery({
    queryKey: ['transactions-count', filters],
    queryFn: async (): Promise<{ count: number }> => {
      if (!family?.id) throw new Error("No family");

      let query = supabase
        .from("transactions")
        .select("id", { count: 'exact', head: true })
        .eq("family_id", family.id);

      // Apply filters (same as paginated query)
      if (filters) {
        const effectiveType = filters.type;
        if (effectiveType && effectiveType !== 'all') {
          query = query.eq("type", effectiveType);
        }

        const { startDate, endDate } = getDateRange(filters);
        if (startDate) query = query.gte("date", startDate);
        if (endDate) query = query.lte("date", endDate);

        if (filters.onlyUnclassified) {
          query = query.eq("category_id", "desconhecidas");
        } else if (filters.categoryIds.length > 0) {
          query = query.in("category_id", filters.categoryIds);
        }

        if (filters.bankAccountIds.length > 0) {
          query = query.in("bank_account_id", filters.bankAccountIds);
        }
        if (filters.creditCardIds.length > 0) {
          query = query.in("credit_card_id", filters.creditCardIds);
        }
        if (filters.paymentMethods.length > 0) {
          query = query.in("payment_method", filters.paymentMethods as any);
        }
        if (filters.sources.length > 0) {
          query = query.in("source", filters.sources);
        }
        if (filters.searchQuery && filters.searchQuery.length >= 2) {
          query = query.ilike("description", `%${filters.searchQuery}%`);
        }
      }

      const { count, error } = await query;
      if (error) throw error;

      return { count: count || 0 };
    },
    initialPageParam: undefined,
    getNextPageParam: () => undefined,
    enabled: !!family?.id,
    staleTime: STALE_TIMES.transactions,
  });
}
