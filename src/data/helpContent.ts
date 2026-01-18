export interface HelpArticle {
  id: string;
  title: string;
  category: "getting-started" | "home" | "transactions" | "categories" | "goals" | "budgets" | "projection" | "family" | "settings" | "privacy";
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

export const helpArticles: HelpArticle[] = [
  {
    id: "getting-started",
    title: "Primeiros Passos",
    category: "getting-started",
    icon: "🚀",
    summary: "Aprenda o básico para começar a usar o app",
    steps: [
      {
        title: "Crie sua conta",
        description: "Faça o cadastro com seu email ou conta Google. Você será automaticamente adicionado à sua família financeira.",
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
        description: "Vá em Metas e crie limites para cada categoria de gasto. Você receberá alertas ao se aproximar do limite.",
      },
    ],
    keywords: ["começar", "início", "cadastro", "primeiro", "tutorial", "básico"],
  },
  {
    id: "home-dashboard",
    title: "Tela Inicial: Saldo e Timeline",
    category: "home",
    icon: "🏠",
    summary: "Entenda cada elemento da tela inicial",
    steps: [
      {
        title: "Card de Saldo",
        description: "Mostra o saldo do mês atual (receitas - despesas). Verde indica saldo positivo, vermelho indica negativo.",
      },
      {
        title: "Seletor de Mês",
        description: "Toque nas setas para navegar entre meses. Toque no mês para voltar ao atual rapidamente.",
        tip: "Você pode ver meses anteriores para comparar gastos.",
      },
      {
        title: "Fatura do Cartão",
        description: "Mostra o total de gastos no cartão de crédito do mês selecionado.",
      },
      {
        title: "Ações Rápidas",
        description: "Botões para adicionar receita, despesa, meta ou visualizar recibos.",
      },
      {
        title: "Widget de Orçamento",
        description: "Mostra alertas de metas próximas do limite ou excedidas.",
      },
    ],
    keywords: ["home", "início", "saldo", "dashboard", "cartão", "fatura", "mês"],
    deepLink: "dashboard",
  },
  {
    id: "add-transaction",
    title: "Inserir Receita ou Despesa",
    category: "transactions",
    icon: "➕",
    summary: "Como registrar lançamentos financeiros",
    steps: [
      {
        title: "Toque no botão +",
        description: "O botão flutuante no canto inferior direito abre o formulário de novo lançamento.",
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
        description: "Escolha a categoria que melhor descreve o lançamento. Você pode também escolher uma subcategoria.",
        tip: "Categorizar corretamente ajuda nos relatórios e metas.",
      },
      {
        title: "Método de pagamento",
        description: "Informe como foi pago: PIX, cartão de débito/crédito, dinheiro ou transferência.",
      },
      {
        title: "Descrição (opcional)",
        description: "Adicione uma descrição para lembrar do que se trata o lançamento.",
      },
    ],
    keywords: ["adicionar", "inserir", "lançamento", "receita", "despesa", "gasto", "entrada", "saída"],
    deepLink: "dashboard",
  },
  {
    id: "statement-filters",
    title: "Extrato e Filtros",
    category: "transactions",
    icon: "📋",
    summary: "Visualize e filtre seus lançamentos",
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
  {
    id: "categories-management",
    title: "Gerenciando Categorias",
    category: "categories",
    icon: "📊",
    summary: "Organize seus gastos por categoria",
    steps: [
      {
        title: "Visualize suas categorias",
        description: "Toque em 'Categorias' na navegação para ver a lista completa.",
      },
      {
        title: "Categorias de despesa",
        description: "Casa, Alimentação, Transporte, Lazer, Filhos, Pet, Saúde e mais.",
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
    keywords: ["categoria", "subcategoria", "organizar", "classificar", "tipo"],
    deepLink: "categories",
  },
  {
    id: "budget-goals",
    title: "Metas de Orçamento",
    category: "budgets",
    icon: "🎯",
    summary: "Defina limites e receba alertas",
    steps: [
      {
        title: "Crie uma meta",
        description: "Em Metas, toque em 'Nova Meta'. Escolha uma categoria e defina o limite mensal.",
      },
      {
        title: "Alerta de 80%",
        description: "Quando atingir 80% do limite, você verá um alerta amarelo.",
      },
      {
        title: "Limite excedido",
        description: "Ao ultrapassar 100%, o alerta fica vermelho com sugestões de ação.",
      },
      {
        title: "Ajuste metas",
        description: "Você pode editar ou remover metas a qualquer momento.",
        tip: "Comece com metas realistas baseadas no seu histórico.",
      },
    ],
    keywords: ["meta", "orçamento", "limite", "alerta", "objetivo", "controle"],
    deepLink: "goals",
  },
  {
    id: "projection-module",
    title: "Projeção Financeira",
    category: "projection",
    icon: "📈",
    summary: "Veja o futuro das suas finanças",
    steps: [
      {
        title: "Acesse Projeção",
        description: "Toque em 'Projeção' na navegação inferior.",
      },
      {
        title: "Timeline mensal",
        description: "Veja cards com projeção de saldo para os próximos 6 meses.",
      },
      {
        title: "Detalhes do mês",
        description: "Toque em um mês para ver receitas, despesas e parcelas projetadas.",
      },
      {
        title: "Dicas de IA",
        description: "Na aba 'Dicas IA', receba recomendações personalizadas baseadas nos seus dados.",
        tip: "As dicas são geradas com dados agregados, sem expor informações sensíveis.",
      },
    ],
    keywords: ["projeção", "futuro", "previsão", "parcela", "cartão", "IA", "dica"],
    deepLink: "projection",
  },
  {
    id: "family-members",
    title: "Família e Permissões",
    category: "family",
    icon: "👨‍👩‍👧‍👦",
    summary: "Convide membros e gerencie permissões",
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
        tip: "Conversem em família sobre o uso do app para melhor organização.",
      },
    ],
    keywords: ["família", "membro", "convidar", "permissão", "compartilhar"],
    deepLink: "settings",
  },
  {
    id: "settings-profile",
    title: "Configurações e Perfil",
    category: "settings",
    icon: "⚙️",
    summary: "Personalize sua experiência",
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
        description: "Importe extratos de bancos em formato OFX ou Excel.",
      },
    ],
    keywords: ["configuração", "perfil", "conta", "cartão", "importar", "dados"],
    deepLink: "settings",
  },
  {
    id: "privacy-lgpd",
    title: "Privacidade e LGPD",
    category: "privacy",
    icon: "🔒",
    summary: "Seus dados estão protegidos",
    steps: [
      {
        title: "Exportar dados",
        description: "Em Configurações > Meus Dados, você pode exportar todos os seus dados em formato JSON.",
      },
      {
        title: "Excluir conta",
        description: "Você pode solicitar a exclusão total da sua conta e dados a qualquer momento.",
        tip: "A exclusão é irreversível. Exporte seus dados antes se precisar.",
      },
      {
        title: "Segurança",
        description: "Seus dados são criptografados e armazenados de forma segura.",
      },
      {
        title: "Uso dos dados",
        description: "Usamos seus dados apenas para fornecer o serviço. Nunca vendemos informações.",
      },
    ],
    keywords: ["privacidade", "lgpd", "dados", "exportar", "excluir", "segurança", "proteção"],
    deepLink: "settings",
  },
];

