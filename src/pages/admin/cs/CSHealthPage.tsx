import { CSHealthDashboard } from "@/components/cs/CSHealthDashboard";

export function CSHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Saúde da Base</h2>
        <p className="text-muted-foreground">
          Visão agregada dos estágios de usuário e risco de churn
        </p>
      </div>
      
      <CSHealthDashboard />
    </div>
  );
}
