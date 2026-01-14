import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { TransactionsPage } from "./TransactionsPage";
import { CategoriesPage } from "./CategoriesPage";
import { GoalsPage } from "./GoalsPage";
import { SettingsPage } from "./SettingsPage";
import { BanksPage } from "./BanksPage";
import { ImportPage } from "./ImportPage";
import { BottomNavigation } from "@/components/BottomNavigation";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <TransactionsPage onBack={() => setActiveTab("dashboard")} />;
      case "categories":
        return <CategoriesPage onBack={() => setActiveTab("dashboard")} />;
      case "goals":
        return <GoalsPage onBack={() => setActiveTab("dashboard")} />;
      case "settings":
        return <SettingsPage onBack={() => setActiveTab("dashboard")} onNavigate={setActiveTab} />;
      case "banks":
        return <BanksPage onBack={() => setActiveTab("settings")} />;
      case "import":
        return <ImportPage onBack={() => setActiveTab("settings")} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderPage()}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
