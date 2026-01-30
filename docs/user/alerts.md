# 🔔 Alertas e Notificações

> Receba avisos importantes sobre suas finanças

---

## Visão Geral

O OIK envia alertas para ajudar você a:

- ⚠️ Não perder prazos importantes
- 💰 Manter o orçamento sob controle
- 🔄 Confirmar lançamentos recorrentes
- 📊 Acompanhar metas

---

## Tipos de Alertas

### Alertas de Orçamento

| Alerta | Quando |
|--------|--------|
| 🟡 80% do limite | Atingiu 80% do orçamento da categoria |
| 🔴 Limite atingido | Atingiu 100% do orçamento |
| 🚨 Acima do limite | Ultrapassou o orçamento |

**Exemplo:**
```
⚠️ Alimentação está em 85% do limite

Você gastou R$ 1.275 de R$ 1.500 orçados.
Restam R$ 225 para o resto do mês.

[Ver gastos] [Ajustar orçamento]
```

### Alertas de Recorrência

Para despesas que se repetem todo mês.

| Alerta | Quando |
|--------|--------|
| 📅 Lembrete | X dias antes do vencimento |
| ❓ Ausência | Data passou e não foi lançado |
| ✅ Confirmação | Pede confirmação do lançamento |

---

## Alertas de Recorrência

### Como funcionam

Quando você marca uma despesa como **recorrente** (ex: aluguel todo dia 5):

1. **Antes do vencimento:** OIK envia lembrete
2. **Na data:** Pede confirmação do lançamento
3. **Se não lançar:** Alerta de ausência

### Exemplo de fluxo

```
📅 Dia 3 (2 dias antes)
└── "Lembrete: Aluguel vence dia 5"

📅 Dia 5 (data do vencimento)
└── "O aluguel de R$ 2.000 foi pago?"
    [Sim, lançar] [Ainda não] [Pular este mês]

📅 Dia 7 (2 dias depois, sem resposta)
└── "Atenção: Aluguel não foi lançado este mês"
    [Lançar agora] [Não houve este mês]
```

---

## Confirmações

Alguns alertas pedem sua confirmação antes de agir.

### Lançamentos automáticos

Para recorrências, você pode escolher:

| Opção | O que acontece |
|-------|----------------|
| **Lançar automaticamente** | OIK lança sem perguntar |
| **Pedir confirmação** | OIK pergunta antes de lançar |
| **Apenas lembrar** | OIK só avisa, você lança manualmente |

### Confirmação de valores

Se um lançamento recorrente tiver valor variável:

```
💡 Conta de luz

O valor médio é R$ 180.
Este mês você informou R$ 250 (+39%).

Deseja lançar esse valor?
[Sim] [Corrigir valor]
```

---

## Registro de Decisões

O OIK registra todas as suas decisões sobre alertas.

### O que é registrado

- ✅ Alertas confirmados
- ❌ Alertas ignorados
- ⏭️ Recorrências puladas
- 📝 Ajustes feitos

### Por que isso importa

- 📊 Melhores relatórios
- 🔍 Auditoria pessoal
- 💡 Insights sobre seu comportamento

### Visualizando o histórico

1. Vá em **Alertas** → **Histórico**
2. Veja todas as decisões tomadas
3. Filtre por tipo ou período

---

## Configurando Alertas

### Ativando/desativando

1. Vá em **Configurações** → **Notificações**
2. Escolha quais alertas quer receber:
   - [ ] Alertas de orçamento
   - [ ] Lembretes de recorrência
   - [ ] Alertas de metas
   - [ ] Dicas e insights
3. Salve

### Canais de notificação

| Canal | Disponível |
|-------|------------|
| Push (app) | ✅ Sim |
| E-mail | ✅ Sim |
| SMS | ❌ Não |
| WhatsApp | 🚧 Em breve |

### Horários

Configure quando receber:
- **Lembretes:** Manhã (8h) ou Noite (20h)
- **Alertas urgentes:** Imediatamente

---

## Alertas de Metas

Se você tem metas de economia configuradas:

### Tipos

| Alerta | Quando |
|--------|--------|
| ✅ Meta atingida | Completou a meta! |
| 🟡 Atraso | Está abaixo do ritmo necessário |
| 🎯 Lembrete de aporte | Dia do aporte mensal |

### Exemplo

```
🎯 Meta: Viagem de férias

Está na hora do aporte mensal!

├── Valor sugerido: R$ 400
├── Já economizado: R$ 2.400 (40%)
└── Faltam: R$ 3.600

[Fazer aporte] [Adiar] [Ver detalhes]
```

---

## Alertas Inteligentes

O OIK aprende com seus dados e envia alertas proativos.

### Exemplos

```
💡 Padrão identificado

Você costuma gastar mais em restaurantes 
nos finais de semana.

Este fim de semana, já gastou R$ 180.
Sua média é R$ 150.

[Entendi] [Ver gastos]
```

```
⚠️ Gasto atípico

Uma transação de R$ 500 em "Eletrônicos"
está muito acima do seu padrão.

Era esperado? 
[Sim, está correto] [Verificar]
```

---

## Silenciando Alertas

### Temporariamente

- **Não perturbe:** Silencia por X horas
- **Férias:** Silencia por X dias (mantém alertas críticos)

### Permanentemente

Para alertas específicos que não quer mais ver:
1. No alerta, toque em **⋮** (menu)
2. Escolha **Não mostrar novamente**
3. Confirme

---

## Próximos Passos

- ⚙️ [Personalize configurações](./settings.md)
- 📊 [Veja seus relatórios](./reports.md)
- 💳 [Gerencie cartões](./credit-cards.md)

---

*[← Voltar à Central de Ajuda](./README.md)*
