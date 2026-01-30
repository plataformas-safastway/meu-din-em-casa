# 🧑‍💻 Documentação Técnica — OIK

> Para desenvolvedores, arquitetos e auditores

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│  React 18 + TypeScript + Vite + Tailwind + shadcn/ui    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                   Supabase (Backend)                     │
├─────────────────────────────────────────────────────────┤
│  Auth │ Database (PostgreSQL) │ Edge Functions │ Storage│
└─────────────────────────────────────────────────────────┘
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| State | TanStack Query, React Context |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Database | PostgreSQL 15 com RLS |
| Infraestrutura | Lovable Cloud |

## Modelagem de Dados

### Entidades principais
- **families**: Núcleo de organização
- **family_members**: Usuários por família (role: owner/manager/member)
- **transactions**: Lançamentos financeiros
- **user_categories/user_subcategories**: Categorização
- **budgets**: Orçamentos mensais
- **credit_cards**: Cartões de crédito
- **audit_logs**: Auditoria

### Relacionamentos
```
families 1:N family_members
families 1:N transactions
families 1:N budgets
transactions N:1 user_categories
```

## Segurança Técnica

### RLS por tabela
Todas as tabelas sensíveis têm RLS habilitado com políticas:
- `is_family_member(family_id)` para acesso de consumidores
- `has_admin_access()` para dashboard
- `is_family_owner_or_manager(family_id)` para governança

### Separação de contextos
- **App** (`/app/*`): Requer `family_members` + `onboarding_status = completed`
- **Dashboard** (`/admin/*`): Requer `admin_users` com role válida

## Fluxos Críticos

1. **Autenticação**: Supabase Auth → Profile check → Redirect apropriado
2. **Lançamento**: Validação → Categorização → Persistência → Atualização de cache
3. **Importação**: Upload → Parser → Preview → Confirmação → Persistência batch
4. **Exclusão LGPD**: Solicitação → Verificação → Período de graça → Anonimização

## Padrões de Desenvolvimento

- Componentes pequenos e focados
- Hooks customizados para lógica reutilizável
- TanStack Query para server state
- Migrations SQL para mudanças de schema
- Convenção de nomenclatura: snake_case (DB), camelCase (código)

## Deploy

- **Test**: Preview automático em cada push
- **Production**: Deploy manual via "Publish"
- Edge functions: Deploy automático

---

*Documentação Técnica OIK v2.0*
