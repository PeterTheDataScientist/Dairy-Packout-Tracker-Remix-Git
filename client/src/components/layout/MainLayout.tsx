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
  Menu,
  Beaker,
  History
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useStore } from "@/lib/mockStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function AppSidebar() {
  const [location] = useLocation();
  const { currentUser } = useStore();

  const isActive = (path: string) => location === path;
  const isDataEntry = currentUser.role === 'DATA_ENTRY';

  const menuItems = [
    { title: "Dashboard", icon: LayoutDashboard, path: "/" },
    { title: "Intake", icon: Milk, path: "/intake" },
    { title: "Production", icon: Factory, path: "/production" },
    { title: "Packouts", icon: Package, path: "/packouts" },
    // Show My History for Data Entry, Reports for Admin
    ...(isDataEntry 
      ? [{ title: "My History", icon: History, path: "/my-history" }]
      : [{ title: "Reports", icon: FileBarChart, path: "/reports" }]
    ),
  ];

  const adminItems = [
    { title: "Products", icon: Beaker, path: "/products" },
    { title: "Formulas", icon: Settings, path: "/formulas" },
    { title: "Approvals", icon: ShieldCheck, path: "/approvals" },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3 w-full">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <img src="/yomilk-logo.png" alt="YoMilk" className="h-6 w-6 object-contain" />
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
            <AvatarImage src={currentUser.avatarUrl} />
            <AvatarFallback>{currentUser.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{currentUser.name}</span>
            <span className="text-xs text-muted-foreground truncate">{currentUser.role}</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ease-in-out">
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 sticky top-0 z-10 justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <h1 className="font-semibold text-lg text-foreground/80">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">System v1.0.4</span>
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
