import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get family
    const { data: familyMember } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    if (!familyMember) {
      return new Response(JSON.stringify({ error: "Family not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const familyId = familyMember.family_id;
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Fetch data
    const [
      { data: bankAccounts },
      { data: creditCards },
      { data: transactions },
      { data: banks },
    ] = await Promise.all([
      supabase.from("bank_accounts").select("*").eq("family_id", familyId).eq("is_active", true),
      supabase.from("credit_cards").select("*").eq("family_id", familyId).eq("is_active", true),
      supabase.from("transactions").select("*").eq("family_id", familyId).gte("date", threeMonthsAgo.toISOString().split("T")[0]),
      supabase.from("banks").select("*"),
    ]);

    const banksMap = new Map((banks || []).map(b => [b.id, b.name]));

    // Prepare aggregated data for AI (no PII)
    const accountsData = (bankAccounts || []).map(acc => {
      const accTxns = (transactions || []).filter(t => t.bank_account_id === acc.id);
      const income = accTxns.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
      const expense = accTxns.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const balance = (acc.initial_balance || 0) + income - expense;
      
      return {
        id: acc.id,
        type: acc.account_type,
        nickname: acc.nickname,
        bankName: acc.bank_id ? banksMap.get(acc.bank_id) : acc.custom_bank_name,
        balance,
        incomeTotal: income,
        expenseTotal: expense,
        transactionCount: accTxns.length,
      };
    });

    const cardsData = (creditCards || []).map(card => {
      const cardTxns = (transactions || []).filter(t => t.credit_card_id === card.id);
      const total = cardTxns.reduce((s, t) => s + Number(t.amount), 0);
      const avgMonthly = total / 3;
      
      return {
        id: card.id,
        name: card.card_name,
        brand: card.brand,
        closingDay: card.closing_day,
        dueDay: card.due_day,
        limit: card.credit_limit,
        totalSpent3Months: total,
        avgMonthlySpend: avgMonthly,
        usagePercent: card.credit_limit ? (avgMonthly / card.credit_limit) * 100 : null,
      };
    });

    // Build AI prompt
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Return default insights without AI
      return new Response(JSON.stringify({
        accounts: accountsData.map(acc => ({
          ...acc,
          insight: acc.balance > 0 
            ? "Conta com saldo positivo. Continue monitorando as movimentações."
            : "Atenção: saldo negativo. Revise suas despesas.",
        })),
        cards: cardsData.map(card => ({
          ...card,
          insight: card.usagePercent && card.usagePercent > 80
            ? "Atenção: uso acima de 80% do limite. Considere reduzir gastos."
            : "Cartão com uso controlado. Bom trabalho!",
          bestUse: `Melhor usar antes do dia ${card.closingDay} para ganhar mais tempo até o vencimento.`,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Lovable AI for insights
    const aiPrompt = `Você é um consultor financeiro familiar. Analise os dados agregados e forneça dicas curtas e acionáveis em português brasileiro.

DADOS DAS CONTAS:
${accountsData.map(a => `- ${a.bankName} (${a.type}): Saldo R$ ${a.balance.toFixed(2)}, ${a.transactionCount} transações nos últimos 3 meses`).join("\n")}

DADOS DOS CARTÕES:
${cardsData.map(c => `- ${c.name} (${c.brand}): Limite R$ ${c.limit || "N/A"}, Média mensal R$ ${c.avgMonthlySpend.toFixed(2)}, Uso ${c.usagePercent?.toFixed(0) || "N/A"}%, Fecha dia ${c.closingDay}, Vence dia ${c.dueDay}`).join("\n")}

Retorne um JSON com o formato:
{
  "accountInsights": [{"id": "...", "insight": "dica curta"}],
  "cardInsights": [{"id": "...", "insight": "dica curta", "bestUse": "quando usar"}],
  "generalTip": "uma dica geral sobre organização financeira"
}`;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um consultor financeiro familiar especializado. Responda sempre em JSON válido." },
            { role: "user", content: aiPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error("AI response not ok");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON in response");
      }
      
      const insights = JSON.parse(jsonMatch[0]);
      
      // Merge insights with account/card data
      const accountsWithInsights = accountsData.map(acc => ({
        ...acc,
        insight: insights.accountInsights?.find((i: any) => i.id === acc.id)?.insight || "Continue monitorando suas finanças.",
      }));

      const cardsWithInsights = cardsData.map(card => ({
        ...card,
        insight: insights.cardInsights?.find((i: any) => i.id === card.id)?.insight || "Mantenha o controle dos gastos.",
        bestUse: insights.cardInsights?.find((i: any) => i.id === card.id)?.bestUse || `Use antes do dia ${card.closingDay}.`,
      }));

      return new Response(JSON.stringify({
        accounts: accountsWithInsights,
        cards: cardsWithInsights,
        generalTip: insights.generalTip || "Organize suas finanças regularmente para melhores resultados.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (aiError) {
      console.error("AI error:", aiError);
      // Fallback to default insights
      return new Response(JSON.stringify({
        accounts: accountsData.map(acc => ({
          ...acc,
          insight: acc.balance > 0 
            ? "Conta com saldo positivo. Continue monitorando."
            : "Atenção ao saldo. Revise suas despesas.",
        })),
        cards: cardsData.map(card => ({
          ...card,
          insight: card.usagePercent && card.usagePercent > 80
            ? "Uso alto do limite. Considere reduzir gastos."
            : "Uso controlado. Bom trabalho!",
          bestUse: `Use antes do dia ${card.closingDay} para mais prazo.`,
        })),
        generalTip: "Mantenha suas finanças organizadas para alcançar seus objetivos.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
