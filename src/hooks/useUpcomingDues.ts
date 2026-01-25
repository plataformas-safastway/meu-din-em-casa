import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addDays, format, startOfDay, isBefore, isAfter, parseISO } from "date-fns";

export interface UpcomingDue {
  id: string;
  name: string;
  type: 'fixed' | 'credit_card' | 'financing';
  amount: number;
  dueDate: Date;
  daysUntilDue: number;
  status: 'ok' | 'attention' | 'urgent' | 'overdue';
  source: 'recurring' | 'credit_card';
  sourceId: string;
  categoryId?: string;
  linkedAccountId?: string;
  linkedCardId?: string;
}

export interface CardClosing {
  id: string;
  cardName: string;
  closingDate: Date;
  dueDate: Date;
  estimatedAmount: number;
  status: 'closing_soon' | 'closed' | 'due_soon';
}

// Calculate next due date based on day_of_month
function getNextDueDate(dayOfMonth: number, referenceDate: Date = new Date()): Date {
  const today = startOfDay(referenceDate);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);
  
  if (isBefore(thisMonth, today)) {
    // Due date already passed this month, get next month
    return new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
  }
  
  return thisMonth;
}

// Calculate days until due
function getDaysUntilDue(dueDate: Date): number {
  const today = startOfDay(new Date());
  const due = startOfDay(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get status based on days until due
function getStatus(daysUntilDue: number): UpcomingDue['status'] {
  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue === 0) return 'urgent';
  if (daysUntilDue <= 3) return 'attention';
  return 'ok';
}

export function useUpcomingDues(daysAhead: number = 30) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["upcoming-dues", family?.id, daysAhead],
    queryFn: async (): Promise<UpcomingDue[]> => {
      if (!family) return [];

      const upcoming: UpcomingDue[] = [];
      const today = new Date();
      const endDate = addDays(today, daysAhead);

      // 1. Fetch active recurring transactions
      const { data: recurring, error: recurringError } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true)
        .eq("type", "expense");

      if (recurringError) throw recurringError;

      // Process recurring transactions
      recurring?.forEach((tx) => {
        if (!tx.day_of_month) return;
        
        const dueDate = getNextDueDate(tx.day_of_month);
        
        // Only include if within range
        if (isAfter(dueDate, endDate)) return;

        const daysUntilDue = getDaysUntilDue(dueDate);

        upcoming.push({
          id: `recurring-${tx.id}`,
          name: tx.description || 'Despesa recorrente',
          type: (tx as any).expense_type || 'fixed',
          amount: tx.amount,
          dueDate,
          daysUntilDue,
          status: getStatus(daysUntilDue),
          source: 'recurring',
          sourceId: tx.id,
          categoryId: tx.category_id,
          linkedAccountId: tx.bank_account_id || undefined,
          linkedCardId: tx.credit_card_id || undefined,
        });
      });

      // 2. Fetch credit cards with due dates
      const { data: cards, error: cardsError } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (cardsError) throw cardsError;

      // Process credit cards
      cards?.forEach((card) => {
        if (!card.due_day) return;

        const dueDate = getNextDueDate(card.due_day);
        
        // Only include if within range
        if (isAfter(dueDate, endDate)) return;

        const daysUntilDue = getDaysUntilDue(dueDate);

        upcoming.push({
          id: `card-${card.id}`,
          name: `Fatura ${card.card_name}`,
          type: 'credit_card',
          amount: 0, // Will be calculated from transactions
          dueDate,
          daysUntilDue,
          status: getStatus(daysUntilDue),
          source: 'credit_card',
          sourceId: card.id,
          linkedCardId: card.id,
        });
      });

      // Sort by due date (closest first)
      return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    },
    enabled: !!family,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCardClosings() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["card-closings", family?.id],
    queryFn: async (): Promise<CardClosing[]> => {
      if (!family) return [];

      const { data: cards, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (error) throw error;

      return cards
        ?.filter((card) => card.closing_day && card.due_day)
        .map((card) => {
          const closingDate = getNextDueDate(card.closing_day!);
          const dueDate = getNextDueDate(card.due_day!);
          const daysUntilClosing = getDaysUntilDue(closingDate);
          const daysUntilDue = getDaysUntilDue(dueDate);

          let status: CardClosing['status'] = 'closing_soon';
          if (daysUntilClosing < 0) {
            status = daysUntilDue <= 3 ? 'due_soon' : 'closed';
          }

          return {
            id: card.id,
            cardName: card.card_name,
            closingDate,
            dueDate,
            estimatedAmount: 0,
            status,
          };
        }) || [];
    },
    enabled: !!family,
    staleTime: 5 * 60 * 1000,
  });
}
