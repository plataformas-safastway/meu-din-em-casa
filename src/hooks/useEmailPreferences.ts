import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailPreferences {
  id?: string;
  security_enabled: boolean;
  financial_enabled: boolean;
  goals_enabled: boolean;
  education_enabled: boolean;
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  security_enabled: true,
  financial_enabled: true,
  goals_enabled: true,
  education_enabled: true,
};

export function useEmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user, family } = useAuth();
  const currentFamilyId = family?.id;
  const { toast } = useToast();

  const fetchPreferences = useCallback(async () => {
    if (!user?.id || !currentFamilyId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', currentFamilyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching email preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          id: data.id,
          security_enabled: data.security_enabled,
          financial_enabled: data.financial_enabled,
          goals_enabled: data.goals_enabled,
          education_enabled: data.education_enabled,
        });
      } else {
        // No preferences yet, use defaults
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, currentFamilyId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = async (updates: Partial<EmailPreferences>) => {
    if (!user?.id || !currentFamilyId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado para alterar preferências.',
      });
      return false;
    }

    // Security cannot be disabled
    if ('security_enabled' in updates && updates.security_enabled === false) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'Notificações de segurança não podem ser desativadas.',
      });
      return false;
    }

    try {
      setIsSaving(true);

      const newPreferences = {
        ...preferences,
        ...updates,
        security_enabled: true, // Always true
      };

      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          id: preferences.id,
          user_id: user.id,
          family_id: currentFamilyId,
          security_enabled: true,
          financial_enabled: newPreferences.financial_enabled,
          goals_enabled: newPreferences.goals_enabled,
          education_enabled: newPreferences.education_enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,family_id',
        });

      if (error) {
        console.error('Error updating email preferences:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao salvar',
          description: 'Não foi possível atualizar suas preferências.',
        });
        return false;
      }

      setPreferences(newPreferences);
      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de e-mail foram atualizadas.',
      });
      return true;
    } catch (err) {
      console.error('Error in updatePreferences:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar as preferências.',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreferences,
    refetch: fetchPreferences,
  };
}
