/**
 * React Query Configuration for Multi-device Sync
 * 
 * Stale Time (TTL) Configuration:
 * - Home summary: 30s - Updates frequently
 * - Transactions/Extrato: 15-30s - Critical data
 * - Categories/Banks/Cards: 5-15min - Rarely changes
 * - Profile: 1-5min - User data
 */

// Stale times in milliseconds
export const STALE_TIMES = {
  // Critical data - short TTL
  homeSummary: 30 * 1000,         // 30 seconds
  transactions: 15 * 1000,         // 15 seconds
  financeSummary: 30 * 1000,       // 30 seconds
  budgetAlerts: 30 * 1000,         // 30 seconds
  
  // Semi-static data - medium TTL
  budgets: 2 * 60 * 1000,          // 2 minutes
  goals: 2 * 60 * 1000,            // 2 minutes
  projection: 5 * 60 * 1000,       // 5 minutes
  
  // Static data - long TTL
  bankAccounts: 5 * 60 * 1000,     // 5 minutes
  creditCards: 5 * 60 * 1000,      // 5 minutes
  banks: 15 * 60 * 1000,           // 15 minutes (system list)
  categories: 15 * 60 * 1000,      // 15 minutes (system list)
  
  // User data
  profile: 1 * 60 * 1000,          // 1 minute
  insights: 5 * 60 * 1000,         // 5 minutes
} as const;

// Garbage collection times (how long to keep data in memory after unmount)
export const GC_TIMES = {
  default: 5 * 60 * 1000,          // 5 minutes
  critical: 2 * 60 * 1000,         // 2 minutes for frequently changing data
  static: 30 * 60 * 1000,          // 30 minutes for static data
} as const;

// Query keys that should be invalidated together
export const QUERY_INVALIDATION_GROUPS = {
  // When a transaction is created/updated/deleted
  transactionMutation: [
    'transactions',
    'transactions-paginated',
    'finance-summary', 
    'home-summary',
    'budget-alerts',
    'projection',
    'cashflow',
    'category-report',
    'monthly-report',
  ],
  
  // When budget is changed
  budgetMutation: [
    'budgets',
    'budget-alerts',
    'projection',
  ],
  
  // When bank account is changed
  bankAccountMutation: [
    'bank_accounts',
    'home-summary',
    'accounts-cards-insights',
  ],
  
  // When credit card is changed
  creditCardMutation: [
    'credit_cards',
    'home-summary',
    'accounts-cards-insights',
  ],
  
  // When goal is changed
  goalMutation: [
    'goals',
    'goal-contributions',
    'home-summary',
  ],
  
  // Full refresh on app resume
  appResume: [
    'home-summary',
    'transactions',
    'transactions-paginated',
    'finance-summary',
    'budget-alerts',
  ],
} as const;

// Helper to invalidate a group of queries
import { QueryClient } from '@tanstack/react-query';

export function invalidateQueryGroup(
  queryClient: QueryClient, 
  group: keyof typeof QUERY_INVALIDATION_GROUPS,
  filters?: { month?: number; year?: number }
) {
  const keys = QUERY_INVALIDATION_GROUPS[group];
  
  keys.forEach((key) => {
    queryClient.invalidateQueries({ 
      queryKey: [key],
      refetchType: 'active',
    });
  });
}
