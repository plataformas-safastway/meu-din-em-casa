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
import { ProjectionPage } from "./ProjectionPage";
import { HelpCenterPage } from "./HelpCenterPage";
import { EducationPage } from "./EducationPage";
import { LearnMorePage } from "./LearnMorePage";
import EbooksAdminPage from "./EbooksAdminPage";
import { OpenFinancePage } from "./OpenFinancePage";
import { FamilyPage } from "./FamilyPage";
import { BottomNavigation } from "@/components/BottomNavigation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { LocationContextBanner } from "@/components/family";
import { CSInAppMessage } from "@/components/cs/CSInAppMessage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reportCategoryId, setReportCategoryId] = useState<string | null>(null);
  const [learnMoreTab, setLearnMoreTab] = useState<"accounts" | "cards">("accounts");

  const handleCategoryReport = (categoryId: string) => {
    setReportCategoryId(categoryId);
    setActiveTab("category-report");
  };

  const handleLearnMore = (tab?: "accounts" | "cards") => {
    setLearnMoreTab(tab || "accounts");
    setActiveTab("learn-more");
  };

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            onSettingsClick={() => setActiveTab("settings")} 
            onGoalsClick={() => setActiveTab("objectives")}
            onLearnMore={handleLearnMore}
            onBanksClick={() => setActiveTab("banks")}
            onCategoriesClick={() => setActiveTab("categories")}
            onTransactionsClick={() => setActiveTab("transactions")}
            onBudgetsClick={() => setActiveTab("goals")}
            onProjectionClick={() => setActiveTab("projection")}
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
      case "projection":
        return <ProjectionPage onBack={() => setActiveTab("dashboard")} />;
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
      case "openfinance":
        return <OpenFinancePage onBack={() => setActiveTab("settings")} />;
      case "family":
        return <FamilyPage onBack={() => setActiveTab("settings")} />;
      case "learn-more":
        return <LearnMorePage onBack={() => setActiveTab("dashboard")} initialTab={learnMoreTab} />;
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
      case "help":
        return (
          <HelpCenterPage 
            onBack={() => setActiveTab("settings")} 
            onNavigate={setActiveTab}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LocationContextBanner />
      {renderPage()}
      <WhatsAppCTA />
      <CSInAppMessage />
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
