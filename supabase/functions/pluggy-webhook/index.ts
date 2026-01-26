import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pluggy-signature, x-webhook-signature",
};

// HMAC-SHA256 signature verification
async function verifyPluggySignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) {
    console.warn("[pluggy-webhook] Missing signature or secret");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const signatureBytes = hexToBytes(signature);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(signatureBytes) as unknown as ArrayBuffer,
      encoder.encode(payload)
    );

    return isValid;
  } catch (error) {
    console.error("[pluggy-webhook] Signature verification error:", error);
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/^sha256=/, ""); // Remove prefix if present
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// IP whitelist for Pluggy (optional additional security)
const PLUGGY_IP_WHITELIST: string[] = [
  // Add Pluggy's webhook IPs here when available
  // For now, we rely primarily on signature verification
];

function isAllowedIP(ip: string): boolean {
  // If no whitelist configured, allow all (rely on signature)
  if (PLUGGY_IP_WHITELIST.length === 0) return true;
  return PLUGGY_IP_WHITELIST.includes(ip);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST for webhooks
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pluggyWebhookSecret = Deno.env.get("PLUGGY_WEBHOOK_SECRET");

    // SECURITY: Require webhook secret to be configured
    if (!pluggyWebhookSecret) {
      console.error("[pluggy-webhook] PLUGGY_WEBHOOK_SECRET not configured - rejecting request");
      return new Response(
        JSON.stringify({ error: "Webhook security not configured" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 503,
        }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // SECURITY: Always verify signature (mandatory)
    const signature = req.headers.get("x-pluggy-signature") || 
                      req.headers.get("x-webhook-signature");
    
    const isValid = await verifyPluggySignature(rawBody, signature, pluggyWebhookSecret);
    
    if (!isValid) {
      console.error("[pluggy-webhook] Invalid signature - rejecting request");
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }
    console.log("[pluggy-webhook] Signature verified successfully");

    // Parse payload
    let payload: { event?: string; data?: Record<string, unknown> };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("[pluggy-webhook] Received event:", payload.event);

    const { event, data } = payload;

    if (!event || !data) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook payload: missing event or data" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (event) {
      case "item/created":
      case "item/updated": {
        const itemId = (data.id || data.itemId) as string;
        const status = data.status as string;

        if (!itemId) {
          console.error("[pluggy-webhook] Missing itemId in payload");
          break;
        }

        // Find connection by external_item_id first (more secure)
        let connection = null;
        const { data: existingConnection } = await supabase
          .from("openfinance_connections")
          .select("*")
          .eq("external_item_id", itemId)
          .maybeSingle();

        if (existingConnection) {
          connection = existingConnection;
        } else {
          // Fallback: find pending connection (only for initial setup)
          const { data: pendingConnections } = await supabase
            .from("openfinance_connections")
            .select("*")
            .eq("status", "PENDING")
            .order("created_at", { ascending: false })
            .limit(1);

          if (pendingConnections && pendingConnections.length > 0) {
            connection = pendingConnections[0];
          }
        }

        if (connection) {
          let newStatus = "ACTIVE";
          let errorMessage = null;

          if (status === "LOGIN_ERROR" || status === "OUTDATED") {
            newStatus = "NEEDS_RECONNECT";
            const execStatus = data.executionStatus as Record<string, unknown> | undefined;
            const lastError = execStatus?.lastError as Record<string, unknown> | undefined;
            errorMessage = (lastError?.message as string) || "Erro de autenticação";
          } else if (status === "ERROR") {
            newStatus = "ERROR";
            const execStatus = data.executionStatus as Record<string, unknown> | undefined;
            const lastError = execStatus?.lastError as Record<string, unknown> | undefined;
            errorMessage = (lastError?.message as string) || "Erro desconhecido";
          }

          await supabase
            .from("openfinance_connections")
            .update({
              external_item_id: itemId,
              status: newStatus,
              error_message: errorMessage,
              consent_created_at: new Date().toISOString(),
              consent_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", connection.id);

          console.log(`[pluggy-webhook] Updated connection ${connection.id} to status ${newStatus}`);
        } else {
          console.warn(`[pluggy-webhook] No matching connection found for item ${itemId}`);
        }
        break;
      }

      case "item/deleted": {
        const itemId = (data.id || data.itemId) as string;
        
        if (itemId) {
          await supabase
            .from("openfinance_connections")
            .update({
              status: "DISCONNECTED",
              updated_at: new Date().toISOString(),
            })
            .eq("external_item_id", itemId);
          
          console.log(`[pluggy-webhook] Marked connection for item ${itemId} as DISCONNECTED`);
        }
        break;
      }

      case "item/error": {
        const itemId = (data.id || data.itemId) as string;
        const errorData = data.error as Record<string, unknown> | undefined;
        const errorMessage = (errorData?.message as string) || "Erro na conexão";
        
        if (itemId) {
          await supabase
            .from("openfinance_connections")
            .update({
              status: "ERROR",
              error_message: errorMessage,
              updated_at: new Date().toISOString(),
            })
            .eq("external_item_id", itemId);
          
          console.log(`[pluggy-webhook] Marked connection for item ${itemId} as ERROR: ${errorMessage}`);
        }
        break;
      }

      default:
        console.log(`[pluggy-webhook] Unhandled event type: ${event}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("[pluggy-webhook] Unexpected error:", error);
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