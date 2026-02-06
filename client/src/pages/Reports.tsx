import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function Reports() {
  const { data: massBalance = [] } = useQuery<MassBalanceRow[]>({ queryKey: ["/api/reports/mass-balance"] });
  const { data: varianceData = [] } = useQuery<VarianceRow[]>({ queryKey: ["/api/reports/variance"] });

  const chartData = varianceData.map(v => ({
    batch: v.batchCode.split("-").pop(),
    expected: v.expectedInput,
    actual: v.actualInput,
    variance: v.variancePercent,
    name: v.outputProduct,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Yield Reports</h2>
          <p className="text-muted-foreground">Analyze production efficiency, variances, and daily balances.</p>
        </div>
      </div>

      <Tabs defaultValue="balance">
        <TabsList>
          <TabsTrigger value="balance" data-testid="tab-mass-balance">Daily Overs/Unders (Mass Balance)</TabsTrigger>
          <TabsTrigger value="variance" data-testid="tab-variance">Batch Variance Analysis</TabsTrigger>
        </TabsList>

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
