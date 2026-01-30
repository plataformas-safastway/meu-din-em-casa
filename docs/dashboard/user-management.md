# 👥 Gestão de Usuários e Famílias

> Como visualizar e gerenciar clientes no Dashboard

---

## Visualização

### Listagem de famílias

Em **Famílias**, você encontra:

| Campo | Descrição |
|-------|-----------|
| Nome | Nome da família |
| Owner | Responsável principal |
| Membros | Quantidade de membros |
| Plano | Plano atual |
| Status | Ativo, Suspenso, Cancelado |
| Criado em | Data de criação |
| Último acesso | Última atividade |

### Filtros disponíveis

- **Status:** Ativo, Suspenso, Cancelado, Trial
- **Plano:** Gratuito, Família, Premium
- **Período:** Criação, último acesso
- **Health score:** Vermelho, Amarelo, Verde
- **Inadimplência:** Sim/Não

### Busca

Busque por:
- Nome da família
- E-mail do owner
- ID da família

---

## Detalhes da Família

Ao clicar em uma família, você vê:

### Informações gerais

```
Família: Silva
├── ID: fam_abc123...
├── Owner: João Silva (joao@email.com)
├── Criada em: 15/01/2025
├── Plano: Família
├── Status: Ativo
└── Health Score: 85 (Verde)
```

### Membros

| Nome | E-mail | Papel | Último acesso |
|------|--------|-------|---------------|
| João | joao@... | Owner | Hoje |
| Maria | maria@... | Manager | Ontem |
| Pedro | pedro@... | Member | 5 dias |

### Métricas

- Transações este mês
- Categorias utilizadas
- Orçamentos ativos
- Metas em andamento

### Histórico

- Ações de CS
- Tickets de suporte
- Alterações de plano
- Comunicações

---

## Limites por Plano

### Tabela de limites

| Recurso | Gratuito | Família | Premium |
|---------|----------|---------|---------|
| Membros | 2 | 5 | 10 |
| Transações/mês | 100 | Ilimitado | Ilimitado |
| Cartões | 2 | 5 | 10 |
| Contas bancárias | 2 | 5 | 10 |
| Metas | 1 | 5 | Ilimitado |
| Histórico | 6 meses | 2 anos | 5 anos |
| Relatórios | Básico | Completo | Completo + IA |
| Suporte | E-mail | E-mail + Chat | Prioritário |

### Verificando limites

No detalhe da família:
1. Vá na aba **Plano**
2. Veja o consumo atual vs limite
3. Identifique se está próximo do limite

### Quando o limite é atingido

- **Membros:** Não pode convidar mais
- **Transações:** Pode lançar, mas com aviso
- **Cartões/Contas:** Não pode adicionar mais
- **Metas:** Não pode criar novas

---

## Bloqueios

### Tipos de bloqueio

| Tipo | Causa | Efeito |
|------|-------|--------|
| **Inadimplência** | Fatura vencida | Acesso limitado |
| **Segurança** | Atividade suspeita | Acesso bloqueado |
| **Violação** | Termos de uso | Acesso bloqueado |
| **Manual** | Decisão administrativa | Configurável |

### Bloqueio por inadimplência

Fluxo automático:
```
Dia 0: Fatura vence
Dia 5: Lembrete por e-mail
Dia 15: Segundo lembrete
Dia 30: Suspensão parcial (só leitura)
Dia 60: Suspensão total
Dia 90: Exclusão agendada
```

### Bloqueio manual

Para bloquear manualmente:
1. Acesse a família
2. Vá em **Ações** → **Bloquear**
3. Selecione o tipo de bloqueio
4. Informe o motivo
5. Confirme

> ⚠️ Apenas Admin ou Master pode bloquear.

### Desbloqueio

Para desbloquear:
1. Acesse a família
2. Vá em **Ações** → **Desbloquear**
3. Verifique que a causa foi resolvida
4. Informe o motivo do desbloqueio
5. Confirme

---

## Inadimplência

### Visão geral

Em **Financeiro** → **Inadimplentes**:

| Família | Valor devido | Dias atraso | Status |
|---------|-------------|-------------|--------|
| Silva | R$ 39,90 | 15 | Lembrete enviado |
| Souza | R$ 79,80 | 45 | Suspenso |
| Costa | R$ 119,70 | 85 | Exclusão em 5 dias |

### Ações disponíveis

| Ação | Quando usar |
|------|-------------|
| **Enviar lembrete** | Atraso leve |
| **Ligar** | Atraso moderado |
| **Oferecer desconto** | Recuperação |
| **Suspender** | Atraso grave |
| **Cancelar** | Sem resposta |

### Negociação

Para negociar:
1. Acesse a família
2. Vá em **Financeiro** → **Negociar**
3. Escolha a condição:
   - Parcelamento
   - Desconto
   - Prazo estendido
4. Gere o link de pagamento
5. Envie ao cliente

### Recuperação

Quando o cliente regulariza:
1. Pagamento é detectado automaticamente
2. Status muda para "Pago"
3. Acesso é restaurado
4. E-mail de confirmação enviado

---

## Ações de CS

### Registrando ação

Após qualquer interação:
1. Acesse a família
2. Vá em **Histórico** → **Nova ação**
3. Selecione o tipo:
   - Contato proativo
   - Resposta a ticket
   - Onboarding
   - Recuperação
   - Outro
4. Descreva a ação
5. Salve

### Tipos de ação

| Tipo | Descrição |
|------|-----------|
| **Contato proativo** | CS entrou em contato |
| **Resposta ticket** | Respondeu solicitação |
| **Onboarding** | Ajudou na configuração |
| **Recuperação** | Tentou evitar churn |
| **Upgrade** | Ofereceu plano superior |
| **Feedback** | Coletou feedback |

---

## Boas Práticas

### Antes de contatar cliente

- ✅ Revise o histórico
- ✅ Entenda o contexto
- ✅ Prepare soluções

### Durante o contato

- ✅ Seja empático
- ✅ Documente em tempo real
- ✅ Ofereça soluções concretas

### Após o contato

- ✅ Registre a ação
- ✅ Atualize tags se necessário
- ✅ Agende follow-up se aplicável

---

*[← Voltar ao índice](./README.md)*
