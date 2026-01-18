import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { TransactionsPage } from "./TransactionsPage";
import { CategoriesPage } from "./CategoriesPage";
import { GoalsPage } from "./GoalsPage";
import { SettingsPage } from "./SettingsPage";
import { ProfilePage } from "./ProfilePage";
import { BanksPage } from "./BanksPage";
import { ImportFlowPage } from "./import";
import { ReportsPage } from "./ReportsPage";
import { CategoryReportPage } from "./CategoryReportPage";
import { BudgetsPage } from "./BudgetsPage";
import { CashflowPage } from "./CashflowPage";
import { EducationPage } from "./EducationPage";
import EbooksAdminPage from "./EbooksAdminPage";
import { BottomNavigation } from "@/components/BottomNavigation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportCategoryId, setReportCategoryId] = useState<string | null>(null);

  const handleCategoryReport = (categoryId: string) => {
    setReportCategoryId(categoryId);
    setActiveTab("category-report");
  };

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            onSettingsClick={() => setActiveTab("settings")} 
            onGoalsClick={() => setActiveTab("objectives")}
          />
        );
      case "transactions":
        return <TransactionsPage onBack={() => setActiveTab("dashboard")} />;
      case "categories":
        return <CategoriesPage onBack={() => setActiveTab("dashboard")} />;
      case "objectives":
        return <GoalsPage onBack={() => setActiveTab("dashboard")} />;
      case "goals":
        return <BudgetsPage onBack={() => setActiveTab("dashboard")} />;
      case "cashflow":
        return <CashflowPage onBack={() => setActiveTab("dashboard")} />;
      case "reports":
        return (
          <ReportsPage 
            onBack={() => setActiveTab("dashboard")} 
            onCategoryReport={handleCategoryReport}
          />
        );
      case "category-report":
        if (reportCategoryId) {
          return (
            <CategoryReportPage 
              categoryId={reportCategoryId} 
              onBack={() => setActiveTab("reports")} 
            />
          );
        }
        return <ReportsPage onBack={() => setActiveTab("dashboard")} onCategoryReport={handleCategoryReport} />;
      case "settings":
        return (
          <SettingsPage 
            onBack={() => setActiveTab("dashboard")} 
            onNavigate={setActiveTab}
          />
        );
      case "banks":
        return <BanksPage onBack={() => setActiveTab("settings")} />;
      case "profile":
        return <ProfilePage onBack={() => setActiveTab("settings")} />;
      case "import":
        return (
          <ImportFlowPage 
            onBack={() => setActiveTab("settings")} 
            onComplete={() => setActiveTab("transactions")}
          />
        );
      case "education":
        return (
          <EducationPage 
            onBack={() => setActiveTab("dashboard")} 
            onAdminClick={() => setActiveTab("ebooks-admin")}
          />
        );
      case "ebooks-admin":
        return <EbooksAdminPage onBack={() => setActiveTab("education")} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderPage()}
      <WhatsAppCTA />
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
