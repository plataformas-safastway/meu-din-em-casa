
-- Corrigir função get_email_category - adicionar search_path
CREATE OR REPLACE FUNCTION public.get_email_category(p_event_type email_event_type)
 RETURNS email_preference_category
 LANGUAGE plpgsql
 IMMUTABLE
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN CASE
    WHEN p_event_type IN (
      'user.account_created', 'user.email_confirmed',
      'user.password_reset_requested', 'user.password_changed',
      'user.login_new_device'
    ) THEN 'security'::email_preference_category
    WHEN p_event_type IN (
      'budget.category_exceeded', 'budget.if_zeroed',
      'spending.decrease_detected', 'spending.increase_detected',
      'spending.no_activity_7d', 'budget.first_created', 'budget.skipped'
    ) THEN 'financial'::email_preference_category
    WHEN p_event_type IN (
      'goal.created', 'goal.progress_25', 'goal.progress_50',
      'goal.progress_75', 'goal.completed', 'goal.at_risk',
      'goal.abandoned', 'behavior.pattern_changed', 'behavior.low_activity',
      'behavior.month_balanced', 'behavior.month_above_average'
    ) THEN 'goals'::email_preference_category
    ELSE 'education'::email_preference_category
  END;
END;
$function$;
