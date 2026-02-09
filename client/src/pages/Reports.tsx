import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type MassBalanceRow = {
  productId: number; productName: string; unitType: string;
  produced: number; consumed: number; packed: number; theoreticalStock: number;
};

type VarianceRow = {
  lineItemId: number; batchCode: string; batchDate: string;
  outputProduct: string; inputProduct: string;
  expectedInput: number; actualInput: number; outputQty: number;
  variancePercent: number; varianceQty: number;
};

type DailyMilkBalanceRow = {
  date: string; intake: number; used: number; produced: number;
  difference: number; runningStock: number; flag: "OK" | "OVER_USE" | "HIGH_VARIANCE";
};

export default function Reports() {
  const { data: massBalance = [] } = useQuery<MassBalanceRow[]>({ queryKey: ["/api/reports/mass-balance"] });
  const { data: varianceData = [] } = useQuery<VarianceRow[]>({ queryKey: ["/api/reports/variance"] });
  const { data: milkBalance = [] } = useQuery<DailyMilkBalanceRow[]>({ queryKey: ["/api/reports/daily-milk-balance"] });

  const chartData = varianceData.map(v => ({
    batch: v.batchCode.split("-").pop(),
    expected: v.expectedInput,
    actual: v.actualInput,
    variance: v.variancePercent,
    name: v.outputProduct,
  }));

  const milkChartData = [...milkBalance].reverse().map(row => ({
    date: row.date.substring(5),
    intake: row.intake,
    used: row.used,
    difference: row.difference,
    stock: row.runningStock,
  }));

  const flagIcon = (flag: string) => {
    if (flag === "OVER_USE") return <XCircle className="h-4 w-4 text-red-500" />;
    if (flag === "HIGH_VARIANCE") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  };

  const flagLabel = (flag: string) => {
    if (flag === "OVER_USE") return "Used more than received";
    if (flag === "HIGH_VARIANCE") return "Large gap (>15%)";
    return "OK";
  };

  const overUseCount = milkBalance.filter(r => r.flag === "OVER_USE").length;
  const highVarCount = milkBalance.filter(r => r.flag === "HIGH_VARIANCE").length;
  const latestStock = milkBalance.length > 0 ? milkBalance[0].runningStock : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Yield Reports</h2>
          <p className="text-muted-foreground">Analyze production efficiency, variances, and daily balances.</p>
        </div>
      </div>

      <Tabs defaultValue="milk-balance">
        <TabsList>
          <TabsTrigger value="milk-balance" data-testid="tab-milk-balance">Daily Milk Balance</TabsTrigger>
          <TabsTrigger value="balance" data-testid="tab-mass-balance">Product Balance</TabsTrigger>
          <TabsTrigger value="variance" data-testid="tab-variance">Batch Variance</TabsTrigger>
        </TabsList>

        <TabsContent value="milk-balance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Running Stock</div>
                <div className={`text-2xl font-bold ${latestStock < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {latestStock > 0 ? "+" : ""}{latestStock.toFixed(1)} L
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cumulative milk received minus used</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5 text-red-500" /> Over-Use Days
                </div>
                <div className={`text-2xl font-bold ${overUseCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {overUseCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Days where more milk was claimed used than received</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> High Variance Days
                </div>
                <div className={`text-2xl font-bold ${highVarCount > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {highVarCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Days with more than 15% gap between intake and usage</p>
              </CardContent>
            </Card>
          </div>

          {milkChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Intake vs Usage Over Time</CardTitle>
                <CardDescription>Compare how much raw milk came in vs how much was claimed as used each day.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={milkChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#666" />
                      <Bar dataKey="intake" name="Milk Received (L)" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="used" name="Milk Used (L)" fill="hsl(346, 87%, 43%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Daily Raw Milk Reconciliation</CardTitle>
              <CardDescription>
                Each row shows one day: how much raw milk was received from suppliers vs how much was used in production.
                A running stock total carries forward. Red rows mean someone claimed to use more milk than was actually received.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Received (L)</TableHead>
                    <TableHead className="text-right">Used in Production (L)</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Running Stock (L)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milkBalance.map((row) => (
                    <TableRow
                      key={row.date}
                      className={row.flag === "OVER_USE" ? "bg-red-50/50" : row.flag === "HIGH_VARIANCE" ? "bg-amber-50/50" : ""}
                      data-testid={`row-milk-balance-${row.date}`}
                    >
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right font-mono">{row.intake.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{row.used.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-medium ${row.difference < 0 ? "text-red-600" : row.difference > 0 ? "text-emerald-600" : ""}`}>
                          {row.difference > 0 ? "+" : ""}{row.difference.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-medium ${row.runningStock < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {row.runningStock > 0 ? "+" : ""}{row.runningStock.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {flagIcon(row.flag)}
                          <span className="text-xs text-muted-foreground">{flagLabel(row.flag)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {milkBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No intake or production data recorded yet. Start by recording milk deliveries on the Intake page.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Product Balance</CardTitle>
              <CardDescription>
                Produced - Consumed - Packed = Theoretical Stock. Negative stock indicates overs/unders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead className="text-right">Packed Out</TableHead>
                    <TableHead className="text-right">Theoretical Stock (Over/Under)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {massBalance.map((row) => (
                    <TableRow key={row.productId} data-testid={`row-balance-${row.productId}`}>
                      <TableCell className="font-medium">{row.productName}</TableCell>
                      <TableCell className="text-right">{row.produced.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unitType}</span></TableCell>
                      <TableCell className="text-right">{row.consumed.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unitType}</span></TableCell>
                      <TableCell className="text-right">{row.packed.toLocaleString()} <span className="text-xs text-muted-foreground">{row.unitType}</span></TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={Math.abs(row.theoreticalStock) > 5 ? "destructive" : "outline"}
                          className={row.theoreticalStock === 0 ? "bg-muted text-muted-foreground border-transparent" : row.theoreticalStock > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
                        >
                          {row.theoreticalStock > 0 ? "+" : ""}{row.theoreticalStock.toFixed(2)} {row.unitType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {massBalance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No activity recorded yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Variance (Actual vs Expected)</CardTitle>
              <CardDescription>Positive variance means excess usage (waste).</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="batch" />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend />
                      <Bar dataKey="expected" name="Expected Input" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="actual" name="Actual Input" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No variance data available yet. Record production batches with actual input quantities to see analysis.</div>
              )}
            </CardContent>
          </Card>

          {varianceData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variance Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Output</TableHead>
                      <TableHead>Input</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceData.map((v) => (
                      <TableRow key={v.lineItemId} data-testid={`row-variance-${v.lineItemId}`}>
                        <TableCell className="font-mono text-xs">{v.batchCode}</TableCell>
                        <TableCell>{v.batchDate}</TableCell>
                        <TableCell>{v.outputProduct}</TableCell>
                        <TableCell>{v.inputProduct}</TableCell>
                        <TableCell className="text-right">{v.expectedInput.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{v.actualInput.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={Math.abs(v.variancePercent) > 5 ? "destructive" : "outline"}>
                            {v.variancePercent > 0 ? "+" : ""}{v.variancePercent.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
