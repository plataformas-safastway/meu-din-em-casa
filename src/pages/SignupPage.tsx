import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import oikMarca from "@/assets/oik-marca.png";

/**
 * New Signup Flow - LGPD Compliant
 * - NO CPF on account creation (deferred to "Complete Registration" flow)
 * - Name, Email, Password, Terms acceptance
 * - Redirects to intelligent onboarding wizard after signup
 */
export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");

  const { signUp, signIn, user, family } = useAuth();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  // Redirect to invite flow if token present
  useEffect(() => {
    if (inviteToken) {
      navigate(`/invite?token=${inviteToken}`, { replace: true });
    }
  }, [inviteToken, navigate]);

  // Redirect if already logged in with family
  useEffect(() => {
    if (user && family) {
      navigate("/app", { replace: true });
    }
  }, [user, family, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);

    // Validate fields
    if (!name.trim()) {
      toast.error("Informe seu nome");
      return;
    }

    if (!email.trim()) {
      toast.error("Informe seu e-mail");
      return;
    }

    if (!password) {
      toast.error("Informe uma senha");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (!termsAccepted) {
      toast.error("Você precisa aceitar os termos para continuar");
      return;
    }

    setLoading(true);

    try {
      // Sign up
      const { error: signUpError } = await signUp(email, password);

      if (signUpError) {
        const errorMessage = signUpError.message?.toLowerCase() || "";
        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("user_already_exists")
        ) {
          setEmailAlreadyExists(true);
          setLoading(false);
          return;
        }

        toast.error("Erro ao criar conta");
        setLoading(false);
        return;
      }

      // Sign in immediately
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast.error("Erro ao entrar");
        setLoading(false);
        return;
      }

      // Store name in session storage for the onboarding flow
      sessionStorage.setItem("onboarding_name", name);

      // Redirect to onboarding wizard
      navigate("/onboarding", { replace: true });
    } catch (err) {
      console.error("Signup error:", err);
      toast.error("Erro inesperado ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-sm mx-auto w-full"
        >
          {/* Logo + Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <img src={oikMarca} alt="Oik" className="h-10 object-contain opacity-80" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
              Criar sua conta
            </h1>
            <p className="text-muted-foreground text-sm">
              Seus dados são privados e criptografados
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Seu nome
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Como você quer ser chamado?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                autoComplete="name"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                E-mail
              </Label>
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

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              <PasswordStrengthIndicator password={password} />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                Li e aceito os{" "}
                <Link to="/termos" className="text-primary hover:underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
              </Label>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 text-base font-medium rounded-xl transition-all duration-300"
                disabled={loading || !termsAccepted}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Criar conta e montar meu orçamento
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Email already exists */}
          <AnimatePresence>
            {emailAlreadyExists && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 p-4 rounded-xl bg-secondary/50"
              >
                <p className="text-foreground text-sm font-medium mb-3">
                  Já existe uma conta com este e-mail
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/login")}
                    className="flex-1 rounded-lg"
                  >
                    Entrar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/login", { state: { forgotPassword: true } })}
                    className="flex-1 rounded-lg"
                  >
                    Recuperar senha
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Já tem conta?{" "}
            <Link to="/login" className="text-foreground font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
}
