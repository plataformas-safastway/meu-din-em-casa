import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectionDriver {
  type: "INSTALLMENT" | "RECURRING" | "AVERAGE";
  label: string;
  amount: number;
  category?: string;
  subcategory?: string;
}

interface MonthProjection {
  month: string;
  monthLabel: string;
  // Income
  incomeProjected: number;
  recurringIncome: number;
  // Expenses total
  expenseProjected: number;
  recurringExpense: number;
  // Fixed Commitment breakdown (NEW)
  fixedRecurringTotal: number;
  creditCardInstallments: number;
  fixedCommitmentTotal: number;
  fixedCommitmentPercentage: number;
  // Projected surplus (what's left for variable spending)
  projectedSurplus: number;
  variableExpenseEstimate: number;
  // Balance
  balanceProjected: number;
  // Drivers/details
  drivers: ProjectionDriver[];
  fixedExpenses: ProjectionDriver[];
  installmentDetails: ProjectionDriver[];
}

interface AITips {
  tips: string[];
  alert: string | null;
  recommendation: string;
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
    
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get family and its accounting regime
    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (memberError || !member) {
      console.error("Member lookup error:", memberError);
      return new Response(JSON.stringify({ error: "No family found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const familyId = member.family_id;

    // Get family settings including accounting regime
    const { data: familyData } = await supabase
      .from("families")
      .select("income_anchor_value, income_type, accounting_regime")
      .eq("id", familyId)
      .single();

    const accountingRegime = familyData?.accounting_regime || "cash_basis";
    const { months = 12, includeAiTips = true } = await req.json().catch(() => ({}));

    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
    
    // Get historical transactions for income average calculation
    const { data: historicalTransactions } = await supabase
      .from("transactions")
      .select("type, amount, category_id, date")
      .eq("family_id", familyId)
      .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

    // Calculate income averages (for variable income families)
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

    const incomeMonths = Object.keys(incomeByMonth).length || 1;
    const avgIncome = Object.values(incomeByMonth).reduce((a, b) => a + b, 0) / incomeMonths;
    
    const expenseMonths = Object.keys(expenseByMonth).length || 1;
    const avgExpense = Object.values(expenseByMonth).reduce((a, b) => a + b, 0) / expenseMonths;

    // Get recurring transactions (both income and expense)
    const { data: recurring } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    // Get legacy installments
    const { data: legacyInstallments } = await supabase
      .from("installments")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    // Get planned installments (PLANNED status only)
    const { data: plannedInstallments } = await supabase
      .from("planned_installments")
      .select(`
        *,
        installment_group:installment_groups(
          description,
          category_id,
          subcategory_id,
          credit_card_id,
          installments_total,
          source
        )
      `)
      .eq("family_id", familyId)
      .eq("status", "PLANNED")
      .gte("due_date", today.toISOString().split("T")[0]);

    // Generate projections for each month
    const projections: MonthProjection[] = [];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 0; i < months; i++) {
      const projDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = projDate.toISOString().split("T")[0].substring(0, 7);
      const monthLabel = `${monthNames[projDate.getMonth()]}/${projDate.getFullYear().toString().slice(-2)}`;
      
      const drivers: ProjectionDriver[] = [];
      const fixedExpenses: ProjectionDriver[] = [];
      const installmentDetails: ProjectionDriver[] = [];
      
      // === LAYER A: FIXED RECURRING EXPENSES ===
      let recurringIncome = 0;
      let recurringExpense = 0;
      let fixedRecurringTotal = 0;
      
      (recurring || []).forEach((r: any) => {
        const startDate = new Date(r.start_date);
        const endDate = r.end_date ? new Date(r.end_date) : null;
        
        // Check if this recurring item is active in this projection month
        if (startDate <= projDate && (!endDate || endDate >= projDate)) {
          const amount = Number(r.amount);
          
          if (r.type === "income") {
            recurringIncome += amount;
            if (amount >= avgIncome * 0.05) {
              drivers.push({
                type: "RECURRING",
                label: r.description,
                amount,
                category: r.category_id,
              });
            }
          } else {
            recurringExpense += amount;
            fixedRecurringTotal += amount;
            
            // Add to fixed expenses breakdown
            fixedExpenses.push({
              type: "RECURRING",
              label: r.description,
              amount,
              category: r.category_id,
              subcategory: r.subcategory_id,
            });
            
            if (amount >= avgExpense * 0.03) {
              drivers.push({
                type: "RECURRING",
                label: r.description,
                amount,
                category: r.category_id,
              });
            }
          }
        }
      });

      // === LAYER B: CREDIT CARD INSTALLMENTS ===
      let creditCardInstallments = 0;
      
      // Process legacy installments table
      (legacyInstallments || []).forEach((inst: any) => {
        const startDate = new Date(inst.start_date);
        const monthsDiff = (projDate.getFullYear() - startDate.getFullYear()) * 12 + 
                           (projDate.getMonth() - startDate.getMonth());
        const installmentNum = inst.current_installment + monthsDiff;
        
        if (installmentNum >= inst.current_installment && installmentNum <= inst.total_installments) {
          const amount = Number(inst.installment_amount);
          creditCardInstallments += amount;
          
          const label = `${inst.description} (${installmentNum}/${inst.total_installments})`;
          installmentDetails.push({
            type: "INSTALLMENT",
            label,
            amount,
            category: inst.category_id,
          });
          
          drivers.push({
            type: "INSTALLMENT",
            label,
            amount,
            category: inst.category_id,
          });
        }
      });

      // Process new planned_installments table
      (plannedInstallments || []).forEach((planned: any) => {
        const dueDate = new Date(planned.due_date);
        // Check if this installment falls in the current projection month
        if (dueDate.getFullYear() === projDate.getFullYear() && 
            dueDate.getMonth() === projDate.getMonth()) {
          const group = planned.installment_group;
          const amount = Number(planned.amount);
          creditCardInstallments += amount;
          
          const label = `${group?.description || 'Parcela'} (${planned.installment_index}/${group?.installments_total || '?'})`;
          installmentDetails.push({
            type: "INSTALLMENT",
            label,
            amount,
            category: group?.category_id,
            subcategory: group?.subcategory_id,
          });
          
          drivers.push({
            type: "INSTALLMENT",
            label,
            amount,
            category: group?.category_id,
          });
        }
      });

      // === LAYER C: INCOME PROJECTION ===
      // Use configured income if available, otherwise use average
      let incomeProjected = 0;
      if (familyData?.income_anchor_value && familyData.income_type === 'fixed') {
        incomeProjected = Number(familyData.income_anchor_value);
      } else if (recurringIncome > 0) {
        incomeProjected = recurringIncome;
      } else {
        incomeProjected = avgIncome;
      }

      // === FIXED COMMITMENT CALCULATION ===
      const fixedCommitmentTotal = fixedRecurringTotal + creditCardInstallments;
      const fixedCommitmentPercentage = incomeProjected > 0 
        ? (fixedCommitmentTotal / incomeProjected) * 100 
        : 0;
      
      // === PROJECTED SURPLUS ===
      // This is what's available for variable spending
      const projectedSurplus = incomeProjected - fixedCommitmentTotal;
      
      // === VARIABLE EXPENSE ESTIMATE ===
      // Estimate variable expenses based on historical average minus fixed
      const variableExpenseEstimate = Math.max(0, avgExpense - fixedRecurringTotal);
      
      // === TOTAL EXPENSE AND BALANCE ===
      const expenseProjected = fixedCommitmentTotal + variableExpenseEstimate;
      const balanceProjected = incomeProjected - expenseProjected;

      projections.push({
        month: monthKey,
        monthLabel,
        // Income
        incomeProjected: Math.round(incomeProjected * 100) / 100,
        recurringIncome: Math.round(recurringIncome * 100) / 100,
        // Expenses
        expenseProjected: Math.round(expenseProjected * 100) / 100,
        recurringExpense: Math.round(recurringExpense * 100) / 100,
        // Fixed Commitment (NEW - core feature)
        fixedRecurringTotal: Math.round(fixedRecurringTotal * 100) / 100,
        creditCardInstallments: Math.round(creditCardInstallments * 100) / 100,
        fixedCommitmentTotal: Math.round(fixedCommitmentTotal * 100) / 100,
        fixedCommitmentPercentage: Math.round(fixedCommitmentPercentage * 10) / 10,
        // Surplus
        projectedSurplus: Math.round(projectedSurplus * 100) / 100,
        variableExpenseEstimate: Math.round(variableExpenseEstimate * 100) / 100,
        // Balance
        balanceProjected: Math.round(balanceProjected * 100) / 100,
        // Details
        drivers: drivers.slice(0, 8),
        fixedExpenses: fixedExpenses.slice(0, 10),
        installmentDetails: installmentDetails.slice(0, 10),
      });
    }

    // Generate AI tips if requested
    let aiTips: AITips | null = null;
    if (includeAiTips) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (LOVABLE_API_KEY) {
        try {
          // Current month's fixed commitment for analysis
          const currentMonth = projections[0];
          const avgFixedCommitment = projections.slice(0, 6).reduce((sum, p) => sum + p.fixedCommitmentPercentage, 0) / Math.min(6, projections.length);
          
          const aggregatedData = {
            avgMonthlyIncome: Math.round(avgIncome),
            avgMonthlyExpense: Math.round(avgExpense),
            currentFixedCommitment: currentMonth?.fixedCommitmentTotal || 0,
            currentFixedCommitmentPercentage: currentMonth?.fixedCommitmentPercentage || 0,
            avgFixedCommitmentPercentage: Math.round(avgFixedCommitment),
            totalActiveInstallments: (legacyInstallments || []).length + (plannedInstallments || []).length,
            totalRecurringExpenses: (recurring || []).filter((r: any) => r.type === 'expense').length,
            monthsWithNegativeSurplus: projections.filter(p => p.projectedSurplus < 0).length,
            projectedSurplusNext3Months: projections.slice(0, 3).map(p => ({
              month: p.monthLabel,
              surplus: p.projectedSurplus,
              commitmentPct: p.fixedCommitmentPercentage,
            })),
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
                  content: `Você é um consultor financeiro familiar brasileiro. Analise os dados de comprometimento fixo e projeções.
                  
FOCO: O conceito central é "Comprometimento Fixo" - quanto da renda já está comprometida antes de qualquer decisão de gasto.

Regras:
- Comprometimento > 60%: Alerta leve - "Atenção ao limite de gastos variáveis"
- Comprometimento > 80%: Alerta crítico - "Risco de aperto financeiro"
- Sobra negativa: Alertar sobre meses críticos

Seja breve, educativo e acolhedor. Use linguagem simples.
Retorne EXATAMENTE um JSON com: { "tips": ["dica1", "dica2", "dica3"], "alert": "alerta se houver risco ou null", "recommendation": "recomendação prática" }`,
                },
                {
                  role: "user",
                  content: `Analise o comprometimento fixo desta família:
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
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  aiTips = JSON.parse(jsonMatch[0]);
                }
              } catch {
                // Fallback tips
              }
            }
          }
        } catch (aiError) {
          console.error("AI tips error:", aiError);
        }
      }
      
      // Default tips if AI fails
      if (!aiTips) {
        const currentCommitment = projections[0]?.fixedCommitmentPercentage || 0;
        let alert = null;
        
        if (currentCommitment > 80) {
          alert = "Seu comprometimento fixo está acima de 80% da renda. Revise parcelas e despesas fixas.";
        } else if (currentCommitment > 60) {
          alert = "Atenção: comprometimento fixo acima de 60%. Há pouca margem para imprevistos.";
        }
        
        aiTips = {
          tips: [
            "O comprometimento fixo mostra quanto da renda já está destinado antes de qualquer gasto",
            "Parcelas de cartão são compromissos inevitáveis até a quitação",
            "A sobra projetada é seu limite real para gastos variáveis",
          ],
          alert,
          recommendation: currentCommitment > 60 
            ? "Considere quitar parcelas ou renegociar despesas fixas para aumentar sua margem"
            : "Mantenha o comprometimento fixo abaixo de 60% para ter folga no orçamento",
        };
      }
    }

    // Current month summary for Home widget
    const currentMonthSummary = projections[0] ? {
      month: projections[0].monthLabel,
      fixedCommitmentTotal: projections[0].fixedCommitmentTotal,
      fixedCommitmentPercentage: projections[0].fixedCommitmentPercentage,
      projectedSurplus: projections[0].projectedSurplus,
      incomeProjected: projections[0].incomeProjected,
      fixedRecurringTotal: projections[0].fixedRecurringTotal,
      creditCardInstallments: projections[0].creditCardInstallments,
      alertLevel: projections[0].fixedCommitmentPercentage > 80 ? 'critical' 
                : projections[0].fixedCommitmentPercentage > 60 ? 'warning' 
                : 'healthy',
    } : null;

    return new Response(
      JSON.stringify({
        projections,
        currentMonthSummary,
        aiTips,
        metadata: {
          generatedAt: new Date().toISOString(),
          monthsProjected: months,
          historicalMonths: incomeMonths,
          accountingRegime,
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
