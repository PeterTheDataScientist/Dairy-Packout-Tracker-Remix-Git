import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useStore } from "@/lib/mockStore";
import { Activity, Milk, Factory, Package, AlertTriangle, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  const { productionLog, products } = useStore();

  const totalProduction = productionLog.length;
  const recentVariances = productionLog.filter(p => (p.variance || 0) > 1).length;

  const getProductUnit = (id?: string) => products.find(p => p.id === id)?.unitType || '';

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all duration-200 border-primary/10 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProduction}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <span className="text-emerald-500 flex items-center mr-1">
                <ArrowUpRight className="h-3 w-3 mr-0.5" /> +12%
              </span>
              from last month
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Yield Variance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{recentVariances}</div>
            <p className="text-xs text-muted-foreground mt-1">Batches requiring review</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Products</CardTitle>
            <Milk className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.filter(p => p.active).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured in system</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Packout Efficiency</CardTitle>
            <Package className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2%</div>
            <p className="text-xs text-muted-foreground mt-1">Target: 98.0%</p>
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
              {productionLog.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{log.batchCode}</p>
                    <p className="text-xs text-muted-foreground">{log.operationType} • {log.date}</p>
                  </div>
                  <div className="ml-auto font-medium text-sm text-right">
                    <div>{log.outputQty} {getProductUnit(log.outputProductId)}</div>
                    <div className="text-xs text-muted-foreground">Output</div>
                  </div>
                </div>
              ))}
              {productionLog.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">No production data yet.</div>
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
            <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                 <Milk className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Log Intake</div>
                <div className="text-xs text-muted-foreground">Record milk delivery</div>
              </div>
            </div>
            <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-md bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                 <Factory className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Start Batch</div>
                <div className="text-xs text-muted-foreground">New production run</div>
              </div>
            </div>
             <div className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                 <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium">Record Packout</div>
                <div className="text-xs text-muted-foreground">Finished goods</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
