# 🔐 LGPD no Dashboard

> Gestão de privacidade e conformidade

---

## Painel LGPD

O painel LGPD centraliza todas as demandas de privacidade.

### Acessando

**Dashboard** → **LGPD**

### Visão geral

```
LGPD Dashboard

Tickets abertos:     12
├── Alta prioridade: 2
├── Média:           5
└── Baixa:           5

Prazo crítico:       3 tickets vencem em 48h

Exclusões agendadas: 8
```

---

## Solicitações

### Tipos de solicitação

| Código | Tipo | Prazo |
|--------|------|-------|
| `DATA_ACCESS` | Acesso aos dados | 15 dias |
| `DATA_CORRECTION` | Correção de dados | 15 dias |
| `DATA_DELETION` | Exclusão de dados | 30 dias |
| `DATA_PORTABILITY` | Portabilidade | 15 dias |
| `CONSENT_REVOCATION` | Revogação de consentimento | Imediato |
| `PRIVACY_QUESTION` | Dúvida geral | 5 dias |

### Origem das solicitações

- **App:** Usuário solicitou via configurações
- **E-mail:** Recebido no dpo@oik.com.br
- **Suporte:** Transferido do atendimento
- **ANPD:** Solicitação do órgão regulador

---

## Fluxo de Atendimento

### 1. Recebimento

```
Ticket criado
├── Protocolo: DPO-2026-00123
├── Tipo: DATA_ACCESS
├── Solicitante: joao@email.com
├── Família: fam_abc123
└── Prazo: 15 dias
```

### 2. Triagem

O DPO ou Legal Admin:
1. Verifica legitimidade
2. Confirma identidade do solicitante
3. Classifica prioridade
4. Atribui responsável

### 3. Verificação de identidade

Antes de qualquer ação:
- ✅ Confirmar que é o titular dos dados
- ✅ Ou representante legal autorizado
- ✅ Documentar verificação

### 4. Execução

| Tipo | Ação |
|------|------|
| Acesso | Gerar relatório de dados |
| Correção | Alterar dados específicos |
| Exclusão | Executar processo de exclusão |
| Portabilidade | Exportar em formato estruturado |
| Revogação | Desativar consentimentos |

### 5. Resposta

1. Documentar ação tomada
2. Preparar resposta ao titular
3. Anexar evidências quando aplicável
4. Enviar resposta
5. Fechar ticket

---

## Prazos Legais

### Tabela de prazos LGPD

| Solicitação | Prazo LGPD | Prazo OIK |
|-------------|-----------|-----------|
| Confirmação de recebimento | — | 2 dias úteis |
| Acesso | 15 dias | 10 dias |
| Correção | 15 dias | 10 dias |
| Exclusão | 30 dias | 20 dias |
| Portabilidade | 15 dias | 10 dias |
| Oposição | Imediato | 24h |

### Alertas de prazo

O sistema alerta automaticamente:
- **5 dias antes:** Alerta amarelo
- **2 dias antes:** Alerta vermelho
- **Vencido:** Escalação automática

### Se o prazo vencer

1. Escalonar para DPO imediatamente
2. Documentar motivo do atraso
3. Comunicar ao titular
4. Priorizar resolução

---

## Registro de Ações

### Auditoria obrigatória

Toda ação LGPD é registrada:

```
Audit Log:
├── Timestamp: 2026-01-30 14:35:22
├── Ator: admin@oik.com.br
├── Ação: DATA_ACCESS_EXECUTED
├── Ticket: DPO-2026-00123
├── Família: fam_abc123
├── Titular: joao@email.com
└── Detalhes: "Relatório gerado e enviado"
```

### Hash de integridade

Cada registro tem hash SHA-256:
- Garante imutabilidade
- Prova para auditoria
- Conformidade LGPD Art. 37

### Retenção de logs

- Logs LGPD: 5 anos (mínimo legal)
- Armazenamento seguro
- Acesso restrito a Legal/Master

---

## Exclusão de Dados

### Processo de exclusão

```
Solicitação recebida
      ↓
Verificação de identidade
      ↓
Período de confirmação (7 dias)
      ↓
Backup de auditoria
      ↓
Execução da exclusão
├── Dados pessoais: EXCLUÍDOS
├── Dados financeiros: ANONIMIZADOS
└── Logs: HASH preservado
      ↓
Confirmação ao titular
      ↓
Ticket fechado
```

### O que é excluído

| Dado | Tratamento |
|------|------------|
| Nome, e-mail, CPF | 🗑️ Excluído |
| Endereço, telefone | 🗑️ Excluído |
| Avatar, fotos | 🗑️ Excluído |
| Transações | 🔒 Anonimizado |
| Categorias | 🔒 Anonimizado |
| Logs de acesso | 🔒 Hash preservado |

### Anonimização

Dados financeiros são anonimizados, não excluídos:
- Necessário para retenção fiscal (10 anos)
- Remove identificação pessoal
- Mantém dados agregados para relatórios

Exemplo:
```
Antes: { user: "João Silva", cpf: "123.456.789-00", valor: 150.00 }
Depois: { user: null, cpf: null, valor: 150.00, anonymized: true }
```

---

## Legal Vault

Área segura para documentos legais.

### Conteúdo

- Termos de uso (todas as versões)
- Políticas de privacidade (todas as versões)
- Consentimentos registrados
- Certificados e contratos
- Evidências de conformidade

### Acesso

- Somente Legal Admin e Master
- Auditado integralmente
- MFA obrigatório

---

## Boas Práticas

### Ao receber solicitação

- ✅ Responda o recebimento em 2 dias
- ✅ Verifique identidade antes de qualquer ação
- ✅ Documente tudo

### Durante o processamento

- ✅ Mantenha o titular informado
- ✅ Cumpra os prazos internos (não os legais)
- ✅ Escale se necessário

### Após conclusão

- ✅ Confirme com o titular
- ✅ Arquive evidências
- ✅ Feche o ticket adequadamente

---

*[← Voltar ao índice](./README.md)*
