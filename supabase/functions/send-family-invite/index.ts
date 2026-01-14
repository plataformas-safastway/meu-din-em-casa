import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  familyName: string;
  inviterName: string;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, familyName, inviterName, inviteLink }: InviteEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ message: "Email service not configured" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Convite para ${familyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">💰</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              
              <!-- Header -->
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #18181b; text-align: center;">
                Você foi convidado! 🎉
              </h1>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #71717a; text-align: center; line-height: 1.5;">
                <strong style="color: #18181b;">${inviterName}</strong> convidou você para fazer parte da família <strong style="color: #18181b;">${familyName}</strong> no Meu Din.
              </p>
              
              <!-- Info Box -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.5;">
                  Com o Meu Din, vocês podem organizar as finanças da família de forma colaborativa, acompanhar gastos e planejar o futuro juntos.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      Aceitar convite
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Note -->
              <p style="margin: 24px 0 0 0; font-size: 12px; color: #a1a1aa; text-align: center; line-height: 1.5;">
                Se você não esperava este convite, pode ignorar este e-mail.
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                Meu Din - Finanças em família
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Meu Din <onboarding@resend.dev>",
        to: [email],
        subject: `${inviterName} convidou você para a família ${familyName}`,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Error sending email:", errorData);
      throw new Error(`Failed to send email: ${errorData}`);
    }

    const result = await emailResponse.json();
    console.log("Invite email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-family-invite function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
