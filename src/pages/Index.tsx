import { useState } from "react";
import { Dashboard } from "./Dashboard";
import { TransactionsPage } from "./TransactionsPage";
import { CategoriesPage } from "./CategoriesPage";
import { GoalsPage } from "./GoalsPage";
import { SettingsPage } from "./SettingsPage";
import { BanksPage } from "./BanksPage";
import { ImportPage } from "./ImportPage";
import { ImportReviewPage } from "./ImportReviewPage";
import { ReportsPage } from "./ReportsPage";
import { CategoryReportPage } from "./CategoryReportPage";
import { BottomNavigation } from "@/components/BottomNavigation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [reviewImportId, setReviewImportId] = useState<string | null>(null);
  const [reportCategoryId, setReportCategoryId] = useState<string | null>(null);

  const handleReviewImport = (importId: string) => {
    setReviewImportId(importId);
    setActiveTab("import-review");
  };

  const handleReviewComplete = () => {
    setReviewImportId(null);
    setActiveTab("transactions");
  };

  const handleReviewBack = () => {
    setReviewImportId(null);
    setActiveTab("import");
  };

  const handleCategoryReport = (categoryId: string) => {
    setReportCategoryId(categoryId);
    setActiveTab("category-report");
  };

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
            onReviewImport={handleReviewImport}
          />
        );
      case "banks":
        return <BanksPage onBack={() => setActiveTab("settings")} />;
      case "import":
        return (
          <ImportPage 
            onBack={() => setActiveTab("settings")} 
            onReviewImport={handleReviewImport}
          />
        );
      case "import-review":
        if (reviewImportId) {
          return (
            <ImportReviewPage 
              importId={reviewImportId} 
              onBack={handleReviewBack}
              onComplete={handleReviewComplete}
            />
          );
        }
        return <Dashboard />;
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
