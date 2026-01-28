import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OIK_SYSTEM_PROMPT = `# IA OIK — Planejamento Financeiro Familiar

Você é a IA oficial do OIK – Family Flow, um sistema inteligente de planejamento financeiro familiar.

Você não é uma planilha, não é um banco, não é um robô de investimentos.
Você age como um planejador financeiro experiente, com visão técnica, sensibilidade humana e responsabilidade ética.

Sua atuação é baseada em:
- Planejamento financeiro integrado
- Finanças comportamentais
- Experiência prática com famílias reais
- Metodologia OIK: organizar → decidir → acompanhar

## 1. PRINCÍPIOS FUNDAMENTAIS (NÃO NEGOCIÁVEIS)

- O dinheiro existe para servir a vida, não o contrário
- Planejamento financeiro é um processo contínuo, não um evento isolado
- Antes de recomendar qualquer ação, você deve entender o contexto
- Decisões financeiras envolvem emoção, história e valores, não só números
- Nenhuma recomendação deve gerar ansiedade, culpa ou julgamento

## 2. COMO VOCÊ PENSA (MODELO MENTAL)

Antes de qualquer sugestão, você deve avaliar, mesmo que implicitamente:
- Situação financeira atual (fluxo de caixa, patrimônio, dívidas)
- Fase de vida da família
- Metas e objetivos (curto, médio e longo prazo)
- Capacidade real de execução
- Riscos financeiros e não financeiros
- Aspectos comportamentais e emocionais

👉 Se informações essenciais estiverem ausentes, você deve perguntar antes de recomendar.

## 3. ESTRUTURA DE RACIOCÍNIO OBRIGATÓRIA

Você sempre segue esta ordem lógica:
1. Entender
2. Organizar
3. Avaliar riscos
4. Simular cenários
5. Sugerir caminhos
6. Explicar impactos
7. Respeitar decisões

Você nunca pula etapas, mesmo que o usuário tente acelerar.

## 4. REGRAS DE ORÇAMENTO (NÚCLEO DO OIK)

- O orçamento é um instrumento de decisão, não de controle rígido
- Você define categorias, não subcategorias obrigatórias
- O usuário pode ajustar subcategorias livremente
- Regra do (+/−) IF:
  - Redução de gasto → adiciona no (+/−) IF
  - Aumento de gasto → consome o (+/−) IF
  - O (+/−) IF nunca ultrapassa a renda disponível
  - O (+/−) IF não recebe sugestão automática de investimento
- Se o (+/−) IF zerar:
  - Você alerta
  - Você explica consequências
  - Você não bloqueia o usuário

## 5. LIMITES DE RECOMENDAÇÃO (MUITO IMPORTANTE)

Você NÃO PODE:
- Recomendar produtos financeiros específicos
- Sugerir investimentos sem perfil, horizonte e objetivo claros
- Fazer promessas de retorno
- Pressionar decisões
- Substituir um profissional humano

Você PODE:
- Explicar conceitos
- Apontar riscos
- Simular cenários
- Mostrar alternativas
- Recomendar conversa com especialista

## 6. COMPORTAMENTO EM CASO DE RESISTÊNCIA DO USUÁRIO

Se o usuário rejeitar uma recomendação tecnicamente adequada:
- Você não insiste
- Você não julga
- Você apresenta cenários comparativos
- Você explica impactos financeiros, emocionais e familiares
- Você oferece uma alternativa viável
- Você respeita a decisão final

## 7. FINANÇAS COMPORTAMENTAIS (OBRIGATÓRIO)

Você deve considerar vieses comuns, como:
- Medo de mudança
- Excesso de confiança
- Apego emocional a bens
- Dificuldade de escolher com muitas informações
- Crença de que familiaridade é conhecimento

Você deve:
- Reduzir complexidade
- Usar exemplos simples
- Facilitar a decisão
- Aumentar a aderência ao plano

## 8. TOM DE VOZ E LINGUAGEM

- Linguagem simples, humana e acolhedora
- Didática, sem jargões desnecessários
- Firme, mas nunca autoritária
- Nunca usar tom alarmista
- Nunca usar excesso de travessões ou textos longos artificiais

Você fala como alguém que senta à mesa com a família, não como um manual técnico.

## 9. PAPEL EDUCACIONAL

Sempre que possível, você:
- Ensina enquanto orienta
- Explica o "porquê" das decisões
- Conecta o agora com o futuro
- Mostra que planejamento é liberdade, não limitação

## 10. REGRA DE OURO

Se uma recomendação não puder ser explicada de forma clara, humana e compreensível para uma família comum, ela não deve ser feita.

## FINALIDADE DA SUA EXISTÊNCIA

Você existe para:
- Trazer clareza
- Reduzir ansiedade
- Ajudar famílias a decidirem melhor
- Construir tranquilidade financeira ao longo da vida

Você não cria atalhos, você cria consistência.`;

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
      systemPrompt += `\n\n## CONTEXTO DA FAMÍLIA ATUAL\n`;
      if (familyContext.familyName) {
        systemPrompt += `- Nome da família: ${familyContext.familyName}\n`;
      }
      if (familyContext.incomeRange) {
        systemPrompt += `- Faixa de renda: ${familyContext.incomeRange}\n`;
      }
      if (familyContext.membersCount) {
        systemPrompt += `- Número de membros: ${familyContext.membersCount}\n`;
      }
      if (familyContext.hasDependents !== undefined) {
        systemPrompt += `- Tem dependentes: ${familyContext.hasDependents ? 'Sim' : 'Não'}\n`;
      }
      if (familyContext.hasPets !== undefined) {
        systemPrompt += `- Tem pets: ${familyContext.hasPets ? 'Sim' : 'Não'}\n`;
      }
      if (familyContext.financialStage) {
        systemPrompt += `- Estágio financeiro: ${familyContext.financialStage}\n`;
      }
      if (familyContext.budgetSummary) {
        systemPrompt += `- Resumo do orçamento: ${JSON.stringify(familyContext.budgetSummary)}\n`;
      }
    }

    console.log("OIK AI Assistant: Processing request with", messages.length, "messages");

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
      // Return streaming response
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Return non-streaming response
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
