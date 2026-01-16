/**
 * Dados fictícios padrão para testes E2E
 * Todos os dados são determinísticos e NÃO usam dados reais
 */

// ===== FAMÍLIA FICTÍCIA =====
export const TEST_FAMILY = {
  name: "Família Teste",
  members_count: 2,
  income_range: "10000-15000",
  primary_objective: "equilibrar"
};

export const TEST_ADMIN_USER = {
  email: "qa+admin@exemplo.com",
  password: "SenhaForte@123",
  display_name: "Admin QA"
};

export const TEST_PARTNER_USER = {
  email: "qa+parceiro@exemplo.com",
  password: "SenhaForte@456",
  display_name: "Parceiro(a) QA"
};

export const TEST_CHILD_USER = {
  email: "qa+filho@exemplo.com",
  password: "SenhaForte@789",
  display_name: "Filho(a) QA"
};

// ===== BANCO E CONTAS =====
export const TEST_BANK_ACCOUNT = {
  bank_name: "Banco QA",
  nickname: "Conta Principal",
  account_type: "checking" as const,
  initial_balance: 5000
};

export const TEST_BANK_ACCOUNT_2 = {
  bank_name: "Banco QA 2",
  nickname: "Conta 2",
  account_type: "savings" as const,
  initial_balance: 10000
};

// ===== CARTÕES =====
export const TEST_CREDIT_CARD = {
  card_name: "Cartão QA",
  brand: "visa" as const,
  card_type: "credit" as const,
  credit_limit: 5000,
  closing_day: 15,
  due_day: 22
};

export const TEST_CREDIT_CARD_2 = {
  card_name: "Cartão QA 2",
  brand: "mastercard" as const,
  card_type: "credit" as const,
  credit_limit: 10000,
  closing_day: 10,
  due_day: 17
};

// ===== METAS DE ORÇAMENTO =====
export const TEST_BUDGETS = [
  {
    category_id: "lazer",
    subcategory_id: "lazer-restaurantes",
    monthly_limit: 500,
    description: "L - Restaurantes"
  },
  {
    category_id: "alimentacao",
    subcategory_id: "alimentacao-supermercado",
    monthly_limit: 1200,
    description: "A - Supermercado"
  }
];

// ===== RECORRÊNCIAS =====
export const TEST_RECURRING_TRANSACTIONS = [
  {
    description: "Salário",
    type: "income" as const,
    amount: 12000,
    category_id: "rendas",
    subcategory_id: "rendas-remuneração-pro-labore",
    frequency: "monthly",
    day_of_month: 5,
    payment_method: "transfer" as const
  },
  {
    description: "Aluguel",
    type: "expense" as const,
    amount: 2500,
    category_id: "casa",
    subcategory_id: "casa-condomínio",
    frequency: "monthly",
    day_of_month: 10,
    payment_method: "pix" as const
  }
];

// ===== COMPRA PARCELADA =====
export const TEST_INSTALLMENT = {
  description: "Celular parcelado",
  total_amount: 2400,
  total_installments: 12,
  installment_amount: 200,
  category_id: "diversos",
  subcategory_id: "diversos-equipamentos-eletrônicos"
};

// ===== TRANSAÇÕES DE TESTE =====
export const TEST_TRANSACTIONS = {
  income_bonus: {
    type: "income" as const,
    amount: 1000,
    description: "Bônus",
    category_id: "rendas",
    subcategory_id: "rendas-distribuição-de-lucros",
    payment_method: "transfer" as const
  },
  expense_market: {
    type: "expense" as const,
    amount: 200,
    description: "Mercado",
    category_id: "alimentacao",
    subcategory_id: "alimentacao-supermercado",
    payment_method: "debit" as const
  },
  expense_restaurant: {
    type: "expense" as const,
    amount: 150,
    description: "Jantar",
    category_id: "lazer",
    subcategory_id: "lazer-restaurantes",
    payment_method: "credit" as const
  },
  expense_restaurant_80_percent: {
    type: "expense" as const,
    amount: 400,
    description: "Restaurante meta 80%",
    category_id: "lazer",
    subcategory_id: "lazer-restaurantes",
    payment_method: "credit" as const
  },
  expense_streaming: {
    type: "expense" as const,
    amount: 59.90,
    description: "Assinatura Streaming",
    category_id: "casa",
    subcategory_id: "casa-internet-tv-streamings",
    payment_method: "credit" as const
  }
};

// ===== ARQUIVOS MOCK PARA IMPORTAÇÃO =====
export const MOCK_OFX_CONTENT = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240115120000[-3:BRT]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101120000[-3:BRT]
<DTEND>20240115120000[-3:BRT]
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240105120000[-3:BRT]
<TRNAMT>12000.00
<FITID>2024010500001
<MEMO>SALARIO EMPRESA XYZ
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240108120000[-3:BRT]
<TRNAMT>-350.00
<FITID>2024010800001
<MEMO>IFOOD *RESTAURANTE
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240110120000[-3:BRT]
<TRNAMT>-2500.00
<FITID>2024011000001
<MEMO>ALUGUEL APARTAMENTO
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>9150.00
<DTASOF>20240115120000[-3:BRT]
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;

export const MOCK_XLS_TRANSACTIONS = [
  { date: "2024-01-05", description: "SALARIO EMPRESA XYZ", amount: 12000, type: "credit" },
  { date: "2024-01-08", description: "IFOOD *RESTAURANTE", amount: -350, type: "debit" },
  { date: "2024-01-10", description: "ALUGUEL APARTAMENTO", amount: -2500, type: "debit" },
  { date: "2024-01-12", description: "SUPERMERCADO EXTRA", amount: -450, type: "debit" }
];

// ===== WHATSAPP CTA =====
export const WHATSAPP_CONFIG = {
  phone: "5548988483333",
  message: "Olá! Quero agendar 1 hora de consultoria financeira familiar. Meu nome é ____."
};

// ===== EBOOKS MOCK =====
export const TEST_EBOOKS = [
  {
    title: "Guia da Reserva de Emergência",
    description: "Aprenda a construir sua reserva de emergência em 6 meses",
    cta_link: "https://exemplo.com/ebook-reserva",
    cta_text: "Baixar eBook",
    theme: "green",
    is_active: true,
    display_order: 1
  },
  {
    title: "Orçamento Familiar na Prática",
    description: "Passo a passo para organizar as finanças da família",
    cta_link: "https://exemplo.com/ebook-orcamento",
    cta_text: "Ver eBook",
    theme: "blue",
    is_active: true,
    display_order: 2
  }
];

// ===== DATAS DE TESTE =====
export const getTestDate = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
};

export const getCurrentMonth = (): number => new Date().getMonth();
export const getCurrentYear = (): number => new Date().getFullYear();
