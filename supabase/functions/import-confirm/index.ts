import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { addMonths, format } from "https://esm.sh/date-fns@3.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmRequest {
  import_id: string;
  transaction_ids: string[];
  learn_categories?: boolean;
}

// ============================================
// Installment Detection Patterns
// ============================================

const INSTALLMENT_PATTERNS = [
  { regex: /(\d{1,2})\s*[\/\\-]\s*(\d{1,2})(?!\d)/i, extractCurrent: 1, extractTotal: 2 },
  { regex: /PARC(?:ELA?)?\s*(\d{1,2})\s*[\/\\-]?\s*(\d{1,2})?/i, extractCurrent: 1, extractTotal: 2 },
  { regex: /PARCELA\s*(\d{1,2})/i, extractCurrent: 1, extractTotal: null },
  { regex: /(\d{1,2})\s*[xX]\s*(?:R?\$?\s*[\d,\.]+)?/i, extractCurrent: null, extractTotal: 1 },
];

interface InstallmentDetection {
  isInstallment: boolean;
  currentInstallment: number | null;
  totalInstallments: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  baseDescription: string;
}

function detectInstallment(description: string): InstallmentDetection {
  if (!description) {
    return { isInstallment: false, currentInstallment: null, totalInstallments: null, confidence: 'LOW', baseDescription: description };
  }

  const normalizedDesc = description.toUpperCase().trim();
  
  for (const pattern of INSTALLMENT_PATTERNS) {
    const match = normalizedDesc.match(pattern.regex);
    if (match) {
      const current = pattern.extractCurrent ? parseInt(match[pattern.extractCurrent]) : null;
      const total = pattern.extractTotal ? parseInt(match[pattern.extractTotal]) : null;
      
      // Remove the installment pattern from description to get base
      const baseDescription = description.replace(pattern.regex, '').trim();
      
      if (current !== null && total !== null && current >= 1 && current <= total && total <= 48) {
        return {
          isInstallment: true,
          currentInstallment: current,
          totalInstallments: total,
          confidence: 'HIGH',
          baseDescription,
        };
      } else if (current !== null) {
        return {
          isInstallment: true,
          currentInstallment: current,
          totalInstallments: null,
          confidence: 'MEDIUM',
          baseDescription,
        };
      }
    }
  }

  return { isInstallment: false, currentInstallment: null, totalInstallments: null, confidence: 'LOW', baseDescription: description };
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
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Admin client for database operations AND auth validation
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Validate JWT using admin.auth.getUser with the token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await adminClient.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error("[import-confirm] auth.getUser failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // adminClient already defined above, continue using it for DB operations
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
      source: "IMPORT",
      // source_ref_id expects UUID, but fitid is a string - store in notes instead
      notes: tx.raw_data?.fitid ? `FITID: ${tx.raw_data.fitid}` : null,
      original_date: tx.original_date,
    }));

    const { error: insertError, data: insertedTx } = await adminClient
      .from("transactions")
      .insert(transactionsToInsert)
      .select("id, description, amount, category_id, subcategory_id, credit_card_id, date");

    if (insertError) {
      console.error("Error inserting transactions:", insertError);
      return new Response(JSON.stringify({ error: "Failed to confirm transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ============================================
    // Installment Detection & Projection
    // ============================================
    
    // Group transactions by base description + amount to detect installment series
    const installmentGroups = new Map<string, Array<{ 
      tx: typeof insertedTx[0], 
      detection: InstallmentDetection,
      pending: typeof pendingTx[0]
    }>>();

    for (let i = 0; i < (insertedTx || []).length; i++) {
      const tx = insertedTx[i];
      const pending = pendingTx[i];
      const detection = detectInstallment(tx.description || '');
      
      if (detection.isInstallment && detection.confidence !== 'LOW') {
        const groupKey = `${detection.baseDescription}_${tx.amount.toFixed(2)}`;
        
        if (!installmentGroups.has(groupKey)) {
          installmentGroups.set(groupKey, []);
        }
        installmentGroups.get(groupKey)!.push({ tx, detection, pending });
      }
    }

    // Create installment groups and planned installments for detected series
    let installmentGroupsCreated = 0;
    let plannedInstallmentsCreated = 0;

    for (const [groupKey, items] of installmentGroups) {
      // Sort by current installment number
      items.sort((a, b) => (a.detection.currentInstallment || 0) - (b.detection.currentInstallment || 0));
      
      const firstItem = items[0];
      const totalInstallments = firstItem.detection.totalInstallments;
      
      // Only create projections if we have high confidence and know total
      if (totalInstallments && firstItem.detection.confidence === 'HIGH') {
        const currentMax = Math.max(...items.map(i => i.detection.currentInstallment || 0));
        const remainingCount = totalInstallments - currentMax;
        
        if (remainingCount > 0) {
          // Create installment group
          const totalAmount = firstItem.tx.amount * totalInstallments;
          
          // Calculate first due date for remaining installments (next month after last imported)
          const lastDate = new Date(items[items.length - 1].tx.date);
          const firstDueDate = addMonths(lastDate, 1);
          
          const { data: group, error: groupError } = await adminClient
            .from("installment_groups")
            .insert({
              family_id: familyId,
              credit_card_id: firstItem.tx.credit_card_id || null,
              total_amount: totalAmount,
              installments_total: totalInstallments,
              installment_value: firstItem.tx.amount,
              first_due_date: format(firstDueDate, 'yyyy-MM-dd'),
              description: firstItem.detection.baseDescription || 'Compra parcelada importada',
              category_id: firstItem.tx.category_id,
              subcategory_id: firstItem.tx.subcategory_id,
              source: 'IMPORT',
              parent_transaction_id: firstItem.tx.id,
              confidence_level: 'HIGH',
              needs_user_confirmation: false,
            })
            .select()
            .single();

          if (!groupError && group) {
            installmentGroupsCreated++;
            
            // Create planned installments for remaining months
            const plannedToInsert = [];
            for (let i = 1; i <= remainingCount; i++) {
              const installmentIndex = currentMax + i;
              const dueDate = addMonths(lastDate, i);
              
              plannedToInsert.push({
                family_id: familyId,
                installment_group_id: group.id,
                installment_index: installmentIndex,
                amount: firstItem.tx.amount,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                status: 'PLANNED',
              });
            }
            
            const { error: plannedError } = await adminClient
              .from("planned_installments")
              .insert(plannedToInsert);
              
            if (!plannedError) {
              plannedInstallmentsCreated += plannedToInsert.length;
            }
            
            // Log audit
            await adminClient.from("installment_audit_log").insert({
              installment_group_id: group.id,
              action: 'CREATED',
              details: { 
                source: 'IMPORT',
                detected_pattern: firstItem.detection.currentInstallment + '/' + totalInstallments,
                remaining_installments: remainingCount,
              },
            });
          }
        }
      }
    }

    console.log(`Installment detection: ${installmentGroupsCreated} groups, ${plannedInstallmentsCreated} planned installments created`);

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
      installment_groups_created: installmentGroupsCreated,
      planned_installments_created: plannedInstallmentsCreated,
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
