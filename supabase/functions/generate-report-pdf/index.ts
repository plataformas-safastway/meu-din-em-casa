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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { familyId, monthRef } = await req.json();

    if (!familyId || !monthRef) {
      return new Response(JSON.stringify({ error: "Missing familyId or monthRef" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating PDF report for family ${familyId}, month ${monthRef}`);

    // Verify user belongs to family
    const { data: membership } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", familyId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse month reference
    const [year, month] = monthRef.split("-").map(Number);
    const startDate = `${monthRef}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    // Fetch family info (without sensitive data)
    const { data: family } = await supabase
      .from("families")
      .select("name")
      .eq("id", familyId)
      .single();

    // Fetch transactions for the month
    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("family_id", familyId)
      .gte("date", startDate)
      .lte("date", endDate);

    // Calculate summary
    const income = (transactions || [])
      .filter((t: any) => t.type === "income")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const expenses = (transactions || [])
      .filter((t: any) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

    const balance = income - expenses;

    // Calculate category breakdown
    const categoryTotals: Record<string, number> = {};
    (transactions || [])
      .filter((t: any) => t.type === "expense")
      .forEach((t: any) => {
        const catId = t.category_id || "Não categorizado";
        categoryTotals[catId] = (categoryTotals[catId] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(categoryTotals)
      .map(([categoryId, amount]) => ({
        categoryId,
        amount,
        percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Check for issues
    const issues: string[] = [];
    const uncategorized = (transactions || []).filter(
      (t: any) => !t.category_id || t.category_id === "desc"
    );
    if (uncategorized.length > 0) {
      issues.push(`${uncategorized.length} transações sem categoria`);
    }

    // Fetch existing report status
    const { data: report } = await supabase
      .from("monthly_reports")
      .select("status, closed_at")
      .eq("family_id", familyId)
      .eq("month_ref", monthRef)
      .maybeSingle();

    const reportStatus = report?.status || "Aberto";
    const closedAt = report?.closed_at;

    // Format month name
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const monthName = monthNames[month - 1];

    // Generate HTML content for PDF
    const formatCurrency = (value: number) => 
      value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Mensal - ${monthName} ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e5e5;
    }
    .header h1 { font-size: 28px; color: #0f172a; margin-bottom: 8px; }
    .header p { color: #64748b; font-size: 14px; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 12px;
    }
    .badge.closed { background: #dcfce7; color: #166534; }
    .badge.open { background: #fef3c7; color: #92400e; }
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e5;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .summary-card {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 24px; font-weight: 700; margin-top: 8px; }
    .summary-card.income .value { color: #16a34a; }
    .summary-card.expenses .value { color: #dc2626; }
    .summary-card.balance .value { color: ${balance >= 0 ? "#16a34a" : "#dc2626"}; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f8fafc; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #64748b; }
    td { font-size: 14px; }
    .progress-bar { background: #e5e5e5; border-radius: 4px; height: 8px; overflow: hidden; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 4px; }
    .issues-list { list-style: none; }
    .issues-list li {
      padding: 12px 16px;
      background: #fef3c7;
      border-radius: 8px;
      margin-bottom: 8px;
      color: #92400e;
      font-size: 14px;
    }
    .no-issues {
      padding: 20px;
      background: #dcfce7;
      border-radius: 8px;
      color: #166534;
      text-align: center;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
    @media print {
      body { padding: 20px; }
      .summary-grid { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Relatório Financeiro</h1>
      <p>${monthName} de ${year} • ${family?.name || "Família"}</p>
      <span class="badge ${reportStatus === 'closed' ? 'closed' : 'open'}">
        ${reportStatus === 'closed' ? '✓ Fechado' : '○ Aberto'}
      </span>
    </div>

    <div class="section">
      <h2 class="section-title">Resumo do Mês</h2>
      <div class="summary-grid">
        <div class="summary-card income">
          <div class="label">Receitas</div>
          <div class="value">${formatCurrency(income)}</div>
        </div>
        <div class="summary-card expenses">
          <div class="label">Despesas</div>
          <div class="value">${formatCurrency(expenses)}</div>
        </div>
        <div class="summary-card balance">
          <div class="label">Saldo</div>
          <div class="value">${formatCurrency(balance)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Principais Categorias</h2>
      ${topCategories.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th style="width: 120px;">Valor</th>
              <th style="width: 80px;">%</th>
              <th style="width: 150px;"></th>
            </tr>
          </thead>
          <tbody>
            ${topCategories.map(cat => `
              <tr>
                <td>${cat.categoryId}</td>
                <td>${formatCurrency(cat.amount)}</td>
                <td>${cat.percentage.toFixed(1)}%</td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(cat.percentage, 100)}%"></div>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : '<p style="color: #64748b; text-align: center; padding: 20px;">Nenhuma despesa registrada</p>'}
    </div>

    <div class="section">
      <h2 class="section-title">Pendências</h2>
      ${issues.length > 0 ? `
        <ul class="issues-list">
          ${issues.map(issue => `<li>⚠️ ${issue}</li>`).join("")}
        </ul>
      ` : '<div class="no-issues">✓ Nenhuma pendência identificada</div>'}
    </div>

    <div class="footer">
      <p>Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
      <p style="margin-top: 8px;">Este relatório contém dados agregados. Informações pessoais foram omitidas conforme LGPD.</p>
      ${closedAt ? `<p style="margin-top: 8px;">Mês fechado em ${new Date(closedAt).toLocaleDateString("pt-BR")}</p>` : ""}
    </div>
  </div>
</body>
</html>
    `;

    // Generate PDF using browser-like rendering (simplified: return HTML for now)
    // In production, you'd use a service like Puppeteer, wkhtmltopdf, or a PDF API
    
    // For now, we'll return the HTML that can be printed as PDF by the browser
    // Create a data URL for the HTML content
    const base64Html = btoa(unescape(encodeURIComponent(html)));
    const dataUrl = `data:text/html;base64,${base64Html}`;

    // Store export record
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await supabase.from("report_exports").insert({
      family_id: familyId,
      month_ref: monthRef,
      requested_by: user.id,
      file_path: `reports/${familyId}/${monthRef}.html`,
      signed_url: dataUrl,
      expires_at: expiresAt.toISOString(),
    });

    // Log audit (safe, no PII)
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      family_id: familyId,
      action: "REPORT_PDF_GENERATED",
      entity_type: "monthly_report",
      entity_id: monthRef,
      module: "insights",
      severity: "info",
      metadata: {
        month_ref: monthRef,
        transaction_count: transactions?.length || 0,
      },
    });

    console.log(`PDF report generated successfully for ${monthRef}`);

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl: dataUrl,
        expiresAt: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
