import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CreateFamilyBody = {
  name: string;
  membersCount: number;
  incomeRange?: string | null;
  primaryObjective?: string | null;
  displayName: string;
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

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json()) as CreateFamilyBody;

    if (!body?.name?.trim() || !body?.displayName?.trim()) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const membersCount = Number(body.membersCount);
    if (!Number.isFinite(membersCount) || membersCount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid membersCount" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const familyId = crypto.randomUUID();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error: familyError } = await adminClient.from("families").insert({
      id: familyId,
      name: body.name.trim(),
      members_count: membersCount,
      income_range: body.incomeRange ?? null,
      primary_objective: body.primaryObjective ?? null,
    });

    if (familyError) {
      console.error("create-family: families insert error", familyError);
      return new Response(JSON.stringify({ error: "Failed to create family" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: memberError } = await adminClient.from("family_members").insert({
      family_id: familyId,
      user_id: userData.user.id,
      display_name: body.displayName.trim(),
      role: "owner",
    });

    if (memberError) {
      console.error("create-family: family_members insert error", memberError);
      return new Response(JSON.stringify({ error: "Failed to create family member" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // emergency fund is best-effort
    const { error: emergencyError } = await adminClient.from("emergency_funds").insert({
      family_id: familyId,
      target_amount: 0,
      current_amount: 0,
      target_months: 6,
    });

    if (emergencyError) {
      console.error("create-family: emergency_funds insert error", emergencyError);
    }

    return new Response(JSON.stringify({ familyId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("create-family: unexpected error", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
