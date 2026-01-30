import { supabase } from '@/integrations/supabase/client';

export type EmailEventType = 
  // Security (always sent)
  | 'user.account_created' 
  | 'user.email_confirmed' 
  | 'user.password_reset_requested' 
  | 'user.password_changed' 
  | 'user.login_new_device'
  // Onboarding
  | 'onboarding.completed' 
  | 'onboarding.incomplete_24h' 
  | 'onboarding.incomplete_72h'
  | 'budget.first_created' 
  | 'budget.skipped' 
  | 'family.invite_sent'
  // Financial
  | 'budget.category_exceeded' 
  | 'budget.if_zeroed'
  | 'spending.decrease_detected' 
  | 'spending.increase_detected' 
  | 'spending.no_activity_7d'
  // Goals
  | 'goal.created' 
  | 'goal.progress_25' 
  | 'goal.progress_50' 
  | 'goal.progress_75'
  | 'goal.completed' 
  | 'goal.at_risk' 
  | 'goal.abandoned'
  // Behavior
  | 'behavior.pattern_changed' 
  | 'behavior.low_activity' 
  | 'behavior.month_balanced' 
  | 'behavior.month_above_average'
  // Family
  | 'family.invite_accepted' 
  | 'family.invite_expired' 
  | 'family.permission_changed'
  | 'family.member_removed' 
  | 'family.sensitive_action'
  // Education & Plans
  | 'education.content_released' 
  | 'plan.upgraded' 
  | 'plan.downgraded' 
  | 'plan.payment_failed';

interface SendEmailOptions {
  userId: string;
  familyId?: string;
  eventType: EmailEventType;
  payload?: Record<string, unknown>;
}

interface SendEmailResult {
  success: boolean;
  blocked?: boolean;
  reason?: string;
  emailId?: string;
  error?: string;
}

/**
 * Trigger an email event. The edge function handles rate limiting, 
 * user preferences, and template selection.
 */
export async function triggerEmailEvent(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        userId: options.userId,
        familyId: options.familyId,
        eventType: options.eventType,
        payload: options.payload || {},
      },
    });

    if (error) {
      console.error('[OIK Email] Edge function error:', error);
      return { success: false, error: error.message };
    }

    return data as SendEmailResult;
  } catch (err) {
    console.error('[OIK Email] Unexpected error:', err);
    return { success: false, error: 'Unexpected error sending email' };
  }
}

/**
 * Trigger welcome email after account creation
 */
export async function sendWelcomeEmail(userId: string, familyId: string, familyName?: string, userName?: string) {
  return triggerEmailEvent({
    userId,
    familyId,
    eventType: 'user.account_created',
    payload: { familyName, userName },
  });
}

/**
 * Trigger goal progress email
 */
export async function sendGoalProgressEmail(
  userId: string, 
  familyId: string, 
  progressPercent: number,
  goalTitle: string,
  targetAmount: string
) {
  let eventType: EmailEventType;
  
  if (progressPercent >= 100) {
    eventType = 'goal.completed';
  } else if (progressPercent >= 75) {
    eventType = 'goal.progress_75';
  } else if (progressPercent >= 50) {
    eventType = 'goal.progress_50';
  } else if (progressPercent >= 25) {
    eventType = 'goal.progress_25';
  } else {
    return { success: true, blocked: true, reason: 'progress_too_low' };
  }

  return triggerEmailEvent({
    userId,
    familyId,
    eventType,
    payload: { goalTitle, targetAmount, progressPercent },
  });
}

/**
 * Trigger budget exceeded email
 */
export async function sendBudgetExceededEmail(
  userId: string,
  familyId: string,
  categoryName: string,
  budgetAmount: string,
  currentAmount: string
) {
  return triggerEmailEvent({
    userId,
    familyId,
    eventType: 'budget.category_exceeded',
    payload: { categoryName, budgetAmount, currentAmount },
  });
}

/**
 * Trigger family invite email
 */
export async function sendFamilyInviteEmail(
  userId: string,
  familyId: string,
  familyName: string,
  inviterName: string,
  inviteUrl: string
) {
  return triggerEmailEvent({
    userId,
    familyId,
    eventType: 'family.invite_sent',
    payload: { familyName, inviterName, inviteUrl },
  });
}

/**
 * Trigger sensitive family action notification
 */
export async function sendSensitiveActionEmail(
  userId: string,
  familyId: string,
  actionDescription: string,
  actorName: string
) {
  return triggerEmailEvent({
    userId,
    familyId,
    eventType: 'family.sensitive_action',
    payload: { actionDescription, actorName },
  });
}
