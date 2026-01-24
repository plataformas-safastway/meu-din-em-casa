import { useState } from "react";
import { ArrowLeft, User, Bell, Shield, Download, HelpCircle, LogOut, ChevronRight, Users, Building2, Upload, Wifi, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { EditFamilyProfileSheet } from "@/components/profile/EditFamilyProfileSheet";
import { EducationPreferences } from "@/components/onboarding";

interface SettingsPageProps {
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

export function SettingsPage({ onBack, onNavigate }: SettingsPageProps) {
  const { family, familyMember, signOut } = useAuth();
  const [showFamilySheet, setShowFamilySheet] = useState(false);
  const [showEducationPrefs, setShowEducationPrefs] = useState(false);

  const handleAction = (id: string) => {
    switch (id) {
      case "export":
        toast.success("Exportação iniciada! Em breve você receberá o arquivo.");
        break;
      case "banks":
        onNavigate?.("banks");
        break;
      case "import":
        onNavigate?.("import");
        break;
      case "profile":
        onNavigate?.("profile");
        break;
      case "family":
        setShowFamilySheet(true);
        break;
      case "education":
        setShowEducationPrefs(!showEducationPrefs);
        break;
      case "help":
        onNavigate?.("help");
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Até logo! 👋");
  };

  const settingsSections = [
    {
      title: "Conta",
      items: [
        { id: "profile", label: "Meus Dados", icon: User, action: "navigate" },
        { id: "family", label: "Perfil da Família", icon: Users, action: "navigate" },
        { id: "banks", label: "Bancos e Cartões", icon: Building2, action: "navigate" },
        { id: "openfinance", label: "Open Finance", icon: Wifi, action: "navigate" },
        { id: "notifications", label: "Notificações", icon: Bell, action: "toggle", enabled: true },
      ],
    },
    {
      title: "Dados",
      items: [
        { id: "import", label: "Importar Extrato/Fatura", icon: Upload, action: "navigate" },
        { id: "export", label: "Exportar Dados (CSV)", icon: Download, action: "action" },
        { id: "backup", label: "Backup Automático", icon: Shield, action: "toggle", enabled: false },
      ],
    },
    {
      title: "Suporte",
      items: [
        { id: "education", label: "Dicas e Educação", icon: BookOpen, action: "component" },
        { id: "help", label: "Central de Ajuda", icon: HelpCircle, action: "navigate" },
      ],
    },
  ];

  const initials = family?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "FF";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Configurações</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Family Info Card */}
        <div className="p-4 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl text-primary-foreground font-bold">
              {initials}
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-lg">{family?.name || "Família"}</h2>
              <p className="text-sm text-muted-foreground">
                {family?.members_count || 1} membro{(family?.members_count || 1) > 1 ? "s" : ""} • {familyMember?.display_name}
              </p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        {settingsSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              {section.title.toUpperCase()}
            </h3>
            <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
              {section.items.map((item) => {
                const Icon = item.icon;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => item.action !== 'toggle' && handleAction(item.id)}
                    role={item.action !== 'toggle' ? 'button' : undefined}
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="flex-1 font-medium text-foreground">
                      {item.label}
                    </span>
                    {item.action === 'toggle' ? (
                      <Switch defaultChecked={item.enabled} />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
            {section.title === "Suporte" && showEducationPrefs && (
              <div className="p-4 border-t border-border/30">
                <EducationPreferences />
              </div>
            )}
          </div>
        ))}

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full gap-2 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sair da Conta
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground">
          Finanças em Família v1.0.0
        </p>
      </main>

      <EditFamilyProfileSheet open={showFamilySheet} onOpenChange={setShowFamilySheet} />
    </div>
  );
}
