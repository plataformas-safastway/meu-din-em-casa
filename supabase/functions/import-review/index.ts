import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ReviewRequest = {
  import_id: string;
};

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

serve(async (req) => {
  // CORS preflight
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      console.error("[import-review] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin client for database operations AND auth validation
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Validate JWT using admin.auth.getUser with the token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error("[import-review] auth.getUser failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = userData.user.id;
    console.log("[import-review] Authenticated user:", userId);

    const body = (await req.json()) as ReviewRequest;
    if (!body?.import_id || !isUuid(body.import_id)) {
      return new Response(JSON.stringify({ error: "Invalid import_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const importId = body.import_id;

    // Resolve family_id from membership
    const { data: member, error: memberErr } = await admin
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (memberErr || !member?.family_id) {
      console.error("[import-review] Member lookup failed:", memberErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const familyId = member.family_id as string;
    console.log("[import-review] Family ID:", familyId);

    // Batch
    const { data: batch, error: batchErr } = await admin
      .from("imports")
      .select("*")
      .eq("id", importId)
      .eq("family_id", familyId)
      .maybeSingle();

    if (batchErr) {
      console.error("[OIK Import][Review] batch query error", { importId, message: batchErr.message });
      return new Response(JSON.stringify({ error: "Failed to fetch import" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!batch) {
      console.log("[import-review] No batch found for import", importId);
      return new Response(JSON.stringify({ batch: null, items: [], summary: null }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Items (no filters by status; no pagination surprises)
    // CRITICAL: Order by DATE ASC (chronological: oldest first), then by created_at ASC (source line order)
    // NO LIMIT - return ALL items for the batch
    const { data: items, error: itemsErr } = await admin
      .from("import_pending_transactions")
      .select("*")
      .eq("import_id", importId)
      .eq("family_id", familyId)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true });

    if (itemsErr) {
      console.error("[OIK Import][Review] items query error", { importId, message: itemsErr.message });
      return new Response(JSON.stringify({ error: "Failed to fetch items" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeItems = items ?? [];

    // ✅ Auto-fix completo:
    // - Se há itens persistidos, eles são a fonte da verdade: status=reviewing e limpar erros antigos.
    // - Se NÃO há itens e o batch está reviewing, isso é inconsistência: marcar failed com código específico.

    if (safeItems.length > 0) {
      const nextCount = safeItems.length;
      const needsFix = (batch as any).status !== "reviewing" || (batch as any).error_code || (batch as any).error_message;

      if (needsFix) {
        const { error: fixErr } = await admin
          .from("imports")
          .update({
            status: "reviewing",
            transactions_count: nextCount,
            error_message: null,
            error_code: null,
          })
          .eq("id", importId)
          .eq("family_id", familyId);

        if (fixErr) {
          console.error("[OIK Import][Review] failed to auto-fix status/errors", {
            importId,
            message: fixErr.message,
          });
        } else {
          (batch as any).status = "reviewing";
          (batch as any).transactions_count = nextCount;
          (batch as any).error_message = null;
          (batch as any).error_code = null;
        }
      }
    } else if ((batch as any).status === "reviewing") {
      // Inconsistência: review sem itens
      const { error: emptyFixErr } = await admin
        .from("imports")
        .update({
          status: "failed",
          error_code: "IMPORT_EMPTY_REVIEW",
          error_message: "Importação em revisão sem itens persistidos",
        })
        .eq("id", importId)
        .eq("family_id", familyId);

      if (emptyFixErr) {
        console.error("[OIK Import][Review] failed to mark empty reviewing as failed", {
          importId,
          message: emptyFixErr.message,
        });
      } else {
        (batch as any).status = "failed";
        (batch as any).error_code = "IMPORT_EMPTY_REVIEW";
        (batch as any).error_message = "Importação em revisão sem itens persistidos";
      }
    }

    const summary = {
      total: safeItems.length,
      duplicateCount: safeItems.filter((i: any) => !!i.is_duplicate).length,
      needsReviewCount: safeItems.filter((i: any) => !!i.needs_review && !i.is_duplicate).length,
      totalIncome: safeItems
        .filter((i: any) => i.type === "income")
        .reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0),
      totalExpense: safeItems
        .filter((i: any) => i.type === "expense")
        .reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0),
    };

    console.log("[OIK Import][Review]", {
      importBatchId: importId,
      status: (batch as any).status,
      itemsCount: safeItems.length,
    });

    return new Response(JSON.stringify({ batch, items: safeItems, summary }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("[OIK Import][Review] unexpected", { message: (e as Error).message, stack: (e as Error).stack });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
