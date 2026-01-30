import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Types
type EmailEventType = 
  | 'user.account_created' | 'user.email_confirmed' | 'user.password_reset_requested' 
  | 'user.password_changed' | 'user.login_new_device'
  | 'onboarding.completed' | 'onboarding.incomplete_24h' | 'onboarding.incomplete_72h'
  | 'budget.first_created' | 'budget.skipped' | 'family.invite_sent'
  | 'budget.category_exceeded' | 'budget.if_zeroed'
  | 'spending.decrease_detected' | 'spending.increase_detected' | 'spending.no_activity_7d'
  | 'goal.created' | 'goal.progress_25' | 'goal.progress_50' | 'goal.progress_75'
  | 'goal.completed' | 'goal.at_risk' | 'goal.abandoned'
  | 'behavior.pattern_changed' | 'behavior.low_activity' | 'behavior.month_balanced' | 'behavior.month_above_average'
  | 'family.invite_accepted' | 'family.invite_expired' | 'family.permission_changed'
  | 'family.member_removed' | 'family.sensitive_action'
  | 'education.content_released' | 'plan.upgraded' | 'plan.downgraded' | 'plan.payment_failed';

type EmailCategory = 'security' | 'financial' | 'goals' | 'education';

interface SendEmailRequest {
  userId: string;
  familyId?: string;
  eventType: EmailEventType;
  payload?: Record<string, unknown>;
}

// Email category mapping
function getEmailCategory(eventType: EmailEventType): EmailCategory {
  const securityEvents = [
    'user.account_created', 'user.email_confirmed', 
    'user.password_reset_requested', 'user.password_changed', 
    'user.login_new_device'
  ];
  const financialEvents = [
    'budget.category_exceeded', 'budget.if_zeroed',
    'spending.decrease_detected', 'spending.increase_detected',
    'spending.no_activity_7d', 'budget.first_created', 'budget.skipped'
  ];
  const goalsEvents = [
    'goal.created', 'goal.progress_25', 'goal.progress_50',
    'goal.progress_75', 'goal.completed', 'goal.at_risk',
    'goal.abandoned', 'behavior.pattern_changed', 'behavior.low_activity',
    'behavior.month_balanced', 'behavior.month_above_average'
  ];
  
  if (securityEvents.includes(eventType)) return 'security';
  if (financialEvents.includes(eventType)) return 'financial';
  if (goalsEvents.includes(eventType)) return 'goals';
  return 'education';
}

