import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLUGGY_API_URL = "https://api.pluggy.ai";

async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Pluggy credentials not configured");
  }

  const response = await fetch(`${PLUGGY_API_URL}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Pluggy");
  }

  const data = await response.json();
  return data.apiKey;
}

// Rate limiting
const SYNC_RATE_LIMIT = { limit: 6, windowSec: 60 }; // 6 req/min

async function checkRateLimit(
  supabaseAdmin: any,
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  try {
    const { data } = await supabaseAdmin.from("rate_limits").select("count, reset_at").eq("key", key).maybeSingle();
    if (!data || new Date(data.reset_at) <= now) {
      await supabaseAdmin.from("rate_limits").upsert({ key, count: 1, reset_at: resetAt.toISOString() });
      return { allowed: true, retryAfterSec: 0 };
    }
    if (data.count >= limit) {
      const retryAfterSec = Math.ceil((new Date(data.reset_at).getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
    }
    await supabaseAdmin.from("rate_limits").update({ count: data.count + 1 }).eq("key", key);
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return { allowed: true, retryAfterSec: 0 };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Rate limit check by user
    const rateLimitKey = `user:${user.id}:pluggy-sync`;
    const rateResult = await checkRateLimit(supabase, rateLimitKey, SYNC_RATE_LIMIT.limit, SYNC_RATE_LIMIT.windowSec);
    if (!rateResult.allowed) {
      console.log(`[pluggy-sync] Rate limited user: ${user.id}`);
      return new Response(
        JSON.stringify({ error: "rate_limited", message: "Muitas sincronizações. Aguarde.", retry_after_sec: rateResult.retryAfterSec }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateResult.retryAfterSec) } }
      );
    }

    const { connectionId } = await req.json();

    if (!connectionId) {
      throw new Error("Missing connectionId");
    }

    // Get connection
    const { data: connection, error: connectionError } = await supabase
      .from("openfinance_connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (connectionError || !connection) {
      throw new Error("Connection not found");
    }

    if (!connection.external_item_id) {
      throw new Error("Connection not linked to Pluggy item");
    }

    const apiKey = await getPluggyApiKey();

    // Create sync log
    const { data: syncLog, error: syncLogError } = await supabase
      .from("openfinance_sync_logs")
      .insert({
        connection_id: connectionId,
        sync_type: connection.last_sync_at ? "INCREMENTAL" : "FULL",
        status: "STARTED",
      })
      .select()
      .single();

    if (syncLogError) {
      throw syncLogError;
    }

    let transactionsImported = 0;
    let accountsSynced = 0;
    let cardsSynced = 0;

    try {
      // Fetch accounts from Pluggy
      const accountsResponse = await fetch(
        `${PLUGGY_API_URL}/accounts?itemId=${connection.external_item_id}`,
        {
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        
        for (const account of accountsData.results || []) {
          // Upsert account
          const { error: accountError } = await supabase
            .from("openfinance_accounts")
            .upsert({
              connection_id: connectionId,
              external_account_id: account.id,
              account_type: account.type || "checking",
              nickname: account.name,
              currency: account.currencyCode || "BRL",
              current_balance: account.balance,
              available_balance: account.availableBalance,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "connection_id,external_account_id",
            });

          if (!accountError) {
            accountsSynced++;
          }

          // Fetch transactions for this account
          const transactionsResponse = await fetch(
            `${PLUGGY_API_URL}/transactions?accountId=${account.id}&pageSize=500`,
            {
              headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
              },
            }
          );

          if (transactionsResponse.ok) {
            const transactionsData = await transactionsResponse.json();
            
            for (const transaction of transactionsData.results || []) {
              // Insert raw transaction
              const { error: txError } = await supabase
                .from("openfinance_transactions_raw")
                .upsert({
                  family_id: connection.family_id,
                  source_type: "ACCOUNT",
                  source_id: account.id,
                  external_transaction_id: transaction.id,
                  date: transaction.date,
                  description: transaction.description,
                  amount: transaction.amount,
                  currency: transaction.currencyCode || "BRL",
                  merchant: transaction.merchant?.name,
                  category_hint: transaction.category,
                  raw_payload: transaction,
                  imported_at: new Date().toISOString(),
                }, {
                  onConflict: "source_id,external_transaction_id",
                });

              if (!txError) {
                transactionsImported++;
              }
            }
          }
        }
      }

      // Fetch credit cards from Pluggy (if available)
      const cardsResponse = await fetch(
        `${PLUGGY_API_URL}/credit-cards?itemId=${connection.external_item_id}`,
        {
          headers: {
            "X-API-KEY": apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        
        for (const card of cardsData.results || []) {
          // Upsert card
          const { error: cardError } = await supabase
            .from("openfinance_cards")
            .upsert({
              connection_id: connectionId,
              external_card_id: card.id,
              brand: card.brand,
              display_name: card.name,
              last4: card.number?.slice(-4),
              credit_limit: card.creditLimit,
              available_limit: card.availableCreditLimit,
              statement_close_day: card.closeDate,
              due_day: card.dueDate,
              last_sync_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "connection_id,external_card_id",
            });

          if (!cardError) {
            cardsSynced++;
          }

          // Fetch card transactions (bills)
          const billsResponse = await fetch(
            `${PLUGGY_API_URL}/bills?creditCardId=${card.id}`,
            {
              headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
              },
            }
          );

          if (billsResponse.ok) {
            const billsData = await billsResponse.json();
            
            for (const bill of billsData.results || []) {
              for (const transaction of bill.transactions || []) {
                const { error: txError } = await supabase
                  .from("openfinance_transactions_raw")
                  .upsert({
                    family_id: connection.family_id,
                    source_type: "CARD",
                    source_id: card.id,
                    external_transaction_id: transaction.id,
                    date: transaction.date,
                    description: transaction.description,
                    amount: -Math.abs(transaction.amount), // Credit card expenses are negative
                    currency: transaction.currencyCode || "BRL",
                    merchant: transaction.merchant?.name,
                    category_hint: transaction.category,
                    raw_payload: transaction,
                    imported_at: new Date().toISOString(),
                  }, {
                    onConflict: "source_id,external_transaction_id",
                  });

                if (!txError) {
                  transactionsImported++;
                }
              }
            }
          }
        }
      }

      // Update connection
      await supabase
        .from("openfinance_connections")
        .update({
          last_sync_at: new Date().toISOString(),
          next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
          status: "ACTIVE",
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", connectionId);

      // Update sync log as completed
      await supabase
        .from("openfinance_sync_logs")
        .update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
          transactions_imported: transactionsImported,
          accounts_synced: accountsSynced,
          cards_synced: cardsSynced,
        })
        .eq("id", syncLog.id);

      return new Response(
        JSON.stringify({
          success: true,
          transactionsImported,
          accountsSynced,
          cardsSynced,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (syncError: unknown) {
      const syncMessage = syncError instanceof Error ? syncError.message : "Unknown error";
      // Update sync log as failed
      await supabase
        .from("openfinance_sync_logs")
        .update({
          status: "FAILED",
          completed_at: new Date().toISOString(),
          error_message: syncMessage,
        })
        .eq("id", syncLog.id);

      throw syncError;
    }
  } catch (error: unknown) {
    console.error("Error syncing connection:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
