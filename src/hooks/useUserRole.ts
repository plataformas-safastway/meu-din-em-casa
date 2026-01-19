import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'user' | 'admin' | 'cs';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<AppRole | null> => {
      if (!user) {
        console.log('[useUserRole] No user, returning null');
        return null;
      }

      console.log('[useUserRole] Fetching role for user:', user.id);

      // Use RPC to get highest role (bypasses RLS issues)
      const { data, error } = await supabase.rpc('get_user_role', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useUserRole] Error fetching user role:', error);
        // If no role exists, user might need to be assigned default 'user' role
        return null;
      }

      console.log('[useUserRole] Role fetched:', data);
      return data as AppRole;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute (reduced for faster updates)
  });
}

export function useHasAnyAdmin() {
  return useQuery({
    queryKey: ['has-any-admin'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc('has_any_admin');

      if (error) {
        console.error('Error checking for admin:', error);
        return false;
      }

      return data as boolean;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSetupFirstAdmin() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Check if any admin exists
      const { data: hasAdmin } = await supabase.rpc('has_any_admin');
      
      if (hasAdmin) {
        throw new Error('Admin already exists');
      }

      // Insert first admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin'
        });

      if (error) throw error;

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['has-any-admin'] });
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Check if role already exists
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useIsAdmin() {
  const { data: role, isLoading } = useUserRole();
  return {
    isAdmin: role === 'admin',
    isCS: role === 'cs',
    isAdminOrCS: role === 'admin' || role === 'cs',
    isLoading,
    role,
  };
}
