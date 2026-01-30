# LGPD Sensitive Data Hardening
**Data:** 2026-01-30  
**Status:** ✅ IMPLEMENTADO

## Sumário

Implementação do princípio de minimização de dados (LGPD Art. 6°, III) através da separação de dados pessoais sensíveis em uma tabela privada com RLS restritivo.

---

## Mudanças Implementadas

### 1. Nova Tabela: `family_member_private`

Criada para armazenar dados sensíveis com RLS restritivo:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `family_member_id` | uuid | FK → family_members.id (CASCADE) |
| `user_id` | uuid | ID do usuário |
| `cpf` | text | CPF (apenas números) |
| `birth_date` | date | Data de nascimento |
| `phone_e164` | text | Telefone formato E.164 |
| `phone_country` | text | Código do país |
| `profession` | text | Profissão |

### 2. RLS Policies

| Policy | Comando | Quem pode? |
|--------|---------|------------|
| `fmp_select_own` | SELECT | Próprio usuário |
| `fmp_select_family_owner` | SELECT | Owner da família |
| `fmp_insert_own_or_owner` | INSERT | Próprio usuário ou owner |
| `fmp_update_own_or_owner` | UPDATE | Próprio usuário ou owner |
| `fmp_delete_owner` | DELETE | Apenas owner |

### 3. Dados Limpos da Tabela Pública

Os seguintes campos em `family_members` foram setados como NULL:
- `cpf`
- `birth_date`
- `phone_e164`
- `phone_country`
- `profession`

**Nota:** As colunas permanecem por compatibilidade, mas não contêm mais dados.

---

## Arquitetura de Código

### Hooks Criados/Atualizados

1. **`useSensitiveProfile`** (novo)
   - `useSensitiveProfile()` - Busca dados sensíveis do usuário atual
   - `useFamilyMemberSensitiveProfile(memberId)` - Owner busca dados de membro
   - `useUpdateSensitiveProfile()` - Atualiza dados sensíveis
   - `useUpdateCpf()` - Atualiza CPF especificamente
   - `useHasCpf()` - Verifica se CPF está cadastrado

2. **`useImportWithCpf`** (atualizado)
   - Agora usa `useHasCpf()` do hook de sensitive profile

3. **`useProfile`** (atualizado)
   - `useUpdateProfile()` agora divide atualizações entre tabela pública e privada

### Componentes Atualizados

1. **`CpfVerificationModal`**
   - Salva CPF em `family_member_private`

2. **Páginas de Import**
   - `ImportUploadStep.tsx`
   - `ImportUploadPage.tsx`
   - `SmartImportPage.tsx`
   - Todas usam `useHasCpf()` para verificar CPF

---

## Validação de Segurança

### Cenários Testados

| Cenário | Esperado | Verificado |
|---------|----------|------------|
| anon SELECT | ❌ Bloqueado | ✅ |
| Membro comum vê próprio CPF | ✅ Permitido | ✅ |
| Membro comum vê CPF de outro membro | ❌ Bloqueado | ✅ |
| Owner vê CPF de todos da família | ✅ Permitido | ✅ |
| DELETE family_member cascade | ✅ Deleta family_member_private | ✅ |

### Grants Revogados

```sql
REVOKE ALL ON family_member_private FROM anon, public;
```

---

## Migração

A migração é idempotente e executa:
1. Cria tabela `family_member_private`
2. Faz backfill dos dados existentes
3. Limpa dados sensíveis de `family_members`
4. Configura RLS e policies

**Arquivo:** `supabase/migrations/20260130_lgpd_sensitive_data_hardening.sql`

---

## Conformidade LGPD

| Artigo | Requisito | Implementação |
|--------|-----------|---------------|
| Art. 6°, III | Minimização de dados | ✅ Dados separados por necessidade |
| Art. 6°, VII | Segurança | ✅ RLS restritivo |
| Art. 46 | Proteção contra acesso não autorizado | ✅ Apenas próprio usuário/owner |
| Art. 49 | Sistemas estruturados para proteção | ✅ Arquitetura de separação |

---

*Documentação de implementação LGPD - OIK v2.1*
