/**
 * ============================================================
 * FAQ DO APLICATIVO (USUÁRIO FINAL)
 * ============================================================
 * 
 * Este arquivo contém APENAS conteúdos da experiência do usuário no App.
 * 
 * ✅ PERMITIDO:
 * - Cadastro, login e recuperação de senha
 * - Criação e gestão de família
 * - Lançamentos de receitas e despesas
 * - Orçamento, categorias e subcategorias
 * - Cartões de crédito e contas bancárias
 * - Metas e objetivos financeiros
 * - Importação de extratos
 * - Projeção financeira
 * - Privacidade e LGPD (do ponto de vista do usuário)
 * - Problemas comuns de uso do aplicativo
 * 
 * ❌ PROIBIDO:
 * - Qualquer referência a dashboard administrativo
 * - Fluxos internos ou de operação
 * - Permissões de CS, admin ou colaboradores
 * - Logs, auditorias, integrações técnicas
 * - Configurações sistêmicas
 * - Segurança técnica (RLS, políticas, banco de dados)
 * 
 * ============================================================
 */

export interface HelpArticle {
  id: string;
  title: string;
  category: "getting-started" | "home" | "transactions" | "categories" | "goals" | "objectives" | "budgets" | "projection" | "import" | "family" | "settings" | "privacy" | "insights";
  icon: string;
  summary: string;
  steps: Array<{
    title: string;
    description: string;
    tip?: string;
  }>;
  keywords: string[];
  deepLink?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
}

// Última atualização: 29/01/2026 - Adição de Regime Contábil
export const HELP_CENTER_VERSION = "29/01/2026 v18";

// Bancos testados e compatíveis com importação
export const SUPPORTED_BANKS = [
  { name: "Bradesco", formats: ["PDF", "XLS", "XLSX"], tested: true },
  { name: "BTG Pactual", formats: ["PDF", "XLS", "XLSX"], tested: true },
  { name: "Itaú", formats: ["PDF", "XLS", "XLSX"], tested: true },
  { name: "Santander", formats: ["PDF", "XLS", "XLSX"], tested: true },
  { name: "Nubank", formats: ["OFX"], tested: true },
  { name: "Inter", formats: ["OFX"], tested: true },
  { name: "C6 Bank", formats: ["OFX"], tested: true },
  { name: "Caixa", formats: ["OFX"], tested: false },
  { name: "Banco do Brasil", formats: ["OFX"], tested: false },
  { name: "Outros", formats: ["OFX", "XLS", "XLSX"], tested: false },
] as const;

