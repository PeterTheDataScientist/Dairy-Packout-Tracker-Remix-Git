import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Download, Droplets, Factory, Package, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type MassBalanceData = {
  dateFrom: string;
  dateTo: string;
  milkIn: number;
  receivingLoss: number;
  productionInputUsed: number;
  productionOutput: number;
  productionLoss: number;
  totalPacked: number;
  packingLoss: number;
  totalLoss: number;
  lossPercent: number;
  categoryBreakdown: Record<string, { produced: number; packed: number }>;
};

export default function MassBalance() {
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, error } = useQuery<MassBalanceData>({
    queryKey: [`/api/reports/mass-balance-enhanced?dateFrom=${dateFrom}&dateTo=${dateTo}`],
  });

  const exportCSV = () => {
    if (!data) return;
    const rows = [["Category", "Produced", "Packed"]];
    Object.entries(data.categoryBreakdown).forEach(([cat, vals]) => {
      rows.push([cat, vals.produced.toFixed(1), vals.packed.toFixed(1)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mass-balance-${data.dateFrom}-${data.dateTo}.csv`;
    a.click();
  };

  const chartData = data
    ? Object.entries(data.categoryBreakdown).map(([category, vals]) => ({
        category,
        produced: vals.produced,
        packed: vals.packed,
      }))
    : [];

  const flowSteps = data
    ? [
        { label: "Milk In", value: data.milkIn, icon: Droplets, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
        { label: "Receiving Loss", value: data.receivingLoss, icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950" },
        { label: "Production Input", value: data.productionInputUsed, icon: Factory, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
        { label: "Production Output", value: data.productionOutput, icon: Factory, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
        { label: "Packout", value: data.totalPacked, icon: Package, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
        { label: "Packing Loss", value: data.packingLoss, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
      ]
    : [];

  const lossColor = data
    ? data.lossPercent > 5
      ? "border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
      : "border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Mass Balance Reconciliation</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">Where did all the milk go?</p>
        </div>
        <div className="flex items-center gap-2" data-testid="date-range-picker">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            data-testid="input-date-from"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            data-testid="input-date-to"
          />
          <Button variant="outline" onClick={exportCSV} disabled={!data} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-muted-foreground" data-testid="text-loading">Loading mass balance data…</div>
      )}

      {error && (
        <div className="text-center py-12 text-red-500" data-testid="text-error">Failed to load data. Please try again.</div>
      )}

      {data && (
        <>
          <Card data-testid="card-flow-diagram">
            <CardHeader>
              <CardTitle>Material Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {flowSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-2">
                      <div
                        className={`flex flex-col items-center p-4 rounded-lg border ${step.bg} min-w-[120px]`}
                        data-testid={`card-flow-${step.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Icon className={`h-6 w-6 ${step.color} mb-1`} />
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                        <span className="text-lg font-bold" data-testid={`text-flow-${step.label.toLowerCase().replace(/\s+/g, "-")}`}>
                          {step.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </span>
                      </div>
                      {i < flowSteps.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className={`border-2 ${lossColor}`} data-testid="card-total-loss">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Total Loss
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-total-loss">
                  {data.totalLoss.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                </div>
                <div className="text-lg font-semibold mt-1" data-testid="text-loss-percent">
                  {data.lossPercent.toFixed(1)}% loss
                </div>
                <p className="text-sm mt-2 opacity-75">
                  {data.lossPercent > 5 ? "Loss exceeds acceptable threshold (5%)" : "Loss within acceptable range"}
                </p>
              </CardContent>
            </Card>

            {chartData.length > 0 && (
              <Card data-testid="card-category-chart">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="produced" fill="#f59e0b" name="Produced" />
                      <Bar dataKey="packed" fill="#8b5cf6" name="Packed" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <Card data-testid="card-category-table">
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Packed</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(data.categoryBreakdown).map(([cat, vals]) => (
                    <TableRow key={cat} data-testid={`row-category-${cat}`}>
                      <TableCell className="font-medium" data-testid={`text-category-name-${cat}`}>{cat}</TableCell>
                      <TableCell className="text-right" data-testid={`text-category-produced-${cat}`}>
                        {vals.produced.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-category-packed-${cat}`}>
                        {vals.packed.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-category-diff-${cat}`}>
                        {(vals.produced - vals.packed).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(data.categoryBreakdown).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No category data available for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
