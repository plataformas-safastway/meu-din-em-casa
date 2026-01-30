# LGPD Sensitive Data Hardening
**Data:** 2026-01-30  
**Status:** ✅ IMPLEMENTADO (com criptografia at-rest)

## Sumário

Implementação do princípio de minimização de dados (LGPD Art. 6°, III) através da separação de dados pessoais sensíveis em uma tabela privada com RLS restritivo e **criptografia at-rest** usando pgcrypto.

---

## Mudanças Implementadas

### 1. Nova Tabela: `family_member_private`

Criada para armazenar dados sensíveis com RLS restritivo e criptografia:

| Campo | Tipo | Criptografia | Descrição |
|-------|------|--------------|-----------|
| `id` | uuid | - | PK |
| `family_member_id` | uuid | - | FK → family_members.id (CASCADE) |
| `user_id` | uuid | - | ID do usuário |
| `cpf` | text | ❌ Limpo | Campo de entrada (auto-limpo) |
| `cpf_enc` | bytea | ✅ AES-256 | CPF criptografado |
| `phone_e164` | text | ❌ Limpo | Campo de entrada (auto-limpo) |
| `phone_e164_enc` | bytea | ✅ AES-256 | Telefone criptografado |
| `birth_date` | date | - | Data de nascimento |
| `phone_country` | text | - | Código do país |
| `profession` | text | - | Profissão |

### 2. Criptografia At-Rest

**Algoritmo:** AES-256 via pgcrypto (pgp_sym_encrypt/decrypt)

**Chave:** Configurada via GUC `app.enc_key` (secret no ambiente)

**Fluxo:**
1. App envia dados em plaintext (cpf, phone_e164)
2. Trigger `encrypt_family_member_private` auto-criptografa
3. Colunas plaintext são setadas como NULL
4. SELECT direto retorna apenas `*_enc` (bytea)
5. Descriptografia somente via RPCs seguras

### 3. RPC Functions Seguras

| Função | Acesso | Descrição |
|--------|--------|-----------|
| `get_my_sensitive_private()` | Próprio usuário | Retorna CPF/phone descriptografados |
| `get_family_member_sensitive(uuid)` | Owner ou próprio | Retorna dados de membro específico |

**Grants:**
- REVOKE ALL FROM anon, public
- GRANT EXECUTE TO authenticated

### 4. RLS Policies

| Policy | Comando | Quem pode? |
|--------|---------|------------|
| `fmp_select_own` | SELECT | Próprio usuário |
| `fmp_select_family_owner` | SELECT | Owner da família |
| `fmp_insert_own_or_owner` | INSERT | Próprio usuário ou owner |
| `fmp_update_own_or_owner` | UPDATE | Próprio usuário ou owner |
| `fmp_delete_owner` | DELETE | Apenas owner |

---

## Arquitetura de Código

### Hooks Atualizados

1. **`useSensitiveProfile`**
   - `useSensitiveProfile()` - Usa RPC `get_my_sensitive_private()` para dados descriptografados
   - `useFamilyMemberSensitiveProfile(memberId)` - Usa RPC `get_family_member_sensitive()`
   - `useUpdateSensitiveProfile()` - Escreve em plaintext (trigger criptografa)
   - `useUpdateCpf()` - Wrapper para CPF
   - `useHasCpf()` - Verifica CPF via RPC

---

## Validação de Segurança

### Cenários Testados

| Cenário | Esperado | Verificado |
|---------|----------|------------|
| anon SELECT | ❌ Bloqueado | ✅ |
| anon RPC call | ❌ Bloqueado | ✅ |
| Membro comum vê próprio CPF via RPC | ✅ Permitido | ✅ |
| Membro comum vê CPF de outro (RPC) | ❌ Bloqueado | ✅ |
| Owner vê CPF de membro (RPC) | ✅ Permitido | ✅ |
| SELECT direto mostra plaintext | ❌ Sempre NULL | ✅ |
| SELECT direto mostra *_enc | ✅ Bytea cifrado | ✅ |
| INSERT com cpf → criptografa auto | ✅ cpf=NULL, cpf_enc=bytea | ✅ |
| Falha se app.enc_key não configurado | ✅ Exception clara | ✅ |

---

## Conformidade LGPD

| Artigo | Requisito | Implementação |
|--------|-----------|---------------|
| Art. 6°, III | Minimização de dados | ✅ Dados separados por necessidade |
| Art. 6°, VII | Segurança | ✅ RLS + Criptografia AES-256 |
| Art. 46 | Proteção contra acesso não autorizado | ✅ RPC com autorização explícita |
| Art. 47 | Proteção contra acesso não autorizado | ✅ Criptografia at-rest |
| Art. 49 | Sistemas estruturados para proteção | ✅ Arquitetura de separação + crypto |

---

## Configuração Necessária

### Secret: APP_ENC_KEY

A chave de criptografia deve ser configurada como secret no ambiente:

1. Acesse Cloud View → Secrets
2. Adicione `APP_ENC_KEY` com uma chave forte (mínimo 16 caracteres)
3. A chave é acessada via `current_setting('app.enc_key', true)`

**⚠️ IMPORTANTE:** Sem essa configuração, operações de leitura/escrita de dados criptografados falharão.

---

*Documentação de implementação LGPD - OIK v2.2 (com criptografia at-rest)*
