# 📧 Sistema de E-mails do OIK

> Documentação técnica do sistema de envio de e-mails baseado em eventos

---

## Arquitetura

O sistema de e-mails é **baseado em eventos** e segue princípios de:
- **Rate limiting**: Máximo 3 e-mails/semana por usuário (exceto segurança)
- **Deduplicação**: Mesmo tipo de e-mail não é reenviado em 7 dias
- **Preferências**: Usuário pode desativar categorias (exceto segurança)
- **Auditoria**: Todo envio é registrado em `email_logs`

## Tabelas

| Tabela | Descrição |
|--------|-----------|
| `email_preferences` | Preferências por usuário/família |
| `email_logs` | Log de todos os envios (auditoria + rate limiting) |
| `email_events_queue` | Fila de eventos pendentes |

## Categorias de E-mail

| Categoria | Opt-out | Exemplos |
|-----------|---------|----------|
| `security` | ❌ Não | Login, senha, novo dispositivo |
| `financial` | ✅ Sim | Orçamento estourado, inatividade |
| `goals` | ✅ Sim | Progresso de metas, conclusões |
| `education` | ✅ Sim | Conteúdos, planos, família |

## Eventos Disponíveis

### Segurança (sempre enviados)
- `user.account_created`
- `user.email_confirmed`
- `user.password_reset_requested`
- `user.password_changed`
- `user.login_new_device`

### Financeiro
- `budget.category_exceeded`
- `budget.if_zeroed`
- `spending.decrease_detected`
- `spending.increase_detected`
- `spending.no_activity_7d`

### Metas
- `goal.created`, `goal.progress_25`, `goal.progress_50`, `goal.progress_75`
- `goal.completed`, `goal.at_risk`, `goal.abandoned`

### Família
- `family.invite_sent`, `family.invite_accepted`, `family.invite_expired`
- `family.permission_changed`, `family.member_removed`, `family.sensitive_action`

## Uso no Código

```typescript
import { triggerEmailEvent, sendWelcomeEmail } from '@/lib/emailEvents';

// Envio genérico
await triggerEmailEvent({
  userId: user.id,
  familyId: family.id,
  eventType: 'goal.completed',
  payload: { goalTitle: 'Reserva de emergência' }
});

// Helpers específicos
await sendWelcomeEmail(userId, familyId, familyName, userName);
await sendBudgetExceededEmail(userId, familyId, categoryName, budgetAmount, currentAmount);
```

## Funções SQL

| Função | Descrição |
|--------|-----------|
| `check_email_rate_limit()` | Verifica limite semanal e deduplicação |
| `check_email_preference()` | Verifica se categoria está habilitada |
| `get_email_category()` | Mapeia evento para categoria |
| `queue_email_event()` | Enfileira evento para processamento |

## Edge Function

A função `send-email` processa os eventos:
1. Valida rate limiting
2. Verifica preferências do usuário
3. Seleciona template apropriado
4. Envia via Resend
5. Registra em `email_logs`

---

*Documentação técnica do OIK - Sistema de E-mails v1.0*
