/**
 * ============================================================
 * FAQ DO DASHBOARD (ADMIN / CS / OPERAÇÃO)
 * ============================================================
 * 
 * Este arquivo contém:
 * A) Conteúdos EXCLUSIVOS do Dashboard (gestão, integrações, auditoria)
 * B) Conteúdos do App úteis para SUPORTE (para CS entender e explicar ao usuário)
 * 
 * ⚠️ REGRA: O FAQ do Dashboard PODE conter informações do App
 *            O FAQ do App NUNCA pode conter informações do Dashboard
 * ============================================================
 */

export interface DashboardHelpArticle {
  id: string;
  title: string;
  category: "admin-users" | "admin-roles" | "admin-integrations" | "admin-audit" | "admin-lgpd" | "admin-cs" | "admin-security" | "app-support-transactions" | "app-support-import" | "app-support-budget" | "app-support-family" | "app-support-general";
  icon: string;
  summary: string;
  steps: Array<{
    title: string;
    description: string;
    tip?: string;
  }>;
  keywords: string[];
  audience: "admin-only" | "cs-only" | "support-reference";
}

export interface DashboardFAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  audience: "admin-only" | "cs-only" | "support-reference";
}

export const DASHBOARD_HELP_VERSION = "29/01/2026 v2";

// =====================================================
// LABELS DE CATEGORIA DO DASHBOARD
// =====================================================
export const dashboardCategoryLabels: Record<string, string> = {
  // Exclusivos do Dashboard
  "admin-users": "Gestão de Usuários",
  "admin-roles": "Perfis e Permissões",
  "admin-integrations": "Integrações",
  "admin-audit": "Auditoria e Logs",
  "admin-lgpd": "LGPD e Governança",
  "admin-cs": "Customer Success",
  "admin-security": "Segurança Técnica",
  // Referência do App para Suporte
  "app-support-transactions": "📱 App: Lançamentos",
  "app-support-import": "📱 App: Importação",
  "app-support-budget": "📱 App: Orçamento",
  "app-support-family": "📱 App: Família",
  "app-support-general": "📱 App: Geral",
};

