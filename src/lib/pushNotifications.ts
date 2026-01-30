import type { EmailEventType } from './emailEvents';

/**
 * Push notification messages for all OIK events
 * Tone: human, respectful, no pressure, no marketing
 * Max ~90 characters per message
 */
export const PUSH_MESSAGES: Record<EmailEventType, string> = {
  // 🔐 Security
  'user.account_created': 'Bem-vindo ao OIK. Sua jornada por mais clareza começa agora.',
  'user.email_confirmed': 'E-mail confirmado. Sua conta já está ativa.',
  'user.password_reset_requested': 'Recebemos um pedido para redefinir sua senha.',
  'user.password_changed': 'Sua senha foi alterada com sucesso.',
  'user.login_new_device': 'Novo acesso detectado na sua conta OIK.',

  // 🚀 Onboarding
  'onboarding.completed': 'Tudo pronto! Agora o OIK pode te acompanhar de verdade.',
  'onboarding.incomplete_24h': 'Quando quiser, é só voltar e concluir seu cadastro.',
  'onboarding.incomplete_72h': 'Seguimos por aqui, respeitando seu tempo.',
  'budget.first_created': 'Seu primeiro orçamento está pronto. Bom começo.',
  'budget.skipped': 'Você pode criar seu orçamento quando fizer sentido.',
  'family.invite_sent': 'Convite enviado. Organizar juntos faz diferença.',

  // 💰 Financial
  'budget.category_exceeded': 'Uma categoria passou do valor planejado este mês.',
  'budget.if_zeroed': 'O indicador (+/–) IF chegou a zero.',
  'spending.decrease_detected': 'Boa notícia: alguns gastos diminuíram recentemente.',
  'spending.increase_detected': 'Um aumento de gasto chamou atenção este mês.',
  'spending.no_activity_7d': 'Faz alguns dias que não vemos movimentações por aqui.',

  // 🎯 Goals
  'goal.created': 'Nova meta criada. Um bom passo começa com intenção.',
  'goal.progress_25': 'Sua meta está avançando. Constância importa.',
  'goal.progress_50': 'Sua meta está avançando. Constância importa.',
  'goal.progress_75': 'Sua meta está avançando. Constância importa.',
  'goal.completed': 'Parabéns! Uma meta foi concluída.',
  'goal.at_risk': 'Uma meta está sem movimentação há algum tempo.',
  'goal.abandoned': 'Talvez seja hora de revisar uma meta.',

  // 🧘 Behavior
  'behavior.pattern_changed': 'Notamos um padrão diferente nos seus gastos.',
  'behavior.low_activity': 'O OIK continua aqui quando você quiser voltar.',
  'behavior.month_balanced': 'Seu mês esteve mais equilibrado que o habitual.',
  'behavior.month_above_average': 'Resultado acima da sua média este mês. Bom trabalho.',

  // 👨‍👩‍👧‍👦 Family
  'family.invite_accepted': 'Agora sua família também faz parte do OIK.',
  'family.invite_expired': 'Um convite para a família expirou.',
  'family.permission_changed': 'As permissões de um membro foram atualizadas.',
  'family.member_removed': 'Houve uma alteração nos membros da sua família.',
  'family.sensitive_action': 'Uma ação importante foi feita por outro membro da família.',

  // 💳 Plans & Education
  'education.content_released': 'Novo conteúdo disponível para você.',
  'plan.upgraded': 'Seu plano foi atualizado com sucesso.',
  'plan.downgraded': 'Seu plano foi ajustado.',
  'plan.payment_failed': 'Detectamos um problema com o pagamento do plano.',
};

/**
 * Get push notification message for an event type
 */
export function getPushMessage(eventType: EmailEventType): string {
  return PUSH_MESSAGES[eventType] || 'Você tem uma nova notificação do OIK.';
}

/**
 * Show a local push notification (for PWA)
 * This uses the Web Notifications API
 */
export async function showLocalNotification(
  eventType: EmailEventType,
  options?: {
    tag?: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
  }
): Promise<boolean> {
  // Check if notifications are supported and permitted
  if (!('Notification' in window)) {
    console.warn('[OIK Push] Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[OIK Push] Notification permission not granted');
    return false;
  }

  try {
    const message = getPushMessage(eventType);
    
    // Try to use service worker for better reliability
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification('OIK', {
        body: message,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: options?.tag || eventType,
        data: { eventType, ...options?.data },
        requireInteraction: options?.requireInteraction ?? false,
        silent: false,
      });
    } else {
      // Fallback to basic notification
      new Notification('OIK', {
        body: message,
        icon: '/icons/icon-192x192.png',
        tag: options?.tag || eventType,
      });
    }

    return true;
  } catch (error) {
    console.error('[OIK Push] Error showing notification:', error);
    return false;
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

/**
 * Check if push notifications are available and enabled
 */
export function isPushAvailable(): boolean {
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'granted'
  );
}
