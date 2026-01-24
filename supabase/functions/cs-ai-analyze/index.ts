import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSignal {
  type: 'risk' | 'activation';
  code: string;
  value: Record<string, unknown>;
}

interface AISuggestion {
  type: string;
  title: string;
  description: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: number;
  action?: Record<string, unknown>;
}

/**
 * CS AI Analysis Edge Function
 * Analyzes user behavior signals and generates explainable suggestions
 * 
 * IMPORTANT: AI only SUGGESTS, never executes actions automatically
 * All suggestions include clear reasoning (explainable AI)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { familyId, signals, metrics, forceAnalysis = false } = await req.json();

    if (!familyId) {
      return new Response(
        JSON.stringify({ error: "familyId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user consent for AI analysis (LGPD compliance)
    const { data: preferences } = await supabase
      .from('cs_user_preferences')
      .select('allow_ai_analysis, allow_smart_tips')
      .eq('family_id', familyId)
      .maybeSingle();

    // Default to true if no preferences set, but respect explicit opt-out
    const allowAnalysis = preferences?.allow_ai_analysis !== false;
    
    if (!allowAnalysis && !forceAnalysis) {
      return new Response(
        JSON.stringify({ 
          error: "User has opted out of AI analysis",
          code: "AI_CONSENT_REQUIRED" 
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or calculate signals
    let userSignals: UserSignal[] = signals;
    
    if (!userSignals) {
      // Calculate signals using database function
      const { data: calculatedSignals, error: signalsError } = await supabase
        .rpc('calculate_cs_signals', { _family_id: familyId });
      
      if (signalsError) {
        console.error('[cs-ai-analyze] Error calculating signals:', signalsError);
        userSignals = [];
      } else {
        userSignals = calculatedSignals || [];
      }
    }

    // Get user metrics if not provided
    let userMetrics = metrics;
    if (!userMetrics) {
      const { data: fetchedMetrics } = await supabase
        .from('cs_engagement_metrics')
        .select('*')
        .eq('family_id', familyId)
        .maybeSingle();
      
      userMetrics = fetchedMetrics;
    }

    // Generate suggestions using AI or rule-based fallback
    let suggestions: AISuggestion[] = [];

    if (lovableApiKey && userSignals.length > 0) {
      try {
        suggestions = await generateAISuggestions(userSignals, userMetrics, lovableApiKey);
      } catch (aiError) {
        console.error('[cs-ai-analyze] AI error, falling back to rules:', aiError);
        suggestions = generateRuleBasedSuggestions(userSignals, userMetrics);
      }
    } else {
      // Fallback to rule-based suggestions
      suggestions = generateRuleBasedSuggestions(userSignals, userMetrics);
    }

    // Store signals in database
    for (const signal of userSignals) {
      await supabase.from('cs_behavior_signals').upsert({
        family_id: familyId,
        signal_type: signal.type,
        signal_code: signal.code,
        signal_value: signal.value,
        detected_at: new Date().toISOString(),
        is_active: true,
      }, { 
        onConflict: 'family_id,signal_code,detected_at',
        ignoreDuplicates: true 
      });
    }

    // Store AI suggestions
    for (const suggestion of suggestions) {
      const signalIds = userSignals
        .filter(s => isSignalRelatedToSuggestion(s, suggestion))
        .map(() => null); // We'd need actual IDs here in production

      await supabase.from('cs_ai_suggestions').insert({
        family_id: familyId,
        suggestion_type: suggestion.type,
        title: suggestion.title,
        description: suggestion.description,
        reason: suggestion.reason,
        confidence_score: suggestion.confidence,
        priority: suggestion.priority,
        suggested_action: suggestion.action || {},
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      });
    }

    // Update AI analysis timestamp in metrics
    await supabase
      .from('cs_engagement_metrics')
      .update({ ai_analysis_at: new Date().toISOString() })
      .eq('family_id', familyId);

    return new Response(
      JSON.stringify({
        success: true,
        signals_detected: userSignals.length,
        suggestions_generated: suggestions.length,
        signals: userSignals,
        suggestions: suggestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[cs-ai-analyze] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Generate suggestions using Lovable AI Gateway
 * Uses explainable prompts to ensure transparency
 */
