# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo.

## [2.0.0] - 2026-01-28

### 🎉 Release Oficial - Versão 2.0

Esta versão marca o lançamento oficial do sistema de Finanças Familiares com arquitetura completa de autenticação e autorização.

### ✨ Funcionalidades Principais

- **Sistema de Autenticação Completo**
  - Login/Logout com Supabase Auth
  - Recuperação de senha
  - Auto-confirmação de email

- **Autorização Multi-Contexto**
  - Separação clara entre Dashboard (admin/master) e App (consumer)
  - Validação de perfil consumer antes de acessar o App
  - Onboarding obrigatório com status persistido (`not_started`, `in_progress`, `completed`)

- **Dashboard Administrativo**
  - Painel de controle para admins/masters
  - Gestão de famílias e membros
  - Relatórios executivos
  - Customer Success com IA

- **App Consumer (Finanças Familiares)**
  - Gestão de transações (receitas/despesas)
  - Orçamentos e metas por categoria
  - Objetivos financeiros com aportes
  - Importação de extratos (OFX, XLS, PDF)
  - Cartões de crédito e contas bancárias
  - Recorrências automáticas
  - Relatórios com IA
  - Integração WhatsApp para consultoria

- **Segurança**
  - RLS (Row Level Security) em todas as tabelas
  - Separação de contextos admin/consumer
  - Modal de acesso negado para admins sem perfil consumer
  - Logs de auditoria

### 🏗️ Arquitetura

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth, Database, Edge Functions, Storage)
- TanStack Query para gerenciamento de estado
- Framer Motion para animações

### 📱 Design

- Mobile-first (375x667 viewport base)
- Tema claro/escuro
- Design system com tokens semânticos
- Componentes acessíveis

---

*Versão 2.0 travada em 28/01/2026*
