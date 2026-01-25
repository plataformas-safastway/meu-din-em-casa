import { useState, Suspense, lazy, memo } from "react";
import { Dashboard } from "./Dashboard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { LocationContextBanner } from "@/components/family";
import { CSInAppMessage } from "@/components/cs/CSInAppMessage";
import { ScreenLoader } from "@/components/ui/money-loader";

// Lazy load heavy modules - these won't be in initial bundle
const TransactionsPage = lazy(() => import("./TransactionsPage").then(m => ({ default: m.TransactionsPage })));
const CategoriesPage = lazy(() => import("./CategoriesPage").then(m => ({ default: m.CategoriesPage })));
const GoalsPage = lazy(() => import("./GoalsPage").then(m => ({ default: m.GoalsPage })));
const SettingsPage = lazy(() => import("./SettingsPage").then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("./ProfilePage").then(m => ({ default: m.ProfilePage })));
const BanksPage = lazy(() => import("./BanksPage").then(m => ({ default: m.BanksPage })));
const ImportFlowPage = lazy(() => import("./import").then(m => ({ default: m.ImportFlowPage })));
const ReportsPage = lazy(() => import("./ReportsPage").then(m => ({ default: m.ReportsPage })));
const CategoryReportPage = lazy(() => import("./CategoryReportPage").then(m => ({ default: m.CategoryReportPage })));
const BudgetsPage = lazy(() => import("./BudgetsPage").then(m => ({ default: m.BudgetsPage })));
const CashflowPage = lazy(() => import("./CashflowPage").then(m => ({ default: m.CashflowPage })));
const ProjectionPage = lazy(() => import("./ProjectionPage").then(m => ({ default: m.ProjectionPage })));
const HelpCenterPage = lazy(() => import("./HelpCenterPage").then(m => ({ default: m.HelpCenterPage })));
const EducationPage = lazy(() => import("./EducationPage").then(m => ({ default: m.EducationPage })));
const LearnMorePage = lazy(() => import("./LearnMorePage").then(m => ({ default: m.LearnMorePage })));
const EbooksAdminPage = lazy(() => import("./EbooksAdminPage"));
const OpenFinancePage = lazy(() => import("./OpenFinancePage").then(m => ({ default: m.OpenFinancePage })));
const FamilyPage = lazy(() => import("./FamilyPage").then(m => ({ default: m.FamilyPage })));

// Minimal loading component for lazy modules
const PageLoader = memo(() => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <ScreenLoader label="Carregando..." />
  </div>
));
PageLoader.displayName = "PageLoader";

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
    // Dashboard is always loaded eagerly - it's the first screen
    if (activeTab === "dashboard") {
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
          onNavigate={setActiveTab}
        />
      );
    }

    // All other pages are lazy loaded
    return (
      <Suspense fallback={<PageLoader />}>
        {renderLazyPage()}
      </Suspense>
    );
  };

  const renderLazyPage = () => {
    switch (activeTab) {
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
