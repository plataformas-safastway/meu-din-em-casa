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

// Email templates with official OIK copy
function getEmailTemplate(eventType: EmailEventType, payload: Record<string, unknown>): { subject: string; html: string } {
  const appUrl = Deno.env.get("APP_URL") || "https://oik-finance.lovable.app";
  
  const templates: Record<string, { subject: string; html: string }> = {
    // ══════════════════════════════════════════════════════════════════
    // 🔐 CONTA & SEGURANÇA
    // ══════════════════════════════════════════════════════════════════
    
    'user.account_created': {
      subject: 'Conta criada com sucesso',
      html: buildTemplate({
        title: 'Conta criada com sucesso! 🎉',
        content: `
          <p>Oi,</p>
          <p>A conta da sua família foi criada com sucesso.</p>
          <p>A partir de agora, vocês já podem organizar as finanças da família com mais clareza, acompanhar os gastos e entender melhor o que está acontecendo com o dinheiro.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #166534; margin: 0; font-style: italic;">💚 Sem julgamentos, sem complicação. Apenas informação clara para decisões melhores.</p>
          </div>
          <p>🔒 Seus dados são privados e acessíveis apenas pela sua família.</p>
        `,
        ctaText: 'Acessar minha conta',
        ctaUrl: `${appUrl}/login`,
        signoff: 'Sejam bem-vindos.<br>Estamos aqui para ajudar a trazer mais tranquilidade para a vida financeira da família.'
      })
    },
    
    'user.email_confirmed': {
      subject: 'E-mail confirmado com sucesso',
      html: buildTemplate({
        title: 'E-mail confirmado com sucesso ✅',
        content: `
          <p>Oi,</p>
          <p>Tudo certo por aqui.<br>Seu e-mail foi confirmado e sua conta está ativa.</p>
          <p>Agora você já pode usar o OIK com tranquilidade e segurança.</p>
          <p>Sempre que precisar, estaremos por perto.</p>
        `,
        ctaText: 'Acessar OIK',
        ctaUrl: `${appUrl}/login`
      })
    },
    
    'user.password_reset_requested': {
      subject: 'Vamos redefinir sua senha',
      html: buildTemplate({
        title: 'Vamos redefinir sua senha 🔁',
        content: `
          <p>Oi,</p>
          <p>Recebemos um pedido para redefinir sua senha no OIK.</p>
          <p>Para continuar, basta seguir o link abaixo e criar uma nova senha com calma.<br>Se não foi você, ignore este e-mail.</p>
          <p>Cuidar da sua segurança é parte do nosso compromisso.</p>
        `,
        ctaText: 'Redefinir senha',
        ctaUrl: payload.resetUrl as string || `${appUrl}/reset-password`
      })
    },
    
    'user.password_changed': {
      subject: 'Sua senha foi alterada',
      html: buildTemplate({
        title: 'Sua senha foi alterada 🔐',
        content: `
          <p>Oi,</p>
          <p>Sua senha foi alterada com sucesso.</p>
          <p>Se foi você, está tudo certo.<br>Se não reconhece essa alteração, recomendamos entrar em contato conosco imediatamente.</p>
          <p>Seguimos atentos para proteger sua conta.</p>
        `,
        ctaText: 'Acessar OIK',
        ctaUrl: `${appUrl}/login`
      })
    },
    
    'user.login_new_device': {
      subject: 'Novo acesso detectado',
      html: buildTemplate({
        title: 'Novo acesso detectado 🔔',
        content: `
          <p>Oi,</p>
          <p>Detectamos um novo acesso à sua conta:</p>
          <ul style="color: #374151; padding-left: 20px;">
            <li><strong>Dispositivo:</strong> ${payload.device || 'Não identificado'}</li>
            <li><strong>Localização:</strong> ${payload.location || 'Não identificada'}</li>
            <li><strong>Data:</strong> ${payload.date || new Date().toLocaleDateString('pt-BR')}</li>
          </ul>
          <p>Se foi você, pode ignorar este e-mail.<br>Caso contrário, recomendamos alterar sua senha imediatamente.</p>
        `,
        ctaText: 'Alterar senha',
        ctaUrl: `${appUrl}/app/settings/security`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 🚀 ONBOARDING & PRIMEIROS PASSOS
    // ══════════════════════════════════════════════════════════════════
    
    'onboarding.completed': {
      subject: 'Configuração concluída',
      html: buildTemplate({
        title: 'Configuração concluída! 🎯',
        content: `
          <p>Oi,</p>
          <p>Você completou a configuração inicial do OIK.</p>
          <p>Agora você está pronto para ter uma visão completa das finanças da família.</p>
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="color: #1e40af; margin: 0;">💡 <strong>Dica:</strong> Explore os relatórios e projeções para entender melhor seus gastos.</p>
          </div>
        `,
        ctaText: 'Ver meu painel',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'onboarding.incomplete_24h': {
      subject: 'Falta pouco para completar',
      html: buildTemplate({
        title: 'Falta pouco! 👋',
        content: `
          <p>Oi,</p>
          <p>Notamos que você ainda não completou a configuração do OIK.</p>
          <p>São apenas alguns passos para ter sua vida financeira organizada.</p>
          <p>Que tal continuar de onde parou?</p>
        `,
        ctaText: 'Continuar configuração',
        ctaUrl: `${appUrl}/app/onboarding`
      })
    },
    
    'onboarding.incomplete_72h': {
      subject: 'Estamos por aqui, no seu tempo',
      html: buildTemplate({
        title: 'Estamos por aqui, no seu tempo ⏰',
        content: `
          <p>Oi,</p>
          <p>Passando só para lembrar que seu cadastro ainda não foi finalizado.</p>
          <p>Sem pressa.<br>Quando fizer sentido, é só voltar ao app e continuar de onde parou.</p>
          <p>O OIK respeita seu ritmo.</p>
        `,
        ctaText: 'Continuar cadastro',
        ctaUrl: `${appUrl}/app/onboarding`
      })
    },
    
    'budget.first_created': {
      subject: 'Seu primeiro orçamento foi criado',
      html: buildTemplate({
        title: 'Orçamento criado! 📊',
        content: `
          <p>Oi,</p>
          <p>Seu primeiro orçamento foi criado com sucesso.</p>
          <p>Agora você tem uma referência para acompanhar seus gastos e tomar decisões mais conscientes.</p>
          <p>Lembre-se: o orçamento é um guia, não uma prisão. Ajuste quando precisar.</p>
        `,
        ctaText: 'Ver meu orçamento',
        ctaUrl: `${appUrl}/app/budget`
      })
    },
    
    'budget.skipped': {
      subject: 'Quando quiser, a gente monta juntos',
      html: buildTemplate({
        title: 'Quando quiser, a gente monta juntos 🧩',
        content: `
          <p>Oi,</p>
          <p>Percebemos que você pulou a etapa de criar seu orçamento — e tudo bem.</p>
          <p>Essa parte existe para ajudar, não para engessar.<br>Você pode montar agora ou ajustar depois, do seu jeito.</p>
          <p>Clareza não precisa ser imediata.<br>Ela se constrói.</p>
        `,
        ctaText: 'Montar orçamento',
        ctaUrl: `${appUrl}/app/budget`
      })
    },
    
    'family.invite_sent': {
      subject: `${payload.inviterName || 'Alguém'} convidou você para a família ${payload.familyName || ''}`,
      html: buildTemplate({
        title: 'Você foi convidado! 🎉',
        content: `
          <p>Oi,</p>
          <p><strong>${payload.inviterName || 'Um membro'}</strong> convidou você para fazer parte da família <strong>${payload.familyName || 'Família'}</strong> no OIK.</p>
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p style="color: #166534; font-size: 14px; margin: 0; line-height: 1.5;">
              Com o OIK, vocês podem organizar as finanças da família de forma colaborativa, acompanhar gastos e planejar o futuro juntos.
            </p>
          </div>
        `,
        ctaText: 'Aceitar convite',
        ctaUrl: payload.inviteUrl as string || `${appUrl}/invite`,
        footer: 'Se você não esperava este convite, pode ignorar este e-mail.'
      })
    },
    
    'family.invite_accepted': {
      subject: 'Sua família agora faz parte do OIK',
      html: buildTemplate({
        title: 'Sua família agora faz parte do OIK 👤',
        content: `
          <p>Oi,</p>
          <p>Um membro da sua família aceitou o convite para participar do OIK.</p>
          <p>Organizar juntos ajuda a alinhar decisões e evitar ruídos no caminho.<br>Agora vocês podem construir essa clareza em conjunto.</p>
          <p>Seguimos acompanhando vocês.</p>
        `,
        ctaText: 'Ver família',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 💰 AÇÕES FINANCEIRAS RELEVANTES
    // ══════════════════════════════════════════════════════════════════
    
    'budget.category_exceeded': {
      subject: `Orçamento ultrapassado: ${payload.categoryName || 'categoria'}`,
      html: buildTemplate({
        title: 'Orçamento ultrapassado ⚠️',
        content: `
          <p>Oi,</p>
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
    
    'budget.if_zeroed': {
      subject: 'Um ponto de atenção no seu orçamento',
      html: buildTemplate({
        title: 'Um ponto de atenção no seu orçamento ⚠️',
        content: `
          <p>Oi,</p>
          <p>O indicador (+/-) IF chegou a zero neste mês.</p>
          <p>Isso não é um erro — é um sinal.<br>Talvez seja hora de rever prioridades, ajustar categorias ou apenas observar.</p>
          <p>Decisão boa começa com informação clara.</p>
        `,
        ctaText: 'Ver orçamento',
        ctaUrl: `${appUrl}/app/budget`
      })
    },
    
    'spending.decrease_detected': {
      subject: 'Redução de gastos detectada',
      html: buildTemplate({
        title: 'Redução de gastos detectada 📉',
        content: `
          <p>Oi,</p>
          <p>Identificamos uma redução nos seus gastos recentes.</p>
          <p>Isso pode ser resultado de um esforço consciente ou simplesmente uma variação natural.</p>
          <p>O importante é perceber o movimento e decidir os próximos passos.</p>
        `,
        ctaText: 'Ver análise',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'spending.increase_detected': {
      subject: 'Um gasto chamou atenção este mês',
      html: buildTemplate({
        title: 'Um gasto chamou atenção este mês 📈',
        content: `
          <p>Oi,</p>
          <p>Identificamos um aumento relevante em alguns gastos recentes.</p>
          <p>Pode ser algo pontual.<br>Ou pode ser um padrão começando a se formar.</p>
          <p>Vale a pena olhar com calma e decidir o próximo passo.<br>O OIK está aqui para apoiar essa leitura.</p>
        `,
        ctaText: 'Ver detalhes',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'spending.no_activity_7d': {
      subject: 'O OIK continua por aqui',
      html: buildTemplate({
        title: 'O OIK continua por aqui 🔍',
        content: `
          <p>Oi,</p>
          <p>Faz um tempo que não vemos movimentações no seu OIK.</p>
          <p>Sem cobrança.<br>Só um lembrete de que pequenas atualizações já ajudam bastante.</p>
          <p>Quando fizer sentido, é só voltar.</p>
        `,
        ctaText: 'Acessar OIK',
        ctaUrl: `${appUrl}/app`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 🎯 METAS & COMPORTAMENTO
    // ══════════════════════════════════════════════════════════════════
    
    'goal.created': {
      subject: `Nova meta criada: ${payload.goalTitle || 'sua meta'}`,
      html: buildTemplate({
        title: 'Meta criada! 🎯',
        content: `
          <p>Oi,</p>
          <p>Você criou uma nova meta: <strong>${payload.goalTitle || 'sua meta'}</strong>.</p>
          <p>Meta: R$ ${payload.targetAmount || '0,00'}</p>
          <p>Vamos juntos alcançar esse objetivo!</p>
        `,
        ctaText: 'Ver minha meta',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.progress_25': {
      subject: 'Sua meta está avançando',
      html: buildTemplate({
        title: 'Sua meta está avançando 📈',
        content: `
          <p>Oi,</p>
          <p>Você atingiu mais um marco importante da sua meta financeira.</p>
          <p>Progresso não é sobre velocidade.<br>É sobre constância.</p>
          <p>Siga no seu ritmo — cada passo conta.</p>
        `,
        ctaText: 'Ver progresso',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.progress_50': {
      subject: 'Sua meta está avançando',
      html: buildTemplate({
        title: 'Sua meta está avançando 📈',
        content: `
          <p>Oi,</p>
          <p>Você atingiu mais um marco importante da sua meta financeira — <strong>metade do caminho</strong>!</p>
          <p>Progresso não é sobre velocidade.<br>É sobre constância.</p>
          <p>Siga no seu ritmo — cada passo conta.</p>
        `,
        ctaText: 'Ver progresso',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.progress_75': {
      subject: 'Sua meta está avançando',
      html: buildTemplate({
        title: 'Sua meta está avançando 📈',
        content: `
          <p>Oi,</p>
          <p>Você atingiu mais um marco importante da sua meta financeira — <strong>75% concluído</strong>!</p>
          <p>Progresso não é sobre velocidade.<br>É sobre constância.</p>
          <p>Siga no seu ritmo — cada passo conta.</p>
        `,
        ctaText: 'Ver progresso',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.completed': {
      subject: `Meta alcançada: ${payload.goalTitle || 'sua meta'}!`,
      html: buildTemplate({
        title: 'Parabéns! Meta alcançada! 🏆',
        content: `
          <p>Oi,</p>
          <p>Você conseguiu! A meta <strong>${payload.goalTitle || 'sua meta'}</strong> foi alcançada.</p>
          <p>Isso mostra seu comprometimento e disciplina.<br>Comemore essa conquista!</p>
        `,
        ctaText: 'Criar nova meta',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.at_risk': {
      subject: 'Um cuidado com uma das suas metas',
      html: buildTemplate({
        title: 'Um cuidado com uma das suas metas ⚠️',
        content: `
          <p>Oi,</p>
          <p>Uma das suas metas está há algum tempo sem novos aportes.</p>
          <p>Não é um alerta de cobrança.<br>É só um convite à reflexão:<br>essa meta ainda faz sentido agora?</p>
          <p>Se precisar ajustar, está tudo bem.</p>
        `,
        ctaText: 'Ver metas',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'goal.abandoned': {
      subject: 'Tudo bem ajustar o caminho',
      html: buildTemplate({
        title: 'Tudo bem ajustar o caminho ❌',
        content: `
          <p>Oi,</p>
          <p>Percebemos que uma das suas metas ficou sem movimentação por um período maior.</p>
          <p>Às vezes as prioridades mudam — e isso faz parte da vida real.<br>Rever metas também é uma forma de cuidado financeiro.</p>
          <p>Quando quiser, você pode criar uma nova.</p>
        `,
        ctaText: 'Gerenciar metas',
        ctaUrl: `${appUrl}/app/goals`
      })
    },
    
    'behavior.pattern_changed': {
      subject: 'Um padrão diferente apareceu',
      html: buildTemplate({
        title: 'Um padrão diferente apareceu 🔄',
        content: `
          <p>Oi,</p>
          <p>Notamos uma mudança no seu padrão de gastos recente.</p>
          <p>Não é bom nem ruim por si só.<br>É apenas informação para te ajudar a decidir melhor.</p>
          <p>Clareza começa por perceber.</p>
        `,
        ctaText: 'Ver análise',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'behavior.low_activity': {
      subject: 'O OIK continua por aqui',
      html: buildTemplate({
        title: 'O OIK continua por aqui 🔍',
        content: `
          <p>Oi,</p>
          <p>Faz um tempo que não vemos movimentações no seu OIK.</p>
          <p>Sem cobrança.<br>Só um lembrete de que pequenas atualizações já ajudam bastante.</p>
          <p>Quando fizer sentido, é só voltar.</p>
        `,
        ctaText: 'Acessar OIK',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'behavior.month_balanced': {
      subject: 'Um mês mais equilibrado',
      html: buildTemplate({
        title: 'Um mês mais equilibrado 🧘',
        content: `
          <p>Oi,</p>
          <p>Seu mês financeiro esteve mais equilibrado do que o habitual.</p>
          <p>Isso mostra mais consciência e menos impulso.<br>Mesmo mudanças sutis fazem diferença no longo prazo.</p>
          <p>Bom trabalho.</p>
        `,
        ctaText: 'Ver resumo',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'behavior.month_above_average': {
      subject: 'Um ótimo resultado este mês',
      html: buildTemplate({
        title: 'Um ótimo resultado este mês 🔥',
        content: `
          <p>Oi,</p>
          <p>Seu desempenho financeiro neste mês ficou acima da sua média histórica.</p>
          <p>Mais do que comemorar, vale observar o que funcionou.<br>Esses aprendizados ajudam nos próximos passos.</p>
          <p>Seguimos juntos.</p>
        `,
        ctaText: 'Ver análise',
        ctaUrl: `${appUrl}/app`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 👨‍👩‍👧‍👦 FAMÍLIA, COMPARTILHAMENTO & COLABORAÇÃO
    // ══════════════════════════════════════════════════════════════════
    
    'family.invite_expired': {
      subject: 'Convite expirado',
      html: buildTemplate({
        title: 'Convite expirado ❌',
        content: `
          <p>Oi,</p>
          <p>O convite enviado para um membro da sua família expirou.</p>
          <p>Se ainda fizer sentido, você pode enviar um novo a qualquer momento.<br>Organizar em conjunto continua sendo uma escolha possível.</p>
        `,
        ctaText: 'Enviar novo convite',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    },
    
    'family.permission_changed': {
      subject: 'Permissões atualizadas',
      html: buildTemplate({
        title: 'Permissões atualizadas 🔐',
        content: `
          <p>Oi,</p>
          <p>As permissões de acesso de um membro da família foram alteradas.</p>
          <p>Essa mensagem é apenas para manter transparência entre todos.<br>Clareza também é parte da organização financeira.</p>
        `,
        ctaText: 'Ver família',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    },
    
    'family.member_removed': {
      subject: 'Atualização na sua família do OIK',
      html: buildTemplate({
        title: 'Atualização na sua família do OIK 🚫',
        content: `
          <p>Oi,</p>
          <p>Um membro foi removido da sua família no OIK.</p>
          <p>Se precisar ajustar acessos ou rever configurações, tudo pode ser feito no app.</p>
          <p>Seguimos à disposição.</p>
        `,
        ctaText: 'Ver família',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    },
    
    'family.sensitive_action': {
      subject: 'Uma ação importante foi realizada',
      html: buildTemplate({
        title: 'Uma ação importante foi realizada ⚠️',
        content: `
          <p>Oi,</p>
          <p>Uma ação sensível foi realizada por outro membro da sua família no OIK<br>(ex.: alteração de orçamento ou meta).</p>
          <p>Essa mensagem é apenas para garantir transparência.<br>Se quiser revisar, o histórico está disponível no app.</p>
        `,
        ctaText: 'Ver atividade',
        ctaUrl: `${appUrl}/app/settings/family`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 💳 PLANOS & PAGAMENTOS
    // ══════════════════════════════════════════════════════════════════
    
    'plan.upgraded': {
      subject: 'Plano atualizado com sucesso',
      html: buildTemplate({
        title: 'Plano atualizado com sucesso 🧾',
        content: `
          <p>Oi,</p>
          <p>Seu plano foi atualizado.</p>
          <p>Agora você tem acesso a novos recursos para acompanhar sua vida financeira com mais profundidade.</p>
          <p>Use no seu ritmo.<br>O OIK continua simples, mesmo crescendo com você.</p>
        `,
        ctaText: 'Explorar recursos',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'plan.downgraded': {
      subject: 'Plano ajustado',
      html: buildTemplate({
        title: 'Plano ajustado 🧾',
        content: `
          <p>Oi,</p>
          <p>Seu plano foi ajustado conforme solicitado.</p>
          <p>Nada muda no que é essencial:<br>clareza, organização e cuidado continuam aqui.</p>
          <p>Se precisar, é só ajustar novamente.</p>
        `,
        ctaText: 'Acessar OIK',
        ctaUrl: `${appUrl}/app`
      })
    },
    
    'plan.payment_failed': {
      subject: 'Tivemos um problema com o pagamento',
      html: buildTemplate({
        title: 'Tivemos um problema com o pagamento ⚠️',
        content: `
          <p>Oi,</p>
          <p>Identificamos uma falha no pagamento do seu plano.</p>
          <p>Pode ter sido algo pontual.<br>Quando puder, vale conferir para evitar interrupções.</p>
          <p>Se precisar de ajuda, estamos por aqui.</p>
        `,
        ctaText: 'Atualizar pagamento',
        ctaUrl: `${appUrl}/app/settings/billing`
      })
    },

    // ══════════════════════════════════════════════════════════════════
    // 📚 EDUCAÇÃO
    // ══════════════════════════════════════════════════════════════════
    
    'education.content_released': {
      subject: 'Novo conteúdo disponível',
      html: buildTemplate({
        title: 'Novo conteúdo disponível 📚',
        content: `
          <p>Oi,</p>
          <p>Temos um novo conteúdo disponível para você.</p>
          <p>Educação financeira não precisa ser complicada.<br>Pequenos aprendizados fazem grandes diferenças.</p>
        `,
        ctaText: 'Ver conteúdo',
        ctaUrl: `${appUrl}/app/learn`
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

// Build email template with OIK branding
function buildTemplate(params: {
  title: string;
  subtitle?: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
  signoff?: string;
}): string {
  const { title, subtitle, content, ctaText, ctaUrl, footer, signoff } = params;
  const appUrl = Deno.env.get("APP_URL") || "https://oik-finance.lovable.app";
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
              
              <!-- Logo -->
              <tr>
                <td align="center" style="padding-bottom: 32px;">
                  <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 32px;">💰</span>
                  </div>
                </td>
              </tr>
              
              <!-- Main Card -->
              <tr>
                <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                  
                  <!-- Header -->
                  <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                    ${title}
                  </h1>
                  ${subtitle ? `<p style="margin: 0 0 24px 0; font-size: 16px; color: #71717a; text-align: center;">${subtitle}</p>` : '<div style="margin-bottom: 24px;"></div>'}
                  
                  <!-- Content -->
                  <div style="font-size: 16px; color: #374151; line-height: 1.6;">
                    ${content}
                  </div>
                  
                  ${ctaText && ctaUrl ? `
                  <!-- CTA Button -->
                  <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 24px;">
                    <tr>
                      <td align="center">
                        <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                          ${ctaText}
                        </a>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  
                  ${signoff ? `
                  <!-- Signoff -->
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 24px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                      ${signoff}
                    </p>
                  </div>
                  ` : ''}
                  
                  ${footer ? `
                  <!-- Security Note -->
                  <p style="margin: 24px 0 0 0; font-size: 12px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                    ${footer}
                  </p>
                  ` : ''}
                  
                  <!-- Signature -->
                  <p style="margin: 24px 0 0 0; font-size: 14px; color: #71717a; text-align: left;">
                    Equipe OIK
                  </p>
                  
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding-top: 24px;">
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                    OIK - Finanças em família
                  </p>
                  <p style="margin: 8px 0 0 0; font-size: 11px; color: #d4d4d8;">
                    <a href="${appUrl}/app/settings/notifications" style="color: #a1a1aa; text-decoration: underline;">Gerenciar notificações</a>
                  </p>
                </td>
              </tr>
              
            </table>
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
        blocked_reason: rateCheck.reason
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

    // Check user preferences (security emails always sent)
    if (category !== 'security') {
      const { data: prefCheck } = await supabase.rpc('check_email_preference', {
        p_user_id: userId,
        p_family_id: familyId,
        p_category: category
      });

      if (prefCheck && !prefCheck.allowed) {
        console.log(`Email blocked by preference for ${userId}: category ${category}`);
        
        await supabase.from('email_logs').insert({
          user_id: userId,
          family_id: familyId,
          event_type: eventType,
          category: category,
          recipient_email: email,
          subject: 'BLOCKED',
          status: 'blocked',
          blocked_reason: 'user_preference_disabled'
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
    const { subject, html } = getEmailTemplate(eventType, payload);

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "OIK <onboarding@resend.dev>",
        to: [email],
        subject: subject,
        html: html,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Error sending email:", errorData);
      
      await supabase.from('email_logs').insert({
        user_id: userId,
        family_id: familyId,
        event_type: eventType,
        category: category,
        recipient_email: email,
        subject: subject,
        status: 'failed',
        provider_response: { error: errorData }
      });

      throw new Error("Failed to send email");
    }

    const result = await emailResponse.json();
    console.log(`Email sent successfully: ${eventType} to ${email}`);

    // Log successful email
    await supabase.from('email_logs').insert({
      user_id: userId,
      family_id: familyId,
      event_type: eventType,
      category: category,
      recipient_email: email,
      subject: subject,
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_response: result
    });

    return new Response(
      JSON.stringify({ success: true, emailId: result.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
