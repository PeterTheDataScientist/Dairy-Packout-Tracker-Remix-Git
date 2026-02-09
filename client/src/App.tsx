import { Switch, Route } from "wouter";
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
import { Loader2 } from "lucide-react";

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
        <Route path="/reports" component={Reports} />
        <Route path="/products" component={Products} />
        <Route path="/formulas" component={Formulas} />
        <Route path="/approvals" component={Approvals} />
        <Route path="/suppliers" component={Suppliers} />
        <Route path="/loss-breakdown" component={LossBreakdown} />
        <Route path="/running-stock" component={RunningStock} />
        <Route path="/allocation" component={Allocation} />
        <Route path="/my-history" component={MyHistory} />
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
