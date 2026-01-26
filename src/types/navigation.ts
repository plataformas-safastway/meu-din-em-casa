/**
 * CTA Navigation System
 * Unified contract for contextual navigation from Home and other screens
 */

// ============================================
// DEFAULT MODE - State to open destination in
// ============================================
export enum CTADefaultMode {
  // General
  CREATE = 'create',
  EDIT = 'edit',
  DETAILS = 'details',
  
  // Transactions
  ADD_INCOME = 'add_income',
  ADD_EXPENSE = 'add_expense',
  
  // Cards/Bills
  PAY = 'pay',
  
  // Budget/Goals
  ADJUST = 'adjust',
  
  // Transfers
  TRANSFER = 'transfer',
  
  // Goals
  LINK = 'link',
  
  // Import/Review
  REVIEW = 'review',
}

// ============================================
// SOURCE CONTEXT SLOTS
// ============================================
export type CTASlot = 
  | 'balance'      // GlobalBalanceCard
  | 'credit_card'  // CreditCardsPreviewCard
  | 'goal'         // GoalsWidget
  | 'budget'       // BudgetAlertsWidget
  | 'timeline'     // Timeline/Projection
  | 'quick_action' // QuickActions/FAB
  | 'onboarding'   // Onboarding checklist
  | 'insight'      // Insight cards
  | 'upcoming_due' // UpcomingDuesCard
  | 'transaction_list'; // TransactionList

// ============================================
// ENTITY TYPES
// ============================================
export type CTAEntityType = 
  | 'account'
  | 'card'
  | 'goal'
  | 'budget'
  | 'category'
  | 'transaction'
  | 'recurring';

// ============================================
// TARGET SCREENS
// ============================================
export type CTATargetScreen = 
  | 'transactions'
  | 'banks'
  | 'goals'       // Budgets page
  | 'objectives'  // Goals page
  | 'projection'
  | 'categories'
  | 'reports'
  | 'import'
  | 'settings'
  | 'profile'
  | 'family'
  | 'help'
  | 'learn-more';

// ============================================
// SOURCE CONTEXT - Where the CTA came from
// ============================================
export interface CTASourceContext {
  /** Always the source screen */
  source: 'home' | 'settings' | 'transactions' | 'goals' | 'banks';
  
  /** Which slot/widget triggered the CTA */
  slot: CTASlot;
  
  /** Type of entity being operated on */
  entityType: CTAEntityType;
  
  /** Entity ID (null if creating new or selecting) */
  entityId: string | null;
  
  /** Month reference in YYYY-MM format */
  monthRef: string;
  
  /** Family ID for audit/tracking */
  familyId: string;
  
  /** UI variant for A/B testing (optional) */
  uiVariant?: string;
  
  /** CTA reference for tracking (e.g., "cta_home_balance_add_expense") */
  ref: string;
}

// ============================================
// CTA PAYLOAD - Data passed to destination
// ============================================
export interface CTAPayload {
  /** Account ID for account-related operations */
  accountId?: string;
  
  /** Credit card ID for card-related operations */
  cardId?: string;
  
  /** Goal ID for goal-related operations */
  goalId?: string;
  
  /** Budget month ID for budget operations */
  budgetMonthId?: string;
  
  /** Category ID for category-focused views */
  categoryId?: string;
  
  /** Transaction ID for editing */
  transactionId?: string;
  
  /** Pre-filled amount */
  amount?: number;
  
  /** Pre-filled description */
  description?: string;
  
  /** Initial tab to open (e.g., "accounts" | "cards") */
  initialTab?: string;
}

// ============================================
// CTA NAVIGATION REQUEST
// ============================================
export interface CTANavigationRequest {
  /** Target screen to navigate to */
  targetScreen: CTATargetScreen;
  
  /** Default mode to open the screen in */
  defaultMode: CTADefaultMode;
  
  /** Source context for tracking and back navigation */
  sourceContext: CTASourceContext;
  
  /** Optional payload with entity IDs and pre-filled data */
  payload?: CTAPayload;
}

// ============================================
// CTA STATE - Stored in navigation context
// ============================================
export interface CTAState {
  /** Current active CTA navigation (if any) */
  active: CTANavigationRequest | null;
  
  /** Timestamp when CTA was triggered */
  triggeredAt: number | null;
}

// ============================================
// TRACKING EVENT
// ============================================
export interface CTATrackingEvent {
  event: 'CTA_CLICKED';
  defaultMode: CTADefaultMode;
  sourceContext: Omit<CTASourceContext, 'familyId'> & { familyRef: string }; // Pseudonymized
  targetScreen: CTATargetScreen;
  timestamp: string;
  hasEntityId: boolean;
}

// ============================================
// HELPERS
// ============================================

/**
 * Creates a standard monthRef from a Date object
 */
export function toMonthRef(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Parses a monthRef into year and month numbers
 */
export function parseMonthRef(monthRef: string): { year: number; month: number } {
  const [yearStr, monthStr] = monthRef.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10) - 1, // 0-indexed for Date
  };
}

/**
 * Creates a CTA reference string for tracking
 */
export function createCTARef(
  source: string,
  slot: CTASlot,
  action: string
): string {
  return `cta_${source}_${slot}_${action}`.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Validates a CTASourceContext object
 */
export function isValidSourceContext(ctx: Partial<CTASourceContext>): ctx is CTASourceContext {
  return !!(
    ctx.source &&
    ctx.slot &&
    ctx.entityType &&
    ctx.monthRef &&
    ctx.familyId &&
    ctx.ref
  );
}
