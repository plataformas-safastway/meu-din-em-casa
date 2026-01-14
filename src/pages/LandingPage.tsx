import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Heart, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: "Acolhimento",
      description: "Sem julgamentos. Apenas clareza e orientação para a família."
    },
    {
      icon: TrendingUp,
      title: "Clareza Financeira",
      description: "Visualize para onde vai o dinheiro e tome decisões conscientes."
    },
    {
      icon: Users,
      title: "Feito para Famílias",
      description: "Organizem juntos as finanças e reduzam conflitos sobre dinheiro."
    },
    {
      icon: Shield,
      title: "Privacidade Total",
      description: "Seus dados são privados e pertencem apenas à sua família."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-xl">💰</span>
          </div>
        </div>
        <Button variant="ghost" onClick={() => navigate("/login")}>
          Entrar
        </Button>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
            Organizem as finanças da família com{" "}
            <span className="text-primary">clareza e tranquilidade</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Um app pensado para famílias que querem entender suas finanças, 
            reduzir a ansiedade sobre dinheiro e tomar decisões melhores juntos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="h-14 px-8 text-base font-semibold"
              onClick={() => navigate("/signup")}
            >
              Começar agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="h-14 px-8 text-base"
              onClick={() => navigate("/login")}
            >
              Já tenho conta
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-6">
            ✓ Gratuito para começar &nbsp;&nbsp; ✓ Sem cartão de crédito
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
              className="p-6 rounded-2xl bg-card border border-border hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium">
            <Shield className="w-4 h-4" />
            Seus dados são criptografados e seguros
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p>Feito com 💚 para famílias brasileiras</p>
      </footer>
    </div>
  );
}
