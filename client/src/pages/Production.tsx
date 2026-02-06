import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Product = { id: number; name: string; unitType: string };
type FormulaWithDetails = {
  id: number; name: string; type: "CONVERSION" | "BLEND"; outputProductId: number; active: boolean;
  conversion?: { inputProductId: number; ratioNumerator: string; ratioDenominator: string };
  components?: { componentProductId: number; fraction: string }[];
};
type LineItem = { id: number; batchCode: string; batchDate: string; operationType: string; outputProductId: number; outputQty: string; inputProductId: number | null; inputQty: string | null };

export default function Production() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [operationType, setOperationType] = useState<"CONVERT" | "BLEND">("CONVERT");
  const [selectedFormulaId, setSelectedFormulaId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [actualInputQty, setActualInputQty] = useState("");
  const [batchCode, setBatchCode] = useState(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });

  const selectedFormula = formulas.find(f => f.id === parseInt(selectedFormulaId));
  const getProductName = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.name || `#${id}` : "";
  const getProductUnit = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.unitType || "" : "";

  const calculations = useMemo(() => {
    if (!selectedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (selectedFormula.type === "CONVERSION" && selectedFormula.conversion) {
      const ratio = parseFloat(selectedFormula.conversion.ratioNumerator) / parseFloat(selectedFormula.conversion.ratioDenominator);
      const expectedInput = outQ * ratio;
      let variance = 0;
      if (actualInputQty) {
        variance = ((parseFloat(actualInputQty) - expectedInput) / expectedInput) * 100;
      }
      return { expectedInput, variancePercent: variance, inputProductId: selectedFormula.conversion.inputProductId };
    }
    if (selectedFormula.type === "BLEND" && selectedFormula.components) {
      const comps = selectedFormula.components.map(c => ({
        ...c,
        expectedQty: outQ * parseFloat(c.fraction),
      }));
      return { components: comps };
    }
    return null;
  }, [selectedFormula, outputQty, actualInputQty]);

  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/production/batches", data);
      return res.json();
    },
  });

  const createLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/production/line-items", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/batches"] });
    },
  });

  const handleSave = async () => {
    if (!selectedFormula || !outputQty) return;
    try {
      const batch = await createBatchMutation.mutateAsync({
        date: format(new Date(), "yyyy-MM-dd"),
        batchCode,
        notes: null,
      });

      await createLineItemMutation.mutateAsync({
        batchId: batch.id,
        operationType,
        formulaId: selectedFormula.id,
        inputProductId: selectedFormula.type === "CONVERSION" ? selectedFormula.conversion?.inputProductId : null,
        inputQty: actualInputQty || null,
        outputProductId: selectedFormula.outputProductId,
        outputQty,
        unitType: getProductUnit(selectedFormula.outputProductId),
      });

      const isHigh = calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5;
      toast({
        title: "Batch Recorded",
        description: `Batch ${batchCode} saved successfully.`,
        variant: isHigh ? "destructive" : "default",
      });
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const resetForm = () => {
    setBatchCode(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);
    setSelectedFormulaId("");
    setOutputQty("");
    setActualInputQty("");
    setOperationType("CONVERT");
  };

  const filteredFormulas = formulas.filter(f => f.type === operationType && f.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Production</h2>
          <p className="text-muted-foreground">Log daily processing batches and blends.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-production">
          <Plus className="h-4 w-4" /> Add Operation
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Batch Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Output Product</TableHead>
              <TableHead className="text-right">Qty Produced</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((log) => (
              <TableRow key={log.id} data-testid={`row-production-${log.id}`}>
                <TableCell className="font-medium font-mono text-xs">{log.batchCode}</TableCell>
                <TableCell>{log.batchDate}</TableCell>
                <TableCell>
                  <Badge variant={log.operationType === "CONVERT" ? "outline" : "secondary"}>
                    {log.operationType}
                  </Badge>
                </TableCell>
                <TableCell>{getProductName(log.outputProductId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {parseFloat(log.outputQty).toLocaleString()} <span className="text-muted-foreground text-xs">{getProductUnit(log.outputProductId)}</span>
                </TableCell>
              </TableRow>
            ))}
            {lineItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No production records yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record Production Batch</DialogTitle>
            <DialogDescription>Select operation type and formula.</DialogDescription>
          </DialogHeader>

          <Tabs value={operationType} onValueChange={(v) => { setOperationType(v as any); setSelectedFormulaId(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="CONVERT">Conversion (Process)</TabsTrigger>
              <TabsTrigger value="BLEND">Blend (Mix)</TabsTrigger>
            </TabsList>

            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batch Code</Label>
                  <Input value={batchCode} onChange={e => setBatchCode(e.target.value)} className="font-mono" data-testid="input-batch-code" />
                </div>
                <div className="space-y-2">
                  <Label>Select Formula</Label>
                  <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
                    <SelectTrigger data-testid="select-formula">
                      <SelectValue placeholder="Choose formula..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredFormulas.map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedFormula && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">
                        {selectedFormula.type === "CONVERSION" ? getProductName(selectedFormula.conversion?.inputProductId) : "Inputs"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-medium text-foreground">{getProductName(selectedFormula.outputProductId)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Output Quantity ({getProductUnit(selectedFormula.outputProductId)})</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          value={outputQty}
                          onChange={e => setOutputQty(e.target.value)}
                          className="bg-background text-lg font-medium"
                          data-testid="input-output-qty"
                        />
                      </div>

                      {operationType === "CONVERT" && (
                        <div className="space-y-2">
                          <Label>Actual Input Used ({getProductUnit(calculations?.inputProductId)})</Label>
                          <Input
                            type="number"
                            placeholder={`Expected: ${calculations?.expectedInput?.toFixed(1) || "..."}`}
                            value={actualInputQty}
                            onChange={e => setActualInputQty(e.target.value)}
                            className={calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5 ? "border-destructive focus-visible:ring-destructive bg-destructive/5" : ""}
                            data-testid="input-actual-input"
                          />
                          {calculations?.expectedInput && (
                            <p className="text-xs text-muted-foreground">
                              Target: {calculations.expectedInput.toFixed(1)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {operationType === "CONVERT" && calculations?.variancePercent !== undefined && actualInputQty && (
                      <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${Math.abs(calculations.variancePercent) > 5 ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                        {Math.abs(calculations.variancePercent) > 5 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span className="font-medium">Variance: {calculations.variancePercent > 0 ? "+" : ""}{calculations.variancePercent.toFixed(1)}%</span>
                        <span className="text-xs opacity-80">({(parseFloat(actualInputQty) - calculations.expectedInput!).toFixed(1)} diff)</span>
                      </div>
                    )}

                    {operationType === "BLEND" && calculations?.components && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs text-muted-foreground">Expected Component Usage:</Label>
                        <div className="grid gap-2 text-sm">
                          {calculations.components.map((c: any, i: number) => (
                            <div key={i} className="flex justify-between items-center bg-background p-2 rounded border">
                              <span>{getProductName(c.componentProductId)}</span>
                              <span className="font-mono">{c.expectedQty.toFixed(1)} {getProductUnit(c.componentProductId)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedFormula || !outputQty || createBatchMutation.isPending} data-testid="button-save-batch">
              Save Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