// =====================================================
// ARTIGOS DO DASHBOARD
// =====================================================
export const dashboardHelpArticles: DashboardHelpArticle[] = [
  // ===== GESTÃO DE USUÁRIOS ADMIN =====
  {
    id: "admin-user-management",
    title: "Gestão de Usuários Administrativos",
    category: "admin-users",
    icon: "👥",
    summary: "Como gerenciar colaboradores do Dashboard",
    audience: "admin-only",
    steps: [
      {
        title: "Acesse Usuários > Colaboradores Admin",
        description: "Na aba Colaboradores Admin você vê todos os usuários com acesso ao Dashboard administrativo.",
      },
      {
        title: "Criar novo colaborador",
        description: "Clique em 'Novo Colaborador'. Informe nome, email e selecione o papel (role). Uma senha temporária de 20 caracteres será gerada.",
        tip: "O colaborador DEVE trocar a senha no primeiro login.",
      },
      {
        title: "Editar colaborador",
        description: "Clique no colaborador para abrir detalhes. Você pode alterar nome, papel e status (ativo/inativo).",
      },
      {
        title: "Resetar senha",
        description: "Use 'Resetar Senha' para gerar nova senha temporária. O colaborador deverá alterá-la no próximo login.",
      },
      {
        title: "Desativar vs Excluir",
        description: "SEMPRE prefira desativar (is_active=false). Isso mantém o histórico de auditoria. Exclusão física é restrita a MASTER.",
        tip: "Soft delete preserva evidências para compliance.",
      },
    ],
    keywords: ["usuário", "admin", "colaborador", "criar", "editar", "desativar", "senha"],
  },
  
  {
    id: "admin-roles-hierarchy",
    title: "Hierarquia de Papéis (Roles)",
    category: "admin-roles",
    icon: "🏛️",
    summary: "Entenda os papéis e suas permissões no Dashboard",
    audience: "admin-only",
    steps: [
      {
        title: "MASTER",
        description: "Papel supremo. Pode criar outros MASTER, gerenciar todos os papéis, acessar todos os módulos sem restrição.",
        tip: "Use com extrema cautela. Recomendado: máximo 2 usuários MASTER.",
      },
      {
        title: "ADMIN",
        description: "Gerencia colaboradores (exceto MASTER), configura integrações, acessa métricas e relatórios.",
      },
      {
        title: "CUSTOMER_SUCCESS (CS)",
        description: "Acesso a métricas de engajamento, saúde de usuários, sinalização de churn. Não edita configurações técnicas.",
      },
      {
        title: "FINANCEIRO",
        description: "Acesso a relatórios financeiros, métricas de receita, integrações de pagamento.",
      },
      {
        title: "TECNOLOGIA",
        description: "Acesso a logs técnicos, integrações, configurações de API, monitoramento.",
      },
      {
        title: "SUPORTE",
        description: "Acesso limitado a FAQ e ferramentas de atendimento. Não acessa dados sensíveis.",
      },
    ],
    keywords: ["papel", "role", "master", "admin", "cs", "financeiro", "tecnologia", "hierarquia"],
  },

  // ===== INTEGRAÇÕES =====
  {
    id: "integrations-overview",
    title: "Visão Geral das Integrações",
    category: "admin-integrations",
    icon: "🔗",
    summary: "Como funcionam as integrações externas do OIK",
    audience: "admin-only",
    steps: [
      {
        title: "Open Finance (Pluggy)",
        description: "Conexão com Open Finance para importação automática de extratos. Requer Client ID e Secret da Pluggy.",
      },
      {
        title: "Resend (Email)",
        description: "Envio de emails transacionais: boas-vindas, alertas, relatórios. Configure API Key e email de envio.",
      },
      {
        title: "eNotas (Notas Fiscais)",
        description: "Emissão automática de NFS-e. Configure API Key, ID da Empresa e ambiente (produção/homologação).",
      },
      {
        title: "OIK AI",
        description: "Assistente de IA integrado. Monitore uso, configure modelos e veja métricas de consumo.",
      },
      {
        title: "Status das integrações",
        description: "ATIVO: funcionando. INATIVO: desabilitado. PENDENTE: aguardando config. ERRO: falha detectada.",
        tip: "Use 'Testar conexão' para validar credenciais a qualquer momento.",
      },
    ],
    keywords: ["integração", "pluggy", "resend", "enotas", "api", "conexão", "status"],
  },

  // ===== AUDITORIA =====
  {
    id: "audit-logs",
    title: "Logs de Auditoria",
    category: "admin-audit",
    icon: "📋",
    summary: "Como consultar e interpretar logs de auditoria",
    audience: "admin-only",
    steps: [
      {
        title: "O que é auditado",
        description: "Todas as ações sensíveis: login/logout, criação/edição de usuários, alterações de papel, reset de senha, acesso a dados de famílias.",
      },
      {
        title: "Estrutura do log",
        description: "Cada registro contém: quem fez (actor), quando (timestamp), o que fez (action), e contexto (metadata).",
        tip: "Dados sensíveis são pseudonimizados nos logs.",
      },
      {
        title: "Filtros disponíveis",
        description: "Filtre por período, tipo de ação, ator (quem fez) e alvo (family_id ou user_id afetado).",
      },
      {
        title: "Exportação",
        description: "Logs podem ser exportados em CSV para compliance e investigações.",
      },
      {
        title: "Retenção",
        description: "Logs são mantidos por 10 anos conforme requisitos legais. Não podem ser deletados.",
      },
    ],
    keywords: ["auditoria", "log", "trilha", "registro", "quem", "quando", "compliance"],
  },

  // ===== CS / SUPORTE =====
  {
    id: "cs-health-dashboard",
    title: "Dashboard de Saúde de Usuários",
    category: "admin-cs",
    icon: "❤️",
    summary: "Como monitorar engajamento e risco de churn",
    audience: "cs-only",
    steps: [
      {
        title: "Score de Engajamento",
        description: "Cada família tem um score calculado com base em: logins, lançamentos, uso de metas, importações.",
      },
      {
        title: "Sinais de Comportamento",
        description: "O sistema detecta sinais automáticos: inatividade prolongada, abandono de onboarding, padrão de churn.",
      },
      {
        title: "Estágios de Usuário",
        description: "ONBOARDING → ATIVO → ENGAJADO → EM RISCO → CHURNED. Cada estágio tem ações recomendadas.",
      },
      {
        title: "Ações de CS",
        description: "Registre interações com o usuário: contatos, dúvidas resolvidas, upgrades oferecidos.",
      },
      {
        title: "Sugestões de IA",
        description: "A IA sugere próximas melhores ações baseado no perfil e histórico do usuário.",
        tip: "Você pode aceitar, rejeitar ou adaptar cada sugestão.",
      },
    ],
    keywords: ["cs", "saúde", "engajamento", "churn", "risco", "score", "ação"],
  },

  // ===== REFERÊNCIA DO APP PARA SUPORTE =====
  {
    id: "app-support-transactions-guide",
    title: "📱 Guia de Lançamentos (para Suporte)",
    category: "app-support-transactions",
    icon: "💰",
    summary: "Como explicar lançamentos ao usuário final",
    audience: "support-reference",
    steps: [
      {
        title: "Tipos de Lançamento",
        description: "Receita (dinheiro entrando), Despesa (saindo), Transferência (entre contas próprias), Reembolso (devolução), Ajuste (correção).",
        tip: "Usuários confundem Crédito (direção) com Receita (classificação).",
      },
      {
        title: "Métodos de Pagamento",
        description: "Despesas: PIX, Dinheiro, Transferência, Débito, Crédito, Cheque. Receitas: PIX, Dinheiro, Transferência, Cheque.",
        tip: "Receitas NÃO têm opção Débito/Crédito - são métodos de pagamento, não recebimento.",
      },
      {
        title: "Vincular Conta/Cartão",
        description: "Opcional, mas ajuda na conciliação. Para crédito, o valor entra na fatura do cartão.",
      },
      {
        title: "Regime de Caixa",
        description: "Compras no cartão entram no orçamento do mês do PAGAMENTO da fatura, não da compra.",
        tip: "Explique: 'O dinheiro só sai quando você paga a fatura'.",
      },
    ],
    keywords: ["lançamento", "receita", "despesa", "cartão", "explicar", "suporte"],
  },

  {
    id: "app-support-import-guide",
    title: "📱 Guia de Importação (para Suporte)",
    category: "app-support-import",
    icon: "📥",
    summary: "Como resolver problemas de importação com usuários",
    audience: "support-reference",
    steps: [
      {
        title: "Formatos Suportados",
        description: "OFX (universal), XLSX/XLS (Excel), PDF. Bancos testados: Bradesco, BTG, Itaú, Santander (PDF/XLS). Outros via OFX.",
      },
      {
        title: "Arquivos com Senha",
        description: "O sistema tenta CPF automaticamente (11, 10, 9... dígitos). Se falhar, peça ao usuário verificar o CPF cadastrado.",
        tip: "Senhas NUNCA são salvas. Apenas o padrão que funcionou é memorizado.",
      },
      {
        title: "Linhas não aparecem",
        description: "Linhas de saldo, cabeçalho e rodapé são filtradas. Se transações reais sumirem, pode ser formato não reconhecido.",
        tip: "Sugira exportar OFX como alternativa.",
      },
      {
        title: "Erros comuns",
        description: "IMPORT-001: arquivo corrompido. IMPORT-002: formato não suportado. IMPORT-003: senha incorreta.",
      },
    ],
    keywords: ["importação", "erro", "senha", "cpf", "formato", "suporte"],
  },

  {
    id: "app-support-budget-guide",
    title: "📱 Guia de Orçamento (para Suporte)",
    category: "app-support-budget",
    icon: "📊",
    summary: "Como explicar orçamento e metas ao usuário",
    audience: "support-reference",
    steps: [
      {
        title: "Metas vs Orçamento",
        description: "Meta = limite por categoria. Orçamento Sugerido = conjunto de metas geradas automaticamente.",
      },
      {
        title: "Alertas de 80% e 100%",
        description: "80%: alerta amarelo suave. 100%: alerta vermelho. Ambos podem ser fechados/silenciados.",
        tip: "Exceder não é 'errar' - é sinal para reavaliar.",
      },
      {
        title: "Orçamento por Faixa de Renda",
        description: "Usuário informa apenas a FAIXA (não valor exato). O sistema aplica percentuais recomendados.",
        tip: "Privacidade: nunca armazenamos renda exata.",
      },
      {
        title: "Versões de Orçamento",
        description: "Cada novo orçamento é uma versão. Versões anteriores são arquivadas, nunca apagadas.",
      },
      {
        title: "Vigência",
        description: "Orçamento vale 'daqui pra frente'. Meses passados mantêm a versão antiga para histórico justo.",
      },
    ],
    keywords: ["orçamento", "meta", "limite", "alerta", "versão", "suporte"],
  },

  // ===== REGIME CONTÁBIL (SUPORTE) =====
  {
    id: "app-support-accounting-regime-guide",
    title: "📱 Guia de Regime Contábil (para Suporte)",
    category: "app-support-budget",
    icon: "🧾",
    summary: "Como explicar Fluxo de Caixa vs Competência ao usuário",
    audience: "support-reference",
    steps: [
      {
        title: "Conceito Central",
        description: "O regime define QUANDO uma transação conta no orçamento. Fluxo de Caixa = quando o dinheiro movimenta. Competência = quando o evento aconteceu.",
        tip: "A maioria dos usuários deve permanecer no Fluxo de Caixa (padrão).",
      },
      {
        title: "Fluxo de Caixa (cash_basis)",
        description: "Transações contam no mês do DESEMBOLSO efetivo. Cartão de crédito entra no mês de pagamento da fatura. Cheque entra após compensação.",
        tip: "Mais simples e visual. Reflete o saldo real da conta.",
      },
      {
        title: "Competência (accrual_basis)",
        description: "Transações contam no mês do EVENTO. Compra de janeiro em cartão entra em janeiro, mesmo com fatura paga em fevereiro.",
        tip: "Mais analítico. Melhor para quem quer rastrear compromissos por período.",
      },
      {
        title: "Impacto na troca",
        description: "Alterar o regime NÃO apaga dados. Apenas muda a agregação do 'realizado'. Orçamento planejado permanece igual.",
      },
      {
        title: "Campo técnico",
        description: "Fluxo de Caixa usa 'cash_date' nas queries. Competência usa 'event_date'. A coluna 'accounting_regime' na tabela 'families' define a escolha.",
      },
    ],
    keywords: ["regime", "fluxo", "caixa", "competência", "cash_basis", "accrual_basis", "suporte"],
  },

  // ===== CARTÃO DE CRÉDITO POR REGIME (SUPORTE) =====
  {
    id: "app-support-credit-card-regime-guide",
    title: "📱 Guia de Cartão de Crédito por Regime (para Suporte)",
    category: "app-support-budget",
    icon: "💳",
    summary: "Regras de cartão de crédito em Fluxo de Caixa vs Competência",
    audience: "support-reference",
    steps: [
      {
        title: "Regra de Ouro",
        description: "NUNCA contar compra + fatura no mesmo regime. Isso causaria dupla contagem.",
        tip: "Essa é a regra mais importante. Se o usuário vê 'valores dobrados', verifique o regime.",
      },
      {
        title: "Fluxo de Caixa: Compra no cartão",
        description: "NÃO entra no realizado. Apenas registra o compromisso. O cartão é meio de pagamento, não despesa imediata.",
      },
      {
        title: "Fluxo de Caixa: Pagamento da fatura",
        description: "ENTRA no realizado, no mês do pagamento, pelo valor total pago. Parcelamentos impactam quando cada fatura mensal é paga.",
      },
      {
        title: "Competência: Compra no cartão",
        description: "ENTRA no realizado imediatamente, classificada na categoria da despesa, no mês da compra.",
      },
      {
        title: "Competência: Pagamento da fatura",
        description: "NÃO entra como despesa (apenas movimentação de caixa). Parcelamentos: cada parcela entra no mês correspondente.",
      },
      {
        title: "Diagnóstico rápido",
        description: "Se usuário em CASH reclama que cartão não aparece → verificar se fatura foi paga. Se em ACCRUAL reclama de valores altos → verificar se não há dupla contagem acidental.",
      },
    ],
    keywords: ["cartão", "crédito", "regime", "fatura", "compra", "dupla", "contagem", "suporte"],
  },
];

