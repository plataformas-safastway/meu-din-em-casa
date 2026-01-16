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
            className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
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

  // Main Login View - CLEAN
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-10">
          {/* App Name & Slogan */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-semibold text-foreground">
              Finanças em Família
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Organizando o dinheiro da família com clareza e tranquilidade.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pr-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 font-medium"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          {/* Secondary Actions */}
          <div className="text-center space-y-3">
            <Link 
              to="/signup" 
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="block w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Esqueci minha senha
            </button>
          </div>
        </div>
      </main>

      {/* Footer - Policies */}
      <footer className="pb-8 px-6 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ao entrar, vocês concordam com nossos{" "}
          <a 
            href="/termos" 
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Termos de Uso
          </a>{" "}
          e{" "}
          <a 
            href="/privacidade" 
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
