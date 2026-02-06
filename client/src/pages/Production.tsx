import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2, Beaker } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  const [selectedFormulaId, setSelectedFormulaId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [actualInputQty, setActualInputQty] = useState("");
  const [batchDate, setBatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchCode, setBatchCode] = useState(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });

  const activeFormulas = formulas.filter(f => f.active);
  const selectedFormula = formulas.find(f => f.id === parseInt(selectedFormulaId));
  const getProductName = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.name || `#${id}` : "";
  const getProductUnit = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.unitType || "" : "";

  const formulaOptions = useMemo(() => {
    return activeFormulas.map(f => {
      const outputName = getProductName(f.outputProductId);
      let inputName = "";
      let ratioLabel = "";
      if (f.type === "CONVERSION" && f.conversion) {
        inputName = getProductName(f.conversion.inputProductId);
        const num = parseFloat(f.conversion.ratioNumerator);
        const den = parseFloat(f.conversion.ratioDenominator);
        ratioLabel = ` (${num}:${den})`;
      }
      const label = inputName ? `${inputName} → ${outputName}${ratioLabel}` : f.name;
      return { value: String(f.id), label };
    });
  }, [activeFormulas, products]);

  const calculations = useMemo(() => {
    if (!selectedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
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
    const operationType = selectedFormula.type === "CONVERSION" ? "CONVERT" : "BLEND";
    try {
      const batch = await createBatchMutation.mutateAsync({
        date: batchDate,
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
    setBatchDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedFormulaId("");
    setOutputQty("");
    setActualInputQty("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-production-title">Production</h2>
          <p className="text-muted-foreground">Log daily processing batches. Pick a formula, enter quantities.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-production">
          <Plus className="h-4 w-4" /> Record Batch
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
                    {log.operationType === "CONVERT" ? "Process" : "Mix"}
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
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Record Production Batch
            </DialogTitle>
            <DialogDescription>
              Choose what you made and enter the quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">What did you produce?</Label>
              <SearchableSelect
                options={formulaOptions}
                value={selectedFormulaId}
                onValueChange={(val) => { setSelectedFormulaId(val); setOutputQty(""); setActualInputQty(""); }}
                placeholder="Pick a formula (e.g. Raw Milk → Yogurt Base)"
                searchPlaceholder="Type to search..."
                data-testid="select-formula"
              />
            </div>

            {selectedFormula && (
              <>
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                        {getProductName(selectedFormula.type === "CONVERSION" ? selectedFormula.conversion?.inputProductId : undefined) || "Inputs"}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                        {getProductName(selectedFormula.outputProductId)}
                      </Badge>
                      {selectedFormula.type === "CONVERSION" && selectedFormula.conversion && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          Ratio: {parseFloat(selectedFormula.conversion.ratioNumerator)}:{parseFloat(selectedFormula.conversion.ratioDenominator)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">How much did you make?</Label>
                        <Input
                          type="number"
                          placeholder="e.g. 500"
                          value={outputQty}
                          onChange={e => setOutputQty(e.target.value)}
                          className="bg-background text-lg font-medium"
                          autoFocus
                          data-testid="input-output-qty"
                        />
                        <p className="text-xs text-muted-foreground">
                          {getProductUnit(selectedFormula.outputProductId) === "LITER" ? "Litres" : getProductUnit(selectedFormula.outputProductId) === "KG" ? "Kilograms" : "Units"} of {getProductName(selectedFormula.outputProductId)}
                        </p>
                      </div>

                      {selectedFormula.type === "CONVERSION" && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">How much raw material did you use?</Label>
                          <Input
                            type="number"
                            placeholder={calculations?.expectedInput ? `Expected: ${calculations.expectedInput.toFixed(1)}` : "..."}
                            value={actualInputQty}
                            onChange={e => setActualInputQty(e.target.value)}
                            className={`bg-background ${calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            data-testid="input-actual-input"
                          />
                          {calculations?.expectedInput && (
                            <p className="text-xs text-muted-foreground">
                              Target: {calculations.expectedInput.toFixed(1)} {getProductUnit(calculations.inputProductId) === "LITER" ? "L" : getProductUnit(calculations.inputProductId) === "KG" ? "kg" : "units"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedFormula.type === "CONVERSION" && calculations?.variancePercent !== undefined && actualInputQty && (
                      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${Math.abs(calculations.variancePercent) > 5 ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                        {Math.abs(calculations.variancePercent) > 5 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        <div>
                          <span className="font-medium">Variance: {calculations.variancePercent > 0 ? "+" : ""}{calculations.variancePercent.toFixed(1)}%</span>
                          <span className="text-xs opacity-80 ml-2">
                            ({calculations.variancePercent > 0 ? "used more than expected" : "used less than expected"})
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedFormula.type === "BLEND" && calculations?.components && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Expected ingredients needed:</Label>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Date</Label>
                    <Input type="date" value={batchDate} onChange={e => setBatchDate(e.target.value)} data-testid="input-batch-date" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Batch Code</Label>
                    <Input value={batchCode} onChange={e => setBatchCode(e.target.value)} className="font-mono text-sm" data-testid="input-batch-code" />
                  </div>
                </div>
              </>
            )}
          </div>

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
