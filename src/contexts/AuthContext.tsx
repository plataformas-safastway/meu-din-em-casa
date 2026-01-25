import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Family {
  id: string;
  name: string;
  members_count: number;
  income_range: string | null;
  primary_objective: string | null;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  role: 'owner' | 'member';
  avatar_url?: string | null;
  phone_e164?: string | null;
  phone_country?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  family: Family | null;
  familyMember: FamilyMember | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; user?: User | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  createFamily: (data: {
    name: string;
    displayName: string;
    membersCount: number;
    incomeRange?: string;
    primaryObjective?: string;
    cpf?: string;
    birthDate?: string;
  }) => Promise<{ error: Error | null }>;
  joinFamily: (familyId: string, displayName: string, cpf?: string, birthDate?: string) => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  refreshFamily: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFamilyData = async (userId: string) => {
    try {
      // Get family member record - order by last_active_at to get the most recent active family
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .order('last_active_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching family member:', memberError);
        setFamilyMember(null);
        setFamily(null);
        return;
      }

      if (memberData) {
        setFamilyMember(memberData as FamilyMember);

        // Get family data
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', memberData.family_id)
          .single();

        if (familyError) {
          console.error('Error fetching family:', familyError);
          setFamily(null);
          return;
        }

        setFamily(familyData as Family);
        
        // Update last_active_at for this family (silently)
        supabase
          .from('family_members')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', memberData.id)
          .then(() => {});
      } else {
        setFamilyMember(null);
        setFamily(null);
      }
    } catch (error) {
      console.error('Error in fetchFamilyData:', error);
      setFamilyMember(null);
      setFamily(null);
    }
  };

  useEffect(() => {
    // Set up auth state change listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(() => fetchFamilyData(session.user.id), 0);
        } else {
          setFamily(null);
          setFamilyMember(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchFamilyData(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null, user: data?.user };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setFamily(null);
    setFamilyMember(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });
    return { error: error as Error | null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error: error as Error | null };
  };

  const getAuthenticatedUser = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user ?? null;

    if (sessionError || !currentUser) {
      console.error('Session error:', sessionError);
      return { user: null, error: new Error('Usuário não autenticado. Por favor, faça login novamente.') };
    }

    return { user: currentUser, error: null as Error | null };
  };

  const createFamily = async (data: {
    name: string;
    displayName: string;
    membersCount: number;
    incomeRange?: string;
    primaryObjective?: string;
    cpf?: string;
    birthDate?: string;
  }) => {
    const { user: currentUser, error: authError } = await getAuthenticatedUser();

    if (authError || !currentUser) {
      return { error: authError };
    }

    try {
      const { data: resp, error } = await supabase.functions.invoke('create-family', {
        body: {
          name: data.name,
          membersCount: data.membersCount,
          incomeRange: data.incomeRange || null,
          primaryObjective: data.primaryObjective || null,
          displayName: data.displayName,
          cpf: data.cpf || null,
          birthDate: data.birthDate || null,
        },
      });

      if (error) {
        console.error('Error creating family (function):', error);
        return { error: error as Error };
      }

      const familyId = (resp as any)?.familyId as string | undefined;
      if (!familyId) {
        console.warn('create-family did not return familyId');
      }

      await fetchFamilyData(currentUser.id);
      return { error: null };
    } catch (error) {
      console.error('Error in createFamily:', error);
      return { error: error as Error };
    }
  };

  const joinFamily = async (familyId: string, displayName: string, cpf?: string, birthDate?: string) => {
    const { user: currentUser, error: authError } = await getAuthenticatedUser();

    if (authError || !currentUser) {
      return { error: authError };
    }

    try {
      const { error: memberError } = await supabase.from('family_members').insert({
        family_id: familyId,
        user_id: currentUser.id,
        display_name: displayName,
        role: 'member',
        cpf: cpf || null,
        birth_date: birthDate || null,
      });

      if (memberError) {
        console.error('Error joining family:', memberError);
        return { error: memberError as Error };
      }

      await fetchFamilyData(currentUser.id);
      return { error: null };
    } catch (error) {
      console.error('Error in joinFamily:', error);
      return { error: error as Error };
    }
  };

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.functions.invoke('delete-account');

      if (error) {
        console.error('Error deleting account:', error);
        return { error: error as Error };
      }

      await supabase.auth.signOut();
      setFamily(null);
      setFamilyMember(null);
      setUser(null);
      setSession(null);

      return { error: null };
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      return { error: error as Error };
    }
  };

  const refreshFamily = async () => {
    if (user) {
      await fetchFamilyData(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        family,
        familyMember,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        createFamily,
        joinFamily,
        deleteAccount,
        refreshFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
