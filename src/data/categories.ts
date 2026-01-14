import { Category, Subcategory } from "@/types/finance";

// Helper to create subcategories
const createSubs = (categoryId: string, names: string[]): Subcategory[] => 
  names.map(name => ({
    id: `${categoryId}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`,
    name,
    categoryId,
  }));

export const defaultCategories: Category[] = [
  // ========== INCOME CATEGORIES ==========
  {
    id: "rendas",
    name: "Rendas",
    code: "R",
    icon: "💰",
    color: "hsl(var(--success))",
    type: "income",
    isDefault: true,
    subcategories: createSubs("rendas", [
      "Receita Bruta Aluguel",
      "(-) Despesas Gerais",
      "(-) Imobiliária",
      "(-) Impostos",
      "(-) Manutenções",
      "Remuneração/Pro Labore",
      "Distribuição de Lucros",
      "Investimentos",
      "Pagamento / Restituição de IR",
      "Herança",
      "Vale Alimentação",
    ]),
  },

  // ========== EXPENSE CATEGORIES ==========
  {
    id: "casa",
    name: "Casa",
    code: "C",
    icon: "🏠",
    color: "hsl(var(--chart-1))",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("casa", [
      "Água",
      "Condomínio",
      "Diarista",
      "Empregada Doméstica",
      "INSS Empregada",
      "Energia Elétrica",
      "Internet + TV + Streamings",
      "IPTU",
      "Locação área lazer",
      "Manutenção Estrutura",
      "Manutenção Eletrônicos",
      "Seguro da casa",
      "Telefone Celular",
      "Utensílios para casa",
    ]),
  },
  {
    id: "alimentacao",
    name: "Alimentação",
    code: "A",
    icon: "🍽️",
    color: "hsl(var(--chart-2))",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("alimentacao", [
      "Almoço",
      "Açougue",
      "Feira",
      "Delivery",
      "Padaria",
      "Peixaria",
      "Produtos Naturais",
      "Supermercado",
    ]),
  },
  {
    id: "lazer",
    name: "Lazer",
    code: "L",
    icon: "🎉",
    color: "hsl(var(--chart-3))",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("lazer", [
      "Cinema/teatro",
      "Baladas",
      "Eventos em casa",
      "Pequenas Viagens",
      "Restaurantes",
      "Shows",
      "Viagem Nacional",
    ]),
  },
  {
    id: "filhos",
    name: "Filhos",
    code: "F",
    icon: "👶",
    color: "hsl(var(--chart-4))",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("filhos", [
      "Alimentação",
      "Atividades Extras",
      "Brinquedos",
      "Cabeleleiro",
      "Calçados",
      "Dentista",
      "Escola",
      "Festas",
      "Material Escolar",
      "Medicamentos e Vacinas",
      "Médico",
      "Passeios",
      "Plano de Saúde",
      "Presentes para Amigos",
      "Roupas e Acessórios",
    ]),
  },
  {
    id: "pet",
    name: "Pet",
    code: "PET",
    icon: "🐶",
    color: "hsl(199 89% 48%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("pet", [
      "Alimentação",
      "Banho e Tosa",
      "Brinquedos",
      "Dentista",
      "Hotel",
      "Medicamentos e Vacinas",
      "Médico Veterinário",
      "Plano de Saúde",
      "Roupas e Acessórios",
    ]),
  },
  {
    id: "transporte",
    name: "Transporte",
    code: "T",
    icon: "🚗",
    color: "hsl(var(--chart-5))",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("transporte", [
      "Combustível",
      "Estacionamento",
      "IPVA",
      "Lavação",
      "Manutenção",
      "Multa",
      "Ônibus",
      "Seguro do carro",
      "Taxi/Uber",
    ]),
  },
  {
    id: "vida-saude",
    name: "Vida & Saúde",
    code: "V & S",
    icon: "❤️",
    color: "hsl(0 72% 51%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("vida-saude", [
      "Academia",
      "Dentista",
      "Exames",
      "Medicamentos",
      "Médico",
      "Personal",
      "Plano de saúde",
      "Seguro de vida",
      "Seguro/Plano de saúde",
      "Tratamentos Específicos",
    ]),
  },
  {
    id: "roupa-estetica",
    name: "Roupas & Estética",
    code: "R & E",
    icon: "👗",
    color: "hsl(340 75% 55%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("roupa-estetica", [
      "Acessórios",
      "Cabeleireiro",
      "Calçados",
      "Manicure",
      "Perfume",
      "Roupas",
    ]),
  },
  {
    id: "educacao",
    name: "Educação & Formação",
    code: "E & F",
    icon: "🎓",
    color: "hsl(280 65% 60%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("educacao", [
      "Certificações",
      "Cursos presenciais",
      "Cursos online",
      "MBA",
      "Inglês",
      "Livros",
    ]),
  },
  {
    id: "despesas-financeiras",
    name: "Despesas Financeiras",
    code: "DF",
    icon: "💳",
    color: "hsl(220 15% 50%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("despesas-financeiras", [
      "Anuidade Cartão",
      "IOF",
      "Juros",
      "Manutenção de Conta",
      "TED",
      "Empréstimos diversos",
      "Parcelamento do cartão",
      "Outras",
    ]),
  },
  {
    id: "diversos",
    name: "Diversos",
    code: "DIV",
    icon: "📦",
    color: "hsl(40 20% 50%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("diversos", [
      "Consultoria Pontual",
      "Despesas Profissionais",
      "Doações",
      "Equipamentos Eletrônicos",
      "Presentes para família",
      "Presentes para festas (casamentos, 15 anos)",
      "Renovação de Documentos",
    ]),
  },
  {
    id: "manutencao-bens",
    name: "Manutenção de Bens",
    code: "MB",
    icon: "🏗️",
    color: "hsl(30 60% 50%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("manutencao-bens", [
      "Imóvel 1",
      "Imóvel 2",
      "Imóvel 3",
    ]),
  },
  {
    id: "desconhecidas",
    name: "Desconhecidas",
    code: "DESC",
    icon: "❓",
    color: "hsl(0 0% 50%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("desconhecidas", [
      "Transferências C.C. <-> Caixinha",
      "Cheques debitádos e desconhecidos",
      "Transferência entre C.C.'s Próprias",
      "Transferências para C.C.'s Desconhecidas",
      "Outros",
    ]),
  },
  {
    id: "despesas-eventuais",
    name: "Despesas Eventuais",
    code: "E",
    icon: "⚠️",
    color: "hsl(45 93% 47%)",
    type: "expense",
    isDefault: true,
    subcategories: createSubs("despesas-eventuais", [
      "Grandes presentes / doações",
      "Reformas",
      "Festas (aniversário, bodas, 15 anos,...)",
      "Grandes viagens (férias)",
      "Joias, bolsas, relógios",
      "Consultorias eventuais",
      "Compra/troca de veículos",
      "Compra/troca de Imóveis",
    ]),
  },
];

