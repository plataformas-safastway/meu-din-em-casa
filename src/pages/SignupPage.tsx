import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Users, Target, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OnboardingCategoriesPage } from "./OnboardingCategoriesPage";
import { OnboardingImportStep } from "@/components/OnboardingImportStep";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import oikMarca from "@/assets/oik-marca.png";

type Step = 1 | 2 | 3 | 4 | 5;

const incomeRanges = [
  { value: "5000-10000", label: "R$ 5.000 a R$ 10.000" },
  { value: "10000-20000", label: "R$ 10.000 a R$ 20.000" },
  { value: "20000-35000", label: "R$ 20.000 a R$ 35.000" },
  { value: "35000-50000", label: "R$ 35.000 a R$ 50.000" },
  { value: "50000+", label: "Acima de R$ 50.000" },
];

const objectives = [
  { value: "organize", label: "Organizar as finanças", icon: "📊" },
  { value: "reduce_anxiety", label: "Reduzir ansiedade financeira", icon: "😌" },
  { value: "plan_better", label: "Planejar o futuro", icon: "🎯" },
  { value: "reduce_conflicts", label: "Harmonizar decisões", icon: "🤝" },
  { value: "save_more", label: "Economizar mais", icon: "💰" },
];

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token"); // New secure token
  const legacyInviteId = searchParams.get("invite"); // Legacy family ID (deprecated)

  const { signUp, signIn, user, family, joinFamily, createFamily, deleteAccount } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Redirect to new invite flow if token is present
  useEffect(() => {
    if (inviteToken) {
      navigate(`/invite?token=${inviteToken}`, { replace: true });
    }
  }, [inviteToken, navigate]);

  // For legacy invite links, we can still support them but they're less secure
  const isLegacyInviteFlow = useMemo(() => Boolean(legacyInviteId), [legacyInviteId]);

  // Step 1 - Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");

  // Step 2 - Family
  const [familyName, setFamilyName] = useState("");
  const [membersCount, setMembersCount] = useState(2);

  // Step 3 - Context
  const [incomeRange, setIncomeRange] = useState("");
  const [primaryObjective, setPrimaryObjective] = useState("");

  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  useEffect(() => {
    if (user && family) {
      navigate("/app", { replace: true });
    }

    if (user && !family) {
      setEmail(user.email ?? "");
    }

    if (isLegacyInviteFlow) {
      setStep(1);
    }
  }, [user, family, navigate, isLegacyInviteFlow]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);

    if (!name || !cpf || !birthDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      toast.error("CPF deve ter 11 dígitos");
      return;
    }

    // LEGACY INVITE FLOW (deprecated - use /invite?token= instead)
    if (isLegacyInviteFlow && legacyInviteId) {
      setLoading(true);

      try {
        if (!user) {
          if (!email || !password) {
            toast.error("Preencha todos os campos");
            setLoading(false);
            return;
          }

          const passwordError = validatePassword(password);
          if (passwordError) {
            toast.error(passwordError);
            setLoading(false);
            return;
          }

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

          const { error: signInError } = await signIn(email, password);
          if (signInError) {
            toast.error("Erro ao entrar");
            setLoading(false);
            return;
          }
        }

        const { error: joinError } = await joinFamily(legacyInviteId, name, cpf.replace(/\D/g, ""), birthDate);
        if (joinError) {
          toast.error("Erro ao entrar na família");
          setLoading(false);
          return;
        }

        toast.success("Bem-vindo à família");
        window.location.href = "/app";
      } catch (err) {
        console.error('Invite flow error:', err);
        toast.error("Erro ao aceitar convite");
        setLoading(false);
      }

      return;
    }

    // NORMAL FLOW
    if (user) {
      setStep(2);
      return;
    }

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    setLoading(true);

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

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      toast.error("Erro ao entrar");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();

    if (!familyName) {
      toast.error("Dê um nome para sua família");
      return;
    }

    setStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    const { error } = await createFamily({
      name: familyName,
      displayName: name,
      membersCount: membersCount,
      incomeRange: incomeRange || undefined,
      primaryObjective: primaryObjective || undefined,
      cpf: cpf.replace(/\D/g, ""),
      birthDate: birthDate,
    });

    if (error) {
      console.error('Error creating family:', error);
      toast.error("Erro ao criar família");
      setLoading(false);
      return;
    }

    toast.success("Tudo pronto");
    setLoading(false);
    setStep(4);
  };

  const handleImportNow = () => {
    setStep(5);
  };

  const handleImportSkip = () => {
    window.location.href = "/app";
  };

  const handleCategoryImportComplete = () => {
    window.location.href = "/app";
  };

  const handleCategoryImportSkip = () => {
    window.location.href = "/app";
  };

  const goBack = () => {
    if (step === 1) {
      navigate("/");
    } else if (step === 4 || step === 5) {
      return;
    } else {
      setStep((step - 1) as Step);
    }
  };

  // Step 4 - Optional Import Decision
  if (step === 4) {
    return (
      <OnboardingImportStep
        onImport={handleImportNow}
        onSkip={handleImportSkip}
      />
    );
  }

  // Step 5 - Category Import
  if (step === 5) {
    return (
      <OnboardingCategoriesPage
        onComplete={handleCategoryImportComplete}
        onSkip={handleCategoryImportSkip}
        onBack={() => setStep(4)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Progress - Minimal */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 w-8 rounded-full transition-all duration-500",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm mx-auto w-full"
            >
              {/* Logo + Header */}
              <div className="text-center mb-10">
                <div className="flex justify-center mb-6">
                  <img src={oikMarca} alt="Oik" className="h-10 object-contain opacity-80" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                  {user ? "Completar cadastro" : "Criar sua conta"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  Seus dados são privados e criptografados
                </p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium">Seu nome</Label>
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

                <div className="space-y-1.5">
                  <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      const masked = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                      setCpf(masked || v);
                    }}
                    className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="birthDate" className="text-sm font-medium">Data de nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                    required
                  />
                </div>

                {!user && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
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
                      <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
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
                  </>
                )}

                {user && email && (
                  <p className="text-xs text-muted-foreground">
                    Conta: <span className="font-medium text-foreground">{email}</span>
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-medium rounded-xl transition-all duration-300"
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
                </div>
              </form>

              {/* Email already exists */}
              <AnimatePresence>
                {!user && emailAlreadyExists && (
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
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-10">
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                  Sua família
                </h1>
                <p className="text-muted-foreground text-sm">
                  Como vocês querem se identificar?
                </p>
              </div>

              <form onSubmit={handleStep2} className="space-y-6">
                <div className="space-y-1.5">
                  <Label htmlFor="familyName" className="text-sm font-medium">Nome da família</Label>
                  <Input
                    id="familyName"
                    type="text"
                    placeholder="Ex: Família Silva"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="h-12 rounded-xl bg-secondary/50 border-0 focus-visible:ring-1"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Quantas pessoas?</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMembersCount(n)}
                        className={cn(
                          "h-12 rounded-xl font-medium transition-all duration-300",
                          membersCount === n
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {n}{n === 5 && "+"}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-12 text-base font-medium rounded-xl transition-all duration-300"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
                  Contexto inicial
                </h1>
                <p className="text-muted-foreground text-sm">
                  Opcional. Ajuda a personalizar sua experiência.
                </p>
              </div>

              <form onSubmit={handleStep3} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Renda mensal aproximada</Label>
                  <div className="space-y-2">
                    {incomeRanges.map((range) => (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => setIncomeRange(range.value === incomeRange ? "" : range.value)}
                        className={cn(
                          "w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 text-left",
                          incomeRange === range.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 hover:bg-secondary"
                        )}
                      >
                        <span className="font-medium text-sm">{range.label}</span>
                        {incomeRange === range.value && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Objetivo principal</Label>
                  <div className="space-y-2">
                    {objectives.map((obj) => (
                      <button
                        key={obj.value}
                        type="button"
                        onClick={() => setPrimaryObjective(obj.value === primaryObjective ? "" : obj.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 text-left",
                          primaryObjective === obj.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/50 hover:bg-secondary"
                        )}
                      >
                        <span className="text-lg">{obj.icon}</span>
                        <span className="font-medium text-sm flex-1">{obj.label}</span>
                        {primaryObjective === obj.value && (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full h-12 text-base font-medium rounded-xl transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Começar"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Dados privados. Pertencem apenas à sua família.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
