import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { search } = await req.json().catch(() => ({}));

    const apiKey = await getPluggyApiKey();

    // Fetch connectors (institutions)
    let url = `${PLUGGY_API_URL}/connectors?countries=BR&sandbox=false`;
    if (search) {
      url += `&name=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url, {
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch connectors: ${errorText}`);
    }

    const data = await response.json();

    // Filter only active connectors with relevant types
    const connectors = (data.results || []).filter((connector: any) => 
      connector.isOpen && 
      ['PERSONAL_BANK', 'BUSINESS_BANK', 'INVESTMENT'].includes(connector.type)
    );

    return new Response(
      JSON.stringify({ connectors }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error fetching institutions:", error);
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
