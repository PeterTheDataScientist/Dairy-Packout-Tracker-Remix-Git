import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Download, AlertTriangle, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

type SupplierScore = {
  id: number; name: string; active: boolean;
  totalDeliveries: number; totalQty: number; avgDeliveryQty: number;
  receivingLossPercent: number; lossFrequencyPercent: number; deliveryDays: number;
};

function lossColor(pct: number) {
  if (pct < 2) return "text-emerald-600";
  if (pct <= 5) return "text-amber-600";
  return "text-red-600";
}

function lossBadgeVariant(pct: number): "outline" | "destructive" | "default" {
  if (pct > 5) return "destructive";
  return "outline";
}

export default function SupplierScorecard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user?.role !== "ADMIN") {
    navigate("/");
    return null;
  }

  const { data = [], isLoading } = useQuery<SupplierScore[]>({
    queryKey: ["/api/reports/supplier-scorecard"],
    queryFn: async () => {
      const res = await fetch("/api/reports/supplier-scorecard", { credentials: "include" });
      return res.json();
    },
  });

  const exportCSV = () => {
    const rows = [["Supplier", "Deliveries", "Total Qty", "Avg Qty", "Loss %", "Loss Freq %"]];
    data.forEach(s => rows.push([s.name, String(s.totalDeliveries), s.totalQty.toFixed(1), s.avgDeliveryQty.toFixed(1), s.receivingLossPercent.toFixed(2), s.lossFrequencyPercent.toFixed(1)]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "supplier-scorecard.csv"; a.click();
  };

  const chartData = [...data]
    .sort((a, b) => b.receivingLossPercent - a.receivingLossPercent)
    .slice(0, 10)
    .map(s => ({ name: s.name, lossPercent: s.receivingLossPercent }));

  return (
    <div className="space-y-6" data-testid="page-supplier-scorecard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-scorecard-title">
            <Truck className="h-6 w-6" />
            Supplier Scorecard
          </h2>
          <p className="text-muted-foreground text-sm">Evaluate supplier performance based on delivery history and loss metrics.</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={data.length === 0} data-testid="button-export-csv">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading scorecard data...</div>
      )}

      {data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(s => (
            <Card key={s.id} data-testid={`card-supplier-${s.id}`}>
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-base" data-testid={`text-supplier-name-${s.id}`}>{s.name}</div>
                  <Badge variant={s.active ? "default" : "outline"} data-testid={`badge-supplier-status-${s.id}`}>
                    {s.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground text-xs">Total Deliveries</span>
                    <div className="font-mono font-medium" data-testid={`text-deliveries-${s.id}`}>{s.totalDeliveries}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Total Qty</span>
                    <div className="font-mono font-medium" data-testid={`text-total-qty-${s.id}`}>{s.totalQty.toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Avg Delivery Qty</span>
                    <div className="font-mono font-medium" data-testid={`text-avg-qty-${s.id}`}>{s.avgDeliveryQty.toFixed(1)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">Delivery Days</span>
                    <div className="font-mono font-medium" data-testid={`text-delivery-days-${s.id}`}>{s.deliveryDays}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-1 border-t">
                  <div className="flex-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> Receiving Loss
                    </span>
                    <Badge variant={lossBadgeVariant(s.receivingLossPercent)} className={lossColor(s.receivingLossPercent)} data-testid={`badge-loss-${s.id}`}>
                      {s.receivingLossPercent.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Loss Frequency
                    </span>
                    <div className="font-mono font-medium text-sm" data-testid={`text-loss-freq-${s.id}`}>{s.lossFrequencyPercent.toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Receiving Loss % by Supplier</CardTitle>
            <CardDescription>Top suppliers ranked by receiving loss percentage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]" data-testid="chart-supplier-loss">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, "Loss %"]}
                  />
                  <Bar dataKey="lossPercent" name="Loss %" fill="hsl(346, 87%, 43%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">No supplier scorecard data available yet. Record deliveries on the Intake page to see supplier performance.</div>
      )}
    </div>
  );
}
