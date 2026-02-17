import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Printer, AlertTriangle } from "lucide-react";

type DailySummaryData = {
  date: string;
  isLocked: boolean;
  totalIntake: number;
  totalProduced: number;
  totalPacked: number;
  batchCount: number;
  unreviewedItems: number;
  alerts: number;
  alertDetails: { type: string; title: string; message: string; severity: string }[];
  productionByCategory: Record<string, { qty: number; items: number }>;
  intakeDetails: { supplier: number | null; product: string; qty: number; deliveredQty: number | null; acceptedQty: number | null }[];
  packoutDetails: { product: string; qty: number; packSize: string | null }[];
};

export default function DailySummary() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data, isLoading } = useQuery<DailySummaryData>({
    queryKey: ["/api/reports/daily-summary", date],
    queryFn: async () => {
      const res = await fetch(`/api/reports/daily-summary?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch daily summary");
      return res.json();
    },
  });

  return (
    <div className="space-y-6" data-testid="page-daily-summary">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold" data-testid="text-daily-summary-title">Daily Summary</h1>
          {data?.isLocked && (
            <Badge variant="secondary" data-testid="badge-locked">
              <Lock className="h-3 w-3 mr-1" />
              Locked
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 no-print">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
            data-testid="input-date"
          />
          <Button onClick={() => window.print()} data-testid="button-print">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">Loading...</div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-total-intake">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Intake</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-intake">{data.totalIntake.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-produced">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Produced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-produced">{data.totalProduced.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-total-packed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Packed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-packed">{data.totalPacked.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card data-testid="card-batch-count">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Batch Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-batch-count">{data.batchCount}</div>
              </CardContent>
            </Card>
          </div>

          {data.alerts > 0 && data.alertDetails.length > 0 && (
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20" data-testid="section-alerts">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Alerts ({data.alerts})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.alertDetails.map((alert, i) => (
                  <div key={i} className="text-sm" data-testid={`alert-item-${i}`}>
                    <span className="font-medium">{alert.title}</span>
                    <span className="text-muted-foreground"> — {alert.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card data-testid="section-intake">
            <CardHeader>
              <CardTitle className="text-base">Intake Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.intakeDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No intake records</TableCell>
                    </TableRow>
                  ) : (
                    data.intakeDetails.map((item, i) => (
                      <TableRow key={i} data-testid={`row-intake-${i}`}>
                        <TableCell>{item.product}</TableCell>
                        <TableCell className="text-right">{item.qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.deliveredQty != null ? item.deliveredQty.toLocaleString() : "—"}</TableCell>
                        <TableCell className="text-right">{item.acceptedQty != null ? item.acceptedQty.toLocaleString() : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card data-testid="section-production">
            <CardHeader>
              <CardTitle className="text-base">Production by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(data.productionByCategory).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No production records</TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(data.productionByCategory).map(([category, val], i) => (
                      <TableRow key={category} data-testid={`row-production-${i}`}>
                        <TableCell>{category}</TableCell>
                        <TableCell className="text-right">{val.qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{val.items}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card data-testid="section-packout">
            <CardHeader>
              <CardTitle className="text-base">Packout Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Pack Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.packoutDetails.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No packout records</TableCell>
                    </TableRow>
                  ) : (
                    data.packoutDetails.map((item, i) => (
                      <TableRow key={i} data-testid={`row-packout-${i}`}>
                        <TableCell>{item.product}</TableCell>
                        <TableCell className="text-right">{item.qty.toLocaleString()}</TableCell>
                        <TableCell>{item.packSize ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end" data-testid="footer-unreviewed">
            <Badge variant={data.unreviewedItems > 0 ? "destructive" : "secondary"} data-testid="badge-unreviewed">
              Unreviewed Items: {data.unreviewedItems}
            </Badge>
          </div>
        </>
      ) : null}
    </div>
  );
}