export const faqItems: FAQItem[] = [
  {
    id: "faq-1",
    question: "Como adicionar uma despesa parcelada?",
    answer: "Ao adicionar uma despesa, selecione o método de pagamento 'Crédito' e informe o número de parcelas. O app criará automaticamente os lançamentos futuros.",
    category: "transactions",
    keywords: ["parcela", "parcelado", "cartão", "crédito"],
  },
  {
    id: "faq-2",
    question: "Posso usar o app sem internet?",
    answer: "O app precisa de internet para sincronizar dados. No entanto, você pode visualizar dados já carregados mesmo offline.",
    category: "general",
    keywords: ["offline", "internet", "conexão"],
  },
  {
    id: "faq-3",
    question: "Como funciona o alerta de orçamento?",
    answer: "Quando você gasta 80% do limite definido para uma categoria, recebe um alerta amarelo. Ao atingir 100%, o alerta fica vermelho indicando que o limite foi excedido.",
    category: "budgets",
    keywords: ["alerta", "orçamento", "limite", "meta", "80%", "100%"],
  },
  {
    id: "faq-4",
    question: "Como convidar minha família?",
    answer: "Vá em Configurações > Família e toque em 'Convidar membro'. Um convite será enviado por email e a pessoa poderá criar a conta e acessar os mesmos dados.",
    category: "family",
    keywords: ["convidar", "família", "membro", "compartilhar"],
  },
  {
    id: "faq-5",
    question: "Meus dados estão seguros?",
    answer: "Sim! Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança. Seus dados são armazenados em servidores seguros e nunca são vendidos a terceiros.",
    category: "privacy",
    keywords: ["segurança", "dados", "privacidade", "criptografia"],
  },
  {
    id: "faq-6",
    question: "Como importar meu extrato bancário?",
    answer: "Vá em Configurações > Importar Dados. Você pode importar arquivos OFX ou Excel do seu banco. O app tentará categorizar automaticamente os lançamentos.",
    category: "settings",
    keywords: ["importar", "extrato", "banco", "ofx", "excel"],
  },
  {
    id: "faq-7",
    question: "Posso alterar a categoria de um lançamento?",
    answer: "Sim! Vá ao Extrato, toque no lançamento desejado e selecione 'Editar'. Você poderá alterar a categoria, valor, data e outros detalhes.",
    category: "transactions",
    keywords: ["editar", "alterar", "categoria", "lançamento"],
  },
  {
    id: "faq-8",
    question: "O que são as dicas de IA na Projeção?",
    answer: "São recomendações personalizadas geradas por inteligência artificial baseadas nos seus padrões de gastos. As dicas usam apenas dados agregados para proteger sua privacidade.",
    category: "projection",
    keywords: ["IA", "inteligência", "dica", "recomendação", "projeção"],
  },
  {
    id: "faq-9",
    question: "Como excluir minha conta?",
    answer: "Em Configurações > Meus Dados > Privacidade, você encontra a opção de excluir conta. Esta ação é irreversível e remove todos os seus dados permanentemente.",
    category: "privacy",
    keywords: ["excluir", "deletar", "conta", "remover"],
  },
  {
    id: "faq-10",
    question: "Posso definir metas por subcategoria?",
    answer: "Sim! Ao criar uma meta de orçamento, você pode escolher uma categoria específica ou uma subcategoria para um controle mais detalhado.",
    category: "budgets",
    keywords: ["meta", "subcategoria", "orçamento", "específico"],
  },
];

export const categoryLabels: Record<string, string> = {
  "getting-started": "Primeiros Passos",
  "home": "Tela Inicial",
  "transactions": "Lançamentos",
  "categories": "Categorias",
  "goals": "Metas",
  "budgets": "Orçamento",
  "projection": "Projeção",
  "family": "Família",
  "settings": "Configurações",
  "privacy": "Privacidade",
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
