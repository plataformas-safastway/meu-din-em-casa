import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateMasterUserRequest {
  email?: string;
  tempPassword?: string;
  password?: string;
  role?: string;
  displayName?: string;
  action?: 'create' | 'reset_password';
  userId?: string;
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

    // Check if caller is admin (try both app_role and admin_users)
    let callerRole: string | null = null;
    
    // First try get_user_role (for legacy)
    const { data: appRole } = await supabaseAdmin.rpc('get_user_role', {
      _user_id: callerUser.id
    });
    
    if (appRole === 'admin' || appRole === 'admin_master') {
      callerRole = appRole;
    } else {
      // Try admin_users table
      const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('admin_role')
        .eq('user_id', callerUser.id)
        .eq('is_active', true)
        .single();
      
      if (adminUser?.admin_role) {
        callerRole = adminUser.admin_role;
      }
    }

    if (!callerRole || !['admin', 'admin_master', 'ADMIN', 'MASTER'].includes(callerRole)) {
      throw new Error("Apenas administradores podem realizar esta ação");
    }

    const body: CreateMasterUserRequest = await req.json();
    const action = body.action || 'create';

    // Handle password reset
    if (action === 'reset_password') {
      const { userId, password } = body;
      
      if (!userId || !password) {
        throw new Error("userId e password são obrigatórios para reset");
      }

      // Update password via admin API
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );

      if (updateError) {
        console.error("Error resetting password:", updateError);
        throw new Error(`Erro ao resetar senha: ${updateError.message}`);
      }

      // Log the reset event
      await supabaseAdmin
        .from('dashboard_audit_logs')
        .insert({
          actor_admin_id: callerUser.id,
          actor_role: callerRole,
          event_type: 'ADMIN_PASSWORD_RESET_COMPLETED',
          target_user_ref: userId.substring(0, 8) + '****',
          metadata_safe: {
            reset_at: new Date().toISOString()
          }
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Senha resetada com sucesso" 
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Handle user creation
    const { email, tempPassword, password: providedPassword, role, displayName } = body;
    const finalPassword = tempPassword || providedPassword;

    if (!email || !finalPassword) {
      throw new Error("Email e senha são obrigatórios");
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      throw new Error("Usuário com este email já existe");
    }

    // Create the user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    if (!newUser.user) {
      throw new Error("Falha ao criar usuário");
    }

    const userId = newUser.user.id;

    // Add role based on the request
    const finalRole = role || 'admin_master';
    
    // Try to add to user_roles (for legacy support)
    try {
      await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role: finalRole === 'MASTER' ? 'admin_master' : 
                finalRole === 'ADMIN' ? 'admin' : 
                finalRole === 'CS' ? 'cs' : 
                finalRole === 'LEGAL' ? 'cs' : 
                finalRole.toLowerCase()
        });
    } catch (roleError) {
      console.log("user_roles insert skipped:", roleError);
    }

    // Create security settings with must_change_password = true
    try {
      await supabaseAdmin
        .from('user_security_settings')
        .insert({
          user_id: userId,
          must_change_password: true,
          temp_password_created_at: new Date().toISOString()
        });
    } catch (securityError) {
      console.log("user_security_settings insert skipped:", securityError);
    }

    // Log the creation event
    await supabaseAdmin
      .from('dashboard_audit_logs')
      .insert({
        actor_admin_id: callerUser.id,
        actor_role: callerRole,
        event_type: 'ADMIN_USER_CREATED',
        target_user_ref: userId.substring(0, 8) + '****',
        metadata_safe: {
          email_domain: email.split('@')[1],
          role_assigned: finalRole,
          created_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        message: "Usuário criado com sucesso" 
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
