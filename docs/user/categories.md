# 🏷️ Categorias e Subcategorias

> Organize suas finanças com categorias personalizadas

---

## Estrutura

O OIK usa um sistema de **duas camadas** para classificar transações:

```
📁 Categoria (nível 1)
└── 📄 Subcategoria (nível 2)
```

### Exemplo

```
📁 Alimentação
├── 📄 Supermercado
├── 📄 Restaurantes
├── 📄 Delivery
└── 📄 Lanches

📁 Moradia
├── 📄 Aluguel
├── 📄 Condomínio
├── 📄 Água
├── 📄 Luz
└── 📄 Gás
```

### Categorias padrão

O OIK já vem com categorias pré-configuradas:

| Tipo | Categorias |
|------|------------|
| **Despesas** | Alimentação, Moradia, Transporte, Saúde, Educação, Lazer, Vestuário, Serviços, Outros |
| **Receitas** | Salário, Freelance, Investimentos, Benefícios, Vendas, Outros |

---

## Subcategoria Obrigatória

> ⚠️ **Regra do OIK:** Todo lançamento precisa de categoria E subcategoria.

### Por que essa regra existe?

1. **Relatórios detalhados** — Saiba exatamente onde está gastando
2. **Orçamentos precisos** — Defina limites por subcategoria
3. **Análise histórica** — Compare gastos específicos ao longo do tempo
4. **Inteligência** — O OIK aprende seus padrões de gasto

### Se não existir subcategoria?

Use a subcategoria **"Geral"** ou **"Outros"** da categoria.

---

## Gerenciamento

### Criando uma categoria

1. Vá em **Configurações** → **Categorias**
2. Toque em **+ Nova Categoria**
3. Preencha:
   - Nome
   - Ícone
   - Cor
   - Tipo (Receita ou Despesa)
4. Adicione subcategorias
5. Salve

### Criando uma subcategoria

1. Vá em **Configurações** → **Categorias**
2. Toque na categoria desejada
3. Toque em **+ Nova Subcategoria**
4. Digite o nome
5. Salve

### Editando categorias

1. Vá em **Configurações** → **Categorias**
2. Toque na categoria/subcategoria
3. Faça as alterações
4. Salve

> ⚠️ Ao editar o nome de uma categoria, as transações existentes mantêm a associação.

### Excluindo categorias

Antes de excluir:

1. **Verifique** se há transações usando essa categoria
2. **Decida** o que fazer com elas:
   - Mover para outra categoria
   - Manter "sem categoria" (não recomendado)

Para excluir:
1. Vá em **Configurações** → **Categorias**
2. Toque na categoria
3. Toque em **Excluir**
4. Escolha a ação para transações existentes
5. Confirme

---

## Importação

### Importação de categorias via Excel

Você pode importar suas categorias de uma planilha:

1. Prepare seu arquivo Excel com as colunas:
   - Categoria
   - Subcategoria
2. Vá em **Configurações** → **Categorias** → **Importar**
3. Selecione o arquivo
4. Revise as categorias detectadas
5. Confirme a importação

### Formato esperado

| Categoria | Subcategoria |
|-----------|--------------|
| Alimentação | Supermercado |
| Alimentação | Restaurantes |
| Moradia | Aluguel |
| Moradia | Condomínio |

### Importação de gastos com categorias próprias

Ao importar um extrato ou planilha de gastos:

1. O OIK detecta categorias novas
2. Você pode:
   - **Criar** as categorias automaticamente
   - **Mapear** para categorias existentes
   - **Ignorar** e deixar sem categoria

---

## Reclassificação

Quando você muda a categoria de uma transação ou cria uma nova categoria, pode precisar reclassificar transações antigas.

### Tipos de reclassificação

| Tipo | O que acontece |
|------|----------------|
| **Só este** | Apenas a transação atual é alterada |
| **Daqui pra frente** | Transações futuras similares serão categorizadas assim |
| **Histórico** | Todas as transações similares (passadas e futuras) são reclassificadas |

### Como reclassificar

1. Abra uma transação
2. Mude a categoria/subcategoria
3. O OIK perguntará:
   > "Deseja aplicar esta mudança a outras transações similares?"
4. Escolha:
   - **Apenas esta** — Só esta transação
   - **Daqui pra frente** — Cria regra para futuras
   - **Todas similares** — Aplica ao histórico também

### Regras de categorização

O OIK cria regras automáticas baseadas em:

- Descrição da transação
- Estabelecimento
- Valor aproximado
- Método de pagamento

Você pode gerenciar estas regras em:
**Configurações** → **Categorias** → **Regras automáticas**

> 🔒 **Governança:** Apenas o Owner ou Manager da família pode criar/editar regras de categorização.

---

## Boas Práticas

### Organize por frequência

Crie subcategorias para gastos frequentes:
- ✅ "Supermercado" (vou toda semana)
- ✅ "Restaurante" (frequente)
- ❌ "Restaurante Italiano" (muito específico)

### Não exagere na granularidade

- 5-10 subcategorias por categoria é suficiente
- Muitas subcategorias = mais trabalho, menos insights

### Use nomes consistentes

- ✅ "Mercado", "Feira", "Padaria"
- ❌ "Mercado 1", "Mercado Bairro", "Aquele mercado"

### Revise periodicamente

A cada 3-6 meses:
- Exclua subcategorias não usadas
- Combine categorias similares
- Ajuste conforme sua vida muda

---

## Próximos Passos

- 💳 [Cartões de crédito e categorias](./credit-cards.md)
- 📊 [Orçamento por categoria](./budget.md)
- 📈 [Relatórios por categoria](./reports.md)

---

*[← Voltar à Central de Ajuda](./README.md)*