export const helpArticles: HelpArticle[] = [
  // ===== PRIMEIROS PASSOS =====
  {
    id: "getting-started",
    title: "Primeiros Passos",
    category: "getting-started",
    icon: "🚀",
    summary: "Aprenda o básico para começar a usar o Oik",
    steps: [
      {
        title: "Crie sua conta",
        description: "Faça o cadastro com seu email. Informe seu CPF e data de nascimento (usados para desbloquear arquivos de importação).",
        tip: "Use um email que você acessa frequentemente para receber alertas importantes.",
      },
      {
        title: "Adicione seu primeiro lançamento",
        description: "Toque no botão + na tela inicial para registrar uma receita ou despesa. Escolha a categoria e informe o valor.",
        tip: "Comece registrando seus gastos fixos mensais como aluguel e contas.",
      },
      {
        title: "Explore o dashboard",
        description: "A tela inicial mostra seu saldo, receitas e despesas do mês. Deslize entre os meses para ver o histórico.",
      },
      {
        title: "Defina metas de orçamento",
        description: "Vá em Metas e crie limites para cada categoria de gasto. Vocês receberão alertas ao se aproximar do limite.",
      },
    ],
    keywords: ["começar", "início", "cadastro", "primeiro", "tutorial", "básico", "criar conta", "login", "oik"],
  },

  // ===== TELA INICIAL =====
  {
    id: "home-dashboard",
    title: "Tela Inicial: Saldo e Timeline",
    category: "home",
    icon: "🏠",
    summary: "Entenda cada elemento da tela inicial do Oik",
    steps: [
      {
        title: "Card de Saldo",
        description: "Mostra o saldo do mês atual (receitas - despesas). Verde indica saldo positivo, vermelho indica negativo.",
      },
      {
        title: "Seletor de Mês",
        description: "Toque nas setas para navegar entre meses. Toque no mês para voltar ao atual rapidamente.",
        tip: "Vocês podem ver meses anteriores para comparar gastos.",
      },
      {
        title: "Fatura do Cartão",
        description: "Mostra o total de gastos no cartão de crédito do mês selecionado.",
      },
      {
        title: "Ações Rápidas",
        description: "Botões para adicionar receita, despesa ou acessar funcionalidades rápidas.",
      },
      {
        title: "Widget de Orçamento",
        description: "Mostra alertas de metas próximas do limite ou excedidas.",
      },
    ],
    keywords: ["home", "início", "saldo", "cartão", "fatura", "mês", "timeline", "notificações"],
    deepLink: "dashboard",
  },

  // ===== NAVEGAÇÃO =====
  {
    id: "navigation-guide",
    title: "Navegação no Aplicativo",
    category: "home",
    icon: "🧭",
    summary: "Guia completo de navegação entre telas do Oik",
    steps: [
      {
        title: "Barra de Navegação Inferior",
        description: "A barra fixa na parte inferior tem 5 ícones: Casa (Home), Extrato, Categorias, Metas e Educação. Toque para navegar.",
        tip: "O ícone ativo fica destacado.",
      },
      {
        title: "Atalhos da Home",
        description: "Na tela inicial, os atalhos rápidos (Extrato, Categorias, Metas, Importar) levam diretamente à funcionalidade.",
      },
      {
        title: "Card de Saldo → Detalhes",
        description: "Toque no card de saldo para ver detalhes da composição (receitas x despesas do mês).",
      },
      {
        title: "Card de Fatura → Faturas",
        description: "Toque no card de fatura do cartão para ver a fatura completa e detalhes.",
      },
      {
        title: "Botão Voltar",
        description: "Em telas internas (Ajuda, Detalhes, etc.), use a seta no canto superior esquerdo para voltar.",
      },
    ],
    keywords: ["navegação", "navegar", "menu", "barra", "inferior", "atalho", "voltar", "tela", "aba"],
    deepLink: "dashboard",
  },

  // ===== LANÇAMENTOS =====
  {
    id: "add-transaction",
    title: "Inserir Receita ou Despesa",
    category: "transactions",
    icon: "➕",
    summary: "Como registrar lançamentos financeiros no Oik",
    steps: [
      {
        title: "Toque no botão +",
        description: "O botão flutuante no canto inferior abre o formulário de novo lançamento.",
      },
      {
        title: "Escolha o tipo",
        description: "Selecione Receita (dinheiro entrando) ou Despesa (dinheiro saindo).",
      },
      {
        title: "Informe o valor",
        description: "Digite o valor em reais. Use vírgula para centavos (ex: 150,50).",
      },
      {
        title: "Selecione a categoria",
        description: "Escolha a categoria que melhor descreve o lançamento. Vocês podem também escolher uma subcategoria.",
        tip: "Categorizar corretamente ajuda nos relatórios e metas.",
      },
      {
        title: "Método de pagamento (Despesa)",
        description: "Para despesas: PIX, Dinheiro, Transferência, Cartão de Débito, Cartão de Crédito ou Cheque.",
        tip: "Ao selecionar Cheque, o campo 'Número do cheque' se torna obrigatório.",
      },
      {
        title: "Método de recebimento (Receita)",
        description: "Para receitas: PIX, Dinheiro, Transferência ou Cheque. NÃO há opção de Débito/Crédito para receitas.",
      },
      {
        title: "Vincular conta ou cartão",
        description: "Opcionalmente, vincule o lançamento a uma conta bancária ou cartão de crédito específico.",
      },
    ],
    keywords: ["adicionar", "inserir", "lançamento", "receita", "despesa", "gasto", "entrada", "saída", "pix", "dinheiro", "cartão", "cheque"],
    deepLink: "dashboard",
  },

  {
    id: "transaction-types",
    title: "Tipos de Lançamento: Guia Completo",
    category: "transactions",
    icon: "🔄",
    summary: "Entenda a diferença entre Receita, Despesa, Reembolso, Transferência e Ajuste",
    steps: [
      {
        title: "Receita 💚",
        description: "Dinheiro entrando como ganho real: salário, pro-labore, freelance, vendas, dividendos. Entra no cálculo de receitas mensais.",
        tip: "Use para qualquer dinheiro novo que entra no seu patrimônio.",
      },
      {
        title: "Despesa 🔴",
        description: "Dinheiro saindo como gasto: compras, contas, assinaturas, alimentação. Entra no cálculo de despesas mensais.",
        tip: "A categoria escolhida afeta os relatórios e metas de orçamento.",
      },
      {
        title: "Reembolso 💙",
        description: "Devolução de uma despesa feita anteriormente. Reduz o total gasto na categoria original.",
        tip: "Exemplo: Gastou R$100 em Saúde, plano devolveu R$30. Classifique como Reembolso em Saúde = R$70 líquido.",
      },
      {
        title: "Transferência ⚪",
        description: "Movimentação entre suas próprias contas. NÃO conta como receita nem despesa.",
        tip: "Use para: PIX entre contas, TED para investimentos, resgate de aplicação.",
      },
      {
        title: "Ajuste ⚙️",
        description: "Correção ou acerto contábil. Para arrumar saldos ou registrar diferenças.",
        tip: "Raramente usado. Ideal para correções de erros ou ajustes de conciliação.",
      },
    ],
    keywords: ["tipo", "lançamento", "receita", "despesa", "reembolso", "transferência", "ajuste", "diferença", "classificação"],
    deepLink: "dashboard",
  },

  {
    id: "statement-filters",
    title: "Extrato e Filtros",
    category: "transactions",
    icon: "📋",
    summary: "Visualize e filtre seus lançamentos no Oik",
    steps: [
      {
        title: "Acesse o Extrato",
        description: "Toque em 'Extrato' na barra de navegação inferior.",
      },
      {
        title: "Navegue pelo mês",
        description: "Use o seletor de mês no topo para ver lançamentos de outros períodos.",
      },
      {
        title: "Busque por descrição",
        description: "Use a barra de busca para encontrar lançamentos específicos.",
      },
      {
        title: "Edite ou exclua",
        description: "Toque em um lançamento para ver detalhes e opções de edição ou exclusão.",
        tip: "Cuidado ao excluir - a ação não pode ser desfeita.",
      },
    ],
    keywords: ["extrato", "filtro", "busca", "histórico", "lançamentos", "transações"],
    deepLink: "transactions",
  },

  // ===== CATEGORIAS =====
  {
    id: "categories-management",
    title: "Categorias e Subcategorias",
    category: "categories",
    icon: "📊",
    summary: "Como organizar seus gastos por categoria",
    steps: [
      {
        title: "Visualize suas categorias",
        description: "Toque em 'Categorias' na navegação para ver a lista completa.",
      },
      {
        title: "Categorias de despesa",
        description: "Casa, Alimentação, Transporte, Lazer, Filhos, Pet, Saúde, Objetivos e mais.",
      },
      {
        title: "Categorias de receita",
        description: "Rendas inclui salário, pro-labore, investimentos, aluguel, etc.",
      },
      {
        title: "Subcategorias",
        description: "Cada categoria tem subcategorias para detalhar melhor seus gastos.",
        tip: "Use subcategorias para relatórios mais precisos.",
      },
    ],
    keywords: ["categoria", "subcategoria", "organizar", "classificar", "tipo", "total", "soma"],
    deepLink: "categories",
  },

  // ===== OBJETIVOS =====
  {
    id: "objectives-goals",
    title: "Objetivos Financeiros",
    category: "objectives",
    icon: "🎯",
    summary: "Crie e acompanhe objetivos de poupança no Oik",
    steps: [
      {
        title: "Crie um objetivo",
        description: "Em Metas, toque em 'Novo Objetivo'. Defina nome, valor alvo e data limite.",
        tip: "Ao criar um objetivo, ele aparece automaticamente como subcategoria em 'Objetivos'.",
      },
      {
        title: "Faça aportes",
        description: "Use o botão 'Contribuir' para registrar aportes no objetivo. Uma transação é criada automaticamente.",
      },
      {
        title: "Acompanhe o progresso",
        description: "Veja o percentual atingido e quanto falta para a meta.",
      },
      {
        title: "Editar ou excluir",
        description: "Vocês podem editar nome, valor alvo e data. Ao excluir um aporte, apenas aquele aporte específico é removido.",
      },
    ],
    keywords: ["objetivo", "meta", "poupança", "guardar", "viagem", "reserva", "aporte", "contribuição"],
    deepLink: "goals",
  },

  // ===== METAS/ORÇAMENTOS =====
  {
    id: "budget-goals",
    title: "Metas de Orçamento",
    category: "budgets",
    icon: "💰",
    summary: "Defina limites e receba alertas",
    steps: [
      {
        title: "Crie uma meta",
        description: "Em Metas, toque em 'Nova Meta'. Escolha uma categoria e defina o limite mensal.",
        tip: "Orçamento é uma referência, não um limite rígido.",
      },
      {
        title: "Previsto vs Realizado",
        description: "Veja a comparação clara entre o que vocês planejaram (previsto) e o que realmente gastaram (realizado).",
      },
      {
        title: "Alerta de 80%",
        description: "Quando vocês atingirem 80% do limite, verão um alerta amarelo suave.",
        tip: "Esses alertas podem ser fechados e silenciados por categoria.",
      },
      {
        title: "Limite excedido (100%)",
        description: "Ao ultrapassar 100%, o alerta fica vermelho. Vocês podem ajustar o orçamento ou revisar os lançamentos.",
        tip: "Exceder não é 'errar' — é um sinal para reavaliar.",
      },
    ],
    keywords: ["meta", "orçamento", "limite", "alerta", "objetivo", "controle", "80%", "100%", "excedido"],
    deepLink: "goals",
  },

  {
    id: "smart-budget",
    title: "Orçamento Inteligente por Faixa de Renda",
    category: "budgets",
    icon: "🧠",
    summary: "Como o OIK gera um orçamento personalizado automaticamente",
    steps: [
      {
        title: "Informe sua faixa de renda",
        description: "Selecione a faixa de renda mensal da família (não armazenamos valores exatos, apenas a faixa).",
        tip: "A faixa é usada apenas para calcular percentuais — sua privacidade está protegida.",
      },
      {
        title: "Refine com a subfaixa",
        description: "Dentro da faixa selecionada, escolha uma subfaixa (baixa, média ou alta) para ajustar as proporções.",
      },
      {
        title: "Indique filhos ou pets",
        description: "Se tiverem filhos ou pets, categorias específicas serão incluídas automaticamente.",
      },
      {
        title: "Crie o orçamento",
        description: "Com um toque, todas as metas de orçamento do mês são criadas automaticamente.",
        tip: "Isso não impede ajustes manuais posteriormente.",
      },
    ],
    keywords: ["orçamento", "inteligente", "faixa", "renda", "automático", "personalizado", "template"],
    deepLink: "settings",
  },

  {
    id: "accounting-regime",
    title: "Regime de Registro: Fluxo de Caixa vs Competência",
    category: "budgets",
    icon: "🧾",
    summary: "Entenda as duas formas de calcular o realizado no orçamento",
    steps: [
      {
        title: "O que é o Regime de Registro?",
        description: "O regime define QUANDO uma receita ou despesa entra no cálculo do seu orçamento mensal.",
        tip: "Você pode escolher o regime em Configurações > Finanças > Regime de Registro.",
      },
      {
        title: "Fluxo de Caixa (Padrão)",
        description: "O dinheiro entra no orçamento quando REALMENTE sai ou entra na sua conta. Cartão de crédito conta no mês do pagamento da fatura.",
        tip: "Recomendado para a maioria das famílias por ser mais simples e visual.",
      },
      {
        title: "Competência (Opcional)",
        description: "Receitas e despesas entram no mês em que ACONTECERAM, independente de quando foram pagas.",
        tip: "Melhor para quem quer acompanhar compromissos por mês de origem.",
      },
      {
        title: "Impacto no Orçamento",
        description: "Seu orçamento planejado NÃO muda. Apenas a forma de calcular o realizado (quanto você gastou) é diferente.",
      },
      {
        title: "Posso trocar depois?",
        description: "Sim! Você pode alterar o regime a qualquer momento. Seus lançamentos não são apagados — apenas a forma de leitura muda.",
      },
    ],
    keywords: ["regime", "fluxo", "caixa", "competência", "registro", "contábil", "realizado", "orçamento"],
    deepLink: "settings",
  },

  // ===== PROJEÇÃO =====
  {
    id: "projection-intro",
    title: "O que é Projeção Financeira?",
    category: "projection",
    icon: "🔮",
    summary: "Entenda como ver o futuro financeiro",
    steps: [
      {
        title: "Visualização, não controle",
        description: "A Projeção mostra o impacto futuro das suas decisões atuais. Você não edita nada — apenas observa.",
        tip: "Enxergue antes de sentir. Essa é a ideia central da projeção.",
      },
      {
        title: "Timeline mensal",
        description: "Veja os próximos 6 meses em cards horizontais. Cada card mostra o saldo projetado.",
      },
      {
        title: "Receitas projetadas",
        description: "Baseadas nas suas transações recorrentes (salário, pro-labore, renda fixa).",
      },
      {
        title: "Despesas projetadas",
        description: "Incluem gastos fixos (recorrentes), parcelas de cartão e estimativa baseada no seu padrão.",
      },
      {
        title: "Saldo projetado",
        description: "Receitas menos despesas. Se ficar negativo, o card fica vermelho com alerta.",
      },
    ],
    keywords: ["projeção", "futuro", "próximos meses", "previsão", "visualizar", "timeline", "saldo projetado"],
    deepLink: "projection",
  },

  {
    id: "projection-credit-cards",
    title: "Parcelas do Cartão na Projeção",
    category: "projection",
    icon: "💳",
    summary: "Como as parcelas impactam seus meses futuros",
    steps: [
      {
        title: "Detalhamento de parcelas",
        description: "A projeção mostra cada parcela individualmente: descrição, número da parcela (ex: 3/12) e valor.",
      },
      {
        title: "Impacto no orçamento",
        description: "Se suas parcelas representam mais de 30% da receita projetada, você verá um alerta educativo.",
      },
      {
        title: "Concentração de parcelas",
        description: "A projeção destaca quando um cartão concentra muitas parcelas em um período específico.",
      },
    ],
    keywords: ["cartão", "parcela", "crédito", "fatura", "projeção", "impacto", "futuro"],
    deepLink: "projection",
  },

  // ===== IMPORTAÇÃO =====
  {
    id: "import-files",
    title: "Importar Extratos",
    category: "import",
    icon: "📥",
    summary: "Importe arquivos OFX, XLSX, XLS ou PDF",
    steps: [
      {
        title: "Formatos suportados",
        description: "OFX (padrão bancário universal), XLSX/XLS (Excel) e PDF. O OIK detecta automaticamente.",
        tip: "Excel é o formato mais confiável. OFX funciona com qualquer banco.",
      },
      {
        title: "Bancos compatíveis (testados)",
        description: "Bradesco, BTG Pactual, Itaú e Santander foram testados com arquivos PDF e XLS. Nubank, Inter e C6 funcionam via OFX.",
      },
      {
        title: "Arquivos com senha",
        description: "Se o arquivo estiver protegido, o OIK tenta desbloquear automaticamente usando padrões de CPF.",
        tip: "O sistema aprende o padrão de cada banco para acelerar futuras importações.",
      },
      {
        title: "Revisão obrigatória",
        description: "Antes de salvar, vocês SEMPRE revisam as transações. Linhas de saldo e cabeçalho são filtradas automaticamente.",
      },
      {
        title: "Edição na revisão",
        description: "Você pode editar descrição, classificação, categoria e subcategoria antes de confirmar.",
      },
    ],
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "xlsx", "xls", "pdf", "senha", "cpf", "automático"],
    deepLink: "settings",
  },

  {
    id: "import-password-cpf",
    title: "Arquivos com Senha (CPF)",
    category: "import",
    icon: "🔐",
    summary: "Como o OIK desbloqueia arquivos protegidos",
    steps: [
      {
        title: "Detecção de proteção",
        description: "Ao enviar um PDF ou Excel protegido, o OIK detecta automaticamente que precisa de senha.",
      },
      {
        title: "Tentativa automática com CPF",
        description: "O sistema tenta padrões de CPF: 11 dígitos completos, depois 10, 9, 8, 7, 6, 5, 4 e 3 primeiros dígitos.",
        tip: "Bradesco geralmente usa CPF completo (11 dígitos). Outros bancos variam.",
      },
      {
        title: "Segurança do CPF",
        description: "Seu CPF é criptografado e NUNCA aparece em logs. Senhas são usadas apenas no momento do desbloqueio e descartadas.",
      },
    ],
    keywords: ["senha", "cpf", "protegido", "desbloquear", "automático", "segurança"],
    deepLink: "settings",
  },

  {
    id: "import-receipt-ocr",
    title: "Importar Recibos e Notas (OCR)",
    category: "import",
    icon: "📸",
    summary: "Fotografe comprovantes e deixe a IA extrair os dados",
    steps: [
      {
        title: "Acesse a importação",
        description: "Em Configurações > Importar, escolha 'Importar Recibos' para ativar o modo foto.",
      },
      {
        title: "Adicionar fotos",
        description: "Selecione múltiplas fotos da galeria ou tire fotos diretamente.",
        tip: "Garanta boa iluminação e enquadre todo o documento.",
      },
      {
        title: "Processamento automático",
        description: "O OIK extrai automaticamente valor, data, estabelecimento e forma de pagamento.",
      },
      {
        title: "Revisão do lote",
        description: "Após o processamento, revise todos os itens. Você pode filtrar por 'Sem categoria', 'Duplicados' ou 'Erros'.",
      },
    ],
    keywords: ["ocr", "foto", "recibo", "nota", "comprovante", "lote", "múltiplas", "categoria", "scanner"],
    deepLink: "dashboard",
  },

  // ===== PRIVACIDADE E SEGURANÇA =====
  {
    id: "privacy-security",
    title: "Privacidade e Segurança",
    category: "privacy",
    icon: "🔒",
    summary: "Como o Oik trata seus dados",
    steps: [
      {
        title: "Senhas de arquivo",
        description: "Senhas usadas para desbloquear arquivos de importação NUNCA são salvas no banco de dados.",
      },
      {
        title: "Dados sensíveis",
        description: "CPF, senhas e dados financeiros são criptografados e nunca aparecem em logs.",
      },
      {
        title: "Exportar dados",
        description: "Em Configurações > Meus Dados, vocês podem exportar todos os dados em formato JSON.",
      },
      {
        title: "Excluir conta",
        description: "Vocês podem solicitar a exclusão total da conta e dados a qualquer momento.",
        tip: "A exclusão é irreversível. Exportem os dados antes se precisarem.",
      },
      {
        title: "Isolamento por família",
        description: "Cada família só acessa seus próprios dados. Não há compartilhamento entre famílias.",
      },
    ],
    keywords: ["privacidade", "lgpd", "dados", "exportar", "excluir", "segurança", "proteção", "senha", "criptografia"],
    deepLink: "settings",
  },

  {
    id: "lgpd-data-deletion",
    title: "Como solicitar exclusão de dados (LGPD)",
    category: "privacy",
    icon: "🗑️",
    summary: "Entenda o processo de exclusão de dados conforme a LGPD",
    steps: [
      {
        title: "Seu direito",
        description: "A Lei Geral de Proteção de Dados (LGPD) garante seu direito de solicitar a exclusão dos seus dados pessoais.",
      },
      {
        title: "Exclusão vs Anonimização",
        description: "Exclusão remove dados definitivamente. Anonimização desvincula dados de você, mantendo apenas estatísticas agregadas.",
      },
      {
        title: "O que é excluído",
        description: "Nome, e-mail, telefone, foto de perfil, preferências pessoais e tokens de autenticação são removidos permanentemente.",
      },
      {
        title: "Prazo de processamento",
        description: "A solicitação é processada em até 30 dias conforme LGPD. Você pode cancelar a qualquer momento enquanto estiver pendente.",
      },
      {
        title: "Como solicitar",
        description: "Vá em Meus Dados > Privacidade (LGPD) > 'Solicitar Exclusão de Dados'. Um código de verificação será enviado para seu e-mail.",
      },
    ],
    keywords: ["lgpd", "exclusão", "dados", "anonimização", "privacidade", "direito", "solicitar", "30 dias"],
    deepLink: "settings",
  },

  // ===== FAMÍLIA =====
  {
    id: "family-members",
    title: "Família e Permissões",
    category: "family",
    icon: "👨‍👩‍👧‍👦",
    summary: "Convide membros e gerencie permissões",
    steps: [
      {
        title: "Convide familiares",
        description: "Em Configurações > Família, toque em 'Convidar membro'. O convite é enviado por email.",
      },
      {
        title: "Perfis de permissão",
        description: "Escolha entre 3 perfis prontos: Visualizador (só vê), Editor (adiciona e edita) ou Administrador (controle total).",
        tip: "Use o perfil mais restrito necessário para cada membro.",
      },
      {
        title: "Compartilhamento",
        description: "Todos os membros da família veem os mesmos dados financeiros conforme suas permissões.",
      },
      {
        title: "Atividade da família",
        description: "Um feed mostra quem adicionou, editou ou removeu lançamentos, com data e hora.",
      },
    ],
    keywords: ["família", "membro", "convidar", "permissão", "compartilhar", "perfil", "atividade"],
    deepLink: "settings",
  },

  // ===== CONFIGURAÇÕES =====
  {
    id: "settings-profile",
    title: "Configurações e Perfil",
    category: "settings",
    icon: "⚙️",
    summary: "Personalize sua experiência no Oik",
    steps: [
      {
        title: "Acesse Configurações",
        description: "Toque no ícone de engrenagem no canto superior direito da tela inicial.",
      },
      {
        title: "Meus Dados",
        description: "Edite seu nome, foto de perfil e informações pessoais.",
      },
      {
        title: "Contas e Cartões",
        description: "Cadastre suas contas bancárias e cartões de crédito.",
      },
      {
        title: "Importação",
        description: "Importe extratos de bancos em formato OFX, Excel ou PDF.",
      },
    ],
    keywords: ["configuração", "perfil", "conta", "cartão", "importar", "dados"],
    deepLink: "settings",
  },

  // ===== WHATSAPP =====
  {
    id: "whatsapp-support",
    title: "Consultoria via WhatsApp",
    category: "home",
    icon: "💬",
    summary: "Agende consultoria financeira com o Oik",
    steps: [
      {
        title: "Botão WhatsApp",
        description: "Na tela inicial, há um botão/link para WhatsApp que abre conversa direta.",
      },
      {
        title: "Número oficial",
        description: "+55 48 98848-3333 é o número para agendamento de consultoria.",
      },
      {
        title: "Mensagem pré-preenchida",
        description: "Ao clicar, a mensagem já vem pronta para agendar 1 hora de consultoria financeira familiar.",
      },
    ],
    keywords: ["whatsapp", "consultoria", "ajuda", "suporte", "atendimento", "oik"],
    deepLink: "dashboard",
  },

  // ===== INSIGHTS =====
  {
    id: "insights-reports",
    title: "Insights e Relatórios Mensais",
    category: "insights",
    icon: "📊",
    summary: "Recomendações personalizadas e resumo mensal",
    steps: [
      {
        title: "O que são Insights",
        description: "Recomendações geradas automaticamente com base nos seus dados: alertas de orçamento, metas sem aporte, padrões de gastos.",
      },
      {
        title: "Relatórios Mensais",
        description: "Visualize o resumo de cada mês (receitas, despesas, saldo, categorias principais) e identifique pendências.",
      },
      {
        title: "Fechar o mês",
        description: "Você pode 'fechar' o mês para registrar que o período foi revisado. Meses fechados podem ser reabertos.",
      },
      {
        title: "Baixar PDF",
        description: "Acesse Insights > Relatórios, selecione o mês e toque em 'Baixar PDF'. O link expira em 24 horas.",
      },
    ],
    keywords: ["insights", "relatório", "mensal", "pdf", "resumo", "recomendação", "dicas"],
    deepLink: "insights",
  },
];

