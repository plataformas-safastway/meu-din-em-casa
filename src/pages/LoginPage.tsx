import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, KeyRound, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    // Check if coming from password reset link
    if (searchParams.get('reset') === 'true') {
      setMode("reset");
    }
    // Check if coming from signup page with forgotPassword state
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
      toast.error("Erro ao entrar", {
        description: "E-mail ou senha incorretos. Tente novamente."
      });
      setLoading(false);
      return;
    }

    toast.success("Bem-vindo de volta! 👋");
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
      toast.error("Erro ao enviar e-mail", {
        description: "Verifique se o e-mail está correto e tente novamente."
      });
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
      toast.error("Erro ao redefinir senha", {
        description: "Tente novamente ou solicite um novo link."
      });
      setLoading(false);
      return;
    }

    setPasswordReset(true);
    setLoading(false);
  };

  const goBack = () => {
    if (mode === "forgot" || mode === "reset") {
      setMode("login");
      setEmailSent(false);
      setPasswordReset(false);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {/* Login Mode */}
          {mode === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💰</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Entrar na conta
                </h1>
                <p className="text-muted-foreground">
                  Acesse as finanças da sua família
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
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
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Não tem uma conta?{" "}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Criar conta
                </Link>
              </p>
            </motion.div>
          )}

          {/* Forgot Password Mode */}
          {mode === "forgot" && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {emailSent ? "E-mail enviado!" : "Recuperar senha"}
                </h1>
                <p className="text-muted-foreground">
                  {emailSent 
                    ? "Verifique sua caixa de entrada e spam"
                    : "Enviaremos um link para redefinir sua senha"}
                </p>
              </div>

              {!emailSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar link de recuperação"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          E-mail enviado para {email}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Clique no link do e-mail para criar uma nova senha.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline"
                    size="lg" 
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

              <p className="text-center text-sm text-muted-foreground mt-6">
                Lembrou a senha?{" "}
                <button 
                  onClick={() => setMode("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Voltar ao login
                </button>
              </p>
            </motion.div>
          )}

          {/* Reset Password Mode */}
          {mode === "reset" && (
            <motion.div
              key="reset"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {passwordReset ? "Senha redefinida!" : "Nova senha"}
                </h1>
                <p className="text-muted-foreground">
                  {passwordReset 
                    ? "Você já pode acessar sua conta"
                    : "Crie uma nova senha segura"}
                </p>
              </div>

              {!passwordReset ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-12 pr-10"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-12"
                      autoComplete="new-password"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redefinindo...
                      </>
                    ) : (
                      "Redefinir senha"
                    )}
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Senha alterada com sucesso!
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Use sua nova senha para acessar sua conta.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full h-12 text-base font-semibold"
                    onClick={() => {
                      setMode("login");
                      setPasswordReset(false);
                    }}
                  >
                    Ir para o login
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
