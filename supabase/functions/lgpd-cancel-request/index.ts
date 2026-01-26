import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { request_id } = await req.json();

    if (!request_id) {
      return new Response(JSON.stringify({ error: "ID da solicitação é obrigatório" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = userData.user.id;

    // Use service role for database operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get the request and verify ownership
    const { data: requestData, error: requestError } = await adminClient
      .from("lgpd_deletion_requests")
      .select("*")
      .eq("id", request_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (requestError || !requestData) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (requestData.status !== "PENDING") {
      return new Response(JSON.stringify({ 
        error: "Não é possível cancelar uma solicitação que já está sendo processada" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Cancel the request
    const { error: updateError } = await adminClient
      .from("lgpd_deletion_requests")
      .update({
        status: "CANCELLED",
        completed_at: new Date().toISOString(),
        completion_notes: "Cancelado pelo usuário",
      })
      .eq("id", request_id);

    if (updateError) {
      console.error("lgpd-cancel-request: Failed to cancel", updateError);
      return new Response(JSON.stringify({ error: "Erro ao cancelar solicitação" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log the cancellation
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      family_id: requestData.family_id,
      action: "LGPD_DELETION_CANCELLED",
      entity_type: "lgpd_deletion_request",
      entity_id: request_id,
      module: "privacy",
      severity: "info",
    });

    console.log("lgpd-cancel-request: Request cancelled", request_id);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Solicitação cancelada com sucesso",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("lgpd-cancel-request: Unexpected error", err);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
