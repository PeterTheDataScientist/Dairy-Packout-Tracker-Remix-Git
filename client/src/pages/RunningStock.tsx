import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Droplets, Beaker, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Line, ComposedChart } from "recharts";

type RawMilkRow = {
  date: string;
  received: number;
  usedInProduction: number;
  difference: number;
  runningStock: number;
};

type YogurtBaseRow = {
  date: string;
  produced: number;
  usedInProduction: number;
  packedOut: number;
  difference: number;
  runningStock: number;
};

type RunningStockData = {
  rawMilk: { productIds: number[]; rows: RawMilkRow[] };
  yogurtBase: { productIds: number[]; rows: YogurtBaseRow[] };
};

function downloadCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RunningStock() {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(thirtyDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading } = useQuery<RunningStockData>({
    queryKey: ["/api/reports/running-stock", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/reports/running-stock?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const rawRows = data?.rawMilk?.rows ?? [];
  const yogurtRows = data?.yogurtBase?.rows ?? [];

  const latestRawStock = rawRows.length > 0 ? rawRows[rawRows.length - 1].runningStock : 0;
  const latestYogurtStock = yogurtRows.length > 0 ? yogurtRows[yogurtRows.length - 1].runningStock : 0;

  const totalRawReceived = rawRows.reduce((s, r) => s + r.received, 0);
  const totalRawUsed = rawRows.reduce((s, r) => s + r.usedInProduction, 0);
  const totalYogurtProduced = yogurtRows.reduce((s, r) => s + r.produced, 0);
  const totalYogurtUsed = yogurtRows.reduce((s, r) => s + r.usedInProduction + r.packedOut, 0);

  const rawChartData = rawRows.map(r => ({
    date: r.date.substring(5),
    received: Math.round(r.received * 10) / 10,
    used: Math.round(r.usedInProduction * 10) / 10,
    stock: Math.round(r.runningStock * 10) / 10,
  }));

  const yogurtChartData = yogurtRows.map(r => ({
    date: r.date.substring(5),
    produced: Math.round(r.produced * 10) / 10,
    used: Math.round((r.usedInProduction + r.packedOut) * 10) / 10,
    stock: Math.round(r.runningStock * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Running Stock</h2>
          <p className="text-muted-foreground">Track daily balances for raw milk and yogurt base.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" data-testid="input-date-from" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" data-testid="input-date-to" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="h-4 w-4 text-blue-500" />
              Raw Milk Stock
            </div>
            <div className={`text-2xl font-bold mt-1 ${latestRawStock < 0 ? "text-red-600" : "text-emerald-600"}`} data-testid="text-raw-milk-stock">
              {latestRawStock.toFixed(1)} L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Beaker className="h-4 w-4 text-pink-500" />
              Yogurt Base Stock
            </div>
            <div className={`text-2xl font-bold mt-1 ${latestYogurtStock < 0 ? "text-red-600" : "text-emerald-600"}`} data-testid="text-yogurt-base-stock">
              {latestYogurtStock.toFixed(1)} L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Total Raw Received
            </div>
            <div className="text-2xl font-bold mt-1">{totalRawReceived.toFixed(0)} L</div>
            <p className="text-xs text-muted-foreground mt-1">Used: {totalRawUsed.toFixed(0)} L</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-amber-500" />
              Total Yogurt Produced
            </div>
            <div className="text-2xl font-bold mt-1">{totalYogurtProduced.toFixed(0)} L</div>
            <p className="text-xs text-muted-foreground mt-1">Used/Packed: {totalYogurtUsed.toFixed(0)} L</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="raw-milk">
        <TabsList>
          <TabsTrigger value="raw-milk" data-testid="tab-raw-milk">Raw Milk</TabsTrigger>
          <TabsTrigger value="yogurt-base" data-testid="tab-yogurt-base">Yogurt Base</TabsTrigger>
        </TabsList>

        <TabsContent value="raw-milk" className="space-y-4">
          {rawChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Raw Milk: Received vs Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rawChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend />
                      <Bar dataKey="received" name="Received (L)" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="used" name="Used (L)" fill="hsl(346, 87%, 43%)" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="stock" name="Running Stock" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Raw Milk Daily Detail</CardTitle>
                <CardDescription>{rawRows.length} days</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCSV(rawRows, `raw-milk-stock-${dateFrom}-to-${dateTo}.csv`)} data-testid="button-export-raw-milk">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Received (L)</TableHead>
                    <TableHead className="text-right">Used (L)</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Running Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rawRows.map(row => (
                    <TableRow key={row.date} className={row.difference < 0 ? "bg-red-50/50" : ""} data-testid={`row-raw-stock-${row.date}`}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right font-mono">{row.received.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{row.usedInProduction.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-medium ${row.difference < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {row.difference > 0 ? "+" : ""}{row.difference.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={row.runningStock < 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                          {row.runningStock.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rawRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {isLoading ? "Loading..." : "No raw milk data for the selected dates."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yogurt-base" className="space-y-4">
          {yogurtChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Yogurt Base: Produced vs Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={yogurtChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                      <Legend />
                      <Bar dataKey="produced" name="Produced (L)" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="used" name="Used/Packed (L)" fill="hsl(346, 87%, 43%)" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="stock" name="Running Stock" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Yogurt Base Daily Detail</CardTitle>
                <CardDescription>{yogurtRows.length} days</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCSV(yogurtRows, `yogurt-base-stock-${dateFrom}-to-${dateTo}.csv`)} data-testid="button-export-yogurt-base">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Produced (L)</TableHead>
                    <TableHead className="text-right">Used (L)</TableHead>
                    <TableHead className="text-right">Packed Out (L)</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-right">Running Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yogurtRows.map(row => (
                    <TableRow key={row.date} className={row.difference < 0 ? "bg-red-50/50" : ""} data-testid={`row-yogurt-stock-${row.date}`}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-right font-mono">{row.produced.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{row.usedInProduction.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{row.packedOut.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-medium ${row.difference < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {row.difference > 0 ? "+" : ""}{row.difference.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={row.runningStock < 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>
                          {row.runningStock.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {yogurtRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {isLoading ? "Loading..." : "No yogurt base data for the selected dates."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
