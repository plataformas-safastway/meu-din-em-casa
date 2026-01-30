# 💰 Lançamentos Financeiros

> Como registrar suas receitas e despesas no OIK

---

## Visão Geral

O OIK oferece várias formas de registrar suas movimentações financeiras:

| Método | Melhor para |
|--------|-------------|
| **Manual** | Lançamentos pontuais, ajustes |
| **OCR (Foto)** | Notas fiscais, cupons |
| **Importação** | Extratos bancários (OFX, Excel) |
| **Open Finance** | Sincronização automática |

---

## Lançamento Manual

### Passo a passo

1. Na tela inicial, toque no botão **+ Lançar**
2. Escolha o tipo: **Receita** ou **Despesa**
3. Preencha os campos obrigatórios:
   - **Valor** (em reais)
   - **Data** (quando aconteceu)
   - **Categoria** (ex: Moradia, Alimentação)
   - **Subcategoria** (ex: Aluguel, Supermercado)
4. Campos opcionais:
   - Descrição
   - Método de pagamento
   - Se é recorrente
5. Toque em **Salvar**

### Campos do Lançamento

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Tipo | ✅ | Receita ou Despesa |
| Valor | ✅ | Valor em reais |
| Data | ✅ | Data da movimentação |
| Categoria | ✅ | Categoria principal |
| Subcategoria | ✅ | Detalhamento da categoria |
| Descrição | ❌ | Observações livres |
| Pagamento | ❌ | PIX, Cartão, Dinheiro, etc. |
| Recorrente | ❌ | Marcação para lançamentos fixos |

---

## Lançamento por Foto (OCR)

O OIK consegue ler automaticamente notas fiscais e cupons usando tecnologia OCR (Reconhecimento Óptico de Caracteres).

### Como usar

1. Toque em **+ Lançar**
2. Selecione **Ler foto**
3. Tire uma foto ou escolha da galeria
4. O OIK irá extrair:
   - Valor total
   - Data (se disponível)
   - Estabelecimento
5. Revise e ajuste os dados
6. Escolha categoria e subcategoria
7. Salve o lançamento

### Dicas para melhor leitura

- 📸 Foto bem iluminada
- 📐 Documento alinhado
- 🔍 Foco no valor total
- 📃 Evite amassados ou rasgos

### Limitações

> O OCR funciona melhor com cupons fiscais padrão. Recibos manuscritos ou muito danificados podem não ser reconhecidos corretamente.

---

## Importação de Arquivos

Importe extratos bancários e planilhas para lançar várias transações de uma vez.

### Formatos suportados

| Formato | Origem típica |
|---------|---------------|
| **OFX** | Extratos bancários |
| **XLS/XLSX** | Planilhas Excel |
| **CSV** | Planilhas genéricas |
| **PDF** | Faturas de cartão (alguns bancos) |

### Como importar

1. Vá em **Transações** → **Importar**
2. Selecione o arquivo
3. O OIK irá analisar o conteúdo
4. Revise as transações detectadas
5. Categorize cada item (ou use sugestões automáticas)
6. Confirme a importação

### Importação inteligente

O OIK aprende suas preferências:
- Transações similares recebem sugestões de categoria
- Descrições recorrentes são reconhecidas
- Você pode criar regras automáticas

---

## Open Finance

> 🚧 **Em desenvolvimento** — Esta funcionalidade está sendo implementada.

O Open Finance permite conectar suas contas bancárias diretamente ao OIK para sincronização automática.

### Benefícios

- ✅ Atualização automática de saldo
- ✅ Importação contínua de transações
- ✅ Menos trabalho manual

### Privacidade

- Conexão segura via APIs reguladas pelo Banco Central
- Você autoriza exatamente quais dados compartilhar
- Pode revogar o acesso a qualquer momento

---

## Regra: Categoria + Subcategoria

> ⚠️ **Obrigatório:** Todo lançamento deve ter categoria E subcategoria.

Esta regra existe para garantir:

- 📊 Relatórios mais detalhados
- 🎯 Orçamentos mais precisos
- 📈 Análises mais úteis

### Exemplo

```
❌ Errado:
   Categoria: Alimentação
   Subcategoria: (vazio)

✅ Correto:
   Categoria: Alimentação
   Subcategoria: Supermercado
```

### Subcategorias disponíveis

Cada categoria tem suas subcategorias. Você pode:
- Usar as subcategorias padrão
- Criar subcategorias personalizadas
- Importar subcategorias de planilhas

[Veja mais em Categorias →](./categories.md)

---

## Edição de Lançamentos

### Editando um lançamento existente

1. Encontre a transação na lista
2. Toque para abrir detalhes
3. Toque em **Editar**
4. Faça as alterações necessárias
5. Salve

### O que pode ser editado

| Campo | Editável? | Observação |
|-------|-----------|------------|
| Valor | ✅ | Sempre |
| Data | ✅ | Sempre |
| Categoria | ✅ | Sempre |
| Subcategoria | ✅ | Sempre |
| Descrição | ✅ | Sempre |
| Pagamento | ✅ | Sempre |

### Excluindo lançamentos

1. Abra o lançamento
2. Toque em **Excluir**
3. Confirme a exclusão

> ⚠️ Lançamentos excluídos não podem ser recuperados.

---

## Lançamentos Recorrentes

Para despesas e receitas que se repetem mensalmente:

1. Ao criar o lançamento, marque **Recorrente**
2. Defina a frequência (mensal, semanal, etc.)
3. O OIK criará automaticamente os próximos lançamentos

### Gerenciando recorrências

- Veja todas em **Configurações** → **Recorrências**
- Pause, edite ou cancele a qualquer momento
- Receba alertas quando um lançamento recorrente estiver próximo

[Veja mais em Alertas →](./alerts.md)

---

## Classificações Especiais

Além de Receita e Despesa, o OIK reconhece:

| Classificação | Uso | Impacto no orçamento |
|---------------|-----|----------------------|
| **Transferência** | Movimentação entre contas | ❌ Não conta |
| **Reembolso** | Redução de despesa | ➖ Reduz despesa |
| **Ajuste** | Correção contábil | ⚙️ Depende |

Essas classificações ajudam a manter seus relatórios mais precisos.

---

## Próximos Passos

- 🏷️ [Aprenda sobre categorias](./categories.md)
- 💳 [Entenda os cartões de crédito](./credit-cards.md)
- 📊 [Configure seu orçamento](./budget.md)

---

*[← Voltar à Central de Ajuda](./README.md)*
