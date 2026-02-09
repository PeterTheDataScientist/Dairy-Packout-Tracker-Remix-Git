import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, PieChart, Droplets, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AllocationLineItem = {
  lineItemId: number;
  outputProductName: string;
  inputProductName: string;
  inputQty: number;
  outputQty: number;
};

type AllocationBucket = {
  category: string;
  categoryLabel: string;
  totalInputUsed: number;
  lineItems: AllocationLineItem[];
};

type DataGap = {
  lineItemId: number;
  batchCode: string;
  batchDate: string;
  outputProductName: string;
  inputProductName: string;
  outputQty: string;
  issue: string;
};

type AllocationData = {
  date: string;
  totalRawMilkReceived: number;
  allocations: AllocationBucket[];
  dataGaps?: DataGap[];
};

const categoryColors: Record<string, string> = {
  RAW_MILK: "bg-amber-100 text-amber-800 border-amber-200",
  MILK: "bg-blue-100 text-blue-800 border-blue-200",
  YOGURT: "bg-pink-100 text-pink-800 border-pink-200",
  DTY: "bg-purple-100 text-purple-800 border-purple-200",
  YOLAC: "bg-lime-100 text-lime-800 border-lime-200",
  PROBIOTIC: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CREAM_CHEESE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  FETA: "bg-orange-100 text-orange-800 border-orange-200",
  SMOOTHY: "bg-violet-100 text-violet-800 border-violet-200",
  FRESH_CREAM: "bg-sky-100 text-sky-800 border-sky-200",
  DIP: "bg-rose-100 text-rose-800 border-rose-200",
  HODZEKO: "bg-teal-100 text-teal-800 border-teal-200",
  CHEESE: "bg-orange-100 text-orange-800 border-orange-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

function downloadCSV(data: AllocationData, filename: string) {
  const rows: any[] = [];
  for (const bucket of data.allocations) {
    for (const li of bucket.lineItems) {
      rows.push({
        date: data.date,
        category: bucket.categoryLabel,
        outputProduct: li.outputProductName,
        inputProduct: li.inputProductName,
        inputQty: li.inputQty,
        outputQty: li.outputQty,
      });
    }
  }
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Allocation() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { data, isLoading } = useQuery<AllocationData>({
    queryKey: ["/api/reports/allocation", date],
    queryFn: async () => {
      const res = await fetch(`/api/reports/allocation?date=${date}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!date,
  });

  const allocations = data?.allocations ?? [];
  const totalReceived = data?.totalRawMilkReceived ?? 0;
  const totalAllocated = allocations.reduce((s, a) => s + a.totalInputUsed, 0);
  const unallocated = totalReceived - totalAllocated;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Daily Allocation</h2>
          <p className="text-muted-foreground">See how raw milk was allocated across product categories on a given day.</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-[180px]" data-testid="input-allocation-date" />
            </div>
            {data && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadCSV(data, `allocation-${date}.csv`)} data-testid="button-export-allocation">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Droplets className="h-4 w-4 text-blue-500" />
              Raw Milk Received
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-total-received">
              {totalReceived.toFixed(1)} L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PieChart className="h-4 w-4 text-purple-500" />
              Total Allocated
            </div>
            <div className="text-2xl font-bold mt-1" data-testid="text-total-allocated">
              {totalAllocated.toFixed(1)} L
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Unallocated
            </div>
            <div className={`text-2xl font-bold mt-1 ${unallocated < 0 ? "text-red-600" : unallocated > 0 ? "text-emerald-600" : ""}`} data-testid="text-unallocated">
              {unallocated.toFixed(1)} L
            </div>
            <p className="text-xs text-muted-foreground mt-1">Received minus total used in production</p>
          </CardContent>
        </Card>
      </div>

      {allocations.length > 0 ? (
        <div className="space-y-3">
          {allocations.map(bucket => (
            <Collapsible key={bucket.category} defaultOpen={true}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`font-normal border ${categoryColors[bucket.category] || categoryColors.OTHER}`}>
                          {bucket.categoryLabel}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{bucket.lineItems.length} operations</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold font-mono">{bucket.totalInputUsed.toFixed(1)} L</span>
                        {totalReceived > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {((bucket.totalInputUsed / totalReceived) * 100).toFixed(1)}%
                          </Badge>
                        )}
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Output Product</TableHead>
                          <TableHead>Input Product</TableHead>
                          <TableHead className="text-right">Input Used (L)</TableHead>
                          <TableHead className="text-right">Output Qty</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bucket.lineItems.map(li => (
                          <TableRow key={li.lineItemId} data-testid={`row-allocation-${li.lineItemId}`}>
                            <TableCell className="font-medium">{li.outputProductName}</TableCell>
                            <TableCell className="text-muted-foreground">{li.inputProductName}</TableCell>
                            <TableCell className="text-right font-mono">{li.inputQty.toFixed(1)}</TableCell>
                            <TableCell className="text-right font-mono">{li.outputQty.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {isLoading ? "Loading..." : `No production data found for ${date}. Try a different date.`}
          </CardContent>
        </Card>
      )}

      {(data?.dataGaps?.length ?? 0) > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800" data-testid="panel-data-gaps">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              Data Gaps ({data!.dataGaps!.length})
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-400">
              These conversion operations are missing input quantities, which affects allocation accuracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Output Product</TableHead>
                  <TableHead>Input Product</TableHead>
                  <TableHead className="text-right">Output Qty</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data!.dataGaps!.map(gap => (
                  <TableRow key={gap.lineItemId} data-testid={`row-data-gap-${gap.lineItemId}`}>
                    <TableCell className="font-mono text-xs">{gap.batchCode}</TableCell>
                    <TableCell>{gap.batchDate}</TableCell>
                    <TableCell className="font-medium">{gap.outputProductName}</TableCell>
                    <TableCell className="text-muted-foreground">{gap.inputProductName}</TableCell>
                    <TableCell className="text-right font-mono">{parseFloat(gap.outputQty).toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                        Missing input qty
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
