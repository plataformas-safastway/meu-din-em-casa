import { Category } from "@/types/finance";

export const defaultCategories: Category[] = [
  // Expense categories (based on spreadsheet)
  { id: "casa", name: "Casa", icon: "🏠", color: "hsl(var(--chart-1))", type: "expense", isDefault: true },
  { id: "alimentacao", name: "Alimentação", icon: "🍽️", color: "hsl(var(--chart-2))", type: "expense", isDefault: true },
  { id: "transporte", name: "Transporte", icon: "🚗", color: "hsl(var(--chart-3))", type: "expense", isDefault: true },
  { id: "vida-saude", name: "Vida & Saúde", icon: "💊", color: "hsl(var(--chart-4))", type: "expense", isDefault: true },
  { id: "lazer", name: "Lazer", icon: "🎉", color: "hsl(var(--chart-5))", type: "expense", isDefault: true },
  { id: "filhos", name: "Filhos", icon: "👶", color: "hsl(var(--chart-6))", type: "expense", isDefault: true },
  { id: "pet", name: "Pet", icon: "🐕", color: "hsl(199 89% 48%)", type: "expense", isDefault: true },
  { id: "educacao", name: "Educação & Formação", icon: "📚", color: "hsl(280 65% 60%)", type: "expense", isDefault: true },
  { id: "roupa-estetica", name: "Roupa & Estética", icon: "👗", color: "hsl(340 75% 55%)", type: "expense", isDefault: true },
  { id: "despesas-financeiras", name: "Despesas Financeiras", icon: "💳", color: "hsl(0 72% 51%)", type: "expense", isDefault: true },
  { id: "manutencao-bens", name: "Manutenção de Bens", icon: "🔧", color: "hsl(220 15% 50%)", type: "expense", isDefault: true },
  { id: "diversos", name: "Diversos", icon: "📦", color: "hsl(40 20% 50%)", type: "expense", isDefault: true },
  
  // Income categories
  { id: "salario", name: "Salário", icon: "💼", color: "hsl(var(--success))", type: "income", isDefault: true },
  { id: "freelance", name: "Freelance", icon: "💻", color: "hsl(158 64% 52%)", type: "income", isDefault: true },
  { id: "investimentos", name: "Investimentos", icon: "📈", color: "hsl(158 64% 62%)", type: "income", isDefault: true },
  { id: "outros-rendas", name: "Outras Rendas", icon: "💰", color: "hsl(158 64% 72%)", type: "income", isDefault: true },
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
