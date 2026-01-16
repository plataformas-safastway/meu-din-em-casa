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
    const errorText = await response.text();
    throw new Error(`Failed to authenticate with Pluggy: ${errorText}`);
  }

  const data = await response.json();
  return data.apiKey;
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

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { connectionId, institutionId } = await req.json();

    if (!connectionId || !institutionId) {
      throw new Error("Missing connectionId or institutionId");
    }

    const apiKey = await getPluggyApiKey();

    // Create a connect token for Pluggy Widget
    const connectResponse = await fetch(`${PLUGGY_API_URL}/connect_token`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        options: {
          connectorIds: [parseInt(institutionId)],
          clientUserId: user.id,
          webhookUrl: `${supabaseUrl}/functions/v1/pluggy-webhook`,
        },
      }),
    });

    if (!connectResponse.ok) {
      const errorText = await connectResponse.text();
      throw new Error(`Failed to create connect token: ${errorText}`);
    }

    const connectData = await connectResponse.json();

    // Update connection with the access token
    const { error: updateError } = await supabase
      .from("openfinance_connections")
      .update({
        status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (updateError) {
      throw updateError;
    }

    // Generate Pluggy Connect URL
    const connectUrl = `https://connect.pluggy.ai/?accessToken=${connectData.accessToken}`;

    return new Response(
      JSON.stringify({
        connectUrl,
        accessToken: connectData.accessToken,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error starting consent flow:", error);
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
