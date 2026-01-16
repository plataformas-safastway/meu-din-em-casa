import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();
    console.log("Received Pluggy webhook:", JSON.stringify(payload));

    const { event, data } = payload;

    if (!event || !data) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    switch (event) {
      case "item/created":
      case "item/updated": {
        const itemId = data.id || data.itemId;
        const status = data.status;

        // Find connection by clientUserId (user_id stored during connect)
        // or update any pending connection
        const { data: connections } = await supabase
          .from("openfinance_connections")
          .select("*")
          .eq("status", "PENDING")
          .order("created_at", { ascending: false })
          .limit(1);

        if (connections && connections.length > 0) {
          const connection = connections[0];
          
          let newStatus = "ACTIVE";
          let errorMessage = null;

          if (status === "LOGIN_ERROR" || status === "OUTDATED") {
            newStatus = "NEEDS_RECONNECT";
            errorMessage = data.executionStatus?.lastError?.message || "Erro de autenticação";
          } else if (status === "ERROR") {
            newStatus = "ERROR";
            errorMessage = data.executionStatus?.lastError?.message || "Erro desconhecido";
          }

          await supabase
            .from("openfinance_connections")
            .update({
              external_item_id: itemId,
              status: newStatus,
              error_message: errorMessage,
              consent_created_at: new Date().toISOString(),
              consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          // If connection is active, trigger initial sync
          if (newStatus === "ACTIVE") {
            // We could trigger the sync function here, but for now we'll let the user do it manually
            console.log(`Connection ${connection.id} is now active, ready for sync`);
          }
        }
        break;
      }

      case "item/deleted": {
        const itemId = data.id || data.itemId;
        
        await supabase
          .from("openfinance_connections")
          .update({
            status: "DISCONNECTED",
            updated_at: new Date().toISOString(),
          })
          .eq("external_item_id", itemId);
        break;
      }

      case "item/error": {
        const itemId = data.id || data.itemId;
        const errorMessage = data.error?.message || "Erro na conexão";
        
        await supabase
          .from("openfinance_connections")
          .update({
            status: "ERROR",
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("external_item_id", itemId);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error processing webhook:", error);
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
