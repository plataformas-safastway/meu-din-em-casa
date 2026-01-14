import { Transaction, FamilyFinanceSummary, Insight, CategoryExpense, MonthlyBalance } from "@/types/finance";

export const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "income",
    amount: 12500,
    category: "salario",
    date: "2026-01-05",
    paymentMethod: "transfer",
    description: "Salário mensal",
    createdAt: "2026-01-05T10:00:00Z"
  },
  {
    id: "2",
    type: "expense",
    expenseType: "fixed",
    amount: 2800,
    category: "casa",
    date: "2026-01-10",
    paymentMethod: "debit",
    description: "Aluguel",
    isRecurring: true,
    createdAt: "2026-01-10T10:00:00Z"
  },
  {
    id: "3",
    type: "expense",
    expenseType: "variable",
    amount: 1850,
    category: "alimentacao",
    date: "2026-01-12",
    paymentMethod: "credit",
    description: "Supermercado do mês",
    createdAt: "2026-01-12T10:00:00Z"
  },
  {
    id: "4",
    type: "expense",
    expenseType: "fixed",
    amount: 450,
    category: "transporte",
    date: "2026-01-08",
    paymentMethod: "debit",
    description: "Combustível",
    createdAt: "2026-01-08T10:00:00Z"
  },
  {
    id: "5",
    type: "expense",
    expenseType: "variable",
    amount: 680,
    category: "lazer",
    date: "2026-01-14",
    paymentMethod: "credit",
    description: "Jantar e cinema em família",
    createdAt: "2026-01-14T10:00:00Z"
  },
  {
    id: "6",
    type: "expense",
    expenseType: "fixed",
    amount: 890,
    category: "vida-saude",
    date: "2026-01-07",
    paymentMethod: "debit",
    description: "Plano de saúde",
    isRecurring: true,
    createdAt: "2026-01-07T10:00:00Z"
  },
  {
    id: "7",
    type: "expense",
    expenseType: "fixed",
    amount: 1200,
    category: "filhos",
    date: "2026-01-06",
    paymentMethod: "transfer",
    description: "Escola das crianças",
    isRecurring: true,
    createdAt: "2026-01-06T10:00:00Z"
  },
  {
    id: "8",
    type: "expense",
    expenseType: "variable",
    amount: 320,
    category: "pet",
    date: "2026-01-11",
    paymentMethod: "pix",
    description: "Ração e veterinário",
    createdAt: "2026-01-11T10:00:00Z"
  },
];

export const mockInsights: Insight[] = [
  {
    id: "1",
    type: "tip",
    title: "Padrão de gastos em alimentação",
    message: "Os gastos com alimentação da família representam 15% da renda este mês. Esse percentual está dentro do ideal para o orçamento de vocês. Continuem assim! 🌟",
    category: "alimentacao",
    priority: 2,
    createdAt: "2026-01-14T10:00:00Z"
  },
  {
    id: "2",
    type: "success",
    title: "Reserva financeira crescendo",
    message: "Vocês já alcançaram 35% da meta de reserva de emergência! Cada passo conta para a tranquilidade financeira da família. 💪",
    priority: 1,
    createdAt: "2026-01-13T10:00:00Z"
  },
  {
    id: "3",
    type: "info",
    title: "Custos fixos equilibrados",
    message: "Os custos fixos da família estão em 52% da renda. O ideal é manter abaixo de 50%. Talvez seja interessante revisar algum compromisso fixo nos próximos meses.",
    priority: 3,
    createdAt: "2026-01-12T10:00:00Z"
  },
];

export const mockCategoryExpenses: CategoryExpense[] = [
  { category: "casa", amount: 2800, percentage: 31.2, color: "hsl(var(--chart-1))", previousAmount: 2800, change: 0 },
  { category: "alimentacao", amount: 1850, percentage: 20.6, color: "hsl(var(--chart-2))", previousAmount: 1650, change: 12.1 },
  { category: "filhos", amount: 1200, percentage: 13.4, color: "hsl(var(--chart-6))", previousAmount: 1200, change: 0 },
  { category: "vida-saude", amount: 890, percentage: 9.9, color: "hsl(var(--chart-4))", previousAmount: 890, change: 0 },
  { category: "lazer", amount: 680, percentage: 7.6, color: "hsl(var(--chart-5))", previousAmount: 450, change: 51.1 },
  { category: "transporte", amount: 450, percentage: 5.0, color: "hsl(var(--chart-3))", previousAmount: 520, change: -13.5 },
  { category: "pet", amount: 320, percentage: 3.6, color: "hsl(199 89% 48%)", previousAmount: 280, change: 14.3 },
];

export const mockMonthlyBalance: MonthlyBalance[] = [
  { month: "Ago", income: 12000, expenses: 8500, balance: 3500 },
  { month: "Set", income: 12000, expenses: 9200, balance: 2800 },
  { month: "Out", income: 12500, expenses: 8800, balance: 3700 },
  { month: "Nov", income: 12500, expenses: 9100, balance: 3400 },
  { month: "Dez", income: 15000, expenses: 12500, balance: 2500 },
  { month: "Jan", income: 12500, expenses: 8990, balance: 3510 },
];

export const mockFinanceSummary: FamilyFinanceSummary = {
  currentBalance: 24850,
  monthlyIncome: 12500,
  monthlyExpenses: 8990,
  savingsRate: 28.1,
  emergencyFund: {
    targetAmount: 37500,
    currentAmount: 13125,
    targetDate: "2026-12-31"
  },
  topCategories: mockCategoryExpenses,
  insights: mockInsights,
};
