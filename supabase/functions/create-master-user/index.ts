import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMasterUserRequest {
  email: string;
  tempPassword: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header to verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Não autorizado");
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is admin using regular client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    const { data: { user: callerUser }, error: callerError } = await supabaseClient.auth.getUser();
    if (callerError || !callerUser) {
      throw new Error("Usuário não autenticado");
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin.rpc('get_user_role', {
      _user_id: callerUser.id
    });

    if (callerRole !== 'admin' && callerRole !== 'admin_master') {
      throw new Error("Apenas administradores podem criar usuários MASTER");
    }

    const { email, tempPassword }: CreateMasterUserRequest = await req.json();

    if (!email || !tempPassword) {
      throw new Error("Email e senha são obrigatórios");
    }

    // Check if master user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const masterExists = existingUsers?.users?.some(u => u.email === email);
    
    if (masterExists) {
      throw new Error("Usuário com este email já existe");
    }

    // Create the user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email since we're not sending verification
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error("Falha ao criar usuário");
    }

    const userId = newUser.user.id;

    // Add admin_master role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin_master'
      });

    if (roleError) {
      console.error("Error adding role:", roleError);
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Erro ao atribuir role MASTER");
    }

    // Create security settings with must_change_password = true
    const { error: securityError } = await supabaseAdmin
      .from('user_security_settings')
      .insert({
        user_id: userId,
        must_change_password: true,
        temp_password_created_at: new Date().toISOString()
      });

    if (securityError) {
      console.error("Error creating security settings:", securityError);
      // Continue anyway, this is not critical for creation
    }

    // Log the creation event (without storing the password!)
    await supabaseAdmin
      .from('dashboard_audit_logs')
      .insert({
        actor_admin_id: callerUser.id,
        actor_role: callerRole || 'admin',
        event_type: 'MASTER_USER_CREATED',
        target_user_ref: userId.substring(0, 8) + '****', // Partial ID for audit
        metadata_safe: {
          email_domain: email.split('@')[1],
          created_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: "Usuário MASTER criado com sucesso" 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {
    console.error("Error in create-master-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
