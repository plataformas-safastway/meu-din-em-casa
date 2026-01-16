import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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

    toast.success("Bem-vindos de volta! 👋");
    navigate("/app");
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
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Recuperar senha
            </h1>
            <p className="text-muted-foreground text-sm">
              Enviaremos um link para redefinir sua senha
            </p>
          </div>

          {!emailSent ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                autoComplete="email"
                required
              />

              <Button 
                type="submit" 
                className="w-full h-12"
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
                E-mail enviado para <strong>{email}</strong>. Verifique sua caixa de entrada.
              </p>
              <Button 
                variant="outline"
                className="w-full h-12"
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
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao login
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
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Nova senha
            </h1>
            <p className="text-muted-foreground text-sm">
              Crie uma nova senha para sua conta
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
                  className="h-12 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirmar senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                autoComplete="new-password"
                required
              />

              <Button 
                type="submit" 
                className="w-full h-12"
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
                Senha alterada com sucesso!
              </p>
              <Button 
                className="w-full h-12"
                onClick={() => {
                  setMode("login");
                  setPasswordReset(false);
                }}
              >
                Ir para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Login View - ULTRA CLEAN
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-10">
          {/* 1. App Name */}
          <h1 className="text-center text-3xl font-medium text-foreground tracking-tight">
            Nome do APP
          </h1>

          {/* 2. Fixed Institutional Text */}
          <p className="text-center text-base text-muted-foreground leading-relaxed">
            Sem julgamentos. Sem complicação.
            <br />
            Apenas informação clara para decisões melhores.
          </p>

          {/* 3. Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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
                className="h-12 rounded-xl"
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
                  className="h-12 pr-10 rounded-xl"
                  autoComplete="current-password"
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
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 font-medium rounded-xl"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* 4. Secondary Actions - Side by Side */}
          <div className="flex items-center justify-between">
            <Link 
              to="/signup" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Recuperar senha
            </button>
          </div>
        </div>
      </main>

      {/* 5. Footer - Consent and Legal Links */}
      <footer className="pb-8 px-6 text-center">
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          Ao continuar, vocês concordam com nossos{" "}
          <Link 
            to="/termos" 
            className="underline hover:text-foreground transition-colors"
          >
            Termos de Uso
          </Link>
          {" e "}
          <Link 
            to="/privacidade" 
            className="underline hover:text-foreground transition-colors"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
