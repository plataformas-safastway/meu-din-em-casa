import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STALE_TIMES } from "@/lib/queryConfig";

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
}

interface TransactionsPage {
  data: PaginatedTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useTransactionsPaginated(filterType?: 'all' | 'income' | 'expense') {
  const { family } = useAuth();

  return useInfiniteQuery({
    queryKey: ['transactions-paginated', filterType],
    queryFn: async ({ pageParam }): Promise<TransactionsPage> => {
      if (!family?.id) throw new Error("No family");

      let query = supabase
        .from("transactions")
        .select(`
          id, type, amount, category_id, subcategory_id, date, description, payment_method, created_at,
          source, created_by_user_id, created_by_name, last_edited_by_user_id, last_edited_at,
          goal_id, goals(title)
        `)
        .eq("family_id", family.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE + 1); // Fetch one extra to know if there's more

      // Apply type filter
      if (filterType && filterType !== 'all') {
        query = query.eq("type", filterType);
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
