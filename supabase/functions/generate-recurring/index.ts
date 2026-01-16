import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user from the JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's family
    const { data: member, error: memberError } = await supabase
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Família não encontrada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const familyId = member.family_id;
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Get all active recurring transactions for this family
    const { data: recurrings, error: recurringError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    if (recurringError) {
      throw new Error(`Erro ao buscar recorrências: ${recurringError.message}`);
    }

    let generatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const recurring of recurrings || []) {
      try {
        // Check if end_date has passed
        if (recurring.end_date && new Date(recurring.end_date) < today) {
          continue;
        }

        // Check if start_date hasn't arrived yet
        if (new Date(recurring.start_date) > today) {
          continue;
        }

        // For monthly frequency, check if it's the right day
        if (recurring.frequency === "monthly") {
          // If day_of_month is greater than current day, skip (not time yet this month)
          // If we already generated for this month, skip
          const targetDay = recurring.day_of_month || 1;
          
          // Skip if today is before the target day
          if (currentDay < targetDay) {
            continue;
          }

          // Check if we already generated for this month
          const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
          const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

          const { data: existing, error: checkError } = await supabase
            .from("transactions")
            .select("id")
            .eq("family_id", familyId)
            .eq("recurring_transaction_id", recurring.id)
            .gte("date", monthStart)
            .lte("date", monthEnd)
            .limit(1);

          if (checkError) {
            errors.push(`Erro ao verificar existente para ${recurring.description}: ${checkError.message}`);
            continue;
          }

          if (existing && existing.length > 0) {
            skippedCount++;
            continue;
          }

          // Also check for duplicates based on description, amount, and date
          const transactionDate = new Date(currentYear, currentMonth, Math.min(targetDay, new Date(currentYear, currentMonth + 1, 0).getDate()));
          const dateStr = transactionDate.toISOString().split("T")[0];

          const { data: duplicates, error: dupError } = await supabase
            .from("transactions")
            .select("id")
            .eq("family_id", familyId)
            .eq("description", recurring.description)
            .eq("amount", recurring.amount)
            .eq("date", dateStr)
            .limit(1);

          if (dupError) {
            errors.push(`Erro ao verificar duplicatas para ${recurring.description}: ${dupError.message}`);
            continue;
          }

          if (duplicates && duplicates.length > 0) {
            skippedCount++;
            continue;
          }

          // Generate the transaction
          const { error: insertError } = await supabase.from("transactions").insert({
            family_id: familyId,
            type: recurring.type,
            amount: recurring.amount,
            category_id: recurring.category_id,
            subcategory_id: recurring.subcategory_id,
            description: recurring.description,
            date: dateStr,
            payment_method: recurring.payment_method,
            bank_account_id: recurring.bank_account_id,
            credit_card_id: recurring.credit_card_id,
            is_recurring: true,
            is_auto_generated: true,
            recurring_transaction_id: recurring.id,
          });

          if (insertError) {
            errors.push(`Erro ao criar transação para ${recurring.description}: ${insertError.message}`);
            continue;
          }

          // Update last_generated_at
          await supabase
            .from("recurring_transactions")
            .update({ last_generated_at: new Date().toISOString() })
            .eq("id", recurring.id);

          generatedCount++;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Erro processando ${recurring.description}: ${errMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedCount,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `${generatedCount} transação(ões) gerada(s) automaticamente. ${skippedCount} ignorada(s) por já existirem.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erro:", error);
    const errorMsg = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
