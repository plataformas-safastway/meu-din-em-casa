# 🏠 Visão Geral do Dashboard

> Entenda o papel e funcionamento do Dashboard administrativo

---

## Objetivo

O Dashboard é a ferramenta administrativa interna do OIK, destinada a:

- 👥 **Gestão de clientes** — Acompanhar famílias e usuários
- 📊 **Métricas** — Visualizar KPIs e health scores
- 🔧 **Suporte** — Resolver problemas e atender solicitações
- 🔐 **Compliance** — Atender demandas LGPD
- 💰 **Billing** — Gerenciar cobranças e inadimplência

---

## Diferença App × Dashboard

| Aspecto | App (Usuário) | Dashboard (Admin) |
|---------|---------------|-------------------|
| **Público** | Famílias/consumidores | Colaboradores internos |
| **Dados visíveis** | Própria família | Todas as famílias (com restrições) |
| **Ações** | Lançar, categorizar, planejar | Suportar, gerenciar, auditar |
| **Autenticação** | Supabase Auth padrão | Supabase Auth + role admin |
| **Acesso** | oik-finance.lovable.app | /admin/* |

### Segregação de contextos

```
┌──────────────────────────────────────────────┐
│                 Supabase Auth                │
├──────────────────┬───────────────────────────┤
│   App Consumer   │    Dashboard Admin        │
│                  │                           │
│  family_members  │     admin_users           │
│  (role: member)  │  (role: admin/cs/master)  │
│                  │                           │
│  Dados próprios  │   Dados de gestão         │
└──────────────────┴───────────────────────────┘
```

---

## Perfis e Permissões

### Roles administrativas

| Role | Código | Descrição |
|------|--------|-----------|
| **Admin Master** | `ADMIN_MASTER` | Acesso total ao sistema |
| **Admin** | `ADMIN` | Gestão geral, sem acesso LGPD completo |
| **Customer Success** | `CUSTOMER_SUCCESS` | Atendimento e acompanhamento |
| **Financeiro** | `FINANCIAL_ADMIN` | Billing e cobranças |
| **Suporte** | `SUPPORT_AGENT` | Suporte técnico |
| **Legal/DPO** | `LEGAL_ADMIN` | LGPD e compliance |

### Matriz de permissões

| Recurso | Master | Admin | CS | Financeiro | Suporte | Legal |
|---------|--------|-------|-----|------------|---------|-------|
| Ver famílias | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver transações | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Ver invoices | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Bloquear usuário | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Excluir dados LGPD | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Gerenciar admins | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Restrições por escopo

Algumas roles podem ter escopo limitado:

- **Por família:** Acesso apenas a famílias específicas
- **Por região:** Acesso por área geográfica
- **Por período:** Acesso temporário

---

## Áreas do Dashboard

### 1. Overview

Página inicial com métricas gerais:
- Total de famílias ativas
- Churn rate
- MRR (Monthly Recurring Revenue)
- Alertas pendentes

### 2. Customer Success

Gestão de relacionamento:
- Health scores por família
- Sinais de comportamento
- Sugestões de IA
- Ações proativas

### 3. Suporte

Atendimento técnico:
- Tickets abertos
- Bugs reportados
- Sessões de breakglass

### 4. Financeiro

Gestão de billing:
- Invoices
- Inadimplência
- Suspensões

### 5. LGPD

Compliance e privacidade:
- Tickets DPO
- Solicitações de exclusão
- Audit logs
- Legal Vault

### 6. Tech

Monitoramento técnico:
- Logs de erro
- Performance
- Integrações

### 7. Executivo

Relatórios gerenciais:
- Dashboards de métricas
- Exportações
- Tendências

---

## Acesso ao Dashboard

### Requisitos

1. **Conta de usuário** no OIK
2. **Registro em `admin_users`** com role apropriada
3. **MFA ativo** (obrigatório para roles sensíveis)
4. **Treinamento** de segurança concluído

### Primeiro acesso

1. Receba convite do Admin Master
2. Crie sua conta (se não tiver)
3. Configure MFA
4. Altere senha inicial
5. Acesse `/admin`

### Perda de acesso

Se perder acesso:
1. Contate o Admin Master
2. Aguarde verificação de identidade
3. Reset de MFA se necessário

---

## Boas Práticas

### Antes de acessar dados de cliente

- ✅ Tenha justificativa clara
- ✅ Documente o motivo
- ✅ Use o mínimo necessário

### Durante o atendimento

- ✅ Seja profissional
- ✅ Não exponha dados sensíveis
- ✅ Siga os scripts quando houver

### Após o atendimento

- ✅ Registre ações tomadas
- ✅ Atualize status dos tickets
- ✅ Escalone se necessário

---

*[← Voltar ao índice](./README.md)*
