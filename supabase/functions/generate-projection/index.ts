import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonthProjection {
  month: string;
  monthLabel: string;
  incomeProjected: number;
  expenseProjected: number;
  creditCardInstallments: number;
  recurringIncome: number;
  recurringExpense: number;
  balanceProjected: number;
  drivers: Array<{
    type: "INSTALLMENT" | "RECURRING" | "AVERAGE";
    label: string;
    amount: number;
    category?: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create client with user token for auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    // Validate token with getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    
    // Use service role for data queries
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get family
    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "No family found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const familyId = member.family_id;
    const { months = 6, includeAiTips = true } = await req.json().catch(() => ({}));

    // Get historical data (last 3 months)
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    
    const { data: historicalTransactions } = await supabase
      .from("transactions")
      .select("type, amount, category_id, date")
      .eq("family_id", familyId)
      .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

    // Calculate averages
    const incomeByMonth: Record<string, number> = {};
    const expenseByMonth: Record<string, number> = {};
    const expenseByCategory: Record<string, number[]> = {};

    (historicalTransactions || []).forEach((t: any) => {
      const monthKey = t.date.substring(0, 7);
      if (t.type === "income") {
        incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + Number(t.amount);
      } else {
        expenseByMonth[monthKey] = (expenseByMonth[monthKey] || 0) + Number(t.amount);
        if (!expenseByCategory[t.category_id]) expenseByCategory[t.category_id] = [];
        expenseByCategory[t.category_id].push(Number(t.amount));
      }
    });

    const monthCount = Object.keys(incomeByMonth).length || 1;
    const avgIncome = Object.values(incomeByMonth).reduce((a, b) => a + b, 0) / monthCount;
    const avgExpense = Object.values(expenseByMonth).reduce((a, b) => a + b, 0) / monthCount;

    // Get recurring transactions
    const { data: recurring } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    // Get installments
    const { data: installments } = await supabase
      .from("installments")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    // Generate projections for each month
    const projections: MonthProjection[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 0; i < months; i++) {
      const projDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = projDate.toISOString().split("T")[0].substring(0, 7);
      const monthLabel = `${monthNames[projDate.getMonth()]}/${projDate.getFullYear().toString().slice(-2)}`;
      
      const drivers: MonthProjection["drivers"] = [];
      
      // Calculate recurring income
      let recurringIncome = 0;
      let recurringExpense = 0;
      
      (recurring || []).forEach((r: any) => {
        const startDate = new Date(r.start_date);
        const endDate = r.end_date ? new Date(r.end_date) : null;
        
        if (startDate <= projDate && (!endDate || endDate >= projDate)) {
          if (r.type === "income") {
            recurringIncome += Number(r.amount);
            if (Number(r.amount) >= avgIncome * 0.1) {
              drivers.push({
                type: "RECURRING",
                label: r.description,
                amount: Number(r.amount),
                category: r.category_id,
              });
            }
          } else {
            recurringExpense += Number(r.amount);
            if (Number(r.amount) >= avgExpense * 0.05) {
              drivers.push({
                type: "RECURRING",
                label: r.description,
                amount: Number(r.amount),
                category: r.category_id,
              });
            }
          }
        }
      });

      // Calculate installments for this month
      let creditCardInstallments = 0;
      
      (installments || []).forEach((inst: any) => {
        const startDate = new Date(inst.start_date);
        const monthsDiff = (projDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (projDate.getMonth() - startDate.getMonth());
        const installmentNum = inst.current_installment + monthsDiff;
        
        if (installmentNum >= inst.current_installment && installmentNum <= inst.total_installments) {
          creditCardInstallments += Number(inst.installment_amount);
          drivers.push({
            type: "INSTALLMENT",
            label: `${inst.description} (${installmentNum}/${inst.total_installments})`,
            amount: Number(inst.installment_amount),
            category: inst.category_id,
          });
        }
      });

      // Calculate projected values
      const incomeProjected = recurringIncome > 0 ? recurringIncome : avgIncome;
      const expenseProjected = recurringExpense + creditCardInstallments + (avgExpense * 0.5); // 50% variable
      const balanceProjected = incomeProjected - expenseProjected;

      projections.push({
        month: monthKey,
        monthLabel,
        incomeProjected: Math.round(incomeProjected * 100) / 100,
        expenseProjected: Math.round(expenseProjected * 100) / 100,
        creditCardInstallments: Math.round(creditCardInstallments * 100) / 100,
        recurringIncome: Math.round(recurringIncome * 100) / 100,
        recurringExpense: Math.round(recurringExpense * 100) / 100,
        balanceProjected: Math.round(balanceProjected * 100) / 100,
        drivers: drivers.slice(0, 5), // Top 5 drivers
      });
    }

    // Generate AI tips if requested
    let aiTips = null;
    if (includeAiTips) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (LOVABLE_API_KEY) {
        try {
          // Prepare aggregated data for AI (no sensitive info)
          const aggregatedData = {
            avgMonthlyIncome: Math.round(avgIncome),
            avgMonthlyExpense: Math.round(avgExpense),
            savingsRate: avgIncome > 0 ? Math.round(((avgIncome - avgExpense) / avgIncome) * 100) : 0,
            totalInstallments: (installments || []).length,
            totalRecurring: (recurring || []).length,
            projectedBalances: projections.map(p => ({
              month: p.monthLabel,
              balance: p.balanceProjected,
              hasNegative: p.balanceProjected < 0,
            })),
            topCategories: Object.entries(expenseByCategory)
              .map(([cat, amounts]) => ({
                category: cat,
                avgAmount: Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length),
              }))
              .sort((a, b) => b.avgAmount - a.avgAmount)
              .slice(0, 5),
          };

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Você é um consultor financeiro familiar brasileiro. Analise os dados agregados e forneça dicas práticas e acolhedoras em português. 
                  Seja breve e direto. Use linguagem simples e encorajadora.
                  Retorne EXATAMENTE um JSON com: { "tips": ["dica1", "dica2", "dica3"], "alert": "alerta se houver risco", "recommendation": "recomendação prática" }`,
                },
                {
                  role: "user",
                  content: `Analise estes dados financeiros agregados e dê 3 dicas práticas:
                  ${JSON.stringify(aggregatedData, null, 2)}`,
                },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;
            if (content) {
              try {
                // Extract JSON from response
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  aiTips = JSON.parse(jsonMatch[0]);
                }
              } catch {
                aiTips = {
                  tips: [
                    "Revise seus gastos fixos mensalmente",
                    "Tente manter uma reserva de emergência",
                    "Acompanhe suas parcelas de cartão",
                  ],
                  alert: null,
                  recommendation: "Continue acompanhando suas finanças regularmente",
                };
              }
            }
          }
        } catch (aiError) {
          console.error("AI tips error:", aiError);
          aiTips = {
            tips: [
              "Revise seus gastos fixos mensalmente",
              "Tente manter uma reserva de emergência",
              "Acompanhe suas parcelas de cartão",
            ],
            alert: null,
            recommendation: "Continue acompanhando suas finanças regularmente",
          };
        }
      } else {
        aiTips = {
          tips: [
            "Revise seus gastos fixos mensalmente",
            "Tente manter uma reserva de emergência",
            "Acompanhe suas parcelas de cartão",
          ],
          alert: null,
          recommendation: "Continue acompanhando suas finanças regularmente",
        };
      }
    }

    return new Response(
      JSON.stringify({
        projections,
        aiTips,
        metadata: {
          generatedAt: new Date().toISOString(),
          monthsProjected: months,
          historicalMonths: monthCount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Projection error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
