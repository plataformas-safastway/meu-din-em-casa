import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import { logAuthStage } from "@/lib/authDebug";
import { logLifecycle, isLifecycleDebugEnabled } from "@/lib/lifecycleTracer";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { useTurnstile } from "@/hooks/useTurnstile";
import { isTurnstileConfigured } from "@/lib/turnstile/config";
import { recordFailedAttempt, clearFailedAttempts } from "@/lib/turnstile/riskAssessment";
import oikMarca from "@/assets/oik-marca.png";

type Mode = "login" | "forgot" | "reset";

// Session key for draft persistence
const LOGIN_DRAFT_KEY = 'login_form_email';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { signIn, resetPassword, updatePassword } = useAuth();
  
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [verifyingTurnstile, setVerifyingTurnstile] = useState(false);
  
  // Track component identity to detect remount
  const instanceIdRef = useRef(`login_${Date.now()}`);

  // Turnstile integration for bot protection
  const {
    token: turnstileToken,
    isReady: turnstileReady,
    isLoading: turnstileLoading,
    error: turnstileError,
    requiresChallenge,
    containerRef: turnstileContainerRef,
    reset: resetTurnstile,
  } = useTurnstile({
    action: 'login',
    invisible: true,
    onError: (err) => {
      console.error('[LoginPage] Turnstile error:', err);
    },
  });

  // Draft persistence for email (not password for security)
  // Uses localStorage with 24-hour expiry (cleared on successful login)
  const { restoredDraft, wasRestored, saveDraft, clearDraft } = useDraftPersistence<{ email: string }>(
    LOGIN_DRAFT_KEY,
    { debounceMs: 500 }
  );

  // Clear login form when component mounts after a logout
  // This ensures the form is always clean on a fresh page load
  // NOTE: The useDraftPersistence hook also checks this flag to prevent restoration race condition
  useEffect(() => {
    const wasLoggedOut = sessionStorage.getItem('oik:just_logged_out');
    if (wasLoggedOut) {
      // Remove flag first to prevent re-triggering
      sessionStorage.removeItem('oik:just_logged_out');
      // Clear email draft and reset form state
      clearDraft();
      setEmail("");
      setPassword("");
      console.log('[LoginPage] Form cleared after logout');
    }
  }, [clearDraft]);

  // Lifecycle tracing for debugging tab-switch resets
  useEffect(() => {
    logLifecycle('MOUNT', 'LoginPage');
    
    if (isLifecycleDebugEnabled()) {
      console.log('[LoginPage] Instance ID:', instanceIdRef.current);
    }
    
    return () => {
      logLifecycle('UNMOUNT', 'LoginPage');
      if (isLifecycleDebugEnabled()) {
        console.log('[LoginPage] Unmounted, instance:', instanceIdRef.current);
      }
    };
  }, []);

  // Restore draft email on mount
  useEffect(() => {
    if (restoredDraft?.email && !email) {
      setEmail(restoredDraft.email);
      if (wasRestored) {
        console.log('[LoginPage] Email restored from draft');
      }
    }
  }, [restoredDraft, wasRestored, email]);

  // Save email draft on change (not password for security)
  useEffect(() => {
    if (email) {
      saveDraft({ email });
    }
  }, [email, saveDraft]);

  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      setMode("reset");
    }
    if (location.state?.forgotPassword) {
      setMode("forgot");
    }
  }, [searchParams, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    logAuthStage('AUTH_INIT_START', { context: 'login_submit' });
    
    try {
      // Step 1: Verify Turnstile if required and configured
      if (isTurnstileConfigured() && requiresChallenge && turnstileToken) {
        setVerifyingTurnstile(true);
        console.log('[LoginPage] Verifying Turnstile token...');
        
        const { data: verifyResult, error: verifyError } = await supabase.functions.invoke('verify-turnstile', {
          body: {
            token: turnstileToken,
            email,
            action: 'login',
          },
        });

        setVerifyingTurnstile(false);

        if (verifyError || !verifyResult?.valid) {
          console.error('[LoginPage] Turnstile verification failed:', verifyError || verifyResult);
          setLoginError('Verificação de segurança falhou. Tente novamente.');
          toast.error('Verificação de segurança falhou');
          resetTurnstile();
          setLoading(false);
          return;
        }
        
        console.log('[LoginPage] Turnstile verified successfully');
      }

      // Step 2: Perform login
      // Defensive: in some edge cases (test env / unexpected auth layer failure),
      // signIn can resolve to undefined; never destructure without a guard.
      const result = await signIn(email, password);
      const error = result?.error ?? null;

      if (error) {
        logAuthStage('AUTH_ERROR', { 
          context: 'signIn',
          error: error.message,
        });
        
        // Record failed attempt for progressive security
        recordFailedAttempt(email);
        resetTurnstile();
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          setLoginError("E-mail ou senha incorretos");
          toast.error("E-mail ou senha incorretos");
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError("Por favor, confirme seu e-mail antes de entrar");
          toast.error("Por favor, confirme seu e-mail");
        } else if (error.message.includes('refresh_token')) {
          // Refresh token error - try to clear and retry
          setLoginError("Sessão anterior expirada. Tentando reconectar...");
          localStorage.removeItem('sb-wnagybpurqweowmievji-auth-token');
          // Retry login after clearing
          const retryResult = await signIn(email, password);
          if (retryResult?.error) {
            setLoginError("Erro ao entrar. Tente novamente.");
            toast.error("Erro ao entrar. Tente novamente.");
            return;
          }
        } else {
          setLoginError("Erro ao entrar. Verifique suas credenciais.");
          toast.error("E-mail ou senha incorretos");
        }
        return;
      }

      // ============================================================
      // SUCCESSFUL LOGIN - CLEAR HARD LOGOUT FLAG
      // ============================================================
      // This allows auto-login to work again (until next explicit logout)
      try {
        localStorage.removeItem('oik:logout_required');
        console.log('[LoginPage] Manual login successful - logout_required flag CLEARED');
      } catch (e) {
        console.warn('[LoginPage] Failed to clear logout_required flag:', e);
      }
      // ============================================================

      // Clear failed attempts on successful login
      clearFailedAttempts();
      
      // Clear email draft on successful login (no longer needed)
      clearDraft();
      
      logAuthStage('AUTH_USER_READY', { context: 'login_success' });

      const nextParam = searchParams.get("next");
      const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

      const from = (location.state as any)?.from as
        | { pathname?: string; search?: string }
        | undefined;

      let redirectTo = safeNext ?? (from?.pathname ? `${from.pathname}${from.search ?? ""}` : null);

      // If no explicit redirect, check user access and decide
      if (!redirectTo) {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (userId) {
          // Check dashboard access
          const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: userId });
          const dashboardRoles = ['admin', 'admin_master', 'cs', 'customer_success', 'financeiro', 'tecnologia', 'suporte', 'diretoria', 'gestao_estrategica'];
          const hasDashboardAccess = roleData ? dashboardRoles.includes(roleData) : false;

          // Check app access - get ALL families for the user
          const { data: familyMembers } = await supabase
            .from('family_members')
            .select('id, family_id')
            .eq('user_id', userId);
          
          const familiesCount = familyMembers?.length ?? 0;
          const hasAppAccess = familiesCount > 0;
          const hasMultipleFamilies = familiesCount > 1;

          // Decide redirect based on access
          if (hasAppAccess && hasDashboardAccess) {
            // Both accesses - show context selector
            redirectTo = "/select-context";
          } else if (hasDashboardAccess) {
            // Only dashboard
            redirectTo = "/admin";
          } else if (hasMultipleFamilies) {
            // Multiple families - show family selector
            redirectTo = "/select-family";
          } else if (hasAppAccess) {
            // Only one family - go directly to app
            redirectTo = "/app";
          } else {
            // No family yet - go to signup to create/join family
            redirectTo = "/signup";
          }
        } else {
          redirectTo = "/app";
        }
      }

      toast.success("Bem-vindos de volta");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error("[Login] handleLogin failed", err);
      logAuthStage('AUTH_ERROR', { 
        context: 'login_exception',
        error: err instanceof Error ? err.message : String(err),
      });
      recordFailedAttempt(email);
      resetTurnstile();
      setLoginError("Erro ao entrar. Tente novamente.");
      toast.error("Erro ao entrar. Tente novamente.");
    } finally {
      setLoading(false);
      setVerifyingTurnstile(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);

    if (error) {
      toast.error("Verifique se o e-mail está correto");
      setLoading(false);
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast.error("Preencha todos os campos");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword);

    if (error) {
      toast.error("Erro ao redefinir senha. Tente novamente.");
      setLoading(false);
      return;
    }

    setPasswordReset(true);
    setLoading(false);
  };

  // Forgot Password View
  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={oikMarca} alt="Oik" className="h-12 object-contain opacity-90" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Recuperar acesso
            </h1>
            <p className="text-muted-foreground text-sm">
              Enviaremos um link para seu e-mail
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                autoComplete="email"
                required
              />

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-medium transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Enviar link"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                E-mail enviado para <span className="text-foreground font-medium">{email}</span>
              </p>
              <Button 
                variant="outline"
                className="w-full h-12 rounded-xl"
                onClick={() => {
                  setEmailSent(false);
                  setEmail("");
                }}
              >
                Enviar novamente
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setEmailSent(false);
            }}
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Reset Password View
  if (mode === "reset") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img src={oikMarca} alt="Oik" className="h-12 object-contain opacity-90" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              Nova senha
            </h1>
            <p className="text-muted-foreground text-sm">
              Escolha uma senha segura
            </p>
          </div>

          {!passwordReset ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-12 pr-10 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                autoComplete="new-password"
                required
              />

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-medium transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Senha alterada com sucesso
              </p>
              <Button 
                className="w-full h-12 rounded-xl font-medium"
                onClick={() => {
                  setMode("login");
                  setPasswordReset(false);
                }}
              >
                Continuar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Login View - OIK PREMIUM
  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
      
      {/* Organic shape accent */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Main Content - Centered */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="w-full max-w-sm space-y-10">
          {/* Brand Block - More prominence */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <img 
                src={oikMarca} 
                alt="Oik" 
                className="h-20 sm:h-24 object-contain drop-shadow-sm"
              />
            </div>
            
            {/* Slogan in 2 lines with more presence */}
            <div className="space-y-1">
              <p className="text-lg text-foreground/80 font-medium tracking-wide">
                Você não precisa amar planilhas.
              </p>
              <p className="text-lg text-muted-foreground font-normal tracking-wide">
                Só precisa saber onde está pisando.
              </p>
            </div>
          </div>

          {/* Login Form - Premium inputs */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-secondary/40 border border-border/50 placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-300"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12 rounded-xl bg-secondary/40 border border-border/50 placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all duration-300"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors duration-300 p-1"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error message display */}
            {loginError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Turnstile error display */}
            {turnstileError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{turnstileError}</span>
              </div>
            )}

            {/* Security challenge indicator (when required) */}
            {requiresChallenge && isTurnstileConfigured() && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 text-muted-foreground text-sm">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 text-primary" />
                <span>Verificação de segurança ativa</span>
              </div>
            )}

            {/* Invisible Turnstile container */}
            <div 
              ref={turnstileContainerRef} 
              className="turnstile-container"
              aria-hidden="true"
            />

            <div className="pt-3 space-y-4">
              {/* Premium Button with gradient and shadow */}
              <Button 
                type="submit" 
                className="w-full h-12 font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/95 hover:to-primary/85 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 active:scale-[0.98] transition-all duration-300"
                disabled={loading || verifyingTurnstile || (requiresChallenge && isTurnstileConfigured() && !turnstileToken && turnstileLoading)}
              >
                {loading || verifyingTurnstile ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
              
              {/* Emotional microcopy */}
              <p className="text-center text-sm text-muted-foreground/70 font-light">
                Organizar a vida financeira pode ser mais leve.
              </p>
            </div>
          </form>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between text-sm pt-2">
            <Link 
              to="/signup" 
              className="text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-muted-foreground hover:text-primary transition-colors duration-300"
            >
              Esqueci a senha
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative pb-8 px-6 text-center z-10">
        <p className="text-xs text-muted-foreground/50 leading-relaxed">
          Ao continuar, você concorda com os{" "}
          <Link 
            to="/termos" 
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors duration-300"
          >
            Termos
          </Link>
          {" e "}
          <Link 
            to="/privacidade" 
            className="underline underline-offset-2 hover:text-muted-foreground transition-colors duration-300"
          >
            Privacidade
          </Link>
        </p>
      </footer>
    </div>
  );
}
