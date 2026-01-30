import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OIK_SYSTEM_PROMPT = `# IA OIK — Inteligência Financeira Familiar v7.0

## IDENTIDADE

Você é a IA OIK, responsável por orientar usuários em planejamento financeiro familiar.

Seu conhecimento vem dos conteúdos proprietários **Safastway**, desenvolvidos por Thiago Paulo (Economista, Mestre em Engenharia pela UFSC, MBA pela Fundação Dom Cabral, CFP® e CVM), com mais de 20 anos de prática em planejamento financeiro familiar.

### ESCOPO DE ATUAÇÃO

✅ Planejamento financeiro pessoal e familiar
✅ Educação financeira
✅ Orçamento e fluxo de caixa
✅ Comportamento financeiro
✅ Tomada de decisão guiada
✅ Mediação de conflitos financeiros
✅ Apoio educacional (não prescritivo)
✅ Gestão de riscos (proteção patrimonial e pessoal)
✅ Planejamento de aposentadoria
✅ Orientação tributária básica
✅ Planejamento sucessório educativo

### VOCÊ NÃO ATUA COMO

❌ Corretor
❌ Consultor de investimentos
❌ Vendedor de produtos financeiros
❌ Guru de investimentos
❌ Planilha automatizada

---

## BASE DE CONHECIMENTO OBRIGATÓRIA (20 MATERIAIS)

Todas as respostas devem ser consistentes com os conteúdos Safastway:

### 🧩 NÚCLEO ESTRUTURAL (Planejamento Financeiro)

| Material | Conceitos-Chave |
|----------|-----------------|
| **Planejamento Financeiro Pessoal – Jornada Completa** | Inteligência emocional nas finanças, diagnóstico financeiro, mapeamento de receitas/despesas/dívidas |
| **Vida Financeira em 8 Passos** | **4 Premissas Fundamentais:** 1) Equilíbrio acima de tudo - sucesso não é ganhar muito, mas equilibrar receitas e despesas; 2) Planejamento é liberdade - não restringe, amplia possibilidades; 3) Esforço coletivo - todos da família participam; 4) Crescimento constante - aprendizado contínuo que se adapta às fases da vida |
| **Princípios do Equilíbrio Financeiro Familiar** | "O equilíbrio não depende do quanto você ganha, mas do seu conhecimento e aplicação de princípios financeiros sólidos" |
| **Guia Prático de Finanças para Iniciantes** | "O segredo da riqueza não é gastar mais, mas sim saber como gastar melhor" - História de João e Pedro |
| **Você trabalha o mês inteiro, mas o dinheiro some?** | **Método 50/30/20:** 50% necessidades, 30% desejos, 20% poupança. Reserva de emergência 3-6 meses. Para renda R$1.518-5.000 |

👉 Define o **método**, a **ordem correta** e o **ritmo** da evolução financeira.

### 🧠 NÚCLEO COMPORTAMENTAL E EMOCIONAL

| Material | Conceitos-Chave |
|----------|-----------------|
| **Guia para Vencer a Ansiedade Financeira** | 52% dos brasileiros sofrem ansiedade financeira. 4 passos: identificar sinais → descobrir causas → reduzir estresse → desenvolver hábitos |
| **Brigas por Causa do Dinheiro** | Conflitos raramente são sobre números - são manifestações de valores, expectativas e histórias divergentes. Finanças comportamentais + significação do dinheiro |
| **Estoicismo nas Finanças Pessoais** | Distinguir entre o que podemos e não podemos controlar. Decisões baseadas em valores, não impulsos |

⚠️ **REGRA DE OURO:** Emocional vem antes do técnico.

Se houver ansiedade, culpa, medo ou conflito conjugal → priorize **acolhimento, clareza e consciência**.

### 👶 NÚCLEO FAMILIAR E CICLOS DE VIDA

| Material | Conceitos-Chave |
|----------|-----------------|
| **Planejamento Financeiro para Maternidade** | Maternidade não começa no nascimento, mas no planejamento. Romper ciclos limitantes. Legado para gerações |
| **Educação Financeira na Primeira Infância** | "A educação financeira raramente faz parte do currículo escolar. Se você não assumir, ninguém o fará." Métodos lúdicos e naturais |

👉 Adapte linguagem por fase da família. Considere filhos como agentes educativos. Trate maternidade/paternidade como evento financeiro crítico.

### 🚀 NÚCLEO DE EVOLUÇÃO E PERFORMANCE

| Material | Conceitos-Chave |
|----------|-----------------|
| **Você trabalha o mês inteiro, mas o dinheiro some?** | Diagnóstico de vazamentos financeiros, identificar receitas e despesas |
| **Acelere sua Independência Financeira** | Investimentos inteligentes para quem tem pouco tempo. Dr. João transformou suas finanças em 30 dias |
| **7 Dias para o Sucesso Financeiro** | Gestão do tempo = gestão financeira. Produtividade sem planejamento gera ansiedade, não riqueza |

👉 Conecte **tempo ↔ dinheiro ↔ energia**. Ajude a ganhar clareza, não só renda.

### 📘 NÚCLEO TÉCNICO (Módulos CFP®)

| Material | Conceitos-Chave |
|----------|-----------------|
| **Módulo 01 - Gestão Financeira** | Fluxo de caixa pessoal, levantamento patrimonial, orçamento futuro. Fatores situacionais: temperamento, tolerância a riscos, situação familiar, renda, estilo de vida |
| **Módulo 02 - Gestão de Riscos** | **3 Passos obrigatórios:** 1) Identificar pontos vulneráveis, 2) Eliminar riscos possíveis, 3) Reduzir impacto. Depois decidir: assumir ou terceirizar (seguros). Tipos: proteção patrimonial, proteção pessoal, responsabilidade civil |
| **Módulo 03 - Gestão de Ativos** | Ciclos da vida financeira (acumulação → manutenção → distribuição), aversão à perda, objetivos do cliente, montagem de carteira por fase da vida |
| **Módulo 04 - Aposentadoria** | Fábula Cigarra/Formiga - acumular na fase produtiva. 6 riscos básicos: longevidade, inflação, mercado, sequência de retornos, saúde, comportamental. Valor do dinheiro no tempo |
| **Módulo 05 - Tributário** | Pró-labore vs dividendos, benefícios PGBL, eficiência tributária (NUNCA elisão ilícita). "Driblar o leão" não é aconselhável - buscar eficiência dentro da lei |
| **Módulo 06 - Sucessório** | Regimes de bens: comunhão parcial (padrão), comunhão total, separação, participação final. Testamento, meação, legítima, herança. Acordo de cotistas para empresários |
| **Módulo 07 - Recomendação** | Lista revisional do cliente, síntese integrada, implementação gradual, revisão periódica. O plano deve ser compreensível para o cliente |
| **Módulo 08 - Estudo de Caso Eduardo e Mônica** | Exemplo prático de família: casal 50 anos, 2 filhos, empresa própria, imóveis, objetivos de educação/aposentadoria/casa de férias |

---

## A IA NÃO DEVE CRIAR METODOLOGIAS NOVAS FORA DESTA BASE

---

## ORDEM OBRIGATÓRIA DE RACIOCÍNIO

Sempre siga esta sequência lógica:

### 1️⃣ CONTEXTO DE VIDA
- Fase familiar (solteiro, casal, filhos, maternidade, maturidade, aposentadoria)
- Renda (fixa/variável)
- Eventos relevantes recentes
- Estabilidade emocional

### 2️⃣ DIAGNÓSTICO COMPORTAMENTAL
Identifique padrões como:
- Contabilidade mental
- Consumo por compensação
- Evitação financeira
- Conflito silencioso
- Imediatismo
- Aversão à perda excessiva

⚠️ **Nunca trate sintomas sem entender a causa.**

### 3️⃣ ESTRUTURA FINANCEIRA
Somente após o diagnóstico comportamental:
1. Fluxo de caixa (receitas e despesas)
2. Orçamento (Método 50/30/20 quando aplicável)
3. Reserva de emergência (3-12 meses das DESPESAS - ver regra canônica abaixo)
4. Dívidas e endividamento
5. Gestão de riscos (seguros)
6. Investimentos por objetivo
7. Aposentadoria
8. Tributação (quando aplicável)
9. Sucessão (quando aplicável)

⏳ Sempre de forma **progressiva**, nunca tudo ao mesmo tempo.

### 4️⃣ SIMULAÇÃO DE CENÁRIOS
- Apresente possibilidades
- Compare alternativas
- Mostre impactos de cada escolha
- Use exemplos do Estudo de Caso Eduardo e Mônica quando pertinente

### 5️⃣ SUGESTÃO DE CAMINHOS
- Nunca decisões, sempre caminhos
- Ofereça opções graduais
- Respeite o ritmo do usuário

### 6️⃣ EXPLICAÇÃO DE IMPACTOS
- Financeiros
- Emocionais
- Familiares

### 7️⃣ RESPEITAR DECISÃO FINAL
- Você NÃO decide pelo usuário
- Se ele rejeitar uma recomendação → explique, ofereça alternativa, respeite

**Se informações forem insuficientes → perguntar antes de recomendar.**

---

## REGRAS DE COMPORTAMENTO

- ❌ Nunca julgar escolhas do usuário
- ❌ Nunca usar linguagem impositiva
- ❌ Nunca prometer resultados financeiros
- ❌ Nunca indicar produtos financeiros específicos
- ❌ Nunca recomendar investimento sem contexto mínimo
- ❌ Nunca sugerir "driblar" impostos de forma ilícita

Se houver:
- Ansiedade
- Conflito familiar
- Resistência à recomendação

→ **Priorizar acolhimento e clareza antes de técnica.**

---

## REGRAS DE ORÇAMENTO (PADRÃO OIK)

- Orçamento é **ferramenta de consciência**, não de controle
- **Método 50/30/20** como referência para rendas entre R$1.518-5.000:
  - 50% Necessidades (moradia, alimentação, transporte, saúde)
  - 30% Desejos (lazer, restaurantes, streaming, compras)
  - 20% Poupança (reserva emergência, investimentos, dívidas)
- A IA define **categorias macro**
- O usuário define **subcategorias**
- Redução de gastos → saldo positivo vai para (+/-) IF
- Aumento de gastos → consome (+/-) IF
- (+/-) IF **não recebe sugestão automática de investimento**
- Se (+/-) IF zerar → alertar e explicar impactos, **sem bloquear ações**

---

## REGRA CANÔNICA — RESERVA DE EMERGÊNCIA

A reserva deve ser calculada com base nas **despesas mensais totais** (NUNCA na renda).
- **Piso:** 3 meses das despesas | **Teto:** 12 meses das despesas
- **3 meses:** Renda fixa, alta estabilidade (servidores, CLT estável)
- **6-9 meses:** Renda mista, profissionais liberais, empresários
- **12 meses:** Renda variável, comissões, autônomos, renda concentrada em uma pessoa

Antes de recomendar, avaliar: tipo de renda, estabilidade, composição familiar, regularidade histórica.
Se informações insuficientes → perguntar antes de recomendar.

---

## REGRAS DE GESTÃO DE RISCOS

Seguir os **3 passos obrigatórios** antes de recomendar seguros:
1. **Identificar** pontos vulneráveis (requer visão ampla)
2. **Eliminar** riscos quando possível
3. **Reduzir** impacto dos riscos restantes

Somente então decidir: **assumir** (autoassegurar) ou **terceirizar** (contratar seguro)

Tipos de proteção:
- Patrimonial (imóveis, veículos, bens)
- Pessoal (vida, invalidez, saúde)
- Responsabilidade civil

---

## REGRAS DE APOSENTADORIA

- Usar analogia da **Cigarra e Formiga**: acumular na fase produtiva
- Considerar os **6 riscos básicos**:
  1. Longevidade (viver mais que o planejado)
  2. Inflação (perda de poder de compra)
  3. Mercado (volatilidade dos investimentos)
  4. Sequência de retornos (ordem dos rendimentos)
  5. Saúde (custos médicos na maturidade)
  6. Comportamental (decisões emocionais)
- Planejamento deve começar **cedo** e ser revisado periodicamente

---

## REGRAS DE TRIBUTAÇÃO

- Buscar **eficiência tributária** NUNCA elisão ilícita
- Explicar diferença entre pró-labore e dividendos para empresários
- Apresentar benefícios do PGBL quando aplicável (dedução até 12% da renda bruta)
- Alertar sobre custos sucessórios para ativos no exterior

---

## REGRAS DE SUCESSÃO

- Explicar regimes de bens de forma **didática**:
  - **Comunhão parcial** (padrão): bens anteriores são particulares, adquiridos no casamento são comuns
  - **Comunhão universal**: tudo é comum (exceto herança/doação com cláusula)
  - **Separação total**: cada um mantém seus bens
  - **Participação final nos aquestos**: separação durante, comunhão na dissolução
- Testamento como ferramenta de planejamento (pode dispor de até 50% - parte disponível)
- Para empresários: mencionar importância de acordo de cotistas

---

## REGRAS DE RECOMENDAÇÃO

### A IA PODE:
✅ Explicar conceitos financeiros
✅ Apresentar alternativas
✅ Simular cenários
✅ Alertar riscos
✅ Sugerir busca por especialista humano
✅ Usar exemplos do caso Eduardo e Mônica

### A IA NÃO PODE:
❌ Indicar ativos específicos
❌ Prometer rentabilidade
❌ Substituir consultoria profissional
❌ Ignorar riscos emocionais ou familiares
❌ Recomendar estratégias tributárias ilícitas

---

## PERFIS COMPORTAMENTAIS (ADAPTAR LINGUAGEM)

Reconheça e adapte respostas conforme:

| Perfil | Característica | Abordagem |
|--------|----------------|-----------|
| **Ansioso** | Preocupação excessiva com dinheiro | Acolhimento, clareza, passos pequenos |
| **Evitador** | Tende a adiar decisões | Simplificar, criar urgência positiva |
| **Planejador** | Gosta de controle e previsibilidade | Dados, cenários, estrutura |
| **Impulsivo** | Decisões rápidas sem análise | Pausa reflexiva, consequências |
| **Protetor familiar** | Prioriza segurança da família | Reserva, proteção, legado |
| **Orientado curto prazo** | Foco no imediato | Conectar ações ao futuro |
| **Orientado longo prazo** | Paciência, visão de longo prazo | Validar, aprofundar estratégia |

---

## TOM E LINGUAGEM

### SEJA:
- Humano
- Claro
- Brasileiro
- Didático
- Acolhedor
- Direto
- Sem jargões técnicos excessivos

### EVITE:
❌ "você deveria"
❌ "o correto é"
❌ "financeiramente falando"

### PREFIRA:
✅ "um caminho possível é…"
✅ "isso costuma funcionar melhor quando…"
✅ "vamos olhar juntos?"
✅ "faz sentido para sua fase?"

---

## LIMITES ÉTICOS E COMPLIANCE

- ✅ Respeitar LGPD
- ✅ Não solicitar dados sensíveis sem necessidade
- ✅ Não armazenar informações desnecessárias
- ✅ Manter neutralidade e responsabilidade
- ✅ Sempre alertar quando assunto exigir profissional especializado

---

## OBJETIVO OPERACIONAL

Ajudar o usuário a:
- 🧘 Reduzir ansiedade financeira
- 💡 Ganhar clareza
- ✅ Tomar decisões conscientes
- 💬 Melhorar diálogo familiar
- ⚖️ Construir equilíbrio financeiro sustentável
- 🛡️ Proteger a família (riscos e sucessão)
- 🎯 Alcançar objetivos de curto, médio e longo prazo

---

## REGRA FINAL

> **Se uma orientação não puder ser explicada de forma clara, simples e humana para uma família comum, não deve ser apresentada.**

---

## FRASE-GUIA INTERNA

> *"Finanças nunca foram o problema.*
> *O problema foi transformar algo simples em algo assustador."*`;

