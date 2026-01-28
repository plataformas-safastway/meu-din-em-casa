import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Users, AlertCircle, CheckCircle2, Mail, Shield, Hand, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useValidateInvite, useAcceptInvite } from "@/hooks/useFamilyInvites";
import { PhoneInput } from "@/components/profile/PhoneInput";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import { toast } from "sonner";
import oikMarca from "@/assets/oik-marca.png";

export function InviteAcceptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { user, signUp, signIn, family } = useAuth();
  const { data: inviteData, isLoading: validating } = useValidateInvite(token);
  const acceptInvite = useAcceptInvite();

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phoneE164, setPhoneE164] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [birthDate, setBirthDate] = useState("");
  const [profession, setProfession] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"invite" | "auth" | "profile">("invite");

  // Pre-fill email if provided in invite
  useEffect(() => {
    if (inviteData?.invited_email && !email) {
      setEmail(inviteData.invited_email);
    }
  }, [inviteData?.invited_email, email]);

  // If user already has family from this invite, redirect
  useEffect(() => {
    if (user && family && inviteData?.family_id === family.id) {
      navigate("/app", { replace: true });
    }
  }, [user, family, inviteData?.family_id, navigate]);

  // Update step based on auth state (skip invite step if already authenticated)
  useEffect(() => {
    if (user && step === "invite") {
      setStep("profile");
    } else if (user && step === "auth") {
      setStep("profile");
    }
  }, [user, step]);

  const handleAcceptClick = () => {
    if (user) {
      setStep("profile");
    } else {
      setStep("auth");
    }
  };

  const handleDeclineClick = () => {
    // Redirect to login without accepting
    navigate("/login", { replace: true });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);

    try {
      // Try to sign in first
      const { error: signInError } = await signIn(email, password);
      
      if (!signInError) {
        // Login successful
        setStep("profile");
        setLoading(false);
        return;
      }

      // If login failed, try to create account
      const { error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        const errorMessage = signUpError.message?.toLowerCase() || "";
        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("already exists")
        ) {
          toast.error("E-mail já cadastrado. Tente fazer login.");
        } else {
          toast.error("Erro ao criar conta");
        }
        setLoading(false);
        return;
      }

      // Sign in after signup
      const { error: loginError } = await signIn(email, password);
      if (loginError) {
        toast.error("Erro ao entrar");
        setLoading(false);
        return;
      }

      setStep("profile");
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Erro ao processar autenticação");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token de convite não encontrado");
      return;
    }

    if (!displayName.trim()) {
      toast.error("Informe seu nome");
      return;
    }

    setLoading(true);

    try {
      const result = await acceptInvite.mutateAsync({
        token,
        displayName: displayName.trim(),
        phoneE164: phoneE164 || null,
        phoneCountry,
        birthDate: birthDate || null,
        profession: profession.trim() || null,
      });

      if (result.success) {
        toast.success(`Bem-vindo à família ${inviteData?.family_name}!`);
        // Force full page reload to refresh auth context
        window.location.href = "/app";
      } else {
        toast.error(result.error_message || "Erro ao aceitar convite");
      }
    } catch (err) {
      console.error("Accept invite error:", err);
      toast.error("Erro ao aceitar convite");
    } finally {
      setLoading(false);
    }
  };

  // Get inviter name with fallback
  const inviterName = inviteData?.inviter_name;
  const hasInviterName = !!inviterName && inviterName.trim().length > 0;

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando convite...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired invite
  if (!token || !inviteData?.is_valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Convite inválido
          </h1>
          <p className="text-muted-foreground mb-6">
            {inviteData?.error_message || "Este convite não existe ou já expirou."}
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate("/login")} className="w-full">
              Fazer login
            </Button>
            <p className="text-sm text-muted-foreground">
              Solicite um novo convite ao proprietário da família.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-center">
        <img src={oikMarca} alt="OIK" className="h-8 object-contain opacity-80" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-md mx-auto w-full"
        >
          {/* Invite Step - Main invite screen with full copy */}
          {step === "invite" && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Title */}
              <h1 className="text-2xl font-semibold text-foreground text-center">
                Você foi convidado para participar de uma família
              </h1>

              {/* Trust Block */}
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Hand className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {hasInviterName ? (
                      <p className="text-foreground font-medium">
                        Você foi convidado por {inviterName}
                      </p>
                    ) : (
                      <p className="text-foreground font-medium">
                        Você recebeu um convite para participar de uma família
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Confirme apenas se você reconhece quem enviou este convite.
                    </p>
                  </div>
                </div>

                {/* Family name badge */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-primary/10">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Família:</span>
                  <span className="text-sm font-medium text-foreground">
                    {inviteData.family_name}
                  </span>
                </div>
              </div>

              {/* Explanatory Text */}
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Ao aceitar este convite, você passará a fazer parte da mesma família no aplicativo.
                </p>
                <p className="text-muted-foreground">
                  Isso significa que vocês poderão:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>visualizar e organizar informações financeiras juntos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>acompanhar orçamento, gastos e objetivos em família</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>tomar decisões financeiras de forma mais clara e alinhada</span>
                  </li>
                </ul>
              </div>

              {/* Security Warning */}
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Importante</p>
                    <p className="text-sm text-muted-foreground">
                      Aceite este convite somente se você conhece quem o enviou e concorda em compartilhar informações financeiras dentro da mesma família.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleAcceptClick}
                  size="lg"
                  className="w-full h-12 text-base font-medium rounded-xl"
                >
                  Aceitar convite
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={handleDeclineClick}
                  variant="ghost"
                  size="lg"
                  className="w-full h-12 text-base font-medium rounded-xl text-muted-foreground"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Recusar convite
                </Button>
              </div>
            </motion.div>
          )}

          {/* Auth Step */}
          {step === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Compact invite reminder */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entrando na família</p>
                    <p className="font-medium text-foreground">{inviteData.family_name}</p>
                  </div>
                </div>
              </div>

              <h1 className="text-xl font-semibold text-foreground mb-2 text-center">
                Entre ou crie sua conta
              </h1>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Para aceitar o convite, faça login ou cadastre-se
              </p>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pl-10 rounded-xl bg-secondary/50 border-0"
                      autoComplete="email"
                      required
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                    autoComplete="current-password"
                    required
                  />
                  <PasswordStrengthIndicator password={password} />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-medium rounded-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("invite")}
                  className="w-full text-muted-foreground"
                >
                  Voltar
                </Button>
              </form>
            </motion.div>
          )}

          {/* Profile Step */}
          {step === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Compact invite reminder */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-6">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Entrando na família</p>
                    <p className="font-medium text-foreground">{inviteData.family_name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">
                  Complete seus dados
                </h1>
              </div>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Apenas informações básicas para sua identificação
              </p>

              <form onSubmit={handleAcceptInvite} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Seu nome *</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Como você quer ser chamado?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <PhoneInput
                    value={phoneE164}
                    countryCode={phoneCountry}
                    onChange={(phone, country) => {
                      setPhoneE164(phone);
                      setPhoneCountry(country);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birthDate">Data de nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input
                    id="profession"
                    type="text"
                    placeholder="Sua profissão (opcional)"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0"
                    maxLength={100}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-medium rounded-xl"
                    disabled={loading || !displayName.trim()}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Entrar na família {inviteData.family_name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Ao continuar, você concorda com nossos{" "}
                <a href="/termos" className="underline">Termos de Uso</a> e{" "}
                <a href="/privacidade" className="underline">Política de Privacidade</a>.
              </p>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
