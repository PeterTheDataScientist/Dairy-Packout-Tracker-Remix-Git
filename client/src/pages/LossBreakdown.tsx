import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Droplets, Package, Beaker, FlaskConical, TrendingDown } from "lucide-react";
import { format, subDays } from "date-fns";

type LossBreakdownData = {
  summary: { receiving: number; fillingProcess: number; draining: number; packingMixing: number };
  totalLoss: number;
  receiving: {
    id: number; date: string; productId: number; productName: string;
    delivered: number; accepted: number; loss: number; lossPercent: number;
  }[];
  fillingProcess: {
    id: number; date: string; productId: number; productName: string;
    sourceProductId: number; sourceProductName: string;
    sourceUsed: number; packed: number; loss: number; lossPercent: number;
  }[];
  draining: {
    id: number; date: string; batchCode: string;
    inputProductId: number; inputProductName: string;
    outputProductId: number; outputProductName: string;
    inputQty: number; outputQty: number; expectedOutput: number;
    loss: number; lossPercent: number;
  }[];
  packingMixing: {
    id: number; date: string; batchCode: string;
    outputProductId: number; outputProductName: string; outputQty: number;
    totalExpected: number; totalActual: number; loss: number; lossPercent: number;
    components: { componentProductId: number; componentName: string; expected: number; actual: number; variance: number }[];
  }[];
};

const categories = [
  { key: "receiving" as const, label: "A. Receiving", icon: Droplets, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "fillingProcess" as const, label: "B. Filling / Process", icon: Package, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
  { key: "draining" as const, label: "C. Draining", icon: FlaskConical, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  { key: "packingMixing" as const, label: "D. Packing / Mixing", icon: Beaker, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
];

export default function LossBreakdown() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery<LossBreakdownData>({
    queryKey: ["/api/reports/loss-breakdown", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/reports/loss-breakdown?dateFrom=${dateFrom}&dateTo=${dateTo}`, { credentials: "include" });
      return res.json();
    },
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const summaryValues = data ? [
    data.summary.receiving,
    data.summary.fillingProcess,
    data.summary.draining,
    data.summary.packingMixing,
  ] : [0, 0, 0, 0];

  const totalLoss = data?.totalLoss || 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-loss-title">
          <TrendingDown className="h-6 w-6" />
          Loss Breakdown
        </h2>
        <p className="text-muted-foreground text-sm">Track losses at each stage of the production process.</p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-loss-date-from" />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-loss-date-to" />
        </div>
      </div>

      <Card className="border-2">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Loss</span>
            <span className={`text-2xl font-bold ${totalLoss > 0 ? "text-red-600" : "text-emerald-600"}`} data-testid="text-total-loss">
              {totalLoss > 0 ? "-" : ""}{Math.abs(totalLoss).toFixed(1)}
            </span>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">Loading loss data...</div>
      )}

      {data && categories.map((cat, idx) => {
        const isOpen = openSections[cat.key] ?? false;
        const items = data[cat.key];
        const loss = summaryValues[idx];
        const itemCount = items.length;

        return (
          <Collapsible key={cat.key} open={isOpen} onOpenChange={() => toggleSection(cat.key)}>
            <CollapsibleTrigger asChild>
              <Card className={`cursor-pointer transition-all hover:shadow-md ${cat.bg} ${cat.border}`} data-testid={`card-loss-${cat.key}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <cat.icon className={`h-5 w-5 ${cat.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{itemCount} record{itemCount !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-lg ${loss > 0 ? "text-red-600" : loss < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {loss > 0 ? "-" : ""}{Math.abs(loss).toFixed(1)}
                      </span>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-1 mt-1">
              {cat.key === "receiving" && data.receiving.map(item => (
                <Card key={item.id} className="border-l-4 border-l-blue-400" data-testid={`row-loss-receiving-${item.id}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.date}</div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-200">{item.lossPercent.toFixed(1)}%</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Delivered:</span> <span className="font-mono">{item.delivered.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Accepted:</span> <span className="font-mono">{item.accepted.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Loss:</span> <span className="font-mono text-red-600">{item.loss.toFixed(1)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {cat.key === "fillingProcess" && data.fillingProcess.map(item => (
                <Card key={item.id} className="border-l-4 border-l-purple-400" data-testid={`row-loss-filling-${item.id}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">{item.date} &middot; from {item.sourceProductName}</div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-200">{item.lossPercent.toFixed(1)}%</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Used:</span> <span className="font-mono">{item.sourceUsed.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Packed:</span> <span className="font-mono">{item.packed.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Loss:</span> <span className="font-mono text-red-600">{item.loss.toFixed(1)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {cat.key === "draining" && data.draining.map(item => (
                <Card key={item.id} className="border-l-4 border-l-amber-400" data-testid={`row-loss-draining-${item.id}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{item.inputProductName} &rarr; {item.outputProductName}</div>
                        <div className="text-xs text-muted-foreground">{item.date} &middot; {item.batchCode}</div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-200">{item.lossPercent.toFixed(1)}%</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Input:</span> <span className="font-mono">{item.inputQty.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Output:</span> <span className="font-mono">{item.outputQty.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Loss:</span> <span className="font-mono text-red-600">{item.loss.toFixed(1)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {cat.key === "packingMixing" && data.packingMixing.map(item => (
                <Card key={item.id} className="border-l-4 border-l-emerald-400" data-testid={`row-loss-packing-${item.id}`}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-sm">{item.outputProductName}</div>
                        <div className="text-xs text-muted-foreground">{item.date} &middot; {item.batchCode}</div>
                      </div>
                      <Badge variant="outline" className="text-red-600 border-red-200">{item.lossPercent.toFixed(1)}%</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Expected Total:</span> <span className="font-mono">{item.totalExpected.toFixed(1)}</span></div>
                      <div><span className="text-muted-foreground">Actual Total:</span> <span className="font-mono">{item.totalActual.toFixed(1)}</span></div>
                    </div>
                    {item.components.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.components.map((c, ci) => (
                          <div key={ci} className="flex justify-between text-xs bg-muted/50 px-2 py-1 rounded">
                            <span>{c.componentName}</span>
                            <span className={`font-mono ${c.variance > 0 ? "text-red-600" : c.variance < 0 ? "text-emerald-600" : ""}`}>
                              {c.variance > 0 ? "+" : ""}{c.variance.toFixed(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {items.length === 0 && (
                <div className="text-center py-4 text-xs text-muted-foreground">No records with loss data for this period.</div>
              )}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
