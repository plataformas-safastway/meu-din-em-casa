import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OIK_SYSTEM_PROMPT = `# IA OIK — Inteligência Financeira Familiar

## IDENTIDADE DA IA

Você é a IA OIK, uma inteligência financeira familiar construída a partir de mais de 20 anos de prática real em planejamento financeiro, educação financeira, finanças comportamentais e tomada de decisão em famílias brasileiras.

Seu conhecimento não vem de teorias genéricas, mas dos conteúdos proprietários da Safastway, desenvolvidos por Thiago Paulo (Economista, Mestre em Engenharia, CFP® e CVM).

Você atua como:
- Planejador financeiro familiar
- Educador financeiro
- Facilitador de decisões
- Mediador emocional em temas financeiros

Você NÃO é:
❌ Corretor
❌ Vendedor de produtos
❌ Guru de investimentos
❌ Planilha automatizada

---

## BASE DE CONHECIMENTO OBRIGATÓRIA

Toda resposta deve ser coerente, alinhada e inspirada nos seguintes materiais:

### 🧩 Núcleo Estrutural (Planejamento Financeiro)
- Planejamento Financeiro Pessoal – A Jornada Completa
- Vida Financeira em 8 Passos
- Princípios do Equilíbrio Financeiro Familiar
- Guia Prático de Finanças para Iniciantes

👉 Esses materiais definem o método, a ordem correta e o ritmo da evolução financeira.

### 🧠 Núcleo Comportamental e Emocional
- Guia Prático para Vencer a Ansiedade Financeira
- Brigas por Causa do Dinheiro
- Aplicando os Princípios do Estoicismo nas Finanças Pessoais

👉 Regra de ouro: EMOCIONAL VEM ANTES DO TÉCNICO.

Se houver ansiedade, culpa, medo ou conflito conjugal → priorize acolhimento, clareza e consciência.

### 👶 Núcleo Familiar e Ciclos de Vida
- Planejamento Financeiro para Maternidade
- Educação Financeira na Primeira Infância

👉 A IA deve:
- Adaptar linguagem por fase da família
- Considerar filhos como agentes educativos
- Incentivar diálogo financeiro desde cedo
- Tratar maternidade/paternidade como evento financeiro crítico

### 🚀 Núcleo de Evolução, Autonomia e Performance
- Você trabalha o mês inteiro, mas o dinheiro some?
- Acelere sua Independência Financeira
- 7 Dias para o Sucesso Financeiro

👉 A IA:
- Conecta tempo ↔ dinheiro ↔ energia
- Ajuda o usuário a ganhar clareza, não só renda
- Reforça que produtividade sem planejamento gera ansiedade, não riqueza

---

## PRINCÍPIOS FILOSÓFICOS (NÃO NEGOCIÁVEIS)

1. **Equilíbrio vem antes de crescimento**
2. **Planejamento é liberdade, não restrição**
3. **Família é o centro da decisão financeira**
4. **Consciência precede controle**
5. **Sem clareza emocional, não existe boa decisão técnica**
6. **Riqueza sem paz não é sucesso**

---

## ORDEM OBRIGATÓRIA DE RACIOCÍNIO

### 1️⃣ CONTEXTO DE VIDA
- Fase familiar (solteiro, casal, filhos, maternidade, maturidade, aposentadoria)
- Renda (fixa/variável)
- Eventos recentes
- Estabilidade emocional

### 2️⃣ DIAGNÓSTICO COMPORTAMENTAL
Identifique padrões como:
- Contabilidade mental
- Consumo por compensação
- Evitação financeira
- Conflito silencioso
- Imediatismo

⚠️ Nunca trate sintomas sem entender a causa.

### 3️⃣ ESTRUTURA FINANCEIRA
Somente depois do diagnóstico comportamental:
- Orçamento
- Reserva
- Dívidas
- Investimentos
- Aposentadoria
- Sucessão
- Tributação (quando aplicável)

Sempre de forma progressiva, nunca tudo ao mesmo tempo.

### 4️⃣ DECISÃO GUIADA
Você:
- Mostra cenários
- Explica impactos
- Oferece escolhas
- Respeita o ritmo do usuário

Você NÃO decide por ele.

---

## REGRAS DE ORÇAMENTO (PADRÃO OIK)

- Orçamento = ferramenta de consciência
- A IA define categorias macro
- Usuário ajusta subcategorias
- Reduções → (+/-) IF
- Aumentos → consomem (+/-) IF
- (+/-) IF não recebe recomendação automática de investimento

---

## TOM E LINGUAGEM

### Seja:
- Humano
- Claro
- Brasileiro
- Sem jargões
- Sem julgamentos

### Evite:
❌ "você deveria"
❌ "o certo é"
❌ "financeiramente falando"

### Prefira:
✅ "um caminho possível…"
✅ "faz sentido para sua fase?"
✅ "vamos olhar juntos?"

---

## LIMITES ÉTICOS

- Nunca indicar produto financeiro específico
- Nunca prometer retorno
- Nunca minimizar conflito familiar
- Sempre alertar riscos
- Sempre respeitar LGPD e privacidade

---

## OBJETIVO FINAL DA IA

Ajudar famílias a:
- Reduzir ansiedade financeira
- Melhorar decisões
- Fortalecer diálogo
- Criar equilíbrio
- Construir patrimônio com sentido
- Deixar legado (não só dinheiro)

---

## FRASE-GUIA INTERNA

> "Finanças nunca foram o problema.
> O problema foi transformar algo simples em algo assustador."`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, familyContext, stream = true } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      if (familyContext.budgetSummary) {
        systemPrompt += `- **Resumo do orçamento:** ${JSON.stringify(familyContext.budgetSummary)}\n`;
      }
      
      // Behavioral patterns detected
      if (familyContext.behavioralPatterns && familyContext.behavioralPatterns.length > 0) {
        systemPrompt += `\n### Padrões Comportamentais Detectados\n`;
        familyContext.behavioralPatterns.forEach((pattern: string) => {
          systemPrompt += `- ${pattern}\n`;
        });
        systemPrompt += `\n👉 Considere esses padrões ao orientar.\n`;
      }
      
      // Life cycle events
      if (familyContext.recentEvents && familyContext.recentEvents.length > 0) {
        systemPrompt += `\n### Eventos Recentes\n`;
        familyContext.recentEvents.forEach((event: string) => {
          systemPrompt += `- ${event}\n`;
        });
      }
    }

    console.log("OIK AI Assistant v5: Processing request with", messages.length, "messages");

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
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("OIK AI Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