async function generateAISuggestions(
  signals: UserSignal[],
  metrics: Record<string, unknown> | null,
  apiKey: string
): Promise<AISuggestion[]> {
  const systemPrompt = `Você é um assistente de Customer Success para o OIK, um app de finanças familiares.

REGRAS CRÍTICAS:
1. Você APENAS sugere ações, NUNCA executa nada automaticamente
2. Toda sugestão DEVE ter um motivo claro e explicável
3. Use linguagem empática, nunca culpabilize o usuário
4. Foque em AJUDAR, não em métricas
5. Considere o contexto brasileiro

Para cada sugestão, você DEVE fornecer:
- type: tipo da ação ('education', 'onboarding', 'notification', 'task', 'follow_up')
- title: título curto e claro
- description: descrição da ação sugerida (máx 100 caracteres)
- reason: PORQUÊ essa ação é sugerida (explicável, máx 150 caracteres)
- priority: prioridade ('low', 'medium', 'high', 'urgent')
- confidence: confiança de 0.0 a 1.0

Responda APENAS com um array JSON de sugestões.`;

  const userPrompt = `Analise os sinais de comportamento e métricas abaixo e sugira ações de CS:

SINAIS DETECTADOS:
${JSON.stringify(signals, null, 2)}

MÉTRICAS DO USUÁRIO:
${metrics ? JSON.stringify(metrics, null, 2) : 'Não disponível'}

Gere sugestões acionáveis e empáticas.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty AI response");
  }

  // Parse JSON from response
  try {
    // Try to extract JSON array from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((s: Record<string, unknown>) => ({
        type: s.type || 'education',
        title: s.title || 'Sugestão',
        description: s.description || '',
        reason: s.reason || 'Baseado em análise de comportamento',
        priority: s.priority || 'medium',
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
        action: s.action,
      }));
    }
  } catch (parseError) {
    console.error('[cs-ai-analyze] JSON parse error:', parseError);
  }

  return [];
}

/**
 * Rule-based fallback suggestions when AI is unavailable
 */
function generateRuleBasedSuggestions(
  signals: UserSignal[],
  _metrics: Record<string, unknown> | null
): AISuggestion[] {
  const suggestions: AISuggestion[] = [];

  for (const signal of signals) {
    switch (signal.code) {
      case 'days_without_login':
        const days = (signal.value as Record<string, number>)?.days || 0;
        if (days > 14) {
          suggestions.push({
            type: 'follow_up',
            title: 'Contato de reativação',
            description: 'Entrar em contato para entender se precisa de ajuda',
            reason: `Usuário sem login há ${days} dias - pode precisar de suporte`,
            priority: days > 30 ? 'high' : 'medium',
            confidence: 0.8,
            action: { template: 'reactivation', days }
          });
        } else if (days > 7) {
          suggestions.push({
            type: 'notification',
            title: 'Dica de reengajamento',
            description: 'Enviar dica educativa personalizada',
            reason: `Usuário ausente há ${days} dias - lembrete gentil pode ajudar`,
            priority: 'low',
            confidence: 0.7,
          });
        }
        break;

      case 'no_import_after_signup':
        suggestions.push({
          type: 'education',
          title: 'Guia de importação',
          description: 'Oferecer ajuda com a primeira importação',
          reason: 'Usuário ainda não importou dados - pode não saber como fazer',
          priority: 'medium',
          confidence: 0.75,
          action: { tip_key: 'import_guide' }
        });
        break;

      case 'no_budget_with_transactions':
        const txCount = (signal.value as Record<string, number>)?.transaction_count || 0;
        suggestions.push({
          type: 'education',
          title: 'Sugestão de orçamento',
          description: 'Mostrar benefícios de criar orçamento',
          reason: `${txCount} transações sem orçamento - orçamento pode trazer clareza`,
          priority: 'medium',
          confidence: 0.7,
          action: { tip_key: 'budget_benefits' }
        });
        break;

      case 'no_goals_defined':
        suggestions.push({
          type: 'education',
          title: 'Incentivo para metas',
          description: 'Explicar como metas podem motivar',
          reason: 'Sem metas definidas - metas simples aumentam engajamento',
          priority: 'low',
          confidence: 0.6,
          action: { tip_key: 'goals_intro' }
        });
        break;
    }
  }

  return suggestions;
}

/**
 * Check if a signal is related to a suggestion
 */
function isSignalRelatedToSuggestion(signal: UserSignal, suggestion: AISuggestion): boolean {
  // Simple matching based on common patterns
  if (signal.code.includes('login') && suggestion.type === 'follow_up') return true;
  if (signal.code.includes('import') && suggestion.action?.tip_key === 'import_guide') return true;
  if (signal.code.includes('budget') && suggestion.action?.tip_key === 'budget_benefits') return true;
  if (signal.code.includes('goals') && suggestion.action?.tip_key === 'goals_intro') return true;
  return false;
}
