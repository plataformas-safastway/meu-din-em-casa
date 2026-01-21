export interface HelpArticle {
  id: string;
  title: string;
  category: "getting-started" | "home" | "transactions" | "categories" | "goals" | "objectives" | "budgets" | "projection" | "import" | "family" | "settings" | "privacy";
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

// Última atualização: 21/01/2026
export const HELP_CENTER_VERSION = "21/01/2026";

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
      {
        title: "Ícones do Topo",
        description: "Sino para notificações e engrenagem para configurações.",
      },
    ],
    keywords: ["home", "início", "saldo", "dashboard", "cartão", "fatura", "mês", "timeline", "notificações", "configurações"],
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
    keywords: ["adicionar", "inserir", "lançamento", "receita", "despesa", "gasto", "entrada", "saída", "pix", "dinheiro", "cartão", "cheque", "débito", "crédito"],
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
    summary: "Como os valores são calculados por categoria no Oik",
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
      {
        title: "Cálculo de valores",
        description: "Os valores exibidos são calculados pela SOMA REAL das transações cadastradas, não por estimativas.",
        tip: "O total da categoria é sempre igual à soma de suas subcategorias.",
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
        title: "Integração com categorias",
        description: "Aportes aparecem na categoria 'Objetivos' com subcategoria igual ao nome do objetivo.",
        tip: "Vocês podem fazer lançamentos manuais em 'Objetivos > [Nome]' e o progresso será atualizado.",
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
    summary: "Defina limites e receba alertas no Oik",
    steps: [
      {
        title: "Crie uma meta",
        description: "Em Metas, toque em 'Nova Meta'. Escolha uma categoria e defina o limite mensal.",
      },
      {
        title: "Alerta de 80%",
        description: "Quando vocês atingirem 80% do limite, verão um alerta amarelo com a mensagem 'Atenção com [Categoria]'.",
      },
      {
        title: "Limite excedido (100%)",
        description: "Ao ultrapassar 100%, o alerta fica vermelho: 'O limite de [Categoria] foi ultrapassado'.",
      },
      {
        title: "Ajuste metas",
        description: "Vocês podem editar ou remover metas a qualquer momento. Após exceder, é possível aumentar o limite.",
        tip: "Comece com metas realistas baseadas no seu histórico.",
      },
    ],
    keywords: ["meta", "orçamento", "limite", "alerta", "objetivo", "controle", "80%", "100%", "excedido"],
    deepLink: "goals",
  },

  // ===== IMPORTAÇÃO =====
  {
    id: "import-files",
    title: "Importar Extratos",
    category: "import",
    icon: "📥",
    summary: "Importe arquivos OFX, XLSX ou PDF no Oik",
    steps: [
      {
        title: "Formatos suportados",
        description: "OFX (padrão bancário), XLSX/XLS (Excel) e PDF (fatura de cartão).",
      },
      {
        title: "Upload do arquivo",
        description: "Vá em Configurações > Importar ou use o atalho na tela inicial. O OIK detecta automaticamente o banco e tipo de documento.",
      },
      {
        title: "Arquivos com senha (Inteligente)",
        description: "Se o arquivo estiver protegido, o OIK tenta desbloquear automaticamente usando padrões de CPF: 11 dígitos, 3, 4, 5, 6, 7, 8, 9 ou 10 primeiros dígitos.",
        tip: "O sistema aprende o padrão de cada banco para acelerar futuras importações.",
      },
      {
        title: "Confirmação de titularidade",
        description: "Antes de importar, você confirma que o arquivo pertence a você ou sua família. Isso é obrigatório por segurança.",
      },
      {
        title: "Detecção automática",
        description: "O OIK identifica automaticamente: banco emissor, tipo (extrato ou fatura), conta/cartão associado, e categoriza as transações.",
      },
      {
        title: "Revisão obrigatória",
        description: "Antes de salvar, vocês SEMPRE revisam as transações. É possível editar categoria, descartar itens ou ajustar valores.",
      },
      {
        title: "Aprendizado contínuo",
        description: "Ao corrigir uma categoria, o OIK aprende para próximas importações. Padrões de senha também são aprendidos por banco.",
      },
    ],
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "xlsx", "pdf", "senha", "cpf", "duplicado", "automático", "inteligente"],
    deepLink: "settings",
  },

  // ===== PRIVACIDADE E SEGURANÇA =====
  {
    id: "privacy-security",
    title: "Privacidade e Segurança",
    category: "privacy",
    icon: "🔒",
    summary: "Como o Oik trata seus dados e senhas",
    steps: [
      {
        title: "Senhas de arquivo",
        description: "Senhas usadas para desbloquear arquivos de importação NUNCA são salvas no banco de dados. São usadas apenas temporariamente para processar o arquivo.",
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
    keywords: ["privacidade", "lgpd", "dados", "exportar", "excluir", "segurança", "proteção", "senha", "criptografia", "oik"],
    deepLink: "settings",
  },

  // ===== FAMÍLIA =====
  {
    id: "family-members",
    title: "Família e Permissões",
    category: "family",
    icon: "👨‍👩‍👧‍👦",
    summary: "Convide membros e gerencie permissões no Oik",
    steps: [
      {
        title: "Convide familiares",
        description: "Em Configurações > Família, toque em 'Convidar membro'.",
      },
      {
        title: "Funções",
        description: "O dono (owner) tem controle total. Membros podem visualizar e adicionar lançamentos.",
      },
      {
        title: "Compartilhamento",
        description: "Todos os membros da família veem os mesmos dados financeiros.",
        tip: "Conversem em família sobre o uso do Oik para melhor organização.",
      },
    ],
    keywords: ["família", "membro", "convidar", "permissão", "compartilhar"],
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
];

export const faqItems: FAQItem[] = [
  {
    id: "faq-0",
    question: "O que é o Oik?",
    answer: "O Oik é uma plataforma premium de inteligência financeira familiar. Utilizamos inteligência artificial para acompanhar o dia a dia financeiro, integrar dados, gerar relatórios e promover educação financeira, trazendo harmonia ao lar e eliminando a ansiedade causada pelo dinheiro.",
    category: "general",
    keywords: ["oik", "o que é", "sobre", "plataforma", "inteligência"],
  },
  {
    id: "faq-1",
    question: "Como adicionar uma despesa parcelada?",
    answer: "Ao adicionar uma despesa, selecione o método de pagamento 'Crédito' e informe o número de parcelas. O Oik criará automaticamente os lançamentos futuros.",
    category: "transactions",
    keywords: ["parcela", "parcelado", "cartão", "crédito"],
  },
  {
    id: "faq-2",
    question: "Posso usar o Oik sem internet?",
    answer: "O Oik precisa de internet para sincronizar dados. No entanto, vocês podem visualizar dados já carregados mesmo offline.",
    category: "general",
    keywords: ["offline", "internet", "conexão"],
  },
  {
    id: "faq-3",
    question: "Como funciona o alerta de orçamento?",
    answer: "Quando vocês gastam 80% do limite definido para uma categoria, aparece um alerta amarelo. Ao atingir 100%, o alerta fica vermelho indicando que o limite foi excedido.",
    category: "budgets",
    keywords: ["alerta", "orçamento", "limite", "meta", "80%", "100%"],
  },
  {
    id: "faq-4",
    question: "Como convidar minha família?",
    answer: "Vá em Configurações > Família e toque em 'Convidar membro'. Um convite será enviado por email e a pessoa poderá criar a conta e acessar os mesmos dados no Oik.",
    category: "family",
    keywords: ["convidar", "família", "membro", "compartilhar"],
  },
  {
    id: "faq-5",
    question: "Meus dados estão seguros no Oik?",
    answer: "Sim! O Oik utiliza criptografia e segue as melhores práticas de segurança. Seus dados são armazenados de forma segura e nunca são vendidos a terceiros. Senhas de arquivos de importação nunca são salvas.",
    category: "privacy",
    keywords: ["segurança", "dados", "privacidade", "criptografia", "senha"],
  },
  {
    id: "faq-6",
    question: "Como importar meu extrato bancário?",
    answer: "Vá em Configurações > Importar Dados. Vocês podem importar arquivos OFX, Excel (XLSX/XLS) ou PDF. Se o arquivo tiver senha, o Oik tentará usar CPF ou data de nascimento automaticamente.",
    category: "import",
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "pdf", "senha"],
  },
  {
    id: "faq-7",
    question: "Posso alterar a categoria de um lançamento?",
    answer: "Sim! Vá ao Extrato, toque no lançamento desejado e selecione 'Editar'. Vocês podem alterar a categoria, valor, data e outros detalhes.",
    category: "transactions",
    keywords: ["editar", "alterar", "categoria", "lançamento"],
  },
  {
    id: "faq-8",
    question: "Como criar um objetivo de poupança?",
    answer: "Em Metas, toque em 'Novo Objetivo'. Defina nome (ex: Viagem), valor alvo e data limite. Ao criar, ele aparece como subcategoria em 'Objetivos'. Faça aportes pelo botão 'Contribuir'.",
    category: "objectives",
    keywords: ["objetivo", "poupança", "guardar", "aporte", "contribuição"],
  },
  {
    id: "faq-9",
    question: "Por que ao excluir um aporte, todos foram apagados?",
    answer: "Isso era um bug que já foi corrigido. Agora, ao excluir um aporte, apenas aquele aporte específico é removido. O objetivo recalcula o progresso corretamente.",
    category: "objectives",
    keywords: ["excluir", "aporte", "bug", "corrigido"],
  },
  {
    id: "faq-10",
    question: "Posso definir metas por subcategoria?",
    answer: "Sim! Ao criar uma meta de orçamento, vocês podem escolher uma categoria específica ou uma subcategoria para um controle mais detalhado.",
    category: "budgets",
    keywords: ["meta", "subcategoria", "orçamento", "específico"],
  },
  {
    id: "faq-11",
    question: "Por que preciso informar CPF e data de nascimento?",
    answer: "O CPF é usado para tentar desbloquear automaticamente arquivos de extrato protegidos por senha. Os bancos brasileiros geralmente usam o CPF (completo ou parcial) como senha padrão. Seu CPF é armazenado de forma segura e nunca aparece em logs.",
    category: "import",
    keywords: ["cpf", "nascimento", "senha", "importar", "segurança"],
  },
  {
    id: "faq-cpf-seguro",
    question: "O OIK salva minha senha de arquivo?",
    answer: "Não! Senhas de arquivos NUNCA são salvas. O OIK apenas memoriza qual PADRÃO funcionou (ex: 'CPF 9 dígitos') para cada banco, acelerando futuras importações. Seu CPF é criptografado e usado apenas no momento do desbloqueio.",
    category: "import",
    keywords: ["senha", "cpf", "segurança", "lgpd", "salvar"],
  },
  {
    id: "faq-auto-detect",
    question: "Como funciona a detecção automática de contas?",
    answer: "Ao importar um arquivo, o OIK identifica automaticamente o banco emissor usando CNPJ, códigos COMPE e padrões de texto. Se detectar uma conta ou cartão, oferece a opção de vincular a um cadastro existente ou criar automaticamente.",
    category: "import",
    keywords: ["detecção", "automático", "conta", "cartão", "banco"],
  },
  {
    id: "faq-12",
    question: "Por que receitas não têm opção de débito/crédito?",
    answer: "Porque débito e crédito são métodos de PAGAMENTO. Para receitas (dinheiro entrando), os métodos de RECEBIMENTO disponíveis são: PIX, Dinheiro, Transferência e Cheque.",
    category: "transactions",
    keywords: ["receita", "débito", "crédito", "pagamento", "recebimento"],
  },
  {
    id: "faq-13",
    question: "O que acontece se eu selecionar Cheque?",
    answer: "Ao selecionar Cheque como método de pagamento, o campo 'Número do cheque' se torna obrigatório. Isso ajuda a rastrear e conciliar os cheques emitidos.",
    category: "transactions",
    keywords: ["cheque", "número", "obrigatório"],
  },
  {
    id: "faq-14",
    question: "Como funciona o WhatsApp do Oik?",
    answer: "O botão WhatsApp na tela inicial abre uma conversa com o número +55 48 98848-3333. A mensagem já vem pré-preenchida para agendar consultoria financeira familiar.",
    category: "home",
    keywords: ["whatsapp", "consultoria", "número"],
  },
  {
    id: "faq-15",
    question: "Como excluir minha conta no Oik?",
    answer: "Em Configurações > Meus Dados > Privacidade, vocês encontram a opção de excluir conta. Esta ação é irreversível e remove todos os dados permanentemente.",
    category: "privacy",
    keywords: ["excluir", "deletar", "conta", "remover"],
  },
  {
    id: "faq-16",
    question: "O que significa Oik?",
    answer: "Oik vem do conceito grego 'oikonomía', que significa a organização inteligente da casa. O Oik representa ordem, clareza e tranquilidade para a vida financeira da sua família.",
    category: "general",
    keywords: ["oik", "nome", "significado", "oikonomia"],
  },
];

export const categoryLabels: Record<string, string> = {
  "getting-started": "Primeiros Passos",
  "home": "Tela Inicial",
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
  "general": "Geral",
};

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
        // Bonus for exact keyword match
        if (keywords.some(k => k.includes(word))) {
          score += 2;
        }
        // Bonus for title match
        if (title.toLowerCase().includes(word)) {
          score += 3;
        }
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
