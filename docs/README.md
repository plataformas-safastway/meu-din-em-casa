# 📚 Documentação Oficial do OIK

> **Fonte única da verdade** do sistema de Finanças Familiares OIK

**Versão:** 2.0  
**Última atualização:** 2026-01-30

---

## 📖 Índice Geral

### 📱 [Bloco 1 — Documentação do Usuário (App)](./user/README.md)
Central de Ajuda para usuários finais do aplicativo de finanças familiares.

| Documento | Descrição |
|-----------|-----------|
| [Primeiros Passos](./user/getting-started.md) | O que é o OIK, criação de conta, multiusuários |
| [Lançamentos Financeiros](./user/transactions.md) | Manual, OCR, importação, categorização |
| [Categorias e Subcategorias](./user/categories.md) | Estrutura, criação, importação, reclassificação |
| [Cartões de Crédito](./user/credit-cards.md) | Regimes de caixa/competência, parcelamentos |
| [Orçamento e Projeções](./user/budget.md) | Planejamento mensal, despesas fixas, metas |
| [Extrato e Relatórios](./user/reports.md) | Extrato mensal, visão anual, comparativos |
| [Alertas e Notificações](./user/alerts.md) | Recorrências, confirmações, decisões |
| [Configurações](./user/settings.md) | Regime financeiro, LGPD, contato DPO |

---

### 🖥️ [Bloco 2 — Documentação do Dashboard (CS/Admin)](./dashboard/README.md)
Central de Ajuda para colaboradores internos.

| Documento | Descrição |
|-----------|-----------|
| [Visão Geral](./dashboard/overview.md) | Objetivo, diferença app × dashboard, perfis |
| [Gestão de Usuários](./dashboard/user-management.md) | Famílias, limites, bloqueios, inadimplência |
| [LGPD e Privacidade](./dashboard/lgpd.md) | Painel LGPD, solicitações, prazos legais |
| [Financeiro / Billing](./dashboard/billing.md) | Invoices, status, suspensão, exclusão |
| [Logs e Auditoria](./dashboard/audit.md) | Audit logs, governança, quem vê o quê |

---

### 🔐 [Bloco 3 — Segurança e LGPD](./security/README.md)
Documentação institucional de segurança e conformidade.

| Documento | Descrição |
|-----------|-----------|
| [Princípios de Segurança](./security/security-principles.md) | Segregação, RLS, criptografia |
| [Conformidade LGPD](./security/lgpd-compliance.md) | Direitos, bases legais, retenção |
| [Proteção de Dados](./security/data-protection.md) | Senhas, auditoria, responsabilidades |

---

### 🧑‍💻 [Bloco 4 — Documentação Técnica (TI)](./technical/README.md)
Documentação para desenvolvedores, arquitetos e auditores.

| Documento | Descrição |
|-----------|-----------|
| [Arquitetura](./technical/architecture.md) | Visão macro, componentes, integrações |
| [Stack Tecnológica](./technical/tech-stack.md) | Frontend, backend, banco, infraestrutura |
| [Modelagem de Dados](./technical/data-model.md) | Famílias, transações, categorias, logs |
| [Segurança Técnica](./technical/security-technical.md) | RLS, policies, separação de contextos |
| [Fluxos Críticos](./technical/critical-flows.md) | Autenticação, lançamentos, importações |
| [Integrações](./technical/integrations.md) | Open Finance, OCR, APIs internas |
| [Observabilidade](./technical/observability.md) | Logs, monitoramento, alertas |
| [Padrões de Desenvolvimento](./technical/development-standards.md) | Convenções, versionamento, migrations |
| [Processo de QA](./technical/qa-process.md) | Testes, segurança, performance |
| [Deploy e Ambientes](./technical/deployment.md) | Ambientes, rollback, backup |

---

### 📄 [Bloco 5 — Governança](./governance/README.md)
Termos, políticas e governança interna.

| Documento | Descrição |
|-----------|-----------|
| [Termos de Uso](./governance/terms-of-use.md) | Versão vigente (v1.7) |
| [Política de Privacidade](./governance/privacy-policy.md) | Versão vigente (v1.4) |
| [Governança Interna](./governance/internal-governance.md) | Foro, responsabilidades, processos |

---

## 🔁 Regra de Manutenção

> **OBRIGATÓRIO:** Nenhuma feature pode ser considerada concluída se:
> - Não estiver documentada para o usuário (quando aplicável)
> - Não estiver documentada tecnicamente (TI)
> - Não estiver refletida nesta Central de Ajuda

### Checklist de Documentação por Feature

```markdown
- [ ] Documentação do usuário atualizada (se afeta UX)
- [ ] Documentação técnica atualizada
- [ ] Changelog atualizado
- [ ] Memory file criado/atualizado (se necessário)
```

---

## 📋 Auditorias e Relatórios

| Documento | Data | Status |
|-----------|------|--------|
| [Auditoria de Segurança Auth](./SECURITY_AUDIT_2026-01-30.md) | 2026-01-30 | ✅ Concluída |
| [Auditoria RLS P0](./SECURITY_AUDIT_RLS_2026-01-30.md) | 2026-01-30 | ✅ Concluída |

---

## ✅ Critérios de Qualidade

A documentação é considerada adequada quando:

1. **Usuário** entende como usar o OIK sem suporte humano
2. **CS** consegue atender qualquer demanda com base na documentação
3. **Novo dev** consegue entender e evoluir o sistema
4. **Auditoria** consegue avaliar segurança e LGPD
5. **Documentação** reflete o sistema real

---

*Documentação oficial do OIK - Versão 2.0*
