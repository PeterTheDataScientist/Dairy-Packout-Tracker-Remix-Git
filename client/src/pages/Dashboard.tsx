import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Activity, Milk, Factory, Package, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

type Product = { id: number; name: string; unitType: string; active: boolean };
type LineItem = { id: number; batchCode: string; batchDate: string; outputProductId: number; outputQty: string; operationType: string };
type Packout = { id: number; productId: number; qty: string };

export default function Dashboard() {
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });
  const { data: packouts = [] } = useQuery<Packout[]>({ queryKey: ["/api/packouts"] });

  const getProductUnit = (id: number) => products.find(p => p.id === id)?.unitType || "";
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || "";

  const totalPacked = packouts.reduce((sum, p) => sum + parseFloat(p.qty), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all duration-200 border-primary/10 bg-gradient-to-br from-card to-primary/5" data-testid="card-total-batches">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Batches</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-batches">{lineItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Production operations logged</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200" data-testid="card-active-products">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Products</CardTitle>
            <Milk className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-active-products">{products.filter(p => p.active).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured in system</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200" data-testid="card-packout-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Packed</CardTitle>
            <Package className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-packout-total">{totalPacked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Units packed out</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200" data-testid="card-operations">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
            <Factory className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lineItems.filter(l => l.operationType === "CONVERT").length}</div>
            <p className="text-xs text-muted-foreground mt-1">Conversion operations</p>
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
