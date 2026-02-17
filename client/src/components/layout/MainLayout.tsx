import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Milk,
  Factory,
  Package,
  FileBarChart,
  Settings,
  ShieldCheck,
  Beaker,
  History,
  Truck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
  TrendingDown,
  BarChart3,
  PieChart,
  Bell,
  Lock,
  Gauge,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/intake": "Intake",
  "/production": "Production",
  "/packouts": "Packouts",
  "/reports": "Reports",
  "/loss-breakdown": "Loss Breakdown",
  "/products": "Products",
  "/formulas": "Formulas",
  "/approvals": "Approvals",
  "/suppliers": "Suppliers",
  "/running-stock": "Running Stock",
  "/allocation": "Daily Allocation",
  "/my-history": "My History",
  "/notifications": "Notifications",
  "/loss-thresholds": "Loss Thresholds",
  "/daily-locks": "Daily Locks",
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const isActive = (path: string) => location === path;
  const isDataEntry = user.role === "DATA_ENTRY";

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Intake", icon: Milk, path: "/intake" },
    { title: "Production", icon: Factory, path: "/production" },
    { title: "Packouts", icon: Package, path: "/packouts" },
    ...(isDataEntry
      ? [{ title: "My History", icon: History, path: "/my-history" }]
      : [
          { title: "Reports", icon: FileBarChart, path: "/reports" },
          { title: "Loss Breakdown", icon: TrendingDown, path: "/loss-breakdown" },
          { title: "Running Stock", icon: BarChart3, path: "/running-stock" },
          { title: "Allocation", icon: PieChart, path: "/allocation" },
        ]
    ),
  ];

  const adminItems = [
    { title: "Products", icon: Beaker, path: "/products" },
    { title: "Formulas", icon: Settings, path: "/formulas" },
    { title: "Suppliers", icon: Truck, path: "/suppliers" },
    { title: "Approvals", icon: ShieldCheck, path: "/approvals" },
    { title: "Notifications", icon: Bell, path: "/notifications" },
    { title: "Loss Thresholds", icon: Gauge, path: "/loss-thresholds" },
    { title: "Daily Locks", icon: Lock, path: "/daily-locks" },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 w-full">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Milk className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-none tracking-tight">YoMilk</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Production</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 gap-4">
        <SidebarMenu>
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
            Operations
          </div>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <Link href={item.path}>
                <SidebarMenuButton
                  isActive={isActive(item.path)}
                  tooltip={item.title}
                  className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                  data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {!isDataEntry && (
          <SidebarMenu>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mt-4">
              Administration
            </div>
            {adminItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <Link href={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
                    data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 border border-sidebar-border">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden flex-1">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user.role}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} data-testid="button-logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const pageTitle = routeTitles[location] || "Not Found";
  const isHome = location === "/";

  const { data: notifCount } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/count"],
    enabled: user?.role === "ADMIN",
    refetchInterval: 30000,
  });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 sticky top-0 z-10 justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              {!isHome && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.history.back()}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <nav className="flex items-center gap-1.5 text-sm" data-testid="breadcrumb-nav">
                <Link href="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                  <Home className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
                {!isHome && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="font-medium text-foreground">{pageTitle}</span>
                  </>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "ADMIN" && (
                <Link href="/notifications">
                  <Button variant="ghost" size="icon" className="h-8 w-8 relative" data-testid="button-notifications">
                    <Bell className="h-4 w-4" />
                    {notifCount && notifCount.count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1" data-testid="badge-notification-count">
                        {notifCount.count}
                      </span>
                    )}
                  </Button>
                </Link>
              )}
              <span className="text-xs text-muted-foreground">System v1.0.5</span>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