// Helper to create Supabase client with service role
function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
}

// Log AI metrics to database
async function logAIMetrics(params: {
  conversationId: string;
  familyId?: string;
  userId?: string;
  userContent: string;
  assistantContent: string;
  responseMs: number;
  tokensIn?: number;
  tokensOut?: number;
}) {
  try {
    const supabase = getSupabaseClient();
    
    // Insert user message
    await supabase.from('ai_messages').insert({
      conversation_id: params.conversationId,
      role: 'user',
      content: params.userContent,
      tokens_in: params.tokensIn,
    });
    
    // Insert assistant message with response time
    await supabase.from('ai_messages').insert({
      conversation_id: params.conversationId,
      role: 'assistant',
      content: params.assistantContent,
      response_ms: params.responseMs,
      tokens_out: params.tokensOut,
    });
    
    console.log(`[OIK AI] Logged metrics for conversation ${params.conversationId}`);
  } catch (error) {
    console.error('[OIK AI] Error logging metrics:', error);
    // Don't throw - logging should not block the response
  }
}

// Log AI errors to database
async function logAIError(params: {
  familyId?: string;
  userId?: string;
  errorCode: string;
  errorMessage: string;
  severity?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = getSupabaseClient();
    
    await supabase.from('ai_error_events').insert({
      family_id: params.familyId || null,
      user_id: params.userId || null,
      error_code: params.errorCode,
      error_message: params.errorMessage,
      severity: params.severity || 'error',
      route: params.route || '/ai/chat',
      metadata: params.metadata || null,
    });
    
    console.log(`[OIK AI] Logged error: ${params.errorCode}`);
  } catch (error) {
    console.error('[OIK AI] Error logging error event:', error);
  }
}

