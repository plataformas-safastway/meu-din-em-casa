import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  import_id: string;
  transaction_ids: string[];
  learn_categories?: boolean;
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
    let body: ConfirmRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { import_id, transaction_ids, learn_categories = true } = body;

    if (!import_id || !transaction_ids || !Array.isArray(transaction_ids)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify import belongs to family
    const { data: importData, error: importError } = await adminClient
      .from("imports")
      .select("*")
      .eq("id", import_id)
      .eq("family_id", familyId)
      .single();

    if (importError || !importData) {
      return new Response(JSON.stringify({ error: "Import not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get pending transactions to confirm
    const { data: pendingTx, error: pendingError } = await adminClient
      .from("import_pending_transactions")
      .select("*")
      .eq("import_id", import_id)
      .in("id", transaction_ids);

    if (pendingError || !pendingTx) {
      return new Response(JSON.stringify({ error: "Failed to fetch pending transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Confirming ${pendingTx.length} transactions for import ${import_id}`);

    // Create actual transactions
    const transactionsToInsert = pendingTx.map(tx => ({
      family_id: familyId,
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category_id: tx.category_id,
      subcategory_id: tx.subcategory_id,
      payment_method: importData.import_type === "credit_card_invoice" ? "credit" : "debit",
      bank_account_id: importData.import_type === "bank_statement" ? importData.source_id : null,
      credit_card_id: importData.import_type === "credit_card_invoice" ? importData.source_id : null,
      import_id: import_id,
      source: "import",
      source_ref_id: tx.raw_data?.fitid || null,
      original_date: tx.original_date,
    }));

    const { error: insertError } = await adminClient
      .from("transactions")
      .insert(transactionsToInsert);

    if (insertError) {
      console.error("Error inserting transactions:", insertError);
      return new Response(JSON.stringify({ error: "Failed to confirm transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Learn category rules if enabled
    if (learn_categories) {
      const rulesMap = new Map<string, { category_id: string; subcategory_id: string | null }>();
      
      for (const tx of pendingTx) {
        // Only learn from transactions where user changed category or has high confidence
        if (tx.category_id !== tx.suggested_category_id || tx.confidence_score >= 0.9) {
          // Extract keywords from description (first 2-3 words usually identify merchant)
          const words = tx.description.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .split(/\s+/)
            .filter((w: string) => w.length > 2)
            .slice(0, 3);
          
          for (const word of words) {
            if (!rulesMap.has(word) && word.length >= 3) {
              rulesMap.set(word, {
                category_id: tx.category_id,
                subcategory_id: tx.subcategory_id,
              });
            }
          }
        }
      }

      // Upsert category rules
      for (const [keyword, mapping] of rulesMap) {
        const { data: existingRule } = await adminClient
          .from("import_category_rules")
          .select("id, match_count")
          .eq("family_id", familyId)
          .eq("keyword", keyword)
          .limit(1)
          .single();

        if (existingRule) {
          await adminClient
            .from("import_category_rules")
            .update({
              category_id: mapping.category_id,
              subcategory_id: mapping.subcategory_id,
              match_count: (existingRule.match_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRule.id);
        } else {
          await adminClient
            .from("import_category_rules")
            .insert({
              family_id: familyId,
              keyword,
              category_id: mapping.category_id,
              subcategory_id: mapping.subcategory_id,
              match_count: 1,
            });
        }
      }
    }

    // Delete confirmed pending transactions
    await adminClient
      .from("import_pending_transactions")
      .delete()
      .eq("import_id", import_id)
      .in("id", transaction_ids);

    // Check if there are remaining pending transactions
    const { count: remainingCount } = await adminClient
      .from("import_pending_transactions")
      .select("*", { count: "exact", head: true })
      .eq("import_id", import_id);

    // Update import status
    const newStatus = remainingCount === 0 ? "completed" : "partial";
    await adminClient
      .from("imports")
      .update({
        status: newStatus,
        processed_at: new Date().toISOString(),
      })
      .eq("id", import_id);

    console.log(`Import ${import_id} ${newStatus}: ${pendingTx.length} confirmed, ${remainingCount || 0} remaining`);

    return new Response(JSON.stringify({
      success: true,
      imported_count: pendingTx.length,
      remaining_count: remainingCount || 0,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err) {
    console.error("import-confirm: unexpected error", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
