import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Check, Users, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const incomeRanges = [
  { value: "5000-10000", label: "R$ 5.000 a R$ 10.000" },
  { value: "10000-20000", label: "R$ 10.000 a R$ 20.000" },
  { value: "20000-35000", label: "R$ 20.000 a R$ 35.000" },
  { value: "35000-50000", label: "R$ 35.000 a R$ 50.000" },
  { value: "50000+", label: "Acima de R$ 50.000" },
];

const objectives = [
  { value: "organize", label: "Organizar as finanças", icon: "📊" },
  { value: "reduce_anxiety", label: "Reduzir ansiedade sobre dinheiro", icon: "😌" },
  { value: "plan_better", label: "Planejar melhor o futuro", icon: "🎯" },
  { value: "reduce_conflicts", label: "Reduzir conflitos sobre dinheiro", icon: "🤝" },
  { value: "save_more", label: "Economizar mais", icon: "💰" },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, createFamily, user, family } = useAuth();
  
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 - Account (or just "display name" when already logged in)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 2 - Family
  const [familyName, setFamilyName] = useState("");
  const [membersCount, setMembersCount] = useState(2);
  
  // Step 3 - Context
  const [incomeRange, setIncomeRange] = useState("");
  const [primaryObjective, setPrimaryObjective] = useState("");

  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);

  useEffect(() => {
    // If already fully set up, don't let the user sit on /signup.
    if (user && family) {
      navigate("/app", { replace: true });
    }

    // If logged in but missing a family, this page is for completing setup.
    if (user && !family) {
      setEmail(user.email ?? "");
    }
  }, [user, family, navigate]);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailAlreadyExists(false);

    // If user is already authenticated, Step 1 is only to confirm display name.
    if (user) {
      if (!name) {
        toast.error("Preencha seu nome");
        return;
      }
      setStep(2);
      return;
    }
    
    if (!name || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password);

    if (error) {
      // Check if user already exists
      const errorMessage = error.message?.toLowerCase() || "";
      if (
        errorMessage.includes("already registered") ||
        errorMessage.includes("already exists") ||
        errorMessage.includes("user_already_exists")
      ) {
        setEmailAlreadyExists(true);
        setLoading(false);
        return;
      }
      
      toast.error("Erro ao criar conta", {
        description: error.message || "Tente novamente mais tarde."
      });
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
      membersCount,
      incomeRange: incomeRange || undefined,
      primaryObjective: primaryObjective || undefined,
    });

    if (error) {
      toast.error("Erro ao criar família", {
        description: "Tente novamente mais tarde."
      });
      setLoading(false);
      return;
    }

    toast.success("Conta criada com sucesso! 🎉", {
      description: "Bem-vindos! Vamos organizar as finanças da família."
    });
    navigate("/app");
  };

  const goBack = () => {
    if (step === 1) {
      navigate("/");
    } else {
      setStep((step - 1) as Step);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goBack}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-2 w-8 rounded-full transition-colors",
                s <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>
        
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {user ? "Completar cadastro" : "Criar sua conta"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {user
                    ? "Sua conta já existe. Agora vamos configurar sua família."
                    : "Seus dados são privados e criptografados"}
                </p>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Seu nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Como você quer ser chamado?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12"
                    autoComplete="name"
                    required
                  />
                </div>

                {!user && (
                  <>
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
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
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
                  </>
                )}

                {user && email && (
                  <p className="text-xs text-muted-foreground">
                    Conta: <span className="font-medium text-foreground">{email}</span>
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 text-base font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {user ? "Continuando..." : "Criando conta..."}
                    </>
                  ) : (
                    <>
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Email already exists message */}
              <AnimatePresence>
                {!user && emailAlreadyExists && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 rounded-xl bg-muted/40 border border-border"
                  >
                    <p className="text-foreground text-sm font-medium mb-3">
                      Já existe uma conta associada a este e-mail.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/login")}
                        className="flex-1"
                      >
                        Entrar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/login", { state: { forgotPassword: true } })}
                        className="flex-1"
                      >
                        Recuperar senha
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Sobre a família
                </h1>
                <p className="text-muted-foreground text-sm">
                  Como vocês querem se identificar?
                </p>
              </div>

              <form onSubmit={handleStep2} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="familyName">Nome da família</Label>
                  <Input
                    id="familyName"
                    type="text"
                    placeholder="Ex: Família Silva, Casa da Praia"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Quantas pessoas fazem parte?</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setMembersCount(n)}
                        className={cn(
                          "h-12 rounded-xl border-2 font-semibold transition-all",
                          membersCount === n
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
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
                  className="w-full h-12 text-base font-semibold"
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
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-sm mx-auto w-full"
            >
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Contexto inicial
                </h1>
                <p className="text-muted-foreground text-sm">
                  Sem julgamentos. Vocês podem ajustar depois.
                </p>
              </div>

              <form onSubmit={handleStep3} className="space-y-6">
                <div className="space-y-3">
                  <Label>Faixa de renda mensal aproximada (opcional)</Label>
                  <div className="space-y-2">
                    {incomeRanges.map((range) => (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => setIncomeRange(range.value === incomeRange ? "" : range.value)}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                          incomeRange === range.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-medium text-sm">{range.label}</span>
                        {incomeRange === range.value && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Objetivo principal (opcional)</Label>
                  <div className="space-y-2">
                    {objectives.map((obj) => (
                      <button
                        key={obj.value}
                        type="button"
                        onClick={() => setPrimaryObjective(obj.value === primaryObjective ? "" : obj.value)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                          primaryObjective === obj.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="text-xl">{obj.icon}</span>
                        <span className="font-medium text-sm flex-1">{obj.label}</span>
                        {primaryObjective === obj.value && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
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
                      Finalizando...
                    </>
                  ) : (
                    "Começar a organizar"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  Os dados são privados e pertencem apenas à sua família
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
