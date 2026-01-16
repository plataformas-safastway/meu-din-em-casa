import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MonthlyData {
  income: number;
  expenses: number;
  balance: number;
  categories: { categoryId: string; name: string; amount: number; percentage: number }[];
  topCategories: { name: string; amount: number }[];
  previousMonth: { income: number; expenses: number };
}

interface AIReport {
  diagnosis: string;
  recommendations: string[];
  impact: string;
  positives: string[];
}

async function generateAIAnalysis(data: MonthlyData, familyName: string): Promise<AIReport> {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  
  if (!lovableApiKey) {
    console.log("LOVABLE_API_KEY not configured, using fallback analysis");
    return generateFallbackAnalysis(data);
  }

  const prompt = `Você é um consultor financeiro acolhedor. Analise os dados financeiros de uma família e gere um relatório personalizado.

DADOS DO MÊS:
- Receitas: R$ ${data.income.toLocaleString("pt-BR")}
- Despesas: R$ ${data.expenses.toLocaleString("pt-BR")}
- Saldo: R$ ${data.balance.toLocaleString("pt-BR")}
- Mês anterior: Receitas R$ ${data.previousMonth.income.toLocaleString("pt-BR")}, Despesas R$ ${data.previousMonth.expenses.toLocaleString("pt-BR")}

TOP 3 CATEGORIAS DE GASTO:
${data.topCategories.map((c, i) => `${i + 1}. ${c.name}: R$ ${c.amount.toLocaleString("pt-BR")}`).join("\n")}

INSTRUÇÕES:
1. Fale sempre no plural ("vocês", "a família")
2. Tom acolhedor, sem julgamentos
3. Seja prático e objetivo
4. Destaque padrões e tendências
5. Se houver problemas, sugira soluções sem culpar

Responda em JSON com este formato exato:
{
  "diagnosis": "Análise dos padrões identificados (2-3 frases)",
  "recommendations": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
  "impact": "Se o padrão continuar, o que pode acontecer (1-2 frases, sem alarmismo)",
  "positives": ["Ponto positivo 1", "Ponto positivo 2"]
}`;

  try {
    const response = await fetch("https://api.lovable.dev/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é um consultor financeiro brasileiro especializado em finanças familiares. Responda apenas em JSON válido." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("AI API error:", await response.text());
      return generateFallbackAnalysis(data);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    
    if (!content) {
      return generateFallbackAnalysis(data);
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return generateFallbackAnalysis(data);
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("AI analysis error:", error);
    return generateFallbackAnalysis(data);
  }
}

function generateFallbackAnalysis(data: MonthlyData): AIReport {
  const balance = data.balance;
  const isPositive = balance >= 0;
  const changeFromPrevious = data.expenses - data.previousMonth.expenses;
  const changePercent = data.previousMonth.expenses > 0 
    ? ((changeFromPrevious / data.previousMonth.expenses) * 100).toFixed(1)
    : "0";

  return {
    diagnosis: isPositive 
      ? `Este mês a família conseguiu fechar com saldo positivo de R$ ${balance.toLocaleString("pt-BR")}. Os gastos ${changeFromPrevious > 0 ? "aumentaram" : "diminuíram"} ${Math.abs(Number(changePercent))}% em relação ao mês anterior.`
      : `Este mês as despesas superaram as receitas em R$ ${Math.abs(balance).toLocaleString("pt-BR")}. É importante revisar os gastos para os próximos meses.`,
    recommendations: [
      data.topCategories[0] ? `Revisar os gastos com ${data.topCategories[0].name}, que representou a maior parcela das despesas` : "Categorizar todas as despesas para melhor visibilidade",
      "Estabelecer metas por categoria para o próximo mês",
      "Revisar despesas recorrentes e identificar oportunidades de redução",
    ],
    impact: isPositive 
      ? "Mantendo este padrão, a família seguirá construindo uma reserva financeira saudável."
      : "Se o padrão atual continuar, pode haver dificuldade para cobrir despesas nos próximos meses.",
    positives: isPositive 
      ? ["Saldo positivo no mês", "Controle financeiro em dia"]
      : ["Visibilidade sobre os gastos", "Oportunidade de ajustar o orçamento"],
  };
}

async function sendReportEmail(
  email: string,
  familyName: string,
  month: number,
  year: number,
  data: MonthlyData,
  aiReport: AIReport
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const monthName = monthNames[month - 1];
  const appUrl = Deno.env.get("APP_URL") || "https://meu-din-em-casa.lovable.app";

  const emailHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <tr>
                <td style="padding: 40px;">
                  <!-- Header -->
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                      📊 Relatório de ${monthName}/${year}
                    </h1>
                    <p style="color: #6b7280; font-size: 16px; margin: 0;">
                      ${familyName}
                    </p>
                  </div>
                  
                  <!-- Summary -->
                  <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px 0;">Resumo do Mês</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px;">💰 Receitas</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #10b981;">R$ ${data.income.toLocaleString("pt-BR")}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #ef4444; font-size: 14px;">💸 Despesas</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #ef4444;">R$ ${data.expenses.toLocaleString("pt-BR")}</td>
                      </tr>
                      <tr style="border-top: 1px solid #e5e7eb;">
                        <td style="padding: 12px 0 0 0; color: #111827; font-size: 14px; font-weight: 600;">📈 Resultado</td>
                        <td style="padding: 12px 0 0 0; text-align: right; font-weight: 700; color: ${data.balance >= 0 ? '#10b981' : '#ef4444'};">
                          R$ ${data.balance.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Top Categories -->
                  <div style="margin-bottom: 24px;">
                    <h2 style="color: #111827; font-size: 18px; margin: 0 0 16px 0;">🏆 Top 3 Categorias</h2>
                    ${data.topCategories.slice(0, 3).map((cat, i) => `
                      <div style="display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
                        <span style="width: 24px; height: 24px; background-color: ${i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#cd7f32'}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 600; margin-right: 12px;">${i + 1}</span>
                        <span style="flex: 1; color: #374151; font-size: 14px;">${cat.name}</span>
                        <span style="color: #111827; font-weight: 600; font-size: 14px;">R$ ${cat.amount.toLocaleString("pt-BR")}</span>
                      </div>
                    `).join("")}
                  </div>

                  <!-- AI Analysis -->
                  <div style="background-color: #eef2ff; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #4f46e5; font-size: 18px; margin: 0 0 16px 0;">🤖 Análise</h2>
                    <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                      ${aiReport.diagnosis}
                    </p>
                    
                    <h3 style="color: #4f46e5; font-size: 14px; margin: 0 0 8px 0;">💡 Recomendações</h3>
                    <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                      ${aiReport.recommendations.map(r => `<li>${r}</li>`).join("")}
                    </ul>

                    ${aiReport.positives.length > 0 ? `
                      <h3 style="color: #10b981; font-size: 14px; margin: 0 0 8px 0;">✨ Destaques Positivos</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                        ${aiReport.positives.map(p => `<li>${p}</li>`).join("")}
                      </ul>
                    ` : ""}
                  </div>

                  <!-- CTA -->
                  <div style="text-align: center; margin-bottom: 24px;">
                    <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 14px; font-weight: 600;">
                      Abrir o app para ver detalhes
                    </a>
                  </div>

                  <!-- Footer -->
                  <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      Este relatório foi gerado automaticamente. Para ajustar as configurações de envio, acesse o app.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Meu Din em Casa <onboarding@resend.dev>",
        to: [email],
        subject: `Relatório mensal da família — ${monthName}/${year}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      console.error("Resend API error:", await res.text());
      return false;
    }

    console.log("Report email sent successfully to:", email);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body (optional - for manual trigger)
    let familyId: string | null = null;
    let targetMonth: number | null = null;
    let targetYear: number | null = null;
    
    try {
      const body = await req.json();
      familyId = body.familyId || null;
      targetMonth = body.month || null;
      targetYear = body.year || null;
    } catch {
      // No body - will process all families with email enabled
    }

    // Determine which month to report on (previous month by default)
    const now = new Date();
    const reportMonth = targetMonth || (now.getMonth() === 0 ? 12 : now.getMonth());
    const reportYear = targetYear || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    // Get families to process
    let familiesQuery = supabase
      .from("families")
      .select("id, name, email_report_enabled, email_report_recipient");
    
    if (familyId) {
      familiesQuery = familiesQuery.eq("id", familyId);
    } else {
      familiesQuery = familiesQuery.eq("email_report_enabled", true);
    }

    const { data: families, error: familiesError } = await familiesQuery;
    
    if (familiesError) {
      throw new Error(`Error fetching families: ${familiesError.message}`);
    }

    if (!families || families.length === 0) {
      return new Response(
        JSON.stringify({ message: "No families to process" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const results = [];

    for (const family of families) {
      try {
        // Get transactions for the month
        const startDate = `${reportYear}-${String(reportMonth).padStart(2, "0")}-01`;
        const endDate = new Date(reportYear, reportMonth, 0).toISOString().split("T")[0];

        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .eq("family_id", family.id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (txError) {
          console.error(`Error fetching transactions for family ${family.id}:`, txError);
          continue;
        }

        // Calculate totals
        const income = transactions
          ?.filter(t => t.type === "income")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        
        const expenses = transactions
          ?.filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

        // Category breakdown
        const categoryTotals: Record<string, number> = {};
        transactions?.filter(t => t.type === "expense").forEach(t => {
          categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + Math.abs(t.amount);
        });

        // Get previous month data
        const prevMonth = reportMonth === 1 ? 12 : reportMonth - 1;
        const prevYear = reportMonth === 1 ? reportYear - 1 : reportYear;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
        const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split("T")[0];

        const { data: prevTransactions } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("family_id", family.id)
          .gte("date", prevStartDate)
          .lte("date", prevEndDate);

        const prevIncome = prevTransactions
          ?.filter(t => t.type === "income")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        
        const prevExpenses = prevTransactions
          ?.filter(t => t.type === "expense")
          .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

        // Category names mapping
        const categoryNames: Record<string, string> = {
          "casa": "Casa",
          "alimentacao": "Alimentação",
          "lazer": "Lazer",
          "filhos": "Filhos",
          "pet": "Pet",
          "transporte": "Transporte",
          "vida-saude": "Vida & Saúde",
          "roupa-estetica": "Roupas & Estética",
          "educacao": "Educação & Formação",
          "despesas-financeiras": "Despesas Financeiras",
          "diversos": "Diversos",
          "manutencao-bens": "Manutenção de Bens",
          "desconhecidas": "Desconhecidas",
          "despesas-eventuais": "Despesas Eventuais",
        };

        const categories = Object.entries(categoryTotals)
          .map(([id, amount]) => ({
            categoryId: id,
            name: categoryNames[id] || id,
            amount,
            percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

        const topCategories = categories.slice(0, 3).map(c => ({
          name: c.name,
          amount: c.amount,
        }));

        const data: MonthlyData = {
          income,
          expenses,
          balance: income - expenses,
          categories,
          topCategories,
          previousMonth: {
            income: prevIncome,
            expenses: prevExpenses,
          },
        };

        // Generate AI analysis
        const aiReport = await generateAIAnalysis(data, family.name);

        // Save report to database
        const reportContent = {
          ...data,
          aiReport,
          generatedAt: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from("monthly_ai_reports")
          .upsert({
            family_id: family.id,
            month: reportMonth,
            year: reportYear,
            report_content: reportContent,
            email_recipient: family.email_report_recipient,
          }, {
            onConflict: "family_id,month,year",
          });

        if (insertError) {
          console.error(`Error saving report for family ${family.id}:`, insertError);
        }

        // Send email if recipient is configured
        let emailSent = false;
        if (family.email_report_recipient) {
          emailSent = await sendReportEmail(
            family.email_report_recipient,
            family.name,
            reportMonth,
            reportYear,
            data,
            aiReport
          );

          if (emailSent) {
            await supabase
              .from("monthly_ai_reports")
              .update({ email_sent_at: new Date().toISOString() })
              .eq("family_id", family.id)
              .eq("month", reportMonth)
              .eq("year", reportYear);
          }
        }

        results.push({
          familyId: family.id,
          familyName: family.name,
          success: true,
          emailSent,
        });
      } catch (error) {
        console.error(`Error processing family ${family.id}:`, error);
        results.push({
          familyId: family.id,
          familyName: family.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} families`,
        month: reportMonth,
        year: reportYear,
        results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in generate-monthly-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
