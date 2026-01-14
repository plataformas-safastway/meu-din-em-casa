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
  }) => Promise<{ error: Error | null }>;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [familyMember, setFamilyMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFamilyData = async (userId: string) => {
    try {
      // Get family member record
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberError) {
        console.error('Error fetching family member:', memberError);
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
          return;
        }

        setFamily(familyData as Family);
      }
    } catch (error) {
      console.error('Error in fetchFamilyData:', error);
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

  const createFamily = async (data: {
    name: string;
    displayName: string;
    membersCount: number;
    incomeRange?: string;
    primaryObjective?: string;
  }) => {
    // Buscar sessão diretamente do Supabase para garantir que está atualizada
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const currentUser = sessionData?.session?.user;

    if (sessionError || !currentUser) {
      console.error('Session error:', sessionError);
      return { error: new Error('Usuário não autenticado. Por favor, faça login novamente.') };
    }

    try {
      // Create family
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          name: data.name,
          members_count: data.membersCount,
          income_range: data.incomeRange || null,
          primary_objective: data.primaryObjective || null,
        })
        .select()
        .single();

      if (familyError) {
        console.error('Error creating family:', familyError);
        return { error: familyError as Error };
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: familyData.id,
          user_id: currentUser.id,
          display_name: data.displayName,
          role: 'owner',
        });

      if (memberError) {
        console.error('Error adding family member:', memberError);
        return { error: memberError as Error };
      }

      // Create default emergency fund
      await supabase
        .from('emergency_funds')
        .insert({
          family_id: familyData.id,
          target_amount: 0,
          current_amount: 0,
          target_months: 6,
        });

      // Send welcome email (non-blocking)
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: currentUser.email,
            familyName: data.name,
          },
        });
      } catch (emailError) {
        // Don't block signup if email fails
        console.log('Welcome email could not be sent:', emailError);
      }

      // Refresh family data
      await fetchFamilyData(currentUser.id);

      return { error: null };
    } catch (error) {
      console.error('Error in createFamily:', error);
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
