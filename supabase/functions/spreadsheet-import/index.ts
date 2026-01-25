import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionInput {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string;
  subcategory_id: string | null;
  account_id: string | null;
}

interface RequestBody {
  transactions: TransactionInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const startTime = performance.now();

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get user's family
    const { data: memberData, error: memberError } = await adminClient
      .from("family_members")
      .select("family_id")
      .eq("user_id", userData.user.id)
      .limit(1)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "Family not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const familyId = memberData.family_id;

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return new Response(JSON.stringify({ error: "No transactions provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[spreadsheet-import] Processing ${transactions.length} transactions for family ${familyId}`);

    // Validate and transform transactions
    const transactionsToInsert = transactions
      .filter((tx) => tx.date && tx.description && tx.amount != null)
      .map((tx) => ({
        family_id: familyId,
        date: tx.date,
        description: tx.description,
        amount: Math.abs(tx.amount),
        type: tx.type,
        category_id: tx.category_id || "desconhecidas",
        subcategory_id: tx.subcategory_id,
        payment_method: "transfer", // Default payment method
        bank_account_id: tx.account_id,
        source: "IMPORT",
        notes: "Importado de planilha do usuário",
      }));

    if (transactionsToInsert.length === 0) {
      return new Response(JSON.stringify({ error: "No valid transactions to import" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Insert in batches to avoid timeout
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await adminClient
        .from("transactions")
        .insert(batch);

      if (insertError) {
        console.error(`[spreadsheet-import] Batch insert error:`, insertError);
        throw new Error(`Failed to insert transactions: ${insertError.message}`);
      }

      insertedCount += batch.length;
    }

    const duration = Math.round(performance.now() - startTime);
    console.log(`[spreadsheet-import] Completed: ${insertedCount} transactions in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: insertedCount,
        duration_ms: duration,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("[spreadsheet-import] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
