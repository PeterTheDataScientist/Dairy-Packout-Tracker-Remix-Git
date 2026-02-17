import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, Milk, Factory, Package, TrendingUp, TrendingDown, Minus, ClipboardCheck, Eye, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";

type Product = { id: number; name: string; unitType: string; active: boolean };
type LineItem = { id: number; batchCode: string; batchDate: string; outputProductId: number; outputQty: string; operationType: string };
type Packout = { id: number; productId: number; qty: string };

type DashboardStats = {
  today: { intake: number; production: number; packed: number };
  thisWeek: { intake: number; production: number; packed: number };
  trends: { intake: number; production: number; packed: number };
  unreviewed: { production: number; packouts: number; intakes: number };
  pending: { changeRequests: number; carryForwards: number };
};

function TrendIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400" data-testid="trend-up">
        <TrendingUp className="h-3.5 w-3.5" />
        +{value.toFixed(1)}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400" data-testid="trend-down">
        <TrendingDown className="h-3.5 w-3.5" />
        {value.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground" data-testid="trend-neutral">
      <Minus className="h-3.5 w-3.5" />
      0.0%
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const { data: stats } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });

  const getProductUnit = (id: number) => products.find(p => p.id === id)?.unitType || "";
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || "";

  const todayIntake = stats?.today.intake ?? 0;
  const todayProduction = stats?.today.production ?? 0;
  const todayPacked = stats?.today.packed ?? 0;
  const totalLoss = todayIntake > 0 ? ((todayIntake - todayProduction) / todayIntake) * 100 : 0;

  const pendingTotal = (stats?.pending.changeRequests ?? 0) + (stats?.pending.carryForwards ?? 0);
  const unreviewedTotal = (stats?.unreviewed.production ?? 0) + (stats?.unreviewed.packouts ?? 0) + (stats?.unreviewed.intakes ?? 0);
  const weeklyVolume = stats?.thisWeek.intake ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all duration-200 border-primary/10 bg-gradient-to-br from-card to-primary/5" data-testid="card-today-intake">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Intake</CardTitle>
            <Milk className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-intake">{todayIntake.toLocaleString()} L</div>
            <div className="mt-1">
              <TrendIndicator value={stats?.trends.intake ?? 0} />
              <span className="text-xs text-muted-foreground ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200 border-amber-500/10 bg-gradient-to-br from-card to-amber-500/5" data-testid="card-today-production">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Production</CardTitle>
            <Factory className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-production">{todayProduction.toLocaleString()} L</div>
            <div className="mt-1">
              <TrendIndicator value={stats?.trends.production ?? 0} />
              <span className="text-xs text-muted-foreground ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200 border-purple-500/10 bg-gradient-to-br from-card to-purple-500/5" data-testid="card-today-packed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Packed</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-packed">{todayPacked.toLocaleString()} units</div>
            <div className="mt-1">
              <TrendIndicator value={stats?.trends.packed ?? 0} />
              <span className="text-xs text-muted-foreground ml-1">vs last week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200 border-red-500/10 bg-gradient-to-br from-card to-red-500/5" data-testid="card-total-loss">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loss %</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-loss">{totalLoss.toFixed(1)}%</div>
            <div className="mt-1">
              <TrendIndicator value={totalLoss > 0 ? -totalLoss : 0} />
              <span className="text-xs text-muted-foreground ml-1">week trend</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-4 ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
        {isAdmin && (
          <>
            <Card className="hover-elevate transition-all duration-200 border-orange-500/10 bg-gradient-to-br from-card to-orange-500/5" data-testid="card-pending-approvals">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-pending-approvals">{pendingTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.pending.changeRequests ?? 0} change requests • {stats?.pending.carryForwards ?? 0} carry-forwards
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate transition-all duration-200 border-sky-500/10 bg-gradient-to-br from-card to-sky-500/5" data-testid="card-unreviewed-records">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unreviewed Records</CardTitle>
                <Eye className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unreviewed-records">{unreviewedTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.unreviewed.production ?? 0} production • {stats?.unreviewed.packouts ?? 0} packouts • {stats?.unreviewed.intakes ?? 0} intakes
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="hover-elevate transition-all duration-200 border-emerald-500/10 bg-gradient-to-br from-card to-emerald-500/5" data-testid="card-weekly-volume">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Weekly Volume</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-weekly-volume">{weeklyVolume.toLocaleString()} L</div>
            <p className="text-xs text-muted-foreground mt-1">This week's total intake</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent Production</CardTitle>
            <CardDescription>Latest batch operations and conversions.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center" data-testid={`row-production-${log.id}`}>
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{log.batchCode}</p>
                    <p className="text-xs text-muted-foreground">{log.operationType} • {log.batchDate}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm text-right">
                    <div>{parseFloat(log.outputQty).toLocaleString()} {getProductUnit(log.outputProductId)}</div>
                    <div className="text-xs text-muted-foreground">{getProductName(log.outputProductId)}</div>
                  </div>
                </div>
              ))}
              {lineItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No production data yet. Start by recording batches.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common daily tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/intake">
              <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group" data-testid="link-quick-intake">
                <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <Milk className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Log Intake</div>
                  <div className="text-xs text-muted-foreground">Record milk delivery</div>
                </div>
              </div>
            </Link>
            <Link href="/production">
              <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group" data-testid="link-quick-production">
                <div className="h-8 w-8 rounded-md bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <Factory className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Start Batch</div>
                  <div className="text-xs text-muted-foreground">New production run</div>
                </div>
              </div>
            </Link>
            <Link href="/packouts">
              <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group" data-testid="link-quick-packout">
                <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium">Record Packout</div>
                  <div className="text-xs text-muted-foreground">Finished goods</div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
