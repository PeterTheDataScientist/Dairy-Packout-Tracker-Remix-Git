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
import { Plus, ArrowRight, AlertTriangle, CheckCircle2, Beaker, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Product = { id: number; name: string; unitType: string; category: string; active: boolean };
type FormulaWithDetails = {
  id: number; name: string; type: "CONVERSION" | "BLEND"; outputProductId: number; active: boolean;
  conversion?: { inputProductId: number; ratioNumerator: string; ratioDenominator: string };
  components?: { componentProductId: number; fraction: string }[];
};
type LineItem = { id: number; batchCode: string; batchDate: string; operationType: string; outputProductId: number; outputQty: string; inputProductId: number | null; inputQty: string | null };

export default function Production() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [actualInputQty, setActualInputQty] = useState("");
  const [batchDate, setBatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchCode, setBatchCode] = useState(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });

  const activeProducts = products.filter(p => p.active && p.category !== "RAW_MILK");

  const productOptions = useMemo(() => {
    return activeProducts
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(p => ({ value: String(p.id), label: p.name }));
  }, [activeProducts]);

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));

  const matchedFormula = useMemo(() => {
    if (!selectedProductId) return null;
    const pid = parseInt(selectedProductId);
    return formulas.find(f => f.outputProductId === pid && f.active) || null;
  }, [selectedProductId, formulas]);

  const getProductName = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.name || `#${id}` : "";
  const getProductUnit = (id: number | null | undefined) => id ? products.find(p => p.id === id)?.unitType || "" : "";

  const unitLabel = (unitType: string) => {
    if (unitType === "LITER") return "Litres";
    if (unitType === "KG") return "Kilograms";
    return "Units";
  };

  const unitShort = (unitType: string) => {
    if (unitType === "LITER") return "L";
    if (unitType === "KG") return "kg";
    return "units";
  };

  const calculations = useMemo(() => {
    if (!matchedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
    if (matchedFormula.type === "CONVERSION" && matchedFormula.conversion) {
      const ratio = parseFloat(matchedFormula.conversion.ratioNumerator) / parseFloat(matchedFormula.conversion.ratioDenominator);
      const expectedInput = outQ * ratio;
      let variance = 0;
      if (actualInputQty) {
        variance = ((parseFloat(actualInputQty) - expectedInput) / expectedInput) * 100;
      }
      return { expectedInput, variancePercent: variance, inputProductId: matchedFormula.conversion.inputProductId };
    }
    if (matchedFormula.type === "BLEND" && matchedFormula.components) {
      const comps = matchedFormula.components.map(c => ({
        ...c,
        expectedQty: outQ * parseFloat(c.fraction),
      }));
      return { components: comps };
    }
    return null;
  }, [matchedFormula, outputQty, actualInputQty]);

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
    if (!selectedProduct || !outputQty) return;
    const operationType = matchedFormula?.type === "BLEND" ? "BLEND" : "CONVERT";
    try {
      const batch = await createBatchMutation.mutateAsync({
        date: batchDate,
        batchCode,
        notes: null,
      });

      await createLineItemMutation.mutateAsync({
        batchId: batch.id,
        operationType,
        formulaId: matchedFormula?.id || null,
        inputProductId: matchedFormula?.type === "CONVERSION" ? matchedFormula.conversion?.inputProductId : null,
        inputQty: actualInputQty || null,
        outputProductId: selectedProduct.id,
        outputQty,
        unitType: selectedProduct.unitType,
      });

      toast({
        title: "Batch Recorded",
        description: `${selectedProduct.name} — ${parseFloat(outputQty).toLocaleString()} ${unitShort(selectedProduct.unitType)} logged.`,
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
    setSelectedProductId("");
    setOutputQty("");
    setActualInputQty("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-production-title">Production</h2>
          <p className="text-muted-foreground">Record what was made today and how much raw material was used.</p>
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
              <TableHead>Product Made</TableHead>
              <TableHead className="text-right">Qty Produced</TableHead>
              <TableHead className="text-right">Raw Material Used</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((log) => (
              <TableRow key={log.id} data-testid={`row-production-${log.id}`}>
                <TableCell className="font-medium font-mono text-xs">{log.batchCode}</TableCell>
                <TableCell>{log.batchDate}</TableCell>
                <TableCell className="font-medium">{getProductName(log.outputProductId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {parseFloat(log.outputQty).toLocaleString()} <span className="text-muted-foreground text-xs">{unitShort(getProductUnit(log.outputProductId))}</span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {log.inputQty ? (
                    <>
                      {parseFloat(log.inputQty).toLocaleString()} <span className="text-xs">{unitShort(getProductUnit(log.inputProductId))}</span>
                      {log.inputProductId && <span className="text-xs ml-1">({getProductName(log.inputProductId)})</span>}
                    </>
                  ) : "—"}
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Record Production
            </DialogTitle>
            <DialogDescription>
              Pick what you made, enter how much, and we'll calculate the rest.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
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

            <div className="space-y-2">
              <Label className="font-medium">What did you make?</Label>
              <SearchableSelect
                options={productOptions}
                value={selectedProductId}
                onValueChange={(val) => { setSelectedProductId(val); setOutputQty(""); setActualInputQty(""); }}
                placeholder="Search for a product..."
                searchPlaceholder="Type product name..."
                data-testid="select-output-product"
              />
            </div>

            {selectedProduct && (
              <>
                <div className="space-y-2">
                  <Label className="font-medium">How much did you make?</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={outputQty}
                      onChange={e => setOutputQty(e.target.value)}
                      className="text-lg font-medium flex-1"
                      autoFocus
                      data-testid="input-output-qty"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {unitLabel(selectedProduct.unitType)}
                    </span>
                  </div>
                </div>

                {matchedFormula && matchedFormula.type === "CONVERSION" && matchedFormula.conversion && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                          {getProductName(matchedFormula.conversion.inputProductId)}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800">
                          {selectedProduct.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {parseFloat(matchedFormula.conversion.ratioNumerator)}:{parseFloat(matchedFormula.conversion.ratioDenominator)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-medium">
                          How much {getProductName(matchedFormula.conversion.inputProductId)} did you use?
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder={calculations?.expectedInput ? `Expected: ${calculations.expectedInput.toFixed(1)}` : "..."}
                            value={actualInputQty}
                            onChange={e => setActualInputQty(e.target.value)}
                            className={`flex-1 ${calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            data-testid="input-actual-input"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {unitLabel(getProductUnit(matchedFormula.conversion.inputProductId))}
                          </span>
                        </div>
                        {calculations?.expectedInput && (
                          <p className="text-xs text-muted-foreground">
                            Based on the formula, you should need about {calculations.expectedInput.toFixed(1)} {unitShort(getProductUnit(matchedFormula.conversion.inputProductId))}
                          </p>
                        )}
                      </div>

                      {calculations?.variancePercent !== undefined && actualInputQty && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${Math.abs(calculations.variancePercent) > 5 ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                          {Math.abs(calculations.variancePercent) > 5 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                          <div>
                            <span className="font-medium">
                              {Math.abs(calculations.variancePercent) <= 5 ? "Within range" : `Variance: ${calculations.variancePercent > 0 ? "+" : ""}${calculations.variancePercent.toFixed(1)}%`}
                            </span>
                            {Math.abs(calculations.variancePercent) > 5 && (
                              <span className="text-xs opacity-80 ml-2">
                                ({calculations.variancePercent > 0 ? "used more than expected" : "used less than expected"})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {matchedFormula && matchedFormula.type === "BLEND" && calculations?.components && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <Label className="text-xs text-muted-foreground font-medium">Ingredients needed:</Label>
                      <div className="grid gap-2 text-sm">
                        {calculations.components.map((c: any, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-background p-2 rounded border">
                            <span>{getProductName(c.componentProductId)}</span>
                            <span className="font-mono">{c.expectedQty.toFixed(1)} {unitShort(getProductUnit(c.componentProductId))}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!matchedFormula && outputQty && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No formula set up for this product yet. Production will be recorded without variance tracking. An admin can add a formula later.</span>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedProduct || !outputQty || createBatchMutation.isPending} data-testid="button-save-batch">
              Save Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
