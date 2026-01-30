# 📊 Orçamento e Projeções

> Planeje suas finanças mensais e acompanhe sua evolução

---

## Visão Geral

O orçamento no OIK ajuda você a:

- 🎯 Definir limites de gastos por categoria
- 📊 Acompanhar o realizado vs planejado
- 🔮 Projetar gastos futuros
- ⚠️ Receber alertas antes de estourar

---

## Orçamento Mensal

### Criando seu orçamento

1. Vá em **Orçamento**
2. Escolha o mês
3. Para cada categoria, defina:
   - **Limite mensal** (quanto quer gastar no máximo)
   - **Subcategorias** (opcional: limites específicos)
4. Salve

### Visualização

```
Alimentação          R$ 1.500
├── Planejado:       R$ 1.500
├── Realizado:       R$ 1.200
├── Restante:        R$ 300
└── Status:          🟢 No limite

Transporte           R$ 600
├── Planejado:       R$ 600
├── Realizado:       R$ 750
├── Excedido:        R$ 150
└── Status:          🔴 Acima do limite
```

### Status do orçamento

| Cor | Significado |
|-----|-------------|
| 🟢 Verde | Abaixo de 80% do limite |
| 🟡 Amarelo | Entre 80% e 100% do limite |
| 🔴 Vermelho | Acima do limite |

---

## Despesas Fixas

Despesas fixas são gastos que se repetem mensalmente com valor previsível.

### Exemplos

- 🏠 Aluguel
- 💡 Conta de luz (média)
- 📱 Plano de celular
- 🎓 Mensalidade escolar
- 💪 Academia

### Marcando como fixa

Ao criar ou editar uma transação:
1. Marque a opção **Despesa fixa**
2. O OIK usará esse valor nas projeções

### Benefícios

- 📈 Projeções mais precisas
- ⚠️ Alertas de ausência (se não lançar no mês)
- 📊 Separação clara fixo vs variável

---

## Parcelas como Compromissos

Parcelas de compras no cartão são tratadas como compromissos futuros.

### Como o OIK trata

```
Compra parcelada: Geladeira R$ 2.400 em 12x

O OIK entende que você tem:
├── 12 compromissos futuros de R$ 200
├── Projeta o impacto em cada mês
└── Alerta se vai comprometer seu orçamento
```

### Visualização no orçamento

No orçamento de cada mês futuro, você verá:
- Parcelas que vencem naquele mês
- Impacto nas categorias correspondentes
- Quanto ainda terá "livre" para gastar

---

## Renda Fixa vs Variável

O OIK diferencia tipos de renda para projeções mais precisas.

### Renda Fixa

- Salário CLT
- Aposentadoria
- Pensão
- Aluguel recebido

**Tratamento:** Considerada garantida nas projeções.

### Renda Variável

- Comissões
- Freelance
- Bonificações
- Vendas

**Tratamento:** Projetada com base na média histórica (com cautela).

### Configurando sua renda

1. Vá em **Orçamento** → **Configurar renda**
2. Para cada fonte de renda:
   - Nome
   - Tipo (fixa ou variável)
   - Valor (ou média)
   - Dia do recebimento
3. Salve

---

## Visualização de Comprometimento

O OIK mostra quanto da sua renda está comprometida.

### Indicadores

```
Renda prevista:         R$ 8.000
├── Despesas fixas:     R$ 4.500 (56%)
├── Parcelas:           R$ 800  (10%)
├── Orçamento variável: R$ 2.000 (25%)
└── Livre:              R$ 700  (9%)
```

### Alertas de comprometimento

| Nível | Ação |
|-------|------|
| < 70% comprometido | 🟢 Saudável |
| 70-90% comprometido | 🟡 Atenção |
| > 90% comprometido | 🔴 Crítico |

---

## Projeções

O OIK projeta suas finanças para os próximos meses.

### O que é considerado

- ✅ Despesas fixas
- ✅ Parcelas pendentes
- ✅ Recorrências programadas
- ✅ Média de gastos variáveis
- ✅ Renda prevista

### Visualização de projeções

```
Próximos 3 meses:

Fevereiro
├── Receita prevista:  R$ 8.000
├── Despesa prevista:  R$ 7.200
└── Saldo projetado:   R$ 800 ✅

Março
├── Receita prevista:  R$ 8.000
├── Despesa prevista:  R$ 8.500
└── Saldo projetado:   -R$ 500 ⚠️

Abril
├── Receita prevista:  R$ 8.000
├── Despesa prevista:  R$ 7.000
└── Saldo projetado:   R$ 1.000 ✅
```

### Cenários

O OIK pode mostrar diferentes cenários:

- **Otimista:** Renda variável acima da média
- **Realista:** Baseado em médias
- **Conservador:** Renda variável reduzida

---

## Metas de Economia

Além do orçamento de gastos, você pode definir metas de economia.

### Criando uma meta

1. Vá em **Metas**
2. Toque em **+ Nova Meta**
3. Defina:
   - Nome (ex: "Viagem de férias")
   - Valor total
   - Prazo
   - Aporte mensal sugerido
4. Salve

### Acompanhamento

```
Meta: Viagem de férias
├── Valor total:       R$ 6.000
├── Já economizado:    R$ 2.400 (40%)
├── Faltam:            R$ 3.600
├── Prazo:             Dez/2026
├── Aporte mensal:     R$ 400/mês
└── Status:            🟢 No ritmo
```

---

## Dicas de Orçamento

### Comece simples

- Primeiro mês: apenas acompanhe sem julgar
- Segundo mês: defina limites baseados no real
- Terceiro mês em diante: ajuste conforme necessário

### A regra 50-30-20

Uma sugestão popular:
- **50%** para necessidades (moradia, contas, alimentação básica)
- **30%** para desejos (lazer, restaurantes, compras)
- **20%** para economia/investimentos

### Revise mensalmente

- O que funcionou?
- Onde estourou?
- O que pode cortar?
- O que precisa aumentar?

---

## Próximos Passos

- 📈 [Veja seus relatórios](./reports.md)
- 🔔 [Configure alertas](./alerts.md)
- 💳 [Entenda os cartões](./credit-cards.md)

---

*[← Voltar à Central de Ajuda](./README.md)*
