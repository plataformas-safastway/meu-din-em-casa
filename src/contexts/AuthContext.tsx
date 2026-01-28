import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isInFocusTransition } from '@/hooks/useStableAuth';
import { clearRouteResumeState } from '@/lib/routeResumeGuard';
import { logAuthStage, isAuthDebugEnabled, installAuthErrorHandlers } from '@/lib/authDebug';
import { 
  startAuthFlow, 
  recordAuthStage, 
  recordAuthError,
  wrapAuthRequest 
} from '@/lib/authInstrumentation';
import { setUserContext, addBreadcrumb } from '@/lib/observability';
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

// Bootstrap status to prevent flash/flicker
export type BootstrapStatus = 'initializing' | 'ready';

// Profile status for routing decisions
export type ProfileStatus = 'unknown' | 'loading' | 'incomplete' | 'complete';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  family: Family | null;
  familyMember: FamilyMember | null;
  loading: boolean; // Legacy: true during initial auth check
  bootstrapStatus: BootstrapStatus; // New: 'initializing' until fully ready
  profileStatus: ProfileStatus; // New: profile loading state
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
  const [bootstrapStatus, setBootstrapStatus] = useState<BootstrapStatus>('initializing');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('unknown');
  
  // Refs to prevent race conditions
  const currentUserIdRef = useRef<string | null>(null);
  const fetchAbortControllerRef = useRef<AbortController | null>(null);

  const fetchFamilyData = useCallback(async (userId: string): Promise<boolean> => {
    // Cancel any pending fetch
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    fetchAbortControllerRef.current = abortController;
    
    // Verify this is still the current user
    if (currentUserIdRef.current !== userId) {
      console.log('[Auth] User changed during fetch, aborting');
      return false;
    }

    try {
      setProfileStatus('loading');
      
      // Get family member record - order by last_active_at to get the most recent active family
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .order('last_active_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      // Check if aborted
      if (abortController.signal.aborted || currentUserIdRef.current !== userId) {
        console.log('[Auth] Fetch aborted or user changed');
        return false;
      }

      if (memberError) {
        console.error('[Auth] Error fetching family member:', memberError);
        setFamilyMember(null);
        setFamily(null);
        setProfileStatus('incomplete');
        return true;
      }

      if (memberData) {
        setFamilyMember(memberData as FamilyMember);

        // Get family data
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', memberData.family_id)
          .single();

        // Check if aborted again
        if (abortController.signal.aborted || currentUserIdRef.current !== userId) {
          return false;
        }

        if (familyError) {
          console.error('[Auth] Error fetching family:', familyError);
          setFamily(null);
          setProfileStatus('incomplete');
          return true;
        }

        setFamily(familyData as Family);
        setProfileStatus('complete');
        
        // Update last_active_at for this family (silently, non-blocking)
        supabase
          .from('family_members')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', memberData.id)
          .then(() => {});
          
        return true;
      } else {
        setFamilyMember(null);
        setFamily(null);
        setProfileStatus('incomplete');
        return true;
      }
    } catch (error) {
      if (currentUserIdRef.current === userId) {
        console.error('[Auth] Error in fetchFamilyData:', error);
        setFamilyMember(null);
        setFamily(null);
        setProfileStatus('incomplete');
      }
      return true;
    }
  }, []);

  const completeBootstrap = useCallback(() => {
    setLoading(false);
    setBootstrapStatus('ready');
    logAuthStage('AUTH_LOADING_END', { status: 'complete' });
    console.log('[Auth] Bootstrap complete');
  }, []);

  useEffect(() => {
    let mounted = true;
    
    // Install debug error handlers if enabled
    if (isAuthDebugEnabled()) {
      installAuthErrorHandlers();
    }
    
    const initializeAuth = async () => {
      // Start production instrumentation (always active)
      startAuthFlow();
      
      logAuthStage('AUTH_INIT_START', { path: window.location.pathname });
      addBreadcrumb('auth', 'init_start', { path: window.location.pathname });
      console.log('[Auth] Initializing...');
      
      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          if (!mounted) return;
          
          logAuthStage('AUTH_STATE_CHANGE', { event, hasSession: !!newSession });
          addBreadcrumb('auth', 'state_change', { event, hasSession: !!newSession });
          console.log('[Auth] Auth state change:', event, 'inFocusTransition:', isInFocusTransition());

          // Instrumentation: if we ever transition to a null session, capture full context.
          if (!newSession) {
            recordAuthStage('null_session', {
              event,
              path: `${window.location.pathname}${window.location.search ?? ''}${window.location.hash ?? ''}`,
              inFocusTransition: isInFocusTransition(),
              bootstrapStatus,
              profileStatus,
            });
            console.warn('[Auth] onAuthStateChange received null session', {
              event,
              path: `${window.location.pathname}${window.location.search ?? ''}${window.location.hash ?? ''}`,
              inFocusTransition: isInFocusTransition(),
              bootstrapStatus,
              profileStatus,
              currentUserIdRef: currentUserIdRef.current,
            });
          }
          
          // CRITICAL: If we're in a focus transition and receive a null session,
          // this is likely a temporary state during token refresh. Don't reset state.
          if (!newSession && isInFocusTransition()) {
            console.log('[Auth] Ignoring null session during focus transition - likely token refresh');
            addBreadcrumb('auth', 'null_session_ignored_focus_transition');
            return;
          }
          
          // Update session and user synchronously
          setSession(newSession);
          setUser(newSession?.user ?? null);
          
          // Track current user ID for race condition prevention
          const newUserId = newSession?.user?.id ?? null;
          currentUserIdRef.current = newUserId;
          
          // Update user context for observability
          setUserContext(newUserId);
          
          if (newSession?.user) {
            // Set profile to loading while we fetch
            setProfileStatus('loading');
            recordAuthStage('user_ready', { userId: newSession.user.id });
            
            // Fetch family data and complete bootstrap when done
            // Use setTimeout(0) to avoid Supabase deadlock
            setTimeout(async () => {
              if (!mounted || currentUserIdRef.current !== newSession.user.id) return;
              
              recordAuthStage('profile_start');
              await fetchFamilyData(newSession.user.id);
              recordAuthStage('profile_end', { success: true });
              
              if (mounted && currentUserIdRef.current === newSession.user.id) {
                recordAuthStage('complete');
                completeBootstrap();
              }
            }, 0);
          } else {
            // No user - reset everything
            // Only do this if we're NOT in a focus transition
            console.log('[Auth] Session is null, resetting state');
            recordAuthStage('session_reset', {
              event,
              path: `${window.location.pathname}${window.location.search ?? ''}${window.location.hash ?? ''}`,
            });

            // CRITICAL instrumentation: this reset is the usual precursor to any logout redirect.
            console.error('[Auth] RESET_STATE_DUE_TO_NULL_SESSION', {
              event,
              path: `${window.location.pathname}${window.location.search ?? ''}${window.location.hash ?? ''}`,
              inFocusTransition: isInFocusTransition(),
              bootstrapStatus,
              profileStatus,
              currentUserIdRef: currentUserIdRef.current,
            });
            console.trace('[Auth] reset stack');

            setFamily(null);
            setFamilyMember(null);
            setProfileStatus('unknown');
            setUserContext(null);
            recordAuthStage('complete', { reason: 'no_session' });
            completeBootstrap();
          }
        }
      );

      // Get initial session with instrumentation
      logAuthStage('AUTH_SESSION_READ', { context: 'initial' });
      recordAuthStage('getSession_start');
      
      const { data: { session: initialSession }, error: sessionError } = await wrapAuthRequest(
        'getSession',
        () => supabase.auth.getSession()
      );
      
      recordAuthStage('getSession_end', { 
        hasSession: !!initialSession, 
        error: sessionError?.message,
      });
      
      if (sessionError) {
        logAuthStage('AUTH_ERROR', { 
          context: 'getSession',
          error: sessionError.message,
        });
        recordAuthError(sessionError.message, { context: 'getSession' });
        console.error('[Auth] Error getting session:', sessionError);
      }
      
      if (!mounted) {
        subscription.unsubscribe();
        return;
      }
      
      console.log('[Auth] Initial session:', initialSession ? 'exists' : 'none');
      logAuthStage('AUTH_USER_READY', { 
        hasSession: !!initialSession,
        userId: initialSession?.user?.id,
      });
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      currentUserIdRef.current = initialSession?.user?.id ?? null;
      
      // Set user context for observability
      if (initialSession?.user) {
        setUserContext(initialSession.user.id);
        recordAuthStage('user_ready', { userId: initialSession.user.id });
      }
      
      if (initialSession?.user) {
        setProfileStatus('loading');
        recordAuthStage('profile_start');
        await fetchFamilyData(initialSession.user.id);
        recordAuthStage('profile_end', { success: true });
      } else {
        setProfileStatus('unknown');
      }
      
      if (mounted) {
        recordAuthStage('complete', { 
          hasSession: !!initialSession,
          source: 'initial_load',
        });
        completeBootstrap();
      }
      
      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();

    return () => {
      mounted = false;
      // Cancel any pending fetches
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
    };
  }, [fetchFamilyData, completeBootstrap]);

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
    // Reset profile status before sign in
    setProfileStatus('loading');
    setBootstrapStatus('initializing');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setProfileStatus('unknown');
      setBootstrapStatus('ready');
    }
    // On success, onAuthStateChange will handle the rest
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Ensure we don't restore a previous protected route after a real logout.
    clearRouteResumeState();

    // Cancel any pending fetches
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    // Reset state before signing out
    currentUserIdRef.current = null;
    setFamily(null);
    setFamilyMember(null);
    setProfileStatus('unknown');
    
    await supabase.auth.signOut();
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

      // Cancel pending fetches
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      
      currentUserIdRef.current = null;
      await supabase.auth.signOut();
      setFamily(null);
      setFamilyMember(null);
      setUser(null);
      setSession(null);
      setProfileStatus('unknown');

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
        bootstrapStatus,
        profileStatus,
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
