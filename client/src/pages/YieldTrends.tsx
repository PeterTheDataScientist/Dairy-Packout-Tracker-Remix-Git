import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

type YieldTrend = {
  formulaId: number; formulaName: string; outputProduct: string;
  weeks: { week: string; yieldPercent: number; batchCount: number; totalInput: number; totalOutput: number }[];
};

export default function YieldTrends() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  if (user?.role !== "ADMIN") {
    navigate("/");
    return null;
  }

  const [selectedFormula, setSelectedFormula] = useState<string>("");

  const { data = [], isLoading } = useQuery<YieldTrend[]>({
    queryKey: ["/api/reports/yield-trends"],
    queryFn: async () => {
      const res = await fetch("/api/reports/yield-trends", { credentials: "include" });
      return res.json();
    },
  });

  const current = data.find(d => String(d.formulaId) === selectedFormula) || data[0];
  const weeks = current?.weeks || [];

  const avgYield = weeks.length > 0 ? weeks.reduce((sum, w) => sum + w.yieldPercent, 0) / weeks.length : 0;
  const bestWeek = weeks.length > 0 ? Math.max(...weeks.map(w => w.yieldPercent)) : 0;
  const worstWeek = weeks.length > 0 ? Math.min(...weeks.map(w => w.yieldPercent)) : 0;
  const totalBatches = weeks.reduce((sum, w) => sum + w.batchCount, 0);

  const hasData = data.length > 0 && weeks.length > 0;

  return (
    <div className="space-y-6" data-testid="page-yield-trends">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-yield-title">
          <TrendingUp className="h-6 w-6" />
          Yield Trends
        </h2>
        <p className="text-muted-foreground text-sm">Analyze production yield percentages over time by formula.</p>
      </div>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading yield data...</div>
      )}

      {data.length > 0 && (
        <div className="flex items-center gap-3">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedFormula || String(data[0]?.formulaId)} onValueChange={setSelectedFormula} data-testid="select-formula">
            <SelectTrigger className="w-[300px]" data-testid="select-formula-trigger">
              <SelectValue placeholder="Select formula" />
            </SelectTrigger>
            <SelectContent>
              {data.map(d => (
                <SelectItem key={d.formulaId} value={String(d.formulaId)} data-testid={`select-formula-${d.formulaId}`}>
                  {d.formulaName} → {d.outputProduct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {hasData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Yield % Over Time</CardTitle>
              <CardDescription>{current.formulaName} → {current.outputProduct}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]" data-testid="chart-yield-trends">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeks}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, "auto"]} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      formatter={(value: number, name: string) => {
                        if (name === "yieldPercent") return [`${value.toFixed(1)}%`, "Yield"];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Week: ${label}`}
                      content={({ active, payload, label }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3 text-sm space-y-1">
                            <div className="font-medium">Week: {label}</div>
                            <div>Yield: <span className="font-mono font-medium">{d.yieldPercent.toFixed(1)}%</span></div>
                            <div>Batches: <span className="font-mono">{d.batchCount}</span></div>
                            <div>Input: <span className="font-mono">{d.totalInput.toFixed(1)}</span></div>
                            <div>Output: <span className="font-mono">{d.totalOutput.toFixed(1)}</span></div>
                          </div>
                        );
                      }}
                    />
                    <Line type="monotone" dataKey="yieldPercent" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground">Avg Yield</div>
                <div className="text-2xl font-bold font-mono" data-testid="text-avg-yield">{avgYield.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground">Best Week</div>
                <div className="text-2xl font-bold font-mono text-emerald-600" data-testid="text-best-yield">{bestWeek.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground">Worst Week</div>
                <div className="text-2xl font-bold font-mono text-red-600" data-testid="text-worst-yield">{worstWeek.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="text-xs text-muted-foreground">Total Batches</div>
                <div className="text-2xl font-bold font-mono" data-testid="text-total-batches">{totalBatches}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Weekly Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Yield %</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Total Input</TableHead>
                    <TableHead className="text-right">Total Output</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeks.map((w, i) => (
                    <TableRow key={w.week} data-testid={`row-yield-week-${i}`}>
                      <TableCell className="font-medium">{w.week}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={w.yieldPercent >= avgYield ? "text-emerald-600" : "text-amber-600"}>
                          {w.yieldPercent.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{w.batchCount}</TableCell>
                      <TableCell className="text-right font-mono">{w.totalInput.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono">{w.totalOutput.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!hasData && !isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground" data-testid="text-yield-empty">
              No yield data available yet. Production data with input quantities is needed for trend analysis.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