// =====================================================
// FAQs DO APLICATIVO (USUÁRIO FINAL)
// =====================================================
export const faqItems: FAQItem[] = [
  // ===== PRIMEIROS PASSOS =====
  {
    id: "faq-1",
    question: "Como criar minha conta no Oik?",
    answer: "Toque em 'Criar conta' na tela inicial. Informe seu email, crie uma senha segura e complete o cadastro com seu nome, CPF e data de nascimento. O CPF é usado para desbloquear extratos protegidos.",
    category: "getting-started",
    keywords: ["criar", "conta", "cadastro", "início", "email"],
  },
  {
    id: "faq-2",
    question: "Por que preciso informar CPF e data de nascimento?",
    answer: "O CPF é usado para tentar desbloquear automaticamente arquivos de extrato protegidos por senha. Os bancos brasileiros geralmente usam o CPF como senha padrão. Seu CPF é armazenado de forma segura.",
    category: "getting-started",
    keywords: ["cpf", "nascimento", "senha", "importar", "segurança"],
  },
  {
    id: "faq-3",
    question: "O que é o Oik?",
    answer: "Oik vem do conceito grego 'oikonomía', que significa a organização inteligente da casa. O Oik representa ordem, clareza e tranquilidade para a vida financeira da sua família.",
    category: "general",
    keywords: ["oik", "nome", "significado", "oikonomia"],
  },

  // ===== LANÇAMENTOS =====
  {
    id: "faq-4",
    question: "Qual a diferença entre 'Crédito' e 'Receita'?",
    answer: "Crédito é a DIREÇÃO do valor (dinheiro entrando). Receita é a CLASSIFICAÇÃO (como você quer que o sistema trate). Um crédito pode ser classificado como Receita (salário), Reembolso (devolução) ou Transferência (entre contas).",
    category: "transactions",
    keywords: ["crédito", "receita", "diferença", "classificação", "direção"],
  },
  {
    id: "faq-5",
    question: "Por que receitas não têm opção de débito/crédito?",
    answer: "Porque débito e crédito são métodos de PAGAMENTO. Para receitas (dinheiro entrando), os métodos de RECEBIMENTO disponíveis são: PIX, Dinheiro, Transferência e Cheque.",
    category: "transactions",
    keywords: ["receita", "débito", "crédito", "pagamento", "recebimento"],
  },
  {
    id: "faq-6",
    question: "Posso alterar a categoria de um lançamento?",
    answer: "Sim! Vá ao Extrato, toque no lançamento desejado e selecione 'Editar'. Vocês podem alterar a categoria, valor, data e outros detalhes.",
    category: "transactions",
    keywords: ["editar", "alterar", "categoria", "lançamento"],
  },
  {
    id: "faq-7",
    question: "Transferência entre minhas contas conta como despesa?",
    answer: "Não! Ao classificar como 'Transferência', o lançamento não entra no cálculo de despesas nem receitas. É apenas uma movimentação interna.",
    category: "transactions",
    keywords: ["transferência", "contas", "próprias", "não conta", "despesa"],
  },
  {
    id: "faq-8",
    question: "Como lançar despesas rápido no celular?",
    answer: "Toque no botão + flutuante. O valor é o primeiro campo com teclado numérico automático. Escolha categoria com um toque, a data já vem como 'Hoje' e o botão Salvar fica sempre visível. Menos de 10 segundos!",
    category: "transactions",
    keywords: ["rápido", "celular", "mobile", "lançar", "despesa", "velocidade"],
  },

  // ===== FAMÍLIA =====
  {
    id: "faq-9",
    question: "Como convidar minha família?",
    answer: "Vá em Configurações > Família e toque em 'Convidar membro'. Um convite será enviado por email e a pessoa poderá criar a conta e acessar os mesmos dados.",
    category: "family",
    keywords: ["convidar", "família", "membro", "compartilhar"],
  },

  // ===== IMPORTAÇÃO =====
  {
    id: "faq-10",
    question: "Como importar meu extrato bancário?",
    answer: "Vá em Configurações > Importar Dados. Vocês podem importar arquivos OFX, Excel (XLSX/XLS) ou PDF. Bancos testados: Bradesco, BTG Pactual, Itaú e Santander. Se o arquivo tiver senha, o Oik tentará usar CPF automaticamente.",
    category: "import",
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "pdf", "senha"],
  },
  {
    id: "faq-11",
    question: "Quais bancos são compatíveis com importação?",
    answer: "Testamos e validamos: Bradesco, BTG Pactual, Itaú e Santander (PDF e XLS). Nubank, Inter e C6 Bank funcionam via OFX. Outros bancos podem funcionar — se o seu não for reconhecido, exporte em OFX.",
    category: "import",
    keywords: ["banco", "compatível", "suportado", "bradesco", "btg", "itau", "santander", "nubank"],
  },
  {
    id: "faq-12",
    question: "O OIK salva minha senha de arquivo?",
    answer: "Não! Senhas de arquivos NUNCA são salvas. O OIK apenas memoriza qual PADRÃO funcionou (ex: 'CPF 9 dígitos') para cada banco, acelerando futuras importações.",
    category: "import",
    keywords: ["senha", "cpf", "segurança", "lgpd", "salvar"],
  },
  {
    id: "faq-13",
    question: "Qual formato de arquivo é melhor para importar?",
    answer: "OFX é o mais universal e funciona com qualquer banco. PDF e XLS são suportados para Bradesco, BTG, Itaú e Santander. Se um formato não funcionar, tente OFX.",
    category: "import",
    keywords: ["formato", "ofx", "pdf", "xls", "xlsx", "melhor", "recomendado"],
  },

  // ===== ORÇAMENTO =====
  {
    id: "faq-14",
    question: "O que é o Orçamento Inteligente?",
    answer: "É um recurso que cria automaticamente metas de orçamento para cada categoria baseado na faixa de renda da família. Você seleciona a faixa (não o valor exato), e o OIK aplica percentuais recomendados.",
    category: "budgets",
    keywords: ["orçamento", "inteligente", "faixa", "renda", "automático", "template"],
  },
  {
    id: "faq-15",
    question: "O OIK armazena minha renda exata?",
    answer: "Não! O OIK armazena apenas a faixa de renda selecionada (por exemplo, 'R$ 8.001 – R$ 15.000'), nunca o valor exato. Isso é usado apenas para calcular percentuais.",
    category: "budgets",
    keywords: ["privacidade", "renda", "faixa", "segurança", "dados"],
  },
  {
    id: "faq-16",
    question: "Por que compras no cartão não entram no orçamento do mês?",
    answer: "O Oik usa regime de caixa: a compra no cartão é um evento, mas o dinheiro só sai quando você paga a fatura. Por isso, compras no cartão entram no orçamento do mês em que a fatura é paga.",
    category: "budgets",
    keywords: ["cartão", "crédito", "compra", "fatura", "orçamento", "mês"],
  },
  {
    id: "faq-17",
    question: "Posso definir metas por subcategoria?",
    answer: "Sim! Ao criar uma meta de orçamento, vocês podem escolher uma categoria específica ou uma subcategoria para um controle mais detalhado.",
    category: "budgets",
    keywords: ["meta", "subcategoria", "orçamento", "específico"],
  },

  // ===== OBJETIVOS =====
  {
    id: "faq-18",
    question: "Como criar um objetivo de poupança?",
    answer: "Em Metas, toque em 'Novo Objetivo'. Defina nome (ex: Viagem), valor alvo e data limite. Ao criar, ele aparece como subcategoria em 'Objetivos'. Faça aportes pelo botão 'Contribuir'.",
    category: "objectives",
    keywords: ["objetivo", "poupança", "guardar", "aporte", "contribuição"],
  },

  // ===== PRIVACIDADE =====
  {
    id: "faq-19",
    question: "Meus dados estão seguros no Oik?",
    answer: "Sim! O Oik utiliza criptografia e segue as melhores práticas de segurança. Seus dados são armazenados de forma segura e nunca são vendidos a terceiros.",
    category: "privacy",
    keywords: ["segurança", "dados", "privacidade", "criptografia", "senha"],
  },
  {
    id: "faq-20",
    question: "Como excluir minha conta no Oik?",
    answer: "Em Configurações > Meus Dados > Privacidade, vocês encontram a opção de excluir conta. Esta ação é irreversível e remove todos os dados permanentemente.",
    category: "privacy",
    keywords: ["excluir", "deletar", "conta", "remover"],
  },

  // ===== NAVEGAÇÃO =====
  {
    id: "faq-21",
    question: "Como navegar entre as telas do Oik?",
    answer: "Use a barra de navegação inferior com 5 ícones: Casa, Extrato, Categorias, Metas e Educação. Na tela inicial, atalhos rápidos também levam às funcionalidades principais.",
    category: "navigation",
    keywords: ["navegar", "navegação", "menu", "tela", "aba", "inferior"],
  },
  {
    id: "faq-22",
    question: "Como voltar para a tela anterior?",
    answer: "Use a seta no canto superior esquerdo ou toque no ícone Casa na barra inferior para voltar à Home. Em painéis deslizantes, deslize para baixo ou toque fora.",
    category: "navigation",
    keywords: ["voltar", "anterior", "seta", "fechar", "sheet"],
  },

  // ===== WHATSAPP =====
  {
    id: "faq-23",
    question: "Como funciona o WhatsApp do Oik?",
    answer: "O botão WhatsApp na tela inicial abre uma conversa com o número +55 48 98848-3333. A mensagem já vem pré-preenchida para agendar consultoria financeira familiar.",
    category: "home",
    keywords: ["whatsapp", "consultoria", "número"],
  },

  // ===== REGIME DE CAIXA / COMPETÊNCIA =====
  {
    id: "faq-24",
    question: "O que é regime de caixa?",
    answer: "Regime de caixa (Fluxo de Caixa) significa que o Oik conta as transações no mês em que o dinheiro efetivamente sai ou entra. Para cartão de crédito, é o mês do pagamento da fatura. Para cheque, é a data de compensação. Este é o regime padrão e recomendado.",
    category: "budgets",
    keywords: ["regime", "caixa", "quando", "conta", "mês", "orçamento", "fluxo"],
  },
  {
    id: "faq-25",
    question: "Como funciona o cheque no regime de caixa?",
    answer: "Cheques emitidos ficam 'pendentes' até você informar a data de compensação. Só então o valor entra no orçamento daquele mês. Isso evita contabilizar gastos que ainda não afetaram seu saldo.",
    category: "budgets",
    keywords: ["cheque", "compensação", "pendente", "data", "caixa"],
  },
  {
    id: "faq-26",
    question: "O que é regime de competência?",
    answer: "Regime de competência considera receitas e despesas no mês em que ACONTECERAM, independente de quando foram pagas. Por exemplo: aluguel de janeiro entra em janeiro mesmo se pago em fevereiro.",
    category: "budgets",
    keywords: ["regime", "competência", "quando", "aconteceu", "mês", "origem"],
  },
  {
    id: "faq-27",
    question: "Qual regime devo escolher?",
    answer: "O Fluxo de Caixa (padrão) é mais simples e indicado para planejamento familiar — mostra exatamente o impacto no saldo. O regime de Competência é mais analítico, para quem quer acompanhar compromissos pelo mês de origem.",
    category: "budgets",
    keywords: ["qual", "regime", "escolher", "recomendado", "melhor"],
  },
  {
    id: "faq-28",
    question: "Posso trocar o regime de registro?",
    answer: "Sim! Em Configurações > Finanças > Regime de Registro. A troca não apaga lançamentos — apenas muda a forma como o 'realizado' é calculado no orçamento.",
    category: "budgets",
    keywords: ["trocar", "mudar", "alterar", "regime", "configuração"],
  },
  {
    id: "faq-29",
    question: "Como funciona o cartão de crédito no Fluxo de Caixa?",
    answer: "No Fluxo de Caixa (padrão), compras no cartão NÃO entram no orçamento no momento da compra. A despesa só entra quando você PAGA a fatura. Assim, o realizado reflete exatamente quando o dinheiro saiu da sua conta.",
    category: "budgets",
    keywords: ["cartão", "crédito", "fluxo", "caixa", "fatura", "pagamento"],
  },
  {
    id: "faq-30",
    question: "Como funciona o cartão de crédito no regime de Competência?",
    answer: "No regime de Competência, compras no cartão entram no orçamento no mês da COMPRA, independente de quando você pagar a fatura. Cada parcela entra no mês correspondente. O pagamento da fatura não conta como despesa para evitar contagem dupla.",
    category: "budgets",
    keywords: ["cartão", "crédito", "competência", "compra", "parcela"],
  },
  {
    id: "faq-31",
    question: "Por que meu cartão não aparece no realizado?",
    answer: "Se você está no regime de Fluxo de Caixa (padrão), compras no cartão só aparecem no realizado quando a FATURA é paga. Verifique se o pagamento da fatura foi registrado. Se preferir ver compras imediatamente, considere mudar para regime de Competência.",
    category: "budgets",
    keywords: ["cartão", "não aparece", "realizado", "fatura", "regime"],
  },
];

// =====================================================
// LABELS DE CATEGORIA
// =====================================================
export const categoryLabels: Record<string, string> = {
  "getting-started": "Primeiros Passos",
  "home": "Tela Inicial",
  "navigation": "Navegação",
  "transactions": "Lançamentos",
  "categories": "Categorias",
  "goals": "Metas",
  "objectives": "Objetivos",
  "budgets": "Orçamento",
  "projection": "Projeção",
  "import": "Importação",
  "family": "Família",
  "settings": "Configurações",
  "privacy": "Privacidade e Segurança",
  "insights": "Insights e Relatórios",
  "general": "Geral",
};

// =====================================================
// FUNÇÃO DE BUSCA
// =====================================================
export function searchHelp(query: string): { articles: HelpArticle[]; faqs: FAQItem[] } {
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

  const scoredArticles = helpArticles
    .map(article => ({
      article,
      score: matchScore(article.keywords, article.title, article.summary),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const scoredFaqs = faqItems
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
