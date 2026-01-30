# 💳 Financeiro / Billing

> Gestão de cobranças e faturamento

---

## Invoices

### Visão geral

Em **Financeiro** → **Invoices**:

| Campo | Descrição |
|-------|-----------|
| Número | Identificador único |
| Família | Cliente |
| Valor | Valor da fatura |
| Vencimento | Data de vencimento |
| Status | Em aberto, Pago, Vencido, Cancelado |
| Plano | Plano cobrado |

### Filtros

- **Status:** Em aberto, Pago, Vencido, Cancelado
- **Período:** Emissão, vencimento
- **Plano:** Família, Premium
- **Valor:** Faixa de valores

### Detalhes da invoice

```
Invoice #INV-2026-00456

Família: Silva
├── CNPJ/CPF: ***.456.789-**
├── E-mail: joao@email.com
└── Endereço: São Paulo, SP

Itens:
├── Plano Família (Jan/2026): R$ 29,90
├── Membro adicional x1:       R$ 5,00
└── Total:                     R$ 34,90

Status: Pago em 05/01/2026
Método: Cartão de crédito
```

---

## Status

### Ciclo de vida

```
Gerada → Em aberto → Paga
                  ↘ Vencida → Suspensa → Cancelada
```

### Estados

| Status | Descrição | Acesso do cliente |
|--------|-----------|-------------------|
| **Em aberto** | Aguardando pagamento | ✅ Normal |
| **Paga** | Pagamento confirmado | ✅ Normal |
| **Vencida** | Passou do vencimento | ⚠️ Avisos |
| **Suspensa** | Acesso limitado | 🔒 Somente leitura |
| **Cancelada** | Conta encerrada | ❌ Sem acesso |

### Ações por status

| Ação | Em aberto | Vencida | Suspensa |
|------|-----------|---------|----------|
| Enviar lembrete | ✅ | ✅ | ✅ |
| Gerar 2ª via | ✅ | ✅ | ✅ |
| Aplicar desconto | ✅ | ✅ | ✅ |
| Parcelar | ❌ | ✅ | ✅ |
| Cancelar | ✅ | ✅ | ✅ |

---

## Suspensão

### Quando ocorre

Suspensão automática após 30 dias de inadimplência.

### O que acontece

| Recurso | Disponibilidade |
|---------|-----------------|
| Login | ✅ Permitido |
| Ver dados | ✅ Permitido |
| Lançar transações | ❌ Bloqueado |
| Editar categorias | ❌ Bloqueado |
| Exportar dados | ✅ Permitido |

### Comunicação

```
E-mail de suspensão:

"Sua conta foi suspensa por falta de pagamento.

Para regularizar:
1. Acesse [link de pagamento]
2. Pague a fatura em aberto
3. Seu acesso será restaurado automaticamente

Dúvidas? Responda este e-mail."
```

### Restauração

Quando o pagamento é confirmado:
1. Status muda para "Pago"
2. Acesso é restaurado imediatamente
3. E-mail de confirmação é enviado
4. Histórico é preservado

---

## Exclusão

### Política de retenção

| Dias de atraso | Ação |
|----------------|------|
| 0 | Fatura gerada |
| 5 | Lembrete por e-mail |
| 15 | Segundo lembrete |
| 30 | Suspensão parcial |
| 60 | Suspensão total |
| 90 | Exclusão agendada |

### Exclusão após 90 dias

Após 90 dias de inadimplência:
1. Notificação final (7 dias antes)
2. Backup de auditoria
3. Execução da exclusão
4. Confirmação por e-mail

### O que é excluído

| Dado | Tratamento |
|------|------------|
| Dados pessoais | 🗑️ Excluído |
| Transações | 🔒 Anonimizado |
| Faturas | 📋 Arquivado (5 anos) |
| Logs | 🔒 Hash preservado |

### Exceções

A exclusão NÃO ocorre se:
- ❌ Há disputa ativa
- ❌ Há processo judicial
- ❌ Há solicitação LGPD pendente
- ❌ O cliente contata durante o prazo

---

## Operações

### Gerar segunda via

1. Encontre a invoice
2. Clique em **Segunda via**
3. Escolha: E-mail ou Download
4. Confirme

### Aplicar desconto

1. Encontre a invoice
2. Clique em **Aplicar desconto**
3. Informe:
   - Percentual ou valor fixo
   - Motivo (obrigatório)
4. Confirme

> ⚠️ Descontos acima de 20% precisam de aprovação.

### Parcelar dívida

1. Encontre a invoice vencida
2. Clique em **Parcelar**
3. Configure:
   - Número de parcelas (até 6x)
   - Entrada (opcional)
4. Gere link de pagamento
5. Envie ao cliente

### Cancelar cobrança

1. Encontre a invoice
2. Clique em **Cancelar**
3. Informe o motivo
4. Confirme

> ⚠️ Cancelamentos geram estorno se já pago.

---

## Relatórios

### MRR (Monthly Recurring Revenue)

```
MRR Janeiro/2026: R$ 45.890

Por plano:
├── Família: R$ 32.000 (70%)
├── Premium: R$ 12.000 (26%)
└── Add-ons: R$ 1.890 (4%)

Variação: +5% vs mês anterior
```

### Churn financeiro

```
Churn Janeiro/2026: 2.3%

Motivos:
├── Inadimplência: 45%
├── Cancelamento: 35%
└── Downgrade: 20%
```

### Inadimplência

```
Inadimplência Janeiro/2026

Total em aberto: R$ 8.500
├── 1-30 dias: R$ 4.200 (12 famílias)
├── 31-60 dias: R$ 2.800 (8 famílias)
└── 61-90 dias: R$ 1.500 (5 famílias)
```

---

## Segurança

### Dados sensíveis

Invoices contêm dados sensíveis (CPF/CNPJ):
- Acesso restrito a Financeiro, Admin, Master
- CPF/CNPJ mascarados na listagem
- Logs de acesso auditados

### RLS aplicado

```sql
-- Apenas roles financeiras veem invoices
POLICY "financial_access" ON invoices
FOR SELECT USING (has_financial_access());
```

### Boas práticas

- ✅ Nunca envie CPF/CNPJ por canais inseguros
- ✅ Confirme identidade antes de compartilhar dados
- ✅ Use os canais oficiais de comunicação

---

*[← Voltar ao índice](./README.md)*
