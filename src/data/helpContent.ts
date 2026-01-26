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

// Última atualização: 25/01/2026 - Sprint 7 Relatórios Executivos & BI
export const HELP_CENTER_VERSION = "25/01/2026 v8";

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
      {
        title: "Ícones do Topo",
        description: "Sino para notificações e engrenagem para configurações.",
      },
    ],
    keywords: ["home", "início", "saldo", "dashboard", "cartão", "fatura", "mês", "timeline", "notificações", "configurações"],
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
        tip: "O ícone ativo fica destacado em verde.",
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
        title: "'Ver extrato' na Timeline",
        description: "Abaixo da lista de últimos lançamentos, o botão 'Ver extrato' navega diretamente para o Extrato completo.",
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
    keywords: ["adicionar", "inserir", "lançamento", "receita", "despesa", "gasto", "entrada", "saída", "pix", "dinheiro", "cartão", "cheque", "débito", "crédito"],
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
        tip: "Use para: PIX entre contas, TED para investimentos, resgate de aplicação. Não infla seus números.",
      },
      {
        title: "Ajuste ⚙️",
        description: "Correção ou acerto contábil. Para arrumar saldos ou registrar diferenças.",
        tip: "Raramente usado. Ideal para correções de erros ou ajustes de conciliação.",
      },
      {
        title: "Como escolher?",
        description: "Dinheiro novo = Receita. Gasto real = Despesa. Devolução = Reembolso. Entre contas = Transferência.",
      },
    ],
    keywords: ["tipo", "lançamento", "receita", "despesa", "reembolso", "transferência", "ajuste", "diferença", "classificação", "como escolher", "guia"],
    deepLink: "dashboard",
  },

  {
    id: "choose-bank-account",
    title: "Escolher Conta Bancária Correta",
    category: "transactions",
    icon: "🏦",
    summary: "Como selecionar a conta ou cartão certo ao lançar",
    steps: [
      {
        title: "Por que vincular conta?",
        description: "Vinculando a conta, você sabe de onde saiu ou entrou o dinheiro. Facilita a conciliação com extratos.",
      },
      {
        title: "Conta para PIX/Débito/Transferência",
        description: "Selecione a conta bancária de onde saiu ou entrou o dinheiro. O saldo da conta será afetado.",
      },
      {
        title: "Cartão de Crédito",
        description: "Para compras no crédito, selecione o cartão. O valor entra na fatura do cartão.",
        tip: "A fatura aparece no mês do fechamento, não da compra.",
      },
      {
        title: "Dinheiro ou Cheque",
        description: "Não precisa vincular conta. Para cheque, informe o número no campo específico.",
      },
      {
        title: "Posso não vincular?",
        description: "Sim, o campo é opcional. Mas vincular ajuda nos relatórios por conta e na conciliação.",
      },
    ],
    keywords: ["conta", "bancária", "escolher", "vincular", "cartão", "crédito", "débito", "pix", "qual"],
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
        tip: "Orçamento é uma referência, não um limite rígido. Use para entender padrões.",
      },
      {
        title: "Previsto vs Realizado",
        description: "Veja a comparação clara entre o que vocês planejaram (previsto) e o que realmente gastaram (realizado).",
        tip: "A diferença positiva significa economia. Negativa significa que gastaram mais que o planejado.",
      },
      {
        title: "Alerta de 80%",
        description: "Quando vocês atingirem 80% do limite, verão um alerta amarelo suave: 'Vocês já usaram 80% do orçamento desta categoria'.",
        tip: "Esses alertas podem ser fechados e silenciados por categoria.",
      },
      {
        title: "Limite excedido (100%)",
        description: "Ao ultrapassar 100%, o alerta fica vermelho. Vocês podem ajustar o orçamento ou revisar os lançamentos.",
        tip: "Exceder não é 'errar' — é um sinal para reavaliar ou aceitar que essa categoria precisa de mais.",
      },
      {
        title: "Ajuste metas",
        description: "Vocês podem editar ou remover metas a qualquer momento. Metas futuras também podem ser configuradas.",
        tip: "Comece com metas realistas baseadas no seu histórico.",
      },
      {
        title: "Integração com Projeção",
        description: "As metas de orçamento impactam a projeção financeira futura, ajudando a visualizar o impacto das escolhas.",
      },
    ],
    keywords: ["meta", "orçamento", "limite", "alerta", "objetivo", "controle", "80%", "100%", "excedido", "previsto", "realizado", "comparação"],
    deepLink: "goals",
  },

  // ===== PROJEÇÃO =====
  {
    id: "projection-intro",
    title: "O que é Projeção Financeira?",
    category: "projection",
    icon: "🔮",
    summary: "Entenda como ver o futuro financeiro sem editar nada",
    steps: [
      {
        title: "Visualização, não controle",
        description: "A Projeção mostra o impacto futuro das suas decisões atuais. Você não edita nada — apenas observa e planeja.",
        tip: "Enxergue antes de sentir. Essa é a ideia central da projeção.",
      },
      {
        title: "Timeline mensal",
        description: "Veja os próximos 6 meses em cards horizontais. Cada card mostra o saldo projetado. Toque para ver detalhes.",
      },
      {
        title: "Receitas projetadas",
        description: "Baseadas nas suas transações recorrentes (salário, pro-labore, renda fixa) e na média histórica.",
      },
      {
        title: "Despesas projetadas",
        description: "Incluem gastos fixos (recorrentes), parcelas de cartão e uma estimativa baseada no seu padrão de consumo.",
      },
      {
        title: "Saldo projetado",
        description: "Receitas menos despesas. Se ficar negativo, o card fica vermelho com alerta. Se positivo, está tudo bem.",
        tip: "Vermelho não é erro — é um sinal para planejar com antecedência.",
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
        tip: "Parcelas são compromissos fixos — entram automaticamente no cálculo.",
      },
      {
        title: "Impacto no orçamento",
        description: "Se suas parcelas representam mais de 30% da receita projetada, você verá um alerta educativo.",
        tip: "Parcelar espalha o impacto no tempo — pode ser bom, mas requer atenção.",
      },
      {
        title: "Concentração de parcelas",
        description: "A projeção destaca quando um cartão concentra muitas parcelas em um período específico.",
      },
      {
        title: "Dica: não é sugestão de troca",
        description: "O Oik não sugere trocar de cartão. Apenas mostra os dados para você decidir conscientemente.",
      },
    ],
    keywords: ["cartão", "parcela", "crédito", "fatura", "projeção", "impacto", "futuro", "concentração"],
    deepLink: "projection",
  },

  {
    id: "projection-ai-tips",
    title: "Dicas de IA na Projeção",
    category: "projection",
    icon: "✨",
    summary: "Como funcionam as dicas inteligentes baseadas nos seus dados",
    steps: [
      {
        title: "Análise agregada",
        description: "A IA analisa dados agregados (totais, médias, tendências) — nunca vê transações individuais.",
        tip: "Sua privacidade é preservada. A IA vê números, não descrições.",
      },
      {
        title: "Dicas personalizadas",
        description: "Baseadas no seu padrão: taxa de economia, categorias mais gastas, tendências de mês a mês.",
      },
      {
        title: "Alertas quando necessário",
        description: "Se a projeção indicar risco (saldo negativo futuro, gastos muito altos), você verá um alerta.",
        tip: "Alertas são informativos, não cobranças. O Oik não julga.",
      },
      {
        title: "Recomendações práticas",
        description: "Sugestões simples e acionáveis como 'revisar gastos fixos' ou 'manter reserva de emergência'.",
      },
    ],
    keywords: ["ia", "inteligência artificial", "dicas", "recomendação", "alerta", "automático", "personalizado"],
    deepLink: "projection",
  },

  // ===== IMPORTAÇÃO =====
  {
    id: "import-files",
    title: "Importar Extratos",
    category: "import",
    icon: "📥",
    summary: "Importe arquivos OFX, XLSX, XLS ou PDF no Oik",
    steps: [
      {
        title: "Formatos suportados",
        description: "OFX (padrão bancário universal), XLSX/XLS (Excel) e PDF. O OIK detecta automaticamente as colunas e banco emissor.",
        tip: "Excel é o formato mais confiável para extratos brasileiros. OFX funciona com qualquer banco.",
      },
      {
        title: "Bancos compatíveis (testados)",
        description: "Bradesco, BTG Pactual, Itaú e Santander foram testados com arquivos PDF e XLS reais. Nubank, Inter e C6 funcionam via OFX.",
        tip: "O parser universal funciona com qualquer banco que exporte Excel com colunas padrão (Data, Descrição, Valor).",
      },
      {
        title: "Upload do arquivo",
        description: "Vá em Configurações > Importar ou use o atalho na tela inicial. Selecione o arquivo e confirme a titularidade.",
      },
      {
        title: "Detecção automática de colunas",
        description: "O OIK identifica colunas automaticamente: Data (Data, Dt, Data Lançamento), Descrição (Histórico, Movimentação), Valor (Crédito, Débito, Valor R$).",
        tip: "Se seu Excel tiver cabeçalhos padrão, a importação funciona sem configuração.",
      },
      {
        title: "Arquivos com senha (Inteligente)",
        description: "Se o arquivo estiver protegido, o OIK tenta desbloquear automaticamente usando padrões de CPF: 11, 10, 9, 8, 7, 6, 5, 4 ou 3 primeiros dígitos.",
        tip: "O sistema aprende o padrão de cada banco para acelerar futuras importações.",
      },
      {
        title: "Confirmação de titularidade",
        description: "Antes de importar, você confirma que o arquivo pertence a você ou sua família. Isso é obrigatório por segurança e LGPD.",
      },
      {
        title: "Detecção automática de conta",
        description: "O OIK identifica agência e conta no cabeçalho do arquivo. Se não existir no cadastro, oferece criar automaticamente.",
      },
      {
        title: "Revisão obrigatória",
        description: "Antes de salvar, vocês SEMPRE revisam as transações. Linhas de saldo e cabeçalho são filtradas automaticamente.",
      },
      {
        title: "Edição na revisão",
        description: "Você pode editar: descrição (nome do lançamento), classificação (Receita/Despesa/Transferência/Reembolso/Ajuste), categoria e subcategoria.",
      },
      {
        title: "Linhas multi-linha (Rem:/Des:)",
        description: "Descrições que continuam em linhas abaixo (como 'Rem: Fulano' ou 'Des: Pagamento') são concatenadas automaticamente.",
      },
      {
        title: "Aprendizado contínuo",
        description: "Ao corrigir uma categoria, o OIK aprende para próximas importações. Padrões de senha também são aprendidos por banco.",
      },
    ],
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "xlsx", "xls", "pdf", "senha", "cpf", "duplicado", "automático", "inteligente", "bradesco", "btg", "itau", "santander", "colunas", "heurística"],
    deepLink: "settings",
  },

  {
    id: "import-excel-tips",
    title: "Dicas para Importar Excel",
    category: "import",
    icon: "📊",
    summary: "Como preparar seu arquivo Excel para melhor importação",
    steps: [
      {
        title: "Colunas reconhecidas",
        description: "O OIK detecta automaticamente: Data, Dt, Data Lançamento, Data Movimento | Descrição, Histórico, Movimentação, Lançamento | Valor, Crédito, Débito, Valor R$.",
        tip: "Use nomes de coluna em português para melhor detecção.",
      },
      {
        title: "Formato de data",
        description: "Aceitos: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, ou serial do Excel (número). Datas sem ano usam o ano do período do extrato.",
      },
      {
        title: "Formato de valor",
        description: "Aceitos: 1.234,56 (brasileiro) ou 1234.56 (internacional). Valores negativos indicam débito. Colunas separadas de Crédito/Débito também funcionam.",
      },
      {
        title: "Linhas de cabeçalho",
        description: "O OIK pula linhas de título, período e cabeçalho automaticamente. Procura a primeira linha com 'Data' e padrões similares.",
      },
      {
        title: "Linhas de rodapé",
        description: "Linhas com 'Últimos Lançamentos', 'Total', 'Telefones úteis' ou 'Dados acima' são ignoradas automaticamente.",
      },
      {
        title: "Se não funcionar",
        description: "Exporte o extrato em formato OFX (disponível em todos os internet bankings). OFX é o formato mais universal e confiável.",
      },
    ],
    keywords: ["excel", "xlsx", "xls", "colunas", "formato", "data", "valor", "preparar", "dicas"],
    deepLink: "settings",
  },

  {
    id: "import-password-cpf",
    title: "Arquivos com Senha (CPF)",
    category: "import",
    icon: "🔐",
    summary: "Como o OIK desbloqueia arquivos protegidos por senha",
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
        title: "Aprendizado por banco",
        description: "Quando um padrão funciona, o OIK memoriza para aquele banco. Próximas importações tentam esse padrão primeiro.",
      },
      {
        title: "Segurança do CPF",
        description: "Seu CPF é criptografado e NUNCA aparece em logs. Senhas de arquivo são usadas apenas no momento do desbloqueio e descartadas.",
      },
      {
        title: "Se não conseguir desbloquear",
        description: "Verifique se o CPF cadastrado está correto. Se o arquivo usa outra senha (data de nascimento, código do banco), exporte em OFX.",
      },
    ],
    keywords: ["senha", "cpf", "protegido", "desbloquear", "automático", "segurança", "lgpd"],
    deepLink: "settings",
  },

  {
    id: "import-troubleshooting",
    title: "Problemas na Importação",
    category: "import",
    icon: "🔧",
    summary: "Soluções para erros comuns de importação",
    steps: [
      {
        title: "Erro: 'Nenhuma transação encontrada'",
        description: "O arquivo pode estar vazio, em formato não suportado, ou as colunas não foram reconhecidas. Tente exportar em OFX.",
        tip: "PDFs escaneados (imagem) não funcionam. Precisa ser PDF com texto selecionável.",
      },
      {
        title: "Erro: 'Não foi possível ler o Excel'",
        description: "O arquivo pode estar corrompido ou em formato muito antigo. Abra no Excel, salve como XLSX e tente novamente.",
      },
      {
        title: "Erro: 'Arquivo protegido'",
        description: "O OIK não conseguiu desbloquear com CPF. Verifique se seu CPF está cadastrado corretamente ou exporte em OFX (sem senha).",
      },
      {
        title: "Tela branca na revisão",
        description: "Toque em 'Atualizar'. Se persistir, volte e tente novamente. O OIK nunca perde seus dados — eles ficam salvos no servidor.",
      },
      {
        title: "Valores errados",
        description: "Se os valores estão trocados (crédito como débito), edite a classificação na revisão. Se os números estão errados, o arquivo pode ter formato incomum — use OFX.",
      },
      {
        title: "Falar com suporte",
        description: "Na tela de erro, use 'Falar com suporte' no WhatsApp. Informe o código do erro (ex: IMPORT-003) para agilizar o atendimento.",
      },
    ],
    keywords: ["erro", "problema", "não funciona", "falhou", "branco", "corrompido", "suporte"],
    deepLink: "settings",
  },

  {
    id: "import-supported-banks",
    title: "Bancos Compatíveis",
    category: "import",
    icon: "🏦",
    summary: "Lista de bancos testados e formatos suportados",
    steps: [
      {
        title: "Bradesco",
        description: "PDF e XLS testados. Layout 'Bradesco Internet Banking' com colunas Data, Histórico, Crédito, Débito.",
        tip: "Linhas 'Rem:' e 'Des:' são concatenadas automaticamente na descrição.",
      },
      {
        title: "BTG Pactual",
        description: "PDF e XLS testados. Layout com Data/hora, Categoria, Transação, Descrição, Valor.",
        tip: "Linhas 'Saldo Diário' são ignoradas automaticamente.",
      },
      {
        title: "Itaú",
        description: "PDF e XLS testados. Layout com data, lançamentos, valor, saldo.",
        tip: "Linhas 'SALDO TOTAL DISPONÍVEL DIA' são filtradas automaticamente.",
      },
      {
        title: "Santander",
        description: "PDF e XLS testados. Layout com Data, Descrição, Crédito, Débito, Saldo.",
      },
      {
        title: "Outros bancos (via OFX)",
        description: "Nubank, Inter, C6 Bank, Caixa, Banco do Brasil e outros funcionam exportando o extrato em formato OFX.",
        tip: "OFX é o formato mais universal e funciona com qualquer banco.",
      },
    ],
    keywords: ["banco", "compatível", "suportado", "bradesco", "btg", "itau", "santander", "nubank", "inter", "c6", "caixa", "bb"],
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

  {
    id: "lgpd-data-deletion",
    title: "Como funciona a exclusão de dados (LGPD)",
    category: "privacy",
    icon: "🗑️",
    summary: "Entenda o processo de exclusão de dados conforme a LGPD",
    steps: [
      {
        title: "O que é a LGPD?",
        description: "A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante seu direito de solicitar a exclusão dos seus dados pessoais.",
      },
      {
        title: "Exclusão vs Anonimização",
        description: "Exclusão remove dados definitivamente. Anonimização desvincula dados financeiros de você, mantendo apenas estatísticas agregadas.",
        tip: "Dados anonimizados não são mais considerados dados pessoais pela LGPD.",
      },
      {
        title: "O que é excluído",
        description: "Nome, e-mail, telefone, foto de perfil, preferências pessoais, tokens de autenticação e integrações são removidos permanentemente.",
      },
      {
        title: "O que é anonimizado",
        description: "Histórico financeiro e comportamental perde o vínculo com você, mantido apenas para métricas agregadas do produto.",
      },
      {
        title: "Retenção legal",
        description: "Alguns registros de auditoria são mantidos por obrigação legal (segurança, fraude, defesa jurídica) por até 10 anos, isolados e sem uso operacional.",
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
    keywords: ["lgpd", "exclusão", "dados", "anonimização", "privacidade", "direito", "titular", "solicitar", "30 dias", "prazo"],
    deepLink: "settings",
  },
  {
    id: "lgpd-staff-access",
    title: "Acesso de colaboradores aos seus dados",
    category: "privacy",
    icon: "👥",
    summary: "Como a equipe do Oik acessa seus dados e quais controles existem",
    steps: [
      {
        title: "Quem pode acessar?",
        description: "Apenas colaboradores autorizados (consultores financeiros e equipe de suporte) podem visualizar seus dados para prestar o serviço contratado.",
      },
      {
        title: "Base legal",
        description: "O acesso é fundamentado na execução do contrato de consultoria e legítimo interesse para prestação do serviço financeiro.",
      },
      {
        title: "O que eles veem",
        description: "Consultores acessam: contas, transações, orçamentos, metas, categorias e relatórios financeiros necessários para a consultoria.",
      },
      {
        title: "O que eles NÃO veem",
        description: "Colaboradores não têm acesso a: logs técnicos, tokens de autenticação, IPs, senhas ou dados de auditoria interna.",
      },
      {
        title: "Rastreabilidade",
        description: "Todo acesso de colaborador aos seus dados é registrado automaticamente em log de auditoria, sem exceção.",
        tip: "Os logs são pseudonimizados (sem dados pessoais expostos).",
      },
      {
        title: "Acesso excepcional (Break-glass)",
        description: "Para situações como ordens judiciais ou incidentes de segurança, existem controles rigorosos com aprovação, MFA e tempo limitado.",
      },
    ],
    keywords: ["colaborador", "acesso", "equipe", "consultoria", "suporte", "rastreabilidade", "auditoria", "breakglass"],
    deepLink: "settings",
  },
  {
    id: "lgpd-data-protection",
    title: "Como protegemos seus dados",
    category: "privacy",
    icon: "🔒",
    summary: "Medidas de segurança e privacidade implementadas no Oik",
    steps: [
      {
        title: "Criptografia",
        description: "Todos os dados são criptografados em trânsito (HTTPS/TLS) e em repouso no banco de dados.",
      },
      {
        title: "Row Level Security (RLS)",
        description: "Cada família só vê seus próprios dados. Regras de segurança são aplicadas diretamente no banco de dados.",
      },
      {
        title: "Separação de papéis",
        description: "Colaboradores têm diferentes níveis de acesso conforme sua função: Consultoria, Suporte, Tecnologia, Financeiro, Jurídico.",
      },
      {
        title: "Auditoria completa",
        description: "Todas as ações sensíveis são registradas: quem fez, quando fez, o que mudou. Logs são imutáveis.",
      },
      {
        title: "Cofre Legal isolado",
        description: "Evidências para fins legais são armazenadas em ambiente separado, com acesso extremamente restrito e temporário.",
      },
      {
        title: "Política de retenção",
        description: "Dados são mantidos apenas pelo tempo necessário. Após exclusão, dados pessoais são removidos ou anonimizados irreversivelmente.",
        tip: "Dados anonimizados são mantidos por até 10 anos para fins estatísticos.",
      },
    ],
    keywords: ["segurança", "proteção", "criptografia", "rls", "auditoria", "cofre", "retenção", "privacidade"],
    deepLink: "settings",
  },

  // ===== FAMÍLIA =====
  {
    id: "family-members",
    title: "Família e Permissões",
    category: "family",
    icon: "👨‍👩‍👧‍👦",
    summary: "Convide membros e gerencie permissões granulares no Oik",
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
        title: "Permissões granulares",
        description: "O dono pode definir individualmente: ver tudo, editar tudo, inserir lançamentos, excluir lançamentos, ver projeção, ver orçamento e gerenciar família.",
      },
      {
        title: "Compartilhamento",
        description: "Todos os membros da família veem os mesmos dados financeiros conforme suas permissões.",
        tip: "Alterações de permissão refletem imediatamente.",
      },
      {
        title: "Atividade da família",
        description: "Um feed mostra quem adicionou, editou ou removeu lançamentos, com data e hora.",
      },
    ],
    keywords: ["família", "membro", "convidar", "permissão", "compartilhar", "perfil", "granular", "atividade"],
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
    answer: "Vá em Configurações > Importar Dados. Vocês podem importar arquivos OFX, Excel (XLSX/XLS) ou PDF. Bancos testados: Bradesco, BTG Pactual, Itaú e Santander (PDF/XLS). Outros bancos funcionam via OFX. Se o arquivo tiver senha, o Oik tentará usar CPF automaticamente.",
    category: "import",
    keywords: ["importar", "extrato", "banco", "ofx", "excel", "pdf", "senha", "bradesco", "btg", "itau", "santander"],
  },
  {
    id: "faq-bancos-compativeis",
    question: "Quais bancos são compatíveis com importação?",
    answer: "Testamos e validamos: Bradesco, BTG Pactual, Itaú e Santander (PDF e XLS). Nubank, Inter e C6 Bank funcionam via OFX. Outros bancos podem funcionar — se o seu não for reconhecido, exporte o extrato em formato OFX.",
    category: "import",
    keywords: ["banco", "compatível", "suportado", "bradesco", "btg", "itau", "santander", "nubank", "inter", "c6"],
  },
  {
    id: "faq-saldo-nao-aparece",
    question: "Por que linhas de saldo não aparecem na importação?",
    answer: "O OIK filtra automaticamente linhas que não são transações reais: 'SALDO ANTERIOR', 'SALDO TOTAL DISPONÍVEL DIA', 'Saldo Diário', limites e rodapés. Isso garante que apenas movimentações reais sejam importadas.",
    category: "import",
    keywords: ["saldo", "não aparece", "filtro", "importação", "anterior"],
  },
  {
    id: "faq-data-lancamento",
    question: "Como funciona a data dos lançamentos importados?",
    answer: "A data do lançamento vem diretamente do extrato bancário, nunca da data do upload. Bradesco usa dd/mm/yy com carry-forward para linhas sem data. BTG usa dd/mm/yyyy hh'h'mm. Itaú e Santander usam dd/mm/yyyy. A ordem na revisão é cronológica crescente (mais antigos primeiro).",
    category: "import",
    keywords: ["data", "lançamento", "importação", "cronológica", "ordem", "extrato"],
  },
  {
    id: "faq-ordem-lancamentos",
    question: "Por que a ordem é do mais antigo para o mais recente?",
    answer: "Os lançamentos importados são exibidos em ordem cronológica crescente (do primeiro ao último dia do mês) para facilitar a revisão e conferência com o extrato original do banco.",
    category: "import",
    keywords: ["ordem", "cronológica", "crescente", "antigo", "recente"],
  },
  {
    id: "faq-editar-categoria-revisao",
    question: "Como editar nome/categoria/subcategoria na revisão?",
    answer: "Na tela de revisão, toque no nome do lançamento para editar a descrição. Toque na categoria para abrir os dropdowns de Categoria e Subcategoria (dependentes). Suas edições são salvas automaticamente e aplicadas ao confirmar.",
    category: "import",
    keywords: ["editar", "categoria", "subcategoria", "nome", "revisão", "descrição"],
  },
  {
    id: "faq-formato-melhor",
    question: "Qual formato de arquivo é melhor para importar?",
    answer: "OFX é o mais universal e funciona com qualquer banco. PDF e XLS são suportados para Bradesco, BTG, Itaú e Santander. Se um formato não funcionar, tente OFX como alternativa.",
    category: "import",
    keywords: ["formato", "ofx", "pdf", "xls", "xlsx", "melhor", "recomendado"],
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
  {
    id: "faq-17",
    question: "Como lançar despesas rápido no celular?",
    answer: "Toque no botão + flutuante (canto inferior direito). O valor é o primeiro campo com teclado numérico automático. Escolha categoria com um toque, a data já vem como 'Hoje' e o botão Salvar fica sempre visível. Você consegue lançar em menos de 10 segundos!",
    category: "transactions",
    keywords: ["rápido", "celular", "mobile", "lançar", "despesa", "velocidade"],
  },
  {
    id: "faq-18",
    question: "Dica: como usar o Oik com uma mão só?",
    answer: "O botão + fica na zona do polegar. O valor é o primeiro campo (foco automático). Categorias têm alvos grandes. Deslize horizontalmente para escolher forma de pagamento. O botão Salvar fica fixo na parte inferior. Tudo foi pensado para uso com uma mão!",
    category: "transactions",
    keywords: ["uma mão", "polegar", "mobile", "acessibilidade", "ergonomia"],
  },
  {
    id: "faq-19",
    question: "Por que o botão + é tão grande?",
    answer: "O botão flutuante tem 56px de diâmetro (mínimo recomendado é 44px) para garantir toque preciso mesmo em movimento. Ele fica posicionado na 'zona do polegar' para acesso fácil com uma mão.",
    category: "transactions",
    keywords: ["botão", "grande", "acessibilidade", "toque", "fab"],
  },
  {
    id: "faq-20",
    question: "O que significa 'Processando' na importação?",
    answer: "Quando você envia um arquivo, o OIK está detectando o banco, abrindo o arquivo (se tiver senha, tenta CPF automaticamente), extraindo lançamentos e categorizando. Isso leva até 30 segundos. A tela atualiza automaticamente.",
    category: "import",
    keywords: ["processando", "importação", "aguarde", "loading"],
  },
  {
    id: "faq-21",
    question: "Deu erro na revisão de importação. O que fazer?",
    answer: "Toque em 'Tentar novamente' para reprocessar. Se não funcionar, toque em 'Enviar outro arquivo' ou 'Falar com suporte'. O código de erro (ex: IMPORT-003) ajuda o suporte a resolver mais rápido.",
    category: "import",
    keywords: ["erro", "importação", "falhou", "retry", "suporte"],
  },

  // ===== NAVEGAÇÃO =====
  {
    id: "faq-nav-1",
    question: "Como navegar entre as telas do Oik?",
    answer: "Use a barra de navegação inferior com 5 ícones: Casa, Extrato, Categorias, Metas e Educação. Na tela inicial, atalhos rápidos também levam diretamente às funcionalidades principais.",
    category: "navigation",
    keywords: ["navegar", "navegação", "menu", "tela", "aba", "inferior"],
  },
  {
    id: "faq-nav-2",
    question: "Por que o botão 'Ver extrato' não funciona?",
    answer: "O botão deve navegar para a aba de Extrato. Se não funcionar, atualize o aplicativo. O bug foi corrigido na versão mais recente. Tente também usar o ícone de Extrato na barra inferior.",
    category: "navigation",
    keywords: ["ver extrato", "botão", "não funciona", "bug"],
  },
  {
    id: "faq-nav-3",
    question: "Como voltar para a tela anterior?",
    answer: "Use a seta no canto superior esquerdo ou toque no ícone Casa na barra inferior para voltar à Home. Em sheets (painéis deslizantes), deslize para baixo ou toque fora do painel.",
    category: "navigation",
    keywords: ["voltar", "anterior", "seta", "fechar", "sheet"],
  },

  // ===== CLASSIFICAÇÃO =====
  {
    id: "faq-class-1",
    question: "Qual a diferença entre 'Crédito' e 'Receita'?",
    answer: "Crédito é a DIREÇÃO do valor (dinheiro entrando). Receita é a CLASSIFICAÇÃO (como você quer que o sistema trate). Um crédito pode ser classificado como Receita (salário), Reembolso (devolução de despesa) ou Transferência (movimentação entre contas). A classificação correta afeta os relatórios.",
    category: "transactions",
    keywords: ["crédito", "receita", "diferença", "classificação", "direção"],
  },
  {
    id: "faq-class-2",
    question: "O que são as classificações de lançamento?",
    answer: "Existem 5 classificações: Receita (dinheiro que entra como ganho), Despesa (dinheiro que sai como gasto), Transferência (movimentação entre suas contas), Reembolso (devolução de despesa feita anteriormente), Ajuste (correção ou acerto contábil). Cada uma afeta os relatórios de forma diferente.",
    category: "transactions",
    keywords: ["classificação", "receita", "despesa", "transferência", "reembolso", "ajuste"],
  },
  {
    id: "faq-class-3",
    question: "Por que meu reembolso aparece como despesa negativa?",
    answer: "Reembolsos são creditados na mesma categoria da despesa original, reduzindo o total gasto. Por exemplo: se você gastou R$500 em Alimentação e recebeu R$50 de reembolso, o relatório mostra R$450 líquidos. Isso reflete o custo real.",
    category: "transactions",
    keywords: ["reembolso", "despesa", "negativa", "categoria", "redução"],
  },
  {
    id: "faq-class-4",
    question: "Como classificar um PIX de reembolso?",
    answer: "Na revisão de importação ou ao editar o lançamento, escolha 'Reembolso' no seletor de classificação. Depois, selecione a categoria da despesa original (ex: Alimentação). O valor será subtraído dos gastos dessa categoria.",
    category: "transactions",
    keywords: ["pix", "reembolso", "classificar", "como", "categoria"],
  },
  {
    id: "faq-class-5",
    question: "Transferência entre minhas contas conta como despesa?",
    answer: "Não! Ao classificar como 'Transferência', o lançamento não entra no cálculo de despesas nem receitas. É apenas uma movimentação interna. Ideal para: PIX entre contas próprias, TED para investimentos, resgate de aplicação.",
    category: "transactions",
    keywords: ["transferência", "contas", "próprias", "não conta", "despesa", "interna"],
  },

  // ===== IMPORTAÇÃO AVANÇADA =====
  {
    id: "faq-import-adv-1",
    question: "Por que minha importação mostra 48 itens?",
    answer: "O Oik extrai TODAS as transações do arquivo, sem limite. Se seu extrato Bradesco tem 48 linhas de lançamento, todas aparecem na revisão. Linhas de saldo, cabeçalho e rodapé são filtradas automaticamente.",
    category: "import",
    keywords: ["48", "itens", "limite", "todas", "transações"],
  },
  {
    id: "faq-import-adv-2",
    question: "Posso alterar a classificação na revisão de importação?",
    answer: "Sim! Na tela de revisão, cada lançamento tem um seletor de classificação (Receita, Despesa, Transferência, Reembolso, Ajuste). Toque para alterar. A alteração é aplicada ao confirmar a importação.",
    category: "import",
    keywords: ["classificação", "revisão", "alterar", "importação", "seletor"],
  },
  {
    id: "faq-import-adv-3",
    question: "Como corrigir uma descrição antes de importar?",
    answer: "Na revisão, toque no nome/descrição do lançamento. O campo se torna editável. Digite a nova descrição e toque em Salvar (ícone de check). A descrição corrigida é mantida ao confirmar.",
    category: "import",
    keywords: ["descrição", "corrigir", "editar", "nome", "antes", "importar"],
  },
  {
    id: "faq-import-adv-4",
    question: "Subcategoria sumiu ao trocar a categoria. É bug?",
    answer: "Não! As subcategorias são dependentes da categoria. Ao trocar a categoria, a subcategoria reseta porque as opções mudam. Selecione a nova subcategoria desejada após escolher a categoria.",
    category: "import",
    keywords: ["subcategoria", "sumiu", "dependente", "categoria", "reset"],
  },
  {
    id: "faq-import-adv-5",
    question: "Qual a ordem dos lançamentos na revisão?",
    answer: "Cronológica crescente (do mais antigo para o mais recente). Isso facilita conferir com o extrato original do banco, que geralmente segue a mesma ordem. O primeiro item é o mais antigo do período.",
    category: "import",
    keywords: ["ordem", "cronológica", "crescente", "primeiro", "antigo"],
  },
  {
    id: "faq-import-adv-6",
    question: "O OIK funciona com qualquer banco?",
    answer: "Sim! O parser universal detecta colunas automaticamente (Data, Descrição, Valor/Crédito/Débito). Se seu banco exportar Excel com essas colunas, a importação funciona. Para PDFs, testamos Bradesco, BTG, Itaú e Santander. Para outros bancos, use OFX.",
    category: "import",
    keywords: ["qualquer", "banco", "universal", "parser", "funciona"],
  },
  {
    id: "faq-import-adv-7",
    question: "Como o OIK detecta as colunas do Excel?",
    answer: "O sistema procura cabeçalhos com sinônimos: 'Data' ou 'Dt' ou 'Data Lançamento', 'Descrição' ou 'Histórico' ou 'Movimentação', 'Valor' ou 'Crédito'/'Débito'. Variações com acentos e maiúsculas são aceitas. Se encontrar Data + alguma coluna de valor, consegue importar.",
    category: "import",
    keywords: ["detecta", "colunas", "cabeçalho", "excel", "sinônimos", "heurística"],
  },
  {
    id: "faq-import-adv-8",
    question: "Por que algumas linhas foram ignoradas?",
    answer: "O OIK filtra automaticamente: linhas sem data E sem valor, 'SALDO ANTERIOR', 'SALDO TOTAL', 'Total', 'Últimos Lançamentos', cabeçalhos repetidos, e linhas de rodapé com telefones/avisos. Apenas transações reais são importadas.",
    category: "import",
    keywords: ["ignoradas", "filtradas", "saldo", "linhas", "removidas"],
  },
  {
    id: "faq-import-adv-9",
    question: "Posso importar fatura de cartão de crédito?",
    answer: "Sim! O OIK detecta automaticamente se é extrato de conta corrente ou fatura de cartão. Para faturas, identifica os 4 últimos dígitos e associa ao cartão cadastrado ou cria automaticamente.",
    category: "import",
    keywords: ["fatura", "cartão", "crédito", "detecta", "automaticamente"],
  },
  {
    id: "faq-import-adv-10",
    question: "Como funciona o 'date carry-forward'?",
    answer: "Se uma linha tem valor mas não tem data, o OIK usa a data da linha anterior. Isso é comum em extratos Bradesco onde múltiplas transações do mesmo dia aparecem sem repetir a data. A ordem original do arquivo é preservada.",
    category: "import",
    keywords: ["data", "carry", "forward", "anterior", "mesma", "bradesco"],
  },
];

// ===== ADMIN DASHBOARD FAQ (Internal Use) =====
export const adminFaqItems: FAQItem[] = [
  {
    id: "admin-faq-1",
    question: "Quais são os perfis de acesso no Dashboard Admin?",
    answer: "Admin Master (acesso total), Financeiro (métricas, planos, NF), Customer Success (engajamento, saúde do cliente), Suporte (erros, acesso assistido) e Tecnologia (APIs, logs, integrações). Cada perfil só vê os módulos autorizados.",
    category: "admin",
    keywords: ["perfil", "acesso", "rbac", "admin", "permissão"],
  },
  {
    id: "admin-faq-2",
    question: "Como funciona o acesso assistido no Suporte?",
    answer: "O acesso assistido é somente leitura (read-only) por padrão. O colaborador pode visualizar a conta do usuário para ajudar na navegação. Todas as ações são registradas em trilha de auditoria para LGPD.",
    category: "admin",
    keywords: ["acesso", "assistido", "suporte", "read-only", "auditoria"],
  },
  {
    id: "admin-faq-3",
    question: "O que são os sinais de comportamento no CS?",
    answer: "São indicadores automáticos como 'dias sem login', 'sem importação após cadastro', 'sem orçamento com transações'. Cada sinal pode disparar sugestões de ação ou automações configuráveis.",
    category: "admin",
    keywords: ["sinal", "comportamento", "cs", "automação", "engajamento"],
  },
  {
    id: "admin-faq-4",
    question: "Como a IA do CS funciona?",
    answer: "A IA analisa PADRÕES DE USO (nunca dados financeiros), gera sugestões com explicação clara do motivo, e NUNCA executa ações automaticamente sem aprovação. Respeita preferências de consentimento do usuário.",
    category: "admin",
    keywords: ["ia", "cs", "sugestão", "automação", "consentimento"],
  },
  {
    id: "admin-faq-5",
    question: "O que são os Relatórios Executivos?",
    answer: "Visão estratégica consolidada com métricas de crescimento, receita (MRR/ARR), engajamento e produto. Restrito para ADMIN_MASTER, DIRETORIA e GESTÃO ESTRATÉGICA. Todos os acessos são auditados.",
    category: "admin",
    keywords: ["executivo", "relatório", "mrr", "diretoria", "estratégico"],
  },
  {
    id: "admin-faq-6",
    question: "Como rotacionar chaves de API?",
    answer: "No módulo Tecnologia > Chaves API, selecione a chave e use 'Rotacionar'. Uma nova chave é gerada e a anterior é desativada. A ação é registrada em auditoria.",
    category: "admin",
    keywords: ["api", "chave", "rotacionar", "tecnologia", "segurança"],
  },
  {
    id: "admin-faq-7",
    question: "O que são Feature Flags?",
    answer: "Permitem ativar/desativar funcionalidades sem deploy. Útil para testes A/B, rollouts graduais e kill switches. Controlado pelo módulo Tecnologia.",
    category: "admin",
    keywords: ["feature", "flag", "toggle", "rollout", "tecnologia"],
  },
  {
    id: "admin-faq-8",
    question: "Como emitir Nota Fiscal pelo Dashboard?",
    answer: "No módulo Financeiro > Notas Fiscais, selecione o pagamento e use 'Emitir NF'. O sistema integra com o provedor configurado. Erros de emissão são exibidos com opção de retry.",
    category: "admin",
    keywords: ["nota", "fiscal", "nf", "emitir", "financeiro"],
  },
  {
    id: "admin-faq-9",
    question: "Onde vejo os logs de auditoria?",
    answer: "Cada módulo tem sua aba de 'Auditoria' com trilha de todas as ações realizadas por colaboradores. Logs incluem usuário, ação, timestamp e detalhes mascarados conforme LGPD.",
    category: "admin",
    keywords: ["auditoria", "log", "trilha", "lgpd", "registro"],
  },
  {
    id: "admin-faq-10",
    question: "Como verificar a saúde do sistema?",
    answer: "Módulo Tecnologia > Saúde do Sistema mostra uptime, tempo médio de resposta, erros recentes e status das integrações. Alertas são exibidos quando há degradação.",
    category: "admin",
    keywords: ["saúde", "sistema", "uptime", "erro", "monitoramento"],
  },
];

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
