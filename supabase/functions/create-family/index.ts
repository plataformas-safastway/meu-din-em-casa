import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation constants
const MAX_NAME_LENGTH = 100;
const MAX_FAMILY_NAME_LENGTH = 100;
const MAX_MEMBERS_COUNT = 50;
const MAX_INCOME_RANGE_LENGTH = 50;
const MAX_OBJECTIVE_LENGTH = 200;

type CreateFamilyBody = {
  name: string;
  membersCount: number;
  incomeRange?: string | null;
  primaryObjective?: string | null;
  displayName: string;
  cpf?: string | null;
  birthDate?: string | null;
};

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function validateBody(body: unknown): { valid: true; data: CreateFamilyBody } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  // Validate family name
  const familyName = sanitizeString(b.name, MAX_FAMILY_NAME_LENGTH);
  if (!familyName || familyName.length < 1) {
    return { valid: false, error: "Family name is required (max 100 characters)" };
  }

  // Validate display name
  const displayName = sanitizeString(b.displayName, MAX_NAME_LENGTH);
  if (!displayName || displayName.length < 1) {
    return { valid: false, error: "Display name is required (max 100 characters)" };
  }

  // Validate members count
  const membersCount = Number(b.membersCount);
  if (!Number.isFinite(membersCount) || membersCount < 1 || membersCount > MAX_MEMBERS_COUNT) {
    return { valid: false, error: `Members count must be between 1 and ${MAX_MEMBERS_COUNT}` };
  }

  // Validate optional fields
  const incomeRange = b.incomeRange ? sanitizeString(b.incomeRange, MAX_INCOME_RANGE_LENGTH) : null;
  const primaryObjective = b.primaryObjective ? sanitizeString(b.primaryObjective, MAX_OBJECTIVE_LENGTH) : null;
  const cpf = b.cpf ? sanitizeString(b.cpf, 11)?.replace(/\D/g, "") : null;
  const birthDate = b.birthDate ? sanitizeString(b.birthDate, 10) : null;

  return {
    valid: true,
    data: {
      name: familyName,
      displayName,
      membersCount: Math.floor(membersCount),
      incomeRange,
      primaryObjective,
      cpf,
      birthDate,
    },
  };
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

    // Parse and validate body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const validation = validateBody(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = validation.data;
    const familyId = crypto.randomUUID();

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error: familyError } = await adminClient.from("families").insert({
      id: familyId,
      name: body.name,
      members_count: body.membersCount,
      income_range: body.incomeRange,
      primary_objective: body.primaryObjective,
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
      display_name: body.displayName,
      role: "owner",
      cpf: body.cpf || null,
      birth_date: body.birthDate || null,
    });

    if (memberError) {
      console.error("create-family: family_members insert error", memberError);
      return new Response(JSON.stringify({ error: "Failed to create family member" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create user_onboarding record for the new user/family
    // This is required for authorization checks in the App
    const { error: onboardingError } = await adminClient.from("user_onboarding").upsert({
      user_id: userData.user.id,
      family_id: familyId,
      status: "not_started",
      has_seen_welcome: false,
      step_account_created_at: new Date().toISOString(),
    }, {
      onConflict: "user_id",
    });

    if (onboardingError) {
      console.error("create-family: user_onboarding insert error", onboardingError);
      // Non-critical, continue - the onboarding hook will create this if missing
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
