import { ArrowLeft, GraduationCap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EbooksShowcase } from "@/components/education/EbooksShowcase";
import { useAuth } from "@/contexts/AuthContext";

interface EducationPageProps {
  onBack: () => void;
  onAdminClick?: () => void;
}

export function EducationPage({ onBack, onAdminClick }: EducationPageProps) {
  const { familyMember } = useAuth();
  const isOwner = familyMember?.role === "owner";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Educação Financeira</h1>
            </div>
          </div>
          {isOwner && onAdminClick && (
            <Button variant="ghost" size="icon" onClick={onAdminClick}>
              <Settings className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {/* Intro Section */}
        <section className="text-center py-4">
          <h2 className="text-xl font-bold mb-2">
            Aprenda a cuidar do dinheiro da família
          </h2>
          <p className="text-muted-foreground text-sm">
            Materiais gratuitos e pagos para ajudar vocês a tomar decisões melhores.
          </p>
        </section>

        {/* eBooks Showcase */}
        <section>
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
            📚 eBooks Disponíveis
          </h3>
          <EbooksShowcase />
        </section>
      </main>
    </div>
  );
}