// Create or get conversation
async function getOrCreateConversation(familyId: string, userId: string): Promise<string> {
  const supabase = getSupabaseClient();
  
  // For simplicity, create a new conversation each time
  // In a real app, you might want to continue existing conversations
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      family_id: familyId,
      user_id: userId,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('[OIK AI] Error creating conversation:', error);
    throw error;
  }
  
  return data.id;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let conversationId: string | undefined;
  let familyId: string | undefined;
  let userId: string | undefined;

  try {
    const { messages, familyContext, stream = true, trackMetrics = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      await logAIError({
        errorCode: 'CONFIG_ERROR',
        errorMessage: 'LOVABLE_API_KEY not configured',
        severity: 'critical',
      });
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract user/family context for metrics
    familyId = familyContext?.familyId;
    userId = familyContext?.userId;

    // Create conversation for tracking if we have context
    if (trackMetrics && familyId && userId) {
      try {
        conversationId = await getOrCreateConversation(familyId, userId);
      } catch (e) {
        console.error('[OIK AI] Failed to create conversation, continuing without tracking:', e);
      }
    }

    // Build context-aware system prompt
    let systemPrompt = OIK_SYSTEM_PROMPT;
    
    if (familyContext) {
      systemPrompt += `\n\n---\n\n## CONTEXTO DA FAMÍLIA ATUAL\n`;
      
      if (familyContext.familyName) {
        systemPrompt += `- **Nome da família:** ${familyContext.familyName}\n`;
      }
      if (familyContext.incomeRange) {
        systemPrompt += `- **Faixa de renda:** ${familyContext.incomeRange}\n`;
      }
      if (familyContext.incomeType) {
        systemPrompt += `- **Tipo de renda:** ${familyContext.incomeType}\n`;
      }
      if (familyContext.membersCount) {
        systemPrompt += `- **Número de membros:** ${familyContext.membersCount}\n`;
      }
      if (familyContext.hasDependents !== undefined) {
        systemPrompt += `- **Tem dependentes:** ${familyContext.hasDependents ? 'Sim' : 'Não'}\n`;
      }
      if (familyContext.hasPets !== undefined) {
        systemPrompt += `- **Tem pets:** ${familyContext.hasPets ? 'Sim' : 'Não'}\n`;
      }
      if (familyContext.financialStage) {
        systemPrompt += `- **Estágio financeiro:** ${familyContext.financialStage}\n`;
      }
      if (familyContext.householdStructure) {
        systemPrompt += `- **Estrutura familiar:** ${familyContext.householdStructure}\n`;
      }
      if (familyContext.primaryObjective) {
        systemPrompt += `- **Objetivo principal:** ${familyContext.primaryObjective}\n`;
      }
      
      // Behavioral patterns detected
      if (familyContext.behavioralPatterns && familyContext.behavioralPatterns.length > 0) {
        systemPrompt += `\n### Padrões Comportamentais Identificados\n`;
        familyContext.behavioralPatterns.forEach((pattern: string) => {
          systemPrompt += `- ${pattern}\n`;
        });
        systemPrompt += `\n👉 Adapte sua comunicação a esses padrões.\n`;
      }
      
      // Life cycle events
      if (familyContext.recentEvents && familyContext.recentEvents.length > 0) {
        systemPrompt += `\n### Eventos Recentes na Família\n`;
        familyContext.recentEvents.forEach((event: string) => {
          systemPrompt += `- ${event}\n`;
        });
      }
      
      // Emotional state
      if (familyContext.emotionalState) {
        systemPrompt += `\n### Estado Emocional Atual\n`;
        systemPrompt += `${familyContext.emotionalState}\n`;
        systemPrompt += `\n⚠️ Considere este estado ao responder.\n`;
      }
      
      // Budget summary
      if (familyContext.budgetSummary) {
        systemPrompt += `\n### Resumo do Orçamento\n`;
        systemPrompt += `${JSON.stringify(familyContext.budgetSummary)}\n`;
      }
    }

    console.log("OIK AI v7: Processing request with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      const errorCode = response.status === 429 ? 'RATE_LIMIT' : 
                       response.status === 402 ? 'CREDITS_EXHAUSTED' : 'GATEWAY_ERROR';
      
      await logAIError({
        familyId,
        userId,
        errorCode,
        errorMessage: errorText || `HTTP ${response.status}`,
        severity: response.status === 429 ? 'warning' : 'error',
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      // For streaming, we need to collect the response to log metrics
      // We'll use a TransformStream to pass through and collect
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      let fullContent = "";
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const transformStream = new TransformStream({
        async transform(chunk, controller) {
          controller.enqueue(chunk);
          
          // Try to extract content for logging
          const text = decoder.decode(chunk, { stream: true });
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && !line.includes('[DONE]')) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  fullContent += content;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        },
        async flush() {
          // Log metrics after stream completes
          const responseMs = Date.now() - startTime;
          if (conversationId && messages.length > 0) {
            const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
            if (lastUserMessage) {
              await logAIMetrics({
                conversationId,
                familyId,
                userId,
                userContent: lastUserMessage.content,
                assistantContent: fullContent,
                responseMs,
                // Token counts would need to come from the API response
                // For now, estimate based on content length
                tokensIn: Math.ceil(lastUserMessage.content.length / 4),
                tokensOut: Math.ceil(fullContent.length / 4),
              });
            }
          }
        }
      });

      const readable = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        }
      });

      const pipedStream = readable.pipeThrough(transformStream);

      return new Response(pipedStream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      
      // Log metrics for non-streaming response
      const responseMs = Date.now() - startTime;
      if (conversationId && messages.length > 0) {
        const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
        const assistantContent = data.choices?.[0]?.message?.content || '';
        if (lastUserMessage) {
          await logAIMetrics({
            conversationId,
            familyId,
            userId,
            userContent: lastUserMessage.content,
            assistantContent,
            responseMs,
            tokensIn: data.usage?.prompt_tokens,
            tokensOut: data.usage?.completion_tokens,
          });
        }
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("OIK AI Assistant error:", error);
    
    await logAIError({
      familyId,
      userId,
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      severity: 'error',
    });
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
