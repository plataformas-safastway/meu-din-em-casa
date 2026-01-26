/**
 * Home CTA Actions Hook
 * Pre-built CTA handlers for all Home widgets
 */

import { useCallback } from 'react';
import { useCTARouter } from './useCTARouter';
import { CTADefaultMode, CTATargetScreen, toMonthRef } from '@/types/navigation';

interface UseHomeCTAActionsParams {
  /** Navigation function */
  navigate: (tab: string) => void;
  /** Current month reference (YYYY-MM) */
  monthRef?: string;
}

/**
 * Hook providing all CTA action handlers for the Home screen
 */
export function useHomeCTAActions({ navigate, monthRef }: UseHomeCTAActionsParams) {
  const { handleHomeCTA, buildCTARequest } = useCTARouter();
  
  const currentMonthRef = monthRef || toMonthRef(new Date());

  // ==========================================
  // BALANCE CARD CTAs
  // ==========================================

  /** Add expense from balance card */
  const onBalanceAddExpense = useCallback((accountId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.ADD_EXPENSE,
      slot: 'balance',
      entityType: 'account',
      entityId: accountId,
      monthRef: currentMonthRef,
      actionName: 'add_expense',
      payload: accountId ? { accountId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Add income from balance card */
  const onBalanceAddIncome = useCallback((accountId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.ADD_INCOME,
      slot: 'balance',
      entityType: 'account',
      entityId: accountId,
      monthRef: currentMonthRef,
      actionName: 'add_income',
      payload: accountId ? { accountId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View statement from balance card */
  const onBalanceViewStatement = useCallback((accountId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'balance',
      entityType: 'account',
      entityId: accountId,
      monthRef: currentMonthRef,
      actionName: 'view_statement',
      payload: accountId ? { accountId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View all accounts */
  const onBalanceViewAccounts = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'banks',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'balance',
      entityType: 'account',
      monthRef: currentMonthRef,
      actionName: 'view_accounts',
      payload: { initialTab: 'accounts' },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // CREDIT CARD CTAs
  // ==========================================

  /** Add card transaction (purchase) */
  const onCardAddTransaction = useCallback((cardId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.CREATE,
      slot: 'credit_card',
      entityType: 'card',
      entityId: cardId,
      monthRef: currentMonthRef,
      actionName: 'add_purchase',
      payload: cardId ? { cardId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Pay card bill */
  const onCardPayBill = useCallback((cardId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.PAY,
      slot: 'credit_card',
      entityType: 'card',
      entityId: cardId,
      monthRef: currentMonthRef,
      actionName: 'pay_bill',
      payload: cardId ? { cardId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View card bill details */
  const onCardViewBill = useCallback((cardId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'banks',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'credit_card',
      entityType: 'card',
      entityId: cardId,
      monthRef: currentMonthRef,
      actionName: 'view_bill',
      payload: { cardId, initialTab: 'cards' },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View all cards */
  const onCardViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'banks',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'credit_card',
      entityType: 'card',
      monthRef: currentMonthRef,
      actionName: 'view_all_cards',
      payload: { initialTab: 'cards' },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // GOAL CTAs
  // ==========================================

  /** Add contribution to goal */
  const onGoalAddContribution = useCallback((goalId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'objectives',
      defaultMode: CTADefaultMode.CREATE,
      slot: 'goal',
      entityType: 'goal',
      entityId: goalId,
      monthRef: currentMonthRef,
      actionName: 'add_contribution',
      payload: goalId ? { goalId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Edit goal */
  const onGoalEdit = useCallback((goalId: string) => {
    const request = buildCTARequest({
      targetScreen: 'objectives',
      defaultMode: CTADefaultMode.EDIT,
      slot: 'goal',
      entityType: 'goal',
      entityId: goalId,
      monthRef: currentMonthRef,
      actionName: 'edit_goal',
      payload: { goalId },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View goal details */
  const onGoalViewDetails = useCallback((goalId: string) => {
    const request = buildCTARequest({
      targetScreen: 'objectives',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'goal',
      entityType: 'goal',
      entityId: goalId,
      monthRef: currentMonthRef,
      actionName: 'view_goal',
      payload: { goalId },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View all goals */
  const onGoalViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'objectives',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'goal',
      entityType: 'goal',
      monthRef: currentMonthRef,
      actionName: 'view_all_goals',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // BUDGET CTAs
  // ==========================================

  /** Add expense for budget */
  const onBudgetAddExpense = useCallback((categoryId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.ADD_EXPENSE,
      slot: 'budget',
      entityType: 'budget',
      entityId: categoryId,
      monthRef: currentMonthRef,
      actionName: 'add_expense',
      payload: categoryId ? { categoryId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Adjust budget */
  const onBudgetAdjust = useCallback((categoryId?: string) => {
    const request = buildCTARequest({
      targetScreen: 'goals',
      defaultMode: CTADefaultMode.ADJUST,
      slot: 'budget',
      entityType: 'budget',
      entityId: categoryId,
      monthRef: currentMonthRef,
      actionName: 'adjust_budget',
      payload: categoryId ? { categoryId } : undefined,
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View categories from budget */
  const onBudgetViewCategories = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'categories',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'budget',
      entityType: 'category',
      monthRef: currentMonthRef,
      actionName: 'view_categories',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** View all budgets */
  const onBudgetViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'goals',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'budget',
      entityType: 'budget',
      monthRef: currentMonthRef,
      actionName: 'view_all_budgets',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // QUICK ACTION CTAs
  // ==========================================

  /** Quick add expense */
  const onQuickAddExpense = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.ADD_EXPENSE,
      slot: 'quick_action',
      entityType: 'transaction',
      monthRef: currentMonthRef,
      actionName: 'quick_add_expense',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Quick add income */
  const onQuickAddIncome = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.ADD_INCOME,
      slot: 'quick_action',
      entityType: 'transaction',
      monthRef: currentMonthRef,
      actionName: 'quick_add_income',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Quick import */
  const onQuickImport = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'import',
      defaultMode: CTADefaultMode.CREATE,
      slot: 'quick_action',
      entityType: 'transaction',
      monthRef: currentMonthRef,
      actionName: 'quick_import',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // UPCOMING DUES CTAs
  // ==========================================

  /** View all upcoming dues */
  const onUpcomingDuesViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'projection',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'upcoming_due',
      entityType: 'recurring',
      monthRef: currentMonthRef,
      actionName: 'view_all_dues',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // INSIGHT CTAs
  // ==========================================

  /** View all insights */
  const onInsightsViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'reports',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'insight',
      entityType: 'category',
      monthRef: currentMonthRef,
      actionName: 'view_insights',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Handle insight click (navigate to related screen) */
  const onInsightClick = useCallback((insightId: string, targetScreen?: CTATargetScreen) => {
    const request = buildCTARequest({
      targetScreen: targetScreen || 'reports',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'insight',
      entityType: 'category',
      entityId: insightId,
      monthRef: currentMonthRef,
      actionName: 'insight_action',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // CATEGORY CTAs
  // ==========================================

  /** View all categories */
  const onCategoriesViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'categories',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'budget',
      entityType: 'category',
      monthRef: currentMonthRef,
      actionName: 'view_categories',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // PROJECTION CTAs
  // ==========================================

  /** View projection */
  const onProjectionViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'projection',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'timeline',
      entityType: 'budget',
      monthRef: currentMonthRef,
      actionName: 'view_projection',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  // ==========================================
  // TRANSACTION LIST CTAs
  // ==========================================

  /** View all transactions */
  const onTransactionsViewAll = useCallback(() => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.DETAILS,
      slot: 'transaction_list',
      entityType: 'transaction',
      monthRef: currentMonthRef,
      actionName: 'view_all_transactions',
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  /** Edit transaction */
  const onTransactionEdit = useCallback((transactionId: string) => {
    const request = buildCTARequest({
      targetScreen: 'transactions',
      defaultMode: CTADefaultMode.EDIT,
      slot: 'transaction_list',
      entityType: 'transaction',
      entityId: transactionId,
      monthRef: currentMonthRef,
      actionName: 'edit_transaction',
      payload: { transactionId },
    });
    handleHomeCTA(request, navigate);
  }, [buildCTARequest, handleHomeCTA, navigate, currentMonthRef]);

  return {
    // Balance Card
    onBalanceAddExpense,
    onBalanceAddIncome,
    onBalanceViewStatement,
    onBalanceViewAccounts,
    
    // Credit Card
    onCardAddTransaction,
    onCardPayBill,
    onCardViewBill,
    onCardViewAll,
    
    // Goals
    onGoalAddContribution,
    onGoalEdit,
    onGoalViewDetails,
    onGoalViewAll,
    
    // Budget
    onBudgetAddExpense,
    onBudgetAdjust,
    onBudgetViewCategories,
    onBudgetViewAll,
    
    // Quick Actions
    onQuickAddExpense,
    onQuickAddIncome,
    onQuickImport,
    
    // Projection
    onProjectionViewAll,
    
    // Transaction List
    onTransactionsViewAll,
    onTransactionEdit,
    
    // Upcoming Dues
    onUpcomingDuesViewAll,
    
    // Insights
    onInsightsViewAll,
    onInsightClick,
    
    // Categories
    onCategoriesViewAll,
  };
}
