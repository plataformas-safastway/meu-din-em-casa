# 📋 Logs e Auditoria

> Rastreabilidade e governança no Dashboard

---

## Audit Logs

### O que são

Audit logs registram todas as ações significativas no sistema:
- Acessos
- Alterações de dados
- Operações administrativas
- Eventos de segurança

### Estrutura

```json
{
  "id": "log_abc123",
  "timestamp": "2026-01-30T14:35:22Z",
  "user_id": "usr_xyz789",
  "action": "TRANSACTION_CREATED",
  "entity_type": "transaction",
  "entity_id": "txn_def456",
  "family_id": "fam_ghi012",
  "module": "transactions",
  "severity": "info",
  "ip_address": "hash:sha256:...",
  "user_agent": "hash:sha256:...",
  "metadata": {
    "amount": 150.00,
    "category": "Alimentação"
  }
}
```

### Campos

| Campo | Descrição |
|-------|-----------|
| `timestamp` | Momento exato da ação |
| `user_id` | Quem executou |
| `action` | Tipo de ação |
| `entity_type` | Tipo de entidade afetada |
| `entity_id` | ID da entidade |
| `family_id` | Família relacionada |
| `module` | Módulo do sistema |
| `severity` | info, warn, error |
| `ip_address` | IP (hasheado) |
| `metadata` | Dados contextuais |

---

## Quem vê o quê

### Modelo de acesso

O OIK implementa acesso hierárquico aos logs:

```
Nível 1: Usuário comum
└── Vê apenas seus próprios logs

Nível 2: Owner/Manager da família
└── Vê logs da família (para suporte)

Nível 3: Admin/CS/Suporte
└── Vê logs de famílias autorizadas

Nível 4: Legal/Master
└── Vê todos os logs
```

### Detalhamento por role

| Role | Escopo de visualização |
|------|------------------------|
| Member | Apenas `user_id = self` |
| Owner | `family_id = own_family` |
| CS | Famílias atribuídas |
| Admin | Todas as famílias |
| Legal | Todos + audit completo |
| Master | Acesso irrestrito |

### RLS implementado

```sql
-- Usuário vê apenas seus logs
POLICY "own_logs" ON audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Owner vê logs da família
POLICY "family_logs" ON audit_logs
FOR SELECT USING (is_family_owner_or_manager(family_id));

-- Admin/CS/Suporte vê conforme escopo
POLICY "admin_logs" ON audit_logs
FOR SELECT USING (has_admin_access());
```

---

## Tipos de Eventos

### Autenticação

| Evento | Severidade | Descrição |
|--------|------------|-----------|
| `AUTH_LOGIN` | info | Login bem-sucedido |
| `AUTH_LOGOUT` | info | Logout |
| `AUTH_FAILED` | warn | Tentativa falha |
| `AUTH_MFA_VERIFIED` | info | MFA verificado |
| `AUTH_PASSWORD_CHANGED` | info | Senha alterada |
| `AUTH_PASSWORD_RESET` | info | Reset de senha |

### Dados financeiros

| Evento | Severidade | Descrição |
|--------|------------|-----------|
| `TRANSACTION_CREATED` | info | Transação criada |
| `TRANSACTION_UPDATED` | info | Transação alterada |
| `TRANSACTION_DELETED` | warn | Transação excluída |
| `IMPORT_COMPLETED` | info | Importação concluída |
| `BUDGET_UPDATED` | info | Orçamento alterado |

### Administração

| Evento | Severidade | Descrição |
|--------|------------|-----------|
| `USER_BLOCKED` | warn | Usuário bloqueado |
| `USER_UNBLOCKED` | info | Usuário desbloqueado |
| `FAMILY_SUSPENDED` | warn | Família suspensa |
| `DATA_EXPORTED` | info | Dados exportados |
| `DATA_DELETED` | warn | Dados excluídos |

### LGPD

| Evento | Severidade | Descrição |
|--------|------------|-----------|
| `LGPD_REQUEST_CREATED` | info | Solicitação criada |
| `LGPD_DATA_ACCESSED` | info | Dados acessados |
| `LGPD_DATA_CORRECTED` | info | Dados corrigidos |
| `LGPD_DATA_DELETED` | warn | Dados excluídos |
| `LGPD_CONSENT_REVOKED` | info | Consentimento revogado |

---

## Governança

### Princípios

1. **Não repúdio**: Ações são rastreáveis ao autor
2. **Integridade**: Logs não podem ser alterados
3. **Confidencialidade**: Acesso conforme necessidade
4. **Disponibilidade**: Logs sempre acessíveis para auditoria

### Imutabilidade

Logs são imutáveis:
- Não podem ser editados
- Não podem ser excluídos (exceto por retenção)
- Hash SHA-256 para verificação

### Retenção

| Tipo de log | Retenção |
|-------------|----------|
| Autenticação | 2 anos |
| Transações | 10 anos (fiscal) |
| Administração | 5 anos |
| LGPD | 5 anos |
| Segurança | 5 anos |

### Auditoria de auditores

Ações dos admins também são logadas:
- Qual admin acessou quais dados
- Quando e por quanto tempo
- O que foi visualizado

---

## Consultas

### Interface do Dashboard

Em **Logs** → **Audit Trail**:

1. Selecione filtros:
   - Período
   - Tipo de evento
   - Usuário
   - Família
   - Severidade
2. Execute a busca
3. Visualize resultados
4. Exporte se necessário

### Exemplos de consulta

**Logins falhos nas últimas 24h:**
```
Tipo: AUTH_FAILED
Período: Últimas 24h
```

**Exclusões de transações por família:**
```
Tipo: TRANSACTION_DELETED
Família: fam_abc123
Período: Último mês
```

**Ações LGPD:**
```
Tipo: LGPD_*
Período: Último trimestre
```

---

## Alertas

### Alertas automáticos

| Condição | Ação |
|----------|------|
| 5+ logins falhos em 1h | Alerta de segurança |
| Exclusão em massa | Notificação a Admin |
| Acesso fora do horário | Log com severidade warn |
| Exportação de dados | Notificação ao Owner |

### Configurando alertas

Em **Configurações** → **Alertas de auditoria**:

1. Defina condições
2. Escolha destinatários
3. Configure canais (e-mail, Slack, etc.)
4. Ative

---

## Boas Práticas

### Para administradores

- ✅ Revise logs periodicamente
- ✅ Investigue anomalias
- ✅ Documente investigações
- ✅ Mantenha as regras atualizadas

### Para desenvolvedores

- ✅ Logue ações significativas
- ✅ Use severidades corretas
- ✅ Inclua contexto suficiente
- ✅ Não logue dados sensíveis em plain text

### Para auditores

- ✅ Verifique integridade (hashes)
- ✅ Compare com controles
- ✅ Documente achados
- ✅ Recomende melhorias

---

*[← Voltar ao índice](./README.md)*
