import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("lgpd-send-code: Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
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
      console.error("lgpd-send-code: User not authenticated", userError);
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "E-mail não encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Use service role for database operations
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Check if user already has a pending request
    const { data: pendingRequest } = await adminClient
      .from("lgpd_deletion_requests")
      .select("id, status")
      .eq("user_id", userId)
      .in("status", ["PENDING", "PROCESSING"])
      .maybeSingle();

    if (pendingRequest) {
      return new Response(JSON.stringify({ 
        error: "Você já possui uma solicitação de exclusão em andamento" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Rate limit: max 3 codes per hour
    const { count } = await adminClient
      .from("lgpd_verification_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      console.warn("lgpd-send-code: Rate limit exceeded for user", userId);
      return new Response(JSON.stringify({ 
        error: "Muitas tentativas. Aguarde 1 hora." 
      }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate and store code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const { error: insertError } = await adminClient
      .from("lgpd_verification_codes")
      .insert({
        user_id: userId,
        email: userEmail,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("lgpd-send-code: Failed to insert code", insertError);
      return new Response(JSON.stringify({ error: "Erro ao gerar código" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email with Resend
    if (RESEND_API_KEY) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Oik <noreply@oik.app>",
            to: [userEmail],
            subject: "Código de verificação para exclusão de conta - Oik",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a;">Solicitação de Exclusão de Conta</h2>
                <p>Você solicitou a exclusão da sua conta no Oik.</p>
                <p>Para confirmar, use o código abaixo:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #16a34a;">${code}</span>
                </div>
                <p style="color: #666; font-size: 14px;">Este código expira em 15 minutos.</p>
                <p style="color: #666; font-size: 14px;">Se você não solicitou essa exclusão, ignore este e-mail. Sua conta permanecerá segura.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px;">Oik - Gestão Financeira Familiar</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          console.error("lgpd-send-code: Failed to send email", await emailResponse.text());
        } else {
          console.log("lgpd-send-code: Email sent successfully to", userEmail);
        }
      } catch (emailErr) {
        console.error("lgpd-send-code: Email error", emailErr);
        // Continue even if email fails - code is in database
      }
    } else {
      console.warn("lgpd-send-code: RESEND_API_KEY not configured, code not sent by email");
    }

    // Log the action (without sensitive data)
    await adminClient.from("audit_logs").insert({
      user_id: userId,
      action: "LGPD_CODE_SENT",
      entity_type: "lgpd_verification",
      entity_id: null,
      module: "privacy",
      metadata: {
        email_masked: userEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      },
      severity: "info",
    });

    console.log("lgpd-send-code: Code generated for user", userId);

    return new Response(JSON.stringify({ 
      success: true,
      message: "Código enviado para seu e-mail",
      expires_in_minutes: 15,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("lgpd-send-code: Unexpected error", err);
    return new Response(JSON.stringify({ error: "Erro inesperado" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
