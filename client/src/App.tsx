import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Production from "@/pages/Production";
import Products from "@/pages/Products";
import Formulas from "@/pages/Formulas";
import Approvals from "@/pages/Approvals";
import Packouts from "@/pages/Packouts";
import Reports from "@/pages/Reports";
import MyHistory from "@/pages/MyHistory";
import Intake from "@/pages/Intake";
import Suppliers from "@/pages/Suppliers";
import LossBreakdown from "@/pages/LossBreakdown";
import RunningStock from "@/pages/RunningStock";
import Allocation from "@/pages/Allocation";
import Notifications from "@/pages/Notifications";
import LossThresholds from "@/pages/LossThresholds";
import DailyLocks from "@/pages/DailyLocks";
import CustomUnits from "@/pages/CustomUnits";
import MassBalance from "@/pages/MassBalance";
import DailySummary from "@/pages/DailySummary";
import AuditLog from "@/pages/AuditLog";
import ActivityLog from "@/pages/ActivityLog";
import SupplierScorecard from "@/pages/SupplierScorecard";
import YieldTrends from "@/pages/YieldTrends";
import UserManagement from "@/pages/UserManagement";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Redirect to="/" />;
  }
  return <Component />;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/intake" component={Intake} />
        <Route path="/production" component={Production} />
        <Route path="/packouts" component={Packouts} />
        <Route path="/my-history" component={MyHistory} />

        <Route path="/reports">{() => <AdminRoute component={Reports} />}</Route>
        <Route path="/products">{() => <AdminRoute component={Products} />}</Route>
        <Route path="/formulas">{() => <AdminRoute component={Formulas} />}</Route>
        <Route path="/approvals">{() => <AdminRoute component={Approvals} />}</Route>
        <Route path="/suppliers">{() => <AdminRoute component={Suppliers} />}</Route>
        <Route path="/loss-breakdown">{() => <AdminRoute component={LossBreakdown} />}</Route>
        <Route path="/running-stock">{() => <AdminRoute component={RunningStock} />}</Route>
        <Route path="/allocation">{() => <AdminRoute component={Allocation} />}</Route>
        <Route path="/notifications">{() => <AdminRoute component={Notifications} />}</Route>
        <Route path="/loss-thresholds">{() => <AdminRoute component={LossThresholds} />}</Route>
        <Route path="/daily-locks">{() => <AdminRoute component={DailyLocks} />}</Route>
        <Route path="/custom-units">{() => <AdminRoute component={CustomUnits} />}</Route>
        <Route path="/mass-balance">{() => <AdminRoute component={MassBalance} />}</Route>
        <Route path="/daily-summary">{() => <AdminRoute component={DailySummary} />}</Route>
        <Route path="/audit-log">{() => <AdminRoute component={AuditLog} />}</Route>
        <Route path="/activity-log">{() => <AdminRoute component={ActivityLog} />}</Route>
        <Route path="/supplier-scorecard">{() => <AdminRoute component={SupplierScorecard} />}</Route>
        <Route path="/yield-trends">{() => <AdminRoute component={YieldTrends} />}</Route>
        <Route path="/user-management">{() => <AdminRoute component={UserManagement} />}</Route>

        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
