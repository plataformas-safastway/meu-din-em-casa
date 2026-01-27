import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type AdminRole = 'CS' | 'ADMIN' | 'LEGAL' | 'MASTER';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  admin_role: AdminRole;
  is_active: boolean;
  must_change_password: boolean;
  mfa_required: boolean;
  mfa_verified: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Generate a strong random password
export function generateStrongPassword(length: number = 20): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Get current user's admin role
export function useCurrentAdminRole() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['current-admin-role', user?.id],
    queryFn: async (): Promise<AdminRole | null> => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .rpc('get_admin_role', { _user_id: user.id });
      
      if (error) {
        console.error('[useCurrentAdminRole] Error:', error);
        return null;
      }
      
      return data as AdminRole | null;
    },
    enabled: !!user,
  });
}

// Check if current user can manage admin users
export function useCanManageAdmins() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-manage-admins', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .rpc('can_manage_admins', { _user_id: user.id });
      
      if (error) {
        console.error('[useCanManageAdmins] Error:', error);
        return false;
      }
      
      return data ?? false;
    },
    enabled: !!user,
  });
}

// List all admin users
export function useAdminUsersList() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('[useAdminUsersList] Error:', error);
        throw error;
      }
      
      return (data || []) as AdminUser[];
    },
    enabled: !!user,
  });
}

// Create admin user
export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (params: {
      email: string;
      displayName?: string;
      adminRole: AdminRole;
      mfaRequired?: boolean;
    }): Promise<{ adminUser: AdminUser; tempPassword: string }> => {
      if (!user) throw new Error('Not authenticated');
      
      const tempPassword = generateStrongPassword(20);
      
      // Create auth user via edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke('create-master-user', {
        body: {
          email: params.email,
          password: tempPassword,
          role: params.adminRole,
          displayName: params.displayName,
        },
      });
      
      if (fnError || fnData?.error) {
        throw new Error(fnData?.error || fnError?.message || 'Erro ao criar usuário');
      }
      
      const newUserId = fnData.userId;
      
      // Create admin_users record
      const { data: adminUser, error: insertError } = await supabase
        .from('admin_users')
        .insert({
          user_id: newUserId,
          email: params.email,
          display_name: params.displayName || params.email.split('@')[0],
          admin_role: params.adminRole,
          is_active: true,
          must_change_password: true,
          mfa_required: params.mfaRequired ?? false,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[useCreateAdminUser] Insert error:', insertError);
        throw new Error('Usuário criado mas falhou ao registrar como admin');
      }
      
      return {
        adminUser: adminUser as AdminUser,
        tempPassword,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Update admin user
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (params: {
      id: string;
      adminRole?: AdminRole;
      isActive?: boolean;
      mustChangePassword?: boolean;
      mfaRequired?: boolean;
      displayName?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const updateData: Record<string, unknown> = {
        updated_by: user.id,
      };
      
      if (params.adminRole !== undefined) updateData.admin_role = params.adminRole;
      if (params.isActive !== undefined) updateData.is_active = params.isActive;
      if (params.mustChangePassword !== undefined) updateData.must_change_password = params.mustChangePassword;
      if (params.mfaRequired !== undefined) updateData.mfa_required = params.mfaRequired;
      if (params.displayName !== undefined) updateData.display_name = params.displayName;
      
      const { data, error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw error;
      return data as AdminUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Delete admin user (MASTER only)
export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      toast.success('Usuário removido');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Get admin audit logs
export function useAdminAuditLogs(options?: { limit?: number; eventType?: string }) {
  return useQuery({
    queryKey: ['admin-audit-logs', options],
    queryFn: async () => {
      let query = supabase
        .from('dashboard_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit ?? 100);
      
      if (options?.eventType) {
        query = query.ilike('event_type', `%${options.eventType}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
  });
}

// Log admin login event
export function useLogAdminLogin() {
  return useMutation({
    mutationFn: async (params: { success: boolean; blockedReason?: string }) => {
      const { error } = await supabase.rpc('log_admin_login', {
        _success: params.success,
        _blocked_reason: params.blockedReason || null,
      });
      
      if (error) {
        console.error('[useLogAdminLogin] Error:', error);
      }
    },
  });
}

// Validate if caller can change admin role
export function useCanChangeAdminRole() {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (params: { targetId: string; newRole: AdminRole }): Promise<boolean> => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('can_change_admin_role', {
        _caller_id: user.id,
        _target_id: params.targetId,
        _new_role: params.newRole,
      });
      
      if (error) {
        console.error('[useCanChangeAdminRole] Error:', error);
        return false;
      }
      
      return data ?? false;
    },
  });
}
