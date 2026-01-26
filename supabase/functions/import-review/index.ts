import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    
    if (!authHeader.startsWith("Bearer ")) {
      console.error("[import-review] Missing or invalid Authorization header");
      return jsonResponse(401, { 
        error: "Unauthorized", 
        detail: "Missing Bearer token",
        code: "AUTH_NO_TOKEN"
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ Método 1: Criar client com o token do usuário para validar
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !userData?.user?.id) {
      console.error("[import-review] auth.getUser failed:", userError?.message);
      return jsonResponse(401, { 
        error: "Unauthorized", 
        detail: userError?.message || "Invalid token",
        code: "AUTH_INVALID_TOKEN"
      });
    }

    const userId = userData.user.id;
    console.log("[import-review] Authenticated user:", userId);

    // Service role client para operações de banco
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    let body: ReviewRequest;
    try {
      body = await req.json() as ReviewRequest;
    } catch (e) {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    if (!body?.import_id || !isUuid(body.import_id)) {
      return jsonResponse(400, { error: "Invalid import_id" });
    }

    const importId = body.import_id;

    // Resolve family_id from membership (user may belong to multiple families)
    // Get the most recently active family, or fallback to any family
    const { data: members, error: memberErr } = await admin
      .from("family_members")
      .select("family_id, last_active_at, status")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .order("last_active_at", { ascending: false, nullsFirst: false })
      .limit(10);

    if (memberErr || !members || members.length === 0) {
      console.error("[import-review] Member lookup failed:", memberErr?.message || "No memberships found");
      return jsonResponse(403, { 
        error: "Forbidden", 
        detail: "User not in any family",
        code: "AUTH_NO_FAMILY"
      });
    }

    // Try to find the import in any of the user's families
    let familyId: string | null = null;
    let batch: any = null;
    
    for (const member of members) {
      const { data: importBatch, error: batchCheckErr } = await admin
        .from("imports")
        .select("*")
        .eq("id", importId)
        .eq("family_id", member.family_id)
        .maybeSingle();
      
      if (!batchCheckErr && importBatch) {
        familyId = member.family_id;
        batch = importBatch;
        break;
      }
    }

    // Fallback: use first family if no import found (for error display purposes)
    if (!familyId) {
      familyId = members[0].family_id;
    }

    console.log("[import-review] Using Family ID:", familyId, "Duration:", Date.now() - startTime, "ms");

    // If we didn't find the batch during family search, try to fetch it now
    if (!batch) {
      const { data: fetchedBatch, error: batchErr } = await admin
        .from("imports")
        .select("*")
        .eq("id", importId)
        .eq("family_id", familyId)
        .maybeSingle();

      if (batchErr) {
        console.error("[OIK Import][Review] batch query error", { importId, message: batchErr.message });
        return jsonResponse(500, { error: "Failed to fetch import", code: "DB_ERROR" });
      }

      batch = fetchedBatch;
    }

    if (!batch) {
      console.log("[import-review] No batch found for import", importId);
      return jsonResponse(200, { batch: null, items: [], summary: null });
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
      return jsonResponse(500, { error: "Failed to fetch items", code: "DB_ITEMS_ERROR" });
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

    const duration = Date.now() - startTime;
    console.log("[OIK Import][Review]", {
      importBatchId: importId,
      status: (batch as any).status,
      itemsCount: safeItems.length,
      durationMs: duration,
    });

    return jsonResponse(200, { batch, items: safeItems, summary });
  } catch (e) {
    console.error("[OIK Import][Review] unexpected", { message: (e as Error).message, stack: (e as Error).stack });
    return jsonResponse(500, { error: "Internal server error", code: "UNEXPECTED_ERROR" });
  }
});
