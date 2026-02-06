import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import Production from "@/pages/Production";
import Products from "@/pages/Products";
import Formulas from "@/pages/Formulas";
import Approvals from "@/pages/Approvals";
import Packouts from "@/pages/Packouts";
import Reports from "@/pages/Reports";

// Simple Intake Placeholder
function Intake() { 
  return (
    <div className="p-8 text-center border rounded-lg border-dashed">
      <h2 className="text-xl font-bold mb-2">Intake Module</h2>
      <p className="text-muted-foreground">Receiving logic similar to Production would go here.</p>
    </div>
  ) 
}

function Router() {
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
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