// Email templates
function getEmailTemplate(eventType: EmailEventType, payload: Record<string, unknown>): { subject: string; html: string } {
  const appUrl = Deno.env.get("APP_URL") || "https://oik-finance.lovable.app";
  const familyName = (payload.familyName as string) || '';
  const userName = (payload.userName as string) || '';
  
  const templates: Record<string, { subject: string; html: string }> = {
    // SECURITY
    'user.account_created': {
      subject: '🎉 Bem-vindo ao OIK - Sua conta foi criada!',
      html: buildTemplate({
        title: 'Conta criada com sucesso!',
        subtitle: familyName ? `Bem-vindos, ${familyName}!` : 'Bem-vindos!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Sua conta foi criada com sucesso no OIK! A partir de agora, você pode organizar as finanças da família com mais clareza.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #166534; margin: 0;">💚 Sem julgamentos, sem complicação. Apenas informação clara para decisões melhores.</p>
          </div>
          <p>🔒 Seus dados são privados e acessíveis apenas pela sua família.</p>
        `,
        ctaText: 'Acessar minha conta',
        ctaUrl: `${appUrl}/login`
      })
    },
    
    'user.password_reset_requested': {
      subject: '🔐 Recuperação de senha - OIK',
      html: buildTemplate({
        title: 'Recuperação de senha',
        content: `
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha. Se você não fez essa solicitação, ignore este e-mail.</p>
          <p>Se foi você, clique no botão abaixo para criar uma nova senha:</p>
        `,
        ctaText: 'Redefinir senha',
        ctaUrl: payload.resetUrl as string || `${appUrl}/reset-password`,
        footer: 'Este link expira em 1 hora por segurança.'
      })
    },
    
    'user.password_changed': {
      subject: '✅ Senha alterada com sucesso - OIK',
      html: buildTemplate({
        title: 'Senha alterada',
        content: `
          <p>Olá,</p>
          <p>Sua senha foi alterada com sucesso.</p>
          <p>Se você não fez essa alteração, entre em contato conosco imediatamente.</p>
        `,
        ctaText: 'Acessar minha conta',
        ctaUrl: `${appUrl}/login`
      })
    },
    
    'user.login_new_device': {
      subject: '🔔 Novo acesso detectado - OIK',
      html: buildTemplate({
        title: 'Novo acesso à sua conta',
        content: `
          <p>Olá,</p>
          <p>Detectamos um novo acesso à sua conta:</p>
          <ul style="color: #374151;">
            <li><strong>Dispositivo:</strong> ${payload.device || 'Não identificado'}</li>
            <li><strong>Localização:</strong> ${payload.location || 'Não identificada'}</li>
            <li><strong>Data:</strong> ${payload.date || new Date().toLocaleDateString('pt-BR')}</li>
          </ul>
          <p>Se foi você, pode ignorar este e-mail. Caso contrário, recomendamos alterar sua senha imediatamente.</p>
        `,
        ctaText: 'Alterar senha',
        ctaUrl: `${appUrl}/app/settings/security`
      })
    },
    
    // ONBOARDING
    'onboarding.completed': {
      subject: '🎯 Parabéns! Você completou a configuração - OIK',
      html: buildTemplate({
        title: 'Configuração concluída!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Você completou a configuração inicial do OIK! Agora você está pronto para ter uma visão completa das finanças da família.</p>
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0;">💡 <strong>Dica:</strong> Explore os relatórios e projeções para entender melhor seus gastos.</p>
          </div>
        `,
        ctaText: 'Ver meu painel',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'onboarding.incomplete_24h': {
      subject: '👋 Falta pouco para completar sua configuração - OIK',
      html: buildTemplate({
        title: 'Falta pouco!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Notamos que você ainda não completou a configuração do OIK. São apenas alguns passos para ter sua vida financeira organizada.</p>
          <p>Que tal continuar de onde parou?</p>
        `,
        ctaText: 'Continuar configuração',
        ctaUrl: `${appUrl}/app/onboarding`
      })
    },
    
    'onboarding.incomplete_72h': {
      subject: '⏰ Última chance: complete sua configuração - OIK',
      html: buildTemplate({
        title: 'Não deixe para depois!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Sua configuração ainda está incompleta. Sabemos que a vida é corrida, mas organizar as finanças leva apenas alguns minutos.</p>
          <p>Este é o último lembrete que enviaremos. Estamos aqui quando você precisar!</p>
        `,
        ctaText: 'Completar agora',
        ctaUrl: `${appUrl}/app/onboarding`
      })
    },
    
    // FINANCIAL
    'budget.category_exceeded': {
      subject: `⚠️ Orçamento ultrapassado: ${payload.categoryName || 'categoria'} - OIK`,
      html: buildTemplate({
        title: 'Orçamento ultrapassado',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>O orçamento da categoria <strong>${payload.categoryName || 'categoria'}</strong> foi ultrapassado.</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #92400e; margin: 0;">
              <strong>Planejado:</strong> R$ ${payload.budgetAmount || '0,00'}<br>
              <strong>Gasto atual:</strong> R$ ${payload.currentAmount || '0,00'}
            </p>
          </div>
          <p>Isso não é um problema, apenas uma informação para ajudar nas próximas decisões.</p>
        `,
        ctaText: 'Ver detalhes',
        ctaUrl: `${appUrl}/app/budget`
      })
    },
    
    'spending.no_activity_7d': {
      subject: '📊 Sentimos sua falta! - OIK',
      html: buildTemplate({
        title: 'Tudo bem por aí?',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Faz uma semana que não vemos novos lançamentos na sua conta. Se estiver tudo certo, ótimo!</p>
          <p>Mas se precisar de ajuda ou tiver alguma dúvida, estamos aqui. 💚</p>
        `,
        ctaText: 'Fazer um lançamento',
        ctaUrl: `${appUrl}/app/transactions`
      })
    },
    
    // GOALS
    'goal.created': {
      subject: `🎯 Nova meta criada: ${payload.goalTitle || 'sua meta'} - OIK`,
      html: buildTemplate({
        title: 'Meta criada!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Você criou uma nova meta: <strong>${payload.goalTitle || 'sua meta'}</strong>.</p>
          <p>Meta: R$ ${payload.targetAmount || '0,00'} até ${payload.dueDate || 'data não definida'}</p>
          <p>Vamos juntos alcançar esse objetivo! 🚀</p>
        `,
        ctaText: 'Ver minha meta',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.progress_50': {
      subject: `🎉 Metade do caminho! ${payload.goalTitle || 'Sua meta'} - OIK`,
      html: buildTemplate({
        title: 'Você está na metade!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Parabéns! Você já atingiu <strong>50%</strong> da meta <strong>${payload.goalTitle || 'sua meta'}</strong>.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #166534; margin: 0;">💪 Continue assim! Você está no caminho certo.</p>
          </div>
        `,
        ctaText: 'Ver progresso',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.completed': {
      subject: `🏆 Meta alcançada: ${payload.goalTitle || 'sua meta'}! - OIK`,
      html: buildTemplate({
        title: 'Parabéns! Meta alcançada!',
        content: `
          <p>Olá${userName ? `, ${userName}` : ''},</p>
          <p>Você conseguiu! A meta <strong>${payload.goalTitle || 'sua meta'}</strong> foi alcançada. 🎉</p>
          <p>Isso mostra seu comprometimento e disciplina. Comemore essa conquista!</p>
        `,
        ctaText: 'Criar nova meta',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    // FAMILY
    'family.invite_sent': {
      subject: `👨‍👩‍👧‍👦 Convite para a família ${payload.familyName || ''} - OIK`,
      html: buildTemplate({
        title: 'Você foi convidado!',
        content: `
          <p>Olá,</p>
          <p><strong>${payload.inviterName || 'Alguém'}</strong> convidou você para fazer parte da família <strong>${payload.familyName || ''}</strong> no OIK.</p>
          <p>Clique no botão abaixo para aceitar o convite e começar a organizar as finanças juntos.</p>
        `,
        ctaText: 'Aceitar convite',
        ctaUrl: payload.inviteUrl as string || `${appUrl}/invite`
      })
    },
    
    'family.sensitive_action': {
      subject: '⚠️ Ação importante na família - OIK',
      html: buildTemplate({
        title: 'Ação importante detectada',
        content: `
          <p>Olá,</p>
          <p>Uma ação importante foi realizada na sua família:</p>
          <p><strong>${payload.actionDescription || 'Ação não especificada'}</strong></p>
          <p>Por: ${payload.actorName || 'Membro da família'}</p>
          <p>Se você não reconhece essa ação, entre em contato conosco.</p>
        `,
        ctaText: 'Ver atividade',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    }
  };
  
  return templates[eventType] || {
    subject: 'Notificação do OIK',
    html: buildTemplate({
      title: 'Notificação',
      content: `<p>Você recebeu uma notificação do OIK.</p>`,
      ctaText: 'Acessar OIK',
      ctaUrl: appUrl
    })
  };
}

// Build email template
function buildTemplate(params: {
  title: string;
  subtitle?: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  const { title, subtitle, content, ctaText, ctaUrl, footer } = params;
  const appUrl = Deno.env.get("APP_URL") || "https://oik-finance.lovable.app";
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 40px;">
                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 16px; margin-bottom: 24px;">
                      <span style="font-size: 32px;">🏠</span>
                    </div>
                    <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">${title}</h1>
                    ${subtitle ? `<p style="color: #6b7280; font-size: 16px; margin: 0;">${subtitle}</p>` : ''}
                  </div>
                  
                  <!-- Content -->
                  <div style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                    ${content}
                  </div>
                  
                  ${ctaText && ctaUrl ? `
                  <!-- CTA -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      ${ctaText}
                    </a>
                  </div>
                  ` : ''}
                  
                  ${footer ? `
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">${footer}</p>
                  </div>
                  ` : ''}
                </td>
              </tr>
            </table>
            
            <!-- Email Footer -->
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              OIK - Finanças Familiares | <a href="${appUrl}/app/settings/notifications" style="color: #9ca3af;">Gerenciar notificações</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body: SendEmailRequest = await req.json();
    const { userId, familyId, eventType, payload = {} } = body;

    if (!userId || !eventType) {
      return new Response(
        JSON.stringify({ error: "userId and eventType are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authUser?.user?.email) {
      console.error("User not found:", authError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const email = authUser.user.email;
    const category = getEmailCategory(eventType);

    // Check rate limiting (via RPC)
    const { data: rateCheck } = await supabase.rpc('check_email_rate_limit', {
      p_user_id: userId,
      p_event_type: eventType,
      p_category: category
    });

    if (rateCheck && !rateCheck.allowed) {
      console.log(`Email blocked for ${userId}: ${rateCheck.reason}`);
      
      // Log blocked email
      await supabase.from('email_logs').insert({
        user_id: userId,
        family_id: familyId,
        event_type: eventType,
        category: category,
        recipient_email: email,
        subject: 'BLOCKED',
        status: 'blocked',
        blocked_reason: rateCheck.reason,
        metadata: { payload }
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          blocked: true, 
          reason: rateCheck.reason 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check user preferences (non-security only)
    if (category !== 'security') {
      const { data: prefCheck } = await supabase.rpc('check_email_preference', {
        p_user_id: userId,
        p_family_id: familyId,
        p_category: category
      });

      if (prefCheck === false) {
        console.log(`Email disabled by user preference: ${userId}, ${category}`);
        
        await supabase.from('email_logs').insert({
          user_id: userId,
          family_id: familyId,
          event_type: eventType,
          category: category,
          recipient_email: email,
          subject: 'PREFERENCE_DISABLED',
          status: 'blocked',
          blocked_reason: 'user_preference_disabled',
          metadata: { payload }
        });

        return new Response(
          JSON.stringify({ 
            success: false, 
            blocked: true, 
            reason: 'user_preference_disabled' 
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Get email template
    const template = getEmailTemplate(eventType, payload);

    // Send via Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "OIK <noreply@resend.dev>",
        to: [email],
        subject: template.subject,
        html: template.html,
      }),
    });

    const resendData = await resendResponse.json();

    // Log email
    await supabase.from('email_logs').insert({
      user_id: userId,
      family_id: familyId,
      event_type: eventType,
      category: category,
      recipient_email: email,
      subject: template.subject,
      template_id: eventType,
      status: resendResponse.ok ? 'sent' : 'failed',
      sent_at: resendResponse.ok ? new Date().toISOString() : null,
      provider_response: resendData,
      metadata: { payload }
    });

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: resendResponse.status, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Email sent successfully: ${eventType} to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: resendData.id,
        eventType,
        category
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
