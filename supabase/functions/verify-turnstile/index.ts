import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TurnstileVerifyRequest {
  token: string;
  email?: string;
  action?: string;
}

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    
    if (!secretKey) {
      console.error('[verify-turnstile] TURNSTILE_SECRET_KEY not configured');
      // If not configured, allow through (fail open for development)
      return new Response(
        JSON.stringify({ 
          valid: true, 
          warning: 'Turnstile not configured - validation skipped' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body: TurnstileVerifyRequest = await req.json();
    const { token, email, action } = body;

    if (!token) {
      console.log('[verify-turnstile] No token provided');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Token não fornecido' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                     req.headers.get('x-real-ip') ||
                     req.headers.get('cf-connecting-ip') ||
                     'unknown';

    console.log('[verify-turnstile] Verifying token for:', { 
      email: email ? `${email.substring(0, 3)}***` : 'unknown',
      action,
      ip: clientIp.substring(0, 10) + '***',
    });

    // Call Cloudflare siteverify API
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
          remoteip: clientIp,
        }),
      }
    );

    if (!verifyResponse.ok) {
      console.error('[verify-turnstile] Cloudflare API error:', verifyResponse.status);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Erro ao verificar token' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result: TurnstileResponse = await verifyResponse.json();
    
    console.log('[verify-turnstile] Verification result:', {
      success: result.success,
      action: result.action,
      errorCodes: result['error-codes'],
    });

    // Log security event
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Log to audit_logs
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: result.success ? 'TURNSTILE_VERIFIED' : 'TURNSTILE_FAILED',
        entity_type: 'security',
        entity_id: null,
        user_id: '00000000-0000-0000-0000-000000000000', // System user for pre-auth events
        ip_address: clientIp,
        metadata: {
          action,
          email: email ? `${email.substring(0, 3)}***` : null,
          success: result.success,
          errorCodes: result['error-codes'],
        },
        severity: result.success ? 'info' : 'warning',
        module: 'auth',
      });
    } catch (logError) {
      console.error('[verify-turnstile] Failed to log event:', logError);
      // Don't fail the request if logging fails
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          valid: true,
          action: result.action,
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Verificação de segurança falhou. Tente novamente.',
          codes: result['error-codes'],
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  } catch (error) {
    console.error('[verify-turnstile] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Erro interno ao verificar segurança' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
