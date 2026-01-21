import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import oikLogo from "@/assets/oik-logo.png";

type Mode = "login" | "forgot" | "reset";

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
  const [emailSent, setEmailSent] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

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

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast.error("E-mail ou senha incorretos");
      setLoading(false);
      return;
    }

    const nextParam = searchParams.get("next");
    const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

    const from = (location.state as any)?.from as
      | { pathname?: string; search?: string }
      | undefined;

    let redirectTo = safeNext ?? (from?.pathname ? `${from.pathname}${from.search ?? ""}` : null);

    // Fallback: redirect by role (single login)
    if (!redirectTo) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        const { data: roleData } = await supabase.rpc("get_user_role", { _user_id: userId });
        redirectTo = roleData === "admin" || roleData === "cs" ? "/admin" : "/app";
      } else {
        redirectTo = "/app";
      }
    }

    toast.success("Bem-vindos de volta");
    navigate(redirectTo, { replace: true });

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

    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
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
            <img src={oikLogo} alt="Oik" className="w-12 h-12 object-contain opacity-80" />
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
            <img src={oikLogo} alt="Oik" className="w-12 h-12 object-contain opacity-80" />
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-10">
          {/* Logo + Brand */}
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <img 
                src={oikLogo} 
                alt="Oik" 
                className="w-16 h-16 object-contain"
              />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                Oik
              </h1>
              <p className="text-base text-muted-foreground">
                Tudo no lugar. Os objetivos da família em ordem.
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
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
                  className="h-12 pr-10 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 font-medium rounded-xl transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </div>
          </form>

          {/* Secondary Actions */}
          <div className="flex items-center justify-between text-sm">
            <Link 
              to="/signup" 
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Esqueci a senha
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="pb-8 px-6 text-center">
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
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