export const paymentMethods = [
  { id: "debit", name: "Débito", icon: "💳" },
  { id: "credit", name: "Crédito", icon: "💳" },
  { id: "pix", name: "PIX", icon: "📱" },
  { id: "cash", name: "Dinheiro", icon: "💵" },
  { id: "transfer", name: "Transferência", icon: "🔄" },
];

export const getCategoryById = (id: string): Category | undefined => {
  return defaultCategories.find(cat => cat.id === id);
};

export const getCategoryColor = (categoryId: string): string => {
  const category = getCategoryById(categoryId);
  return category?.color || "hsl(var(--muted))";
};

export const getCategoryIcon = (categoryId: string): string => {
  const category = getCategoryById(categoryId);
  return category?.icon || "📦";
};

export const getSubcategoryById = (categoryId: string, subcategoryId: string): Subcategory | undefined => {
  const category = getCategoryById(categoryId);
  return category?.subcategories.find(sub => sub.id === subcategoryId);
};

export const getSubcategoryName = (categoryId: string, subcategoryId: string): string => {
  const subcategory = getSubcategoryById(categoryId, subcategoryId);
  return subcategory?.name || "";
};

export const getIncomeCategories = () => defaultCategories.filter(c => c.type === 'income');
export const getExpenseCategories = () => defaultCategories.filter(c => c.type === 'expense');
