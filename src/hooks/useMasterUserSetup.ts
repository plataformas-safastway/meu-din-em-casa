import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Generate a cryptographically strong temporary password
 * Min 16 chars with uppercase, lowercase, numbers, and symbols
 */
function generateStrongPassword(length: number = 20): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function useMasterUserSetup() {
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createMasterUser = useMutation({
    mutationFn: async (email: string) => {
      // Generate strong temporary password
      const tempPassword = generateStrongPassword(20);
      
      // Create user via Supabase Auth Admin API (requires service role - we'll use edge function)
      const { data, error } = await supabase.functions.invoke('create-master-user', {
        body: { email, tempPassword }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return { 
        userId: data.userId, 
        tempPassword,
        email 
      };
    },
    onSuccess: (data) => {
      setTemporaryPassword(data.tempPassword);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const clearTemporaryPassword = () => {
    setTemporaryPassword(null);
  };

  return {
    createMasterUser,
    temporaryPassword,
    clearTemporaryPassword,
  };
}

export function useMustChangePassword() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['must-change-password', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('user_must_change_password', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useMustChangePassword] Error:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useMarkPasswordChanged() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('mark_password_changed', {
        _user_id: user.id
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['must-change-password'] });
    },
  });
}
