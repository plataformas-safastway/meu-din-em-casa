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

    // Get code from body
    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
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
    const userEmail = userData.user.email;

    // Use service role for database operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Verify code
    const { data: codeData, error: codeError } = await adminClient
      .from("lgpd_verification_codes")
      .select("*")
      .eq("user_id", userId)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .maybeSingle();

    if (codeError || !codeData) {
      console.warn("lgpd-verify-code: Invalid or expired code for user", userId);
      
      // Log failed attempt
      await adminClient.from("audit_logs").insert({
        user_id: userId,
        action: "LGPD_CODE_INVALID",
        entity_type: "lgpd_verification",
        module: "privacy",
        metadata: { attempts: 1 },
        severity: "warn",
      });

      return new Response(JSON.stringify({ error: "Código inválido ou expirado" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark code as used
    await adminClient
      .from("lgpd_verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codeData.id);

    // Get user's family for the request
    const { data: memberData } = await adminClient
      .from("family_members")
      .select("family_id")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    // Create deletion request
    const { data: requestData, error: requestError } = await adminClient
      .from("lgpd_deletion_requests")
      .insert({
        user_id: userId,
        family_id: memberData?.family_id || null,
        status: "PENDING",
        deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (requestError) {
      console.error("lgpd-verify-code: Failed to create request", requestError);
      return new Response(JSON.stringify({ error: "Erro ao criar solicitação" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Log successful request
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      family_id: memberData?.family_id,
      action: "LGPD_DELETION_REQUESTED",
      entity_type: "lgpd_deletion_request",
      entity_id: requestData.id,
      module: "privacy",
      metadata: {
        deadline: requestData.deadline_at,
        email_masked: userEmail?.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      },
      severity: "info",
    });

    console.log("lgpd-verify-code: Deletion request created", requestData.id);

    return new Response(JSON.stringify({ 
      success: true,
      request_id: requestData.id,
      status: requestData.status,
      deadline: requestData.deadline_at,
      message: "Solicitação registrada com sucesso. Prazo: 30 dias.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("lgpd-verify-code: Unexpected error", err);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