// =====================================================
// FAQs DO DASHBOARD
// =====================================================
export const dashboardFaqItems: DashboardFAQItem[] = [
  // ===== GESTÃO DE USUÁRIOS ADMIN =====
  {
    id: "admin-faq-1",
    question: "Qual a diferença entre conta do Dashboard e do App?",
    answer: "O OIK possui dois ambientes separados: o App (para usuários consumer organizarem suas finanças familiares) e o Dashboard (para administradores e equipe interna). Um login pode ser exclusivo de um ambiente ou ter acesso a ambos. Usuários que possuem apenas acesso ao Dashboard (admin/master) não podem acessar o App automaticamente.",
    category: "admin-users",
    keywords: ["dashboard", "app", "diferença", "admin", "consumer", "acesso"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-2",
    question: "Como criar um novo usuário admin?",
    answer: "Vá em Usuários > Colaboradores Admin > 'Novo Colaborador'. Preencha nome, email, papel e clique em Criar. Uma senha temporária de 20 caracteres será gerada - o usuário deve trocá-la no primeiro login.",
    category: "admin-users",
    keywords: ["criar", "usuário", "admin", "colaborador", "novo"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-3",
    question: "O que significa 'must_change_password'?",
    answer: "Indica que o usuário ainda está usando a senha temporária inicial. Um modal bloqueia o acesso até que ele defina uma senha pessoal. Isso garante segurança no primeiro acesso.",
    category: "admin-users",
    keywords: ["senha", "temporária", "trocar", "primeiro", "login"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-4",
    question: "Como resetar a senha de um colaborador?",
    answer: "Na lista de colaboradores, clique no ícone de ações > 'Resetar Senha'. Uma nova senha temporária de 20 caracteres é gerada. O colaborador deverá alterá-la no próximo login. A ação é registrada em auditoria.",
    category: "admin-users",
    keywords: ["resetar", "senha", "colaborador", "esqueceu"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-5",
    question: "Posso promover alguém a MASTER?",
    answer: "Apenas usuários MASTER podem criar ou promover outros para MASTER. ADMIN pode gerenciar CS, LEGAL e outros ADMIN, mas não tem privilégios sobre MASTER. Esta é uma medida de segurança hierárquica.",
    category: "admin-roles",
    keywords: ["promover", "master", "admin", "hierarquia"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-6",
    question: "Devo excluir ou desativar colaboradores?",
    answer: "SEMPRE prefira desativar (is_active=false). Isso mantém o histórico de auditoria e permite reativação futura. Exclusão física só é permitida para MASTER e deve ser usada apenas em casos excepcionais, com confirmação dupla.",
    category: "admin-users",
    keywords: ["excluir", "desativar", "soft", "delete", "auditoria"],
    audience: "admin-only",
  },

  // ===== INTEGRAÇÕES =====
  {
    id: "admin-faq-7",
    question: "Como configurar a integração Open Finance?",
    answer: "Acesse Integrações > Open Finance. Insira o Client ID e Client Secret da Pluggy. Clique em 'Testar conexão' para validar as credenciais. Os secrets são armazenados de forma segura e nunca são exibidos após salvar.",
    category: "admin-integrations",
    keywords: ["open", "finance", "pluggy", "configurar", "credencial"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-8",
    question: "O que significam os status das integrações?",
    answer: "ATIVO: funcionando normalmente. INATIVO: desabilitado manualmente. PENDENTE: aguardando configuração. ERRO: falha detectada no último teste. Use 'Testar conexão' para atualizar o status.",
    category: "admin-integrations",
    keywords: ["status", "ativo", "inativo", "pendente", "erro", "integração"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-9",
    question: "As credenciais de integração são seguras?",
    answer: "Sim. API keys e secrets são armazenados de forma segura e nunca são exibidos após salvos. Após configurar, o sistema mostra apenas 'Configurado'. Todas as alterações são registradas em auditoria sem expor os valores.",
    category: "admin-integrations",
    keywords: ["segurança", "credencial", "secret", "api", "key"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-10",
    question: "Como funciona a integração com eNotas?",
    answer: "A integração eNotas permite a emissão automática de notas fiscais de serviço (NFS-e). Configure a API Key, ID da Empresa e o ambiente (produção ou homologação). As métricas mostram notas emitidas, canceladas e pendentes.",
    category: "admin-integrations",
    keywords: ["enotas", "nota fiscal", "nfse", "emissão", "fiscal"],
    audience: "admin-only",
  },

  // ===== AUDITORIA =====
  {
    id: "admin-faq-11",
    question: "Como funciona a auditoria de usuários admin?",
    answer: "Todas as ações são registradas automaticamente: criação, edição, ativação/desativação, reset de senha, troca de papel e logins. Os logs incluem quem fez, quando, e detalhes (sem dados sensíveis). Acesse via aba Auditoria.",
    category: "admin-audit",
    keywords: ["auditoria", "log", "registro", "ação", "trilha"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-12",
    question: "Quanto tempo os logs são mantidos?",
    answer: "Logs de auditoria são mantidos por 10 anos conforme requisitos legais e de compliance. Eles são imutáveis - não podem ser editados ou deletados. Dados sensíveis são pseudonimizados.",
    category: "admin-audit",
    keywords: ["retenção", "log", "anos", "compliance", "imutável"],
    audience: "admin-only",
  },

  // ===== LGPD / GOVERNANÇA =====
  {
    id: "admin-faq-13",
    question: "Como processar uma solicitação de exclusão LGPD?",
    answer: "Solicitações de exclusão aparecem em LGPD > Solicitações. Você pode aprovar ou rejeitar com justificativa. Ao aprovar, os dados são anonimizados/excluídos conforme a política. Logs de auditoria são preservados por obrigação legal.",
    category: "admin-lgpd",
    keywords: ["lgpd", "exclusão", "solicitação", "aprovar", "dados"],
    audience: "admin-only",
  },
  {
    id: "admin-faq-14",
    question: "O que é o Cofre Legal?",
    answer: "Evidências para fins legais são armazenadas em ambiente separado (Cofre Legal), com acesso extremamente restrito e temporário. Usado apenas em casos de ordem judicial, investigação de fraude ou defesa jurídica.",
    category: "admin-lgpd",
    keywords: ["cofre", "legal", "evidência", "judicial", "restrito"],
    audience: "admin-only",
  },

  // ===== CS =====
  {
    id: "cs-faq-1",
    question: "Como identificar usuários em risco de churn?",
    answer: "No Dashboard de Saúde, filtre por 'Em Risco'. Esses usuários têm sinais de inatividade, abandono de fluxos ou padrões de churn detectados pela IA. Cada um tem sugestões de próxima melhor ação.",
    category: "admin-cs",
    keywords: ["churn", "risco", "inativo", "identificar", "sinal"],
    audience: "cs-only",
  },
  {
    id: "cs-faq-2",
    question: "O que são sinais de comportamento?",
    answer: "Sinais automáticos detectados pelo sistema: LOGIN_DROP (queda de logins), ONBOARDING_ABANDONED (abandonou setup), NO_TRANSACTIONS_30D (sem lançamentos há 30 dias), etc. Cada sinal tem peso no score de risco.",
    category: "admin-cs",
    keywords: ["sinal", "comportamento", "automático", "detectar", "score"],
    audience: "cs-only",
  },
  {
    id: "cs-faq-3",
    question: "Como registrar uma ação de CS?",
    answer: "Na ficha do usuário, clique em 'Nova Ação'. Selecione o tipo (contato, dúvida resolvida, oferta) e adicione notas. A ação fica vinculada ao histórico do usuário.",
    category: "admin-cs",
    keywords: ["ação", "registrar", "contato", "histórico", "cs"],
    audience: "cs-only",
  },

  // ===== REFERÊNCIA APP PARA SUPORTE =====
  {
    id: "support-faq-1",
    question: "📱 Usuário não consegue importar extrato. O que fazer?",
    answer: "1) Verifique o formato (OFX é mais confiável). 2) Se tem senha, verifique CPF cadastrado. 3) Se PDF/XLS, confirme se é banco testado (Bradesco, BTG, Itaú, Santander). 4) Sugira exportar OFX pelo internet banking.",
    category: "app-support-import",
    keywords: ["importar", "erro", "extrato", "suporte", "usuário"],
    audience: "support-reference",
  },
  {
    id: "support-faq-2",
    question: "📱 Usuário diz que compra no cartão não entrou no orçamento. Está certo?",
    answer: "Sim! O OIK usa regime de caixa. Compras no cartão só entram no orçamento quando a FATURA é paga. Explique: 'O dinheiro só sai quando você paga a fatura, então conta naquele mês'.",
    category: "app-support-budget",
    keywords: ["cartão", "orçamento", "fatura", "regime", "caixa"],
    audience: "support-reference",
  },
  {
    id: "support-faq-3",
    question: "📱 Usuário não entende diferença entre Crédito e Receita. Como explicar?",
    answer: "Crédito é a DIREÇÃO (dinheiro entrando). Receita é a CLASSIFICAÇÃO (como o sistema trata). Um crédito pode ser Receita (salário), Reembolso (devolução) ou Transferência (entre contas próprias).",
    category: "app-support-transactions",
    keywords: ["crédito", "receita", "diferença", "explicar", "classificação"],
    audience: "support-reference",
  },
  {
    id: "support-faq-4",
    question: "📱 Usuário quer excluir conta. Qual o processo?",
    answer: "Direcione para: Configurações > Meus Dados > Privacidade (LGPD) > Solicitar Exclusão. Um código de verificação é enviado por email. A exclusão é processada em até 30 dias. Alerte que é irreversível.",
    category: "app-support-general",
    keywords: ["excluir", "conta", "lgpd", "processo", "irreversível"],
    audience: "support-reference",
  },
  {
    id: "support-faq-5",
    question: "📱 Usuário pergunta por que orçamento não altera meses passados. Como explicar?",
    answer: "Orçamento é planejamento FUTURO. Alterar meses passados distorceria a análise histórica. Cada nova versão vale 'daqui pra frente'. Isso permite comparar 'o que planejei' vs 'o que gastei' de forma honesta.",
    category: "app-support-budget",
    keywords: ["orçamento", "passado", "histórico", "vigência", "versão"],
    audience: "support-reference",
  },
  {
    id: "support-faq-6",
    question: "📱 Usuário diz que subcategoria sumiu ao trocar categoria. É bug?",
    answer: "Não! Subcategorias são dependentes da categoria. Ao trocar categoria, as opções de subcategoria mudam. O usuário precisa selecionar a nova subcategoria após escolher a categoria.",
    category: "app-support-transactions",
    keywords: ["subcategoria", "sumiu", "categoria", "dependente", "bug"],
    audience: "support-reference",
  },
  {
    id: "support-faq-7",
    question: "📱 Usuário quer saber se o OIK armazena renda exata. Armazena?",
    answer: "NÃO! O OIK armazena apenas a FAIXA de renda selecionada (ex: 'R$ 8.001 – R$ 15.000'), nunca o valor exato. Isso é usado apenas para calcular percentuais de orçamento. A privacidade é protegida.",
    category: "app-support-budget",
    keywords: ["renda", "privacidade", "faixa", "armazenar", "exato"],
    audience: "support-reference",
  },
  {
    id: "support-faq-8",
    question: "📱 Como funciona a importação de fotos de recibos (OCR)?",
    answer: "O usuário vai em Importar > 'Importar Recibos'. Tira ou seleciona múltiplas fotos. O OCR extrai valor, data, estabelecimento automaticamente. Na revisão, o usuário categoriza e confirma. Duplicados são detectados.",
    category: "app-support-import",
    keywords: ["ocr", "foto", "recibo", "comprovante", "importar"],
    audience: "support-reference",
  },
  {
    id: "support-faq-9",
    question: "📱 Usuário trocou regime de Caixa para Competência. O que muda?",
    answer: "O 'realizado' passa a usar event_date (data da compra) ao invés de cash_date (data do pagamento). Compras no cartão entram no mês da compra, não da fatura. Lançamentos NÃO são alterados — só a agregação muda.",
    category: "app-support-budget",
    keywords: ["regime", "competência", "troca", "impacto", "mudança"],
    audience: "support-reference",
  },
  {
    id: "support-faq-10",
    question: "📱 Usuário pergunta qual regime usar. O que recomendar?",
    answer: "Fluxo de Caixa (padrão) para 99% dos usuários — é mais simples e reflete o saldo real. Competência só para quem quer análise mais contábil ou tem experiência com gestão financeira analítica.",
    category: "app-support-budget",
    keywords: ["regime", "recomendar", "qual", "melhor", "escolher"],
    audience: "support-reference",
  },
  {
    id: "support-faq-11",
    question: "📱 Usuário quer saber se pode voltar ao regime anterior. Pode?",
    answer: "SIM! A troca é reversível a qualquer momento em Configurações > Finanças > Regime de Registro. Os dados não são perdidos — apenas a forma de leitura muda. O orçamento planejado permanece igual.",
    category: "app-support-budget",
    keywords: ["voltar", "reverter", "regime", "anterior", "trocar"],
    audience: "support-reference",
  },
  {
    id: "support-faq-12",
    question: "📱 Usuário reclama que cartão 'sumiu' do orçamento. O que verificar?",
    answer: "Se está em Fluxo de Caixa (padrão): compras no cartão SÓ entram quando a FATURA é paga. Verificar: 1) A fatura foi paga? 2) O pagamento foi registrado corretamente? Se preferir ver compras imediatamente, sugerir mudar para Competência.",
    category: "app-support-budget",
    keywords: ["cartão", "sumiu", "orçamento", "fatura", "verificar"],
    audience: "support-reference",
  },
  {
    id: "support-faq-13",
    question: "📱 Usuário em Competência vê valores 'dobrados'. Como resolver?",
    answer: "Provavelmente está contando compra + fatura. Em Competência, o pagamento da fatura NÃO deve entrar como despesa (só como movimentação de caixa). Verificar se há transações duplicadas ou se a fatura está sendo categorizada como despesa.",
    category: "app-support-budget",
    keywords: ["dobrado", "dupla", "contagem", "competência", "resolver"],
    audience: "support-reference",
  },
];

// =====================================================
// FUNÇÃO DE BUSCA DO DASHBOARD
// =====================================================
export function searchDashboardHelp(query: string): { articles: DashboardHelpArticle[]; faqs: DashboardFAQItem[] } {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return { articles: [], faqs: [] };
  }

  const queryWords = normalizedQuery.split(/\s+/);

  const matchScore = (keywords: string[], title: string, content: string): number => {
    let score = 0;
    const allText = [...keywords, title.toLowerCase(), content.toLowerCase()].join(" ");
    
    for (const word of queryWords) {
      if (allText.includes(word)) {
        score += 1;
        if (keywords.some(k => k.includes(word))) score += 2;
        if (title.toLowerCase().includes(word)) score += 3;
      }
    }
    return score;
  };

  const scoredArticles = dashboardHelpArticles
    .map(article => ({
      article,
      score: matchScore(article.keywords, article.title, article.summary),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const scoredFaqs = dashboardFaqItems
    .map(faq => ({
      faq,
      score: matchScore(faq.keywords, faq.question, faq.answer),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    articles: scoredArticles.map(item => item.article),
    faqs: scoredFaqs.map(item => item.faq),
  };
}
