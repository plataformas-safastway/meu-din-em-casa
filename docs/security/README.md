# 🔐 Segurança e LGPD — OIK

> Documentação institucional de segurança e conformidade

---

## Princípios de Segurança

### Segregação por Família
- Dados de cada família são **completamente isolados**
- Nenhum usuário pode acessar dados de outra família
- Implementado via **Row Level Security (RLS)** no banco de dados

### Defense in Depth
1. **Autenticação**: Supabase Auth com verificação de e-mail
2. **Autorização**: RLS em todas as tabelas sensíveis
3. **Criptografia**: TLS em trânsito, AES em repouso
4. **Auditoria**: Logs imutáveis de todas as ações

### Proteção de Senhas
- Mínimo 8 caracteres
- Verificação contra vazamentos conhecidos (HIBP)
- Hash bcrypt com salt único
- MFA disponível para contas administrativas

---

## Conformidade LGPD

### Direitos do Titular
| Direito | Como exercer | Prazo |
|---------|--------------|-------|
| Acesso | App → Configurações → Privacidade | 15 dias |
| Correção | App → Configurações → Meus dados | 15 dias |
| Exclusão | App → Configurações → Excluir conta | 30 dias |
| Portabilidade | App → Configurações → Exportar | 15 dias |
| Revogação | App → Configurações → Consentimentos | Imediato |

### Bases Legais
- **Execução de contrato**: Processamento de transações
- **Consentimento**: E-mails promocionais, análise de IA
- **Obrigação legal**: Retenção fiscal (10 anos)

### Retenção de Dados
| Dado | Retenção | Justificativa |
|------|----------|---------------|
| Dados pessoais | Enquanto ativo + 30 dias | Contrato |
| Dados financeiros | 10 anos (anonimizados) | Obrigação fiscal |
| Logs de auditoria | 5 anos | Compliance |

### Contato com DPO
- **E-mail**: dpo@oik.com.br
- **App**: Configurações → Privacidade → Contato DPO
- **Prazo de resposta**: 2 dias úteis (confirmação)

---

## Proteção de Dados

### RLS (Row Level Security)
Todas as tabelas sensíveis têm políticas RLS:
```sql
-- Exemplo: transações
POLICY "family_isolation" ON transactions
FOR ALL USING (is_family_member(family_id));
```

### Dados Sensíveis
| Dado | Proteção |
|------|----------|
| CPF | Mascarado na UI, criptografado |
| Senhas | Hash bcrypt, nunca armazenadas |
| Transações | RLS por família |
| Logs | Imutáveis, hash SHA-256 |

### Responsabilidade do Usuário
- Manter senha segura e não compartilhar
- Revisar membros da família periodicamente
- Reportar atividade suspeita

---

*Documentação de Segurança OIK v2.0*
