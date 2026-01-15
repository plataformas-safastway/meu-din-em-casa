import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation constants
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;

interface WelcomeEmailRequest {
  email: string;
  familyName: string;
}

function isValidEmail(email: unknown): email is string {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(trimmed);
}

function sanitizeString(value: unknown, maxLength: number): string {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = rawBody as Record<string, unknown>;

    // Validate email
    if (!isValidEmail(body.email)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required (max 254 characters)" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    const email = (body.email as string).trim();

    // Sanitize family name
    const familyName = sanitizeString(body.familyName, MAX_NAME_LENGTH);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const appUrl = Deno.env.get("APP_URL") || "https://meu-din-em-casa.lovable.app";

    // Escape HTML to prevent XSS in email
    const safeFamilyName = escapeHtml(familyName);

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 40px;">
                    <!-- Header -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <div style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 16px; border-radius: 16px; margin-bottom: 24px;">
                        <span style="font-size: 32px;">🏠</span>
                      </div>
                      <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                        Conta criada com sucesso!
                      </h1>
                      <p style="color: #6b7280; font-size: 16px; margin: 0;">
                        ${safeFamilyName ? `Bem-vindos, ${safeFamilyName}!` : 'Bem-vindos!'}
                      </p>
                    </div>
                    
                    <!-- Main Content -->
                    <div style="margin-bottom: 32px;">
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                        Olá,
                      </p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                        A conta da sua família foi criada com sucesso.
                      </p>
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
                        A partir de agora, vocês já podem organizar as finanças da família com mais clareza, acompanhar os gastos e entender melhor o que está acontecendo com o dinheiro.
                      </p>
                      
                      <!-- Emotional Reinforcement -->
                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                        <p style="color: #166534; font-size: 15px; margin: 0; font-style: italic;">
                          💚 Sem julgamentos, sem complicação. Apenas informação clara para decisões melhores.
                        </p>
                      </div>
                      
                      <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        🔒 Seus dados são privados e acessíveis apenas pela sua família.
                      </p>
                    </div>
                    
                    <!-- CTA Button -->
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${appUrl}/login" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                        Acessar minha conta
                      </a>
                    </div>
                    
                    <!-- Footer -->
                    <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center;">
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 8px 0;">
                        Sejam bem-vindos.
                      </p>
                      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                        Estamos aqui para ajudar a trazer mais tranquilidade para a vida financeira da família.
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Email Footer -->
              <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Meu Din em Casa <onboarding@resend.dev>",
        to: [email],
        subject: "Conta criada com sucesso",
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error");
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Welcome email sent successfully");

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    console.error("Error in send-welcome-email function");
    return new Response(
      JSON.stringify({ error: "An error occurred while sending the email" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
