import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2, Beaker, Info, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Product = { id: number; name: string; unitType: string; category: string; active: boolean; isIntermediate: boolean; packSizeQty: string | null; packSizeUnit: string | null; packSizeLabel: string | null };
type FormulaWithDetails = {
  id: number; name: string; type: "CONVERSION" | "BLEND"; outputProductId: number; active: boolean;
  conversion?: { inputProductId: number; ratioNumerator: string; ratioDenominator: string };
  components?: { componentProductId: number; fraction: string }[];
};
type LineItem = { id: number; batchCode: string; batchDate: string; operationType: string; outputProductId: number; outputQty: string; inputProductId: number | null; inputQty: string | null; createdByUserId?: number; notes: string | null; reviewedAt: string | null; reviewedByUserId: number | null; adminNotes: string | null };

export default function Production() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LineItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [actualInputQty, setActualInputQty] = useState("");
  const [batchDate, setBatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchCode, setBatchCode] = useState(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);
  const [blendActuals, setBlendActuals] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [reviewingItem, setReviewingItem] = useState<LineItem | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState("");

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });
  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });

  const activeProducts = products.filter(p => p.active && p.category !== "RAW_MILK" && !p.isIntermediate);

  const productOptions = useMemo(() => {
    return activeProducts
      .map(p => ({ value: String(p.id), label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
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

  const outputEquivalent = useMemo(() => {
    if (!selectedProduct || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
    if (selectedProduct.unitType === "UNIT" && selectedProduct.packSizeQty) {
      const packSize = parseFloat(selectedProduct.packSizeQty);
      const volume = outQ * packSize;
      const unitLabel = selectedProduct.packSizeUnit === "KILOGRAM" ? "kg" : "L";
      return { volume, unitLabel, packSize };
    }
    return null;
  }, [selectedProduct, outputQty]);

  const calculations = useMemo(() => {
    if (!matchedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
    if (matchedFormula.type === "CONVERSION" && matchedFormula.conversion) {
      const ratio = parseFloat(matchedFormula.conversion.ratioNumerator) / parseFloat(matchedFormula.conversion.ratioDenominator);
      let effectiveOutputQty = outQ;
      if (selectedProduct?.unitType === "UNIT" && selectedProduct?.packSizeQty) {
        effectiveOutputQty = outQ * parseFloat(selectedProduct.packSizeQty);
      }
      const expectedInput = effectiveOutputQty * ratio;
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

  const canEditItem = (item: LineItem) => {
    return user?.role === "ADMIN" || item.createdByUserId === user?.id;
  };

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

  const updateLineItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PUT", `/api/production/line-items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/production/line-items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
    },
  });

  const saveBlendUsageMutation = useMutation({
    mutationFn: async ({ lineItemId, components }: { lineItemId: number; components: any[] }) => {
      const res = await apiRequest("POST", `/api/production/line-items/${lineItemId}/blend-usage`, { components });
      return res.json();
    },
  });

  const handleSave = async () => {
    if (!selectedProduct || !outputQty) return;
    const operationType = matchedFormula?.type === "BLEND" ? "BLEND" : "CONVERT";
    try {
      if (editingItem) {
        await updateLineItemMutation.mutateAsync({
          id: editingItem.id,
          outputQty,
          inputQty: actualInputQty || null,
          outputProductId: selectedProduct.id,
          inputProductId: matchedFormula?.type === "CONVERSION" ? matchedFormula.conversion?.inputProductId : null,
          formulaId: matchedFormula?.id || null,
          operationType,
        });
        toast({
          title: "Record Updated",
          description: `${selectedProduct.name} — updated to ${parseFloat(outputQty).toLocaleString()} ${unitShort(selectedProduct.unitType)}.`,
        });
      } else {
        const batch = await createBatchMutation.mutateAsync({
          date: batchDate,
          batchCode,
          notes: null,
        });
        const lineItem = await createLineItemMutation.mutateAsync({
          batchId: batch.id,
          operationType,
          formulaId: matchedFormula?.id || null,
          inputProductId: matchedFormula?.type === "CONVERSION" ? matchedFormula.conversion?.inputProductId : null,
          inputQty: actualInputQty || null,
          outputProductId: selectedProduct.id,
          outputQty,
          unitType: selectedProduct.unitType,
          notes: notes || null,
        });

        if (operationType === "BLEND" && Object.keys(blendActuals).length > 0 && calculations?.components) {
          const components = calculations.components.map((c: any) => ({
            componentProductId: c.componentProductId,
            expectedQty: String(c.expectedQty),
            actualQty: blendActuals[c.componentProductId] || String(c.expectedQty),
          }));
          await saveBlendUsageMutation.mutateAsync({ lineItemId: lineItem.id, components });
        }

        if (lineItem.inputQtyAutoFilled) {
          toast({
            title: "Input Auto-Filled",
            description: `No input quantity was entered. The system calculated ${parseFloat(lineItem.inputQty).toFixed(1)} L from the formula. You can edit this later if needed.`,
            variant: "default",
          });
        } else {
          toast({
            title: "Batch Recorded",
            description: `${selectedProduct.name} — ${parseFloat(outputQty).toLocaleString()} ${unitShort(selectedProduct.unitType)} logged.`,
          });
        }
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteLineItemMutation.mutateAsync(deletingItem.id);
      toast({ title: "Record Deleted", description: "Production record has been removed." });
      setDeletingItem(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const openEditDialog = (item: LineItem) => {
    setEditingItem(item);
    setSelectedProductId(String(item.outputProductId));
    setOutputQty(item.outputQty);
    setActualInputQty(item.inputQty || "");
    setBatchDate(item.batchDate);
    setBatchCode(item.batchCode);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setBatchCode(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);
    setBatchDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedProductId("");
    setOutputQty("");
    setActualInputQty("");
    setBlendActuals({});
    setNotes("");
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
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]"></TableHead>
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
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  <div className="flex items-center gap-1">
                    {log.reviewedAt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    <span className="truncate">{log.notes || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canEditItem(log) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(log)} data-testid={`button-edit-production-${log.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {user?.role === "ADMIN" && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeletingItem(log)} data-testid={`button-delete-production-${log.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {!log.reviewedAt && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => { setReviewingItem(log); setAdminNotesInput(""); }} data-testid={`button-review-production-${log.id}`}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {lineItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No production records yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              {editingItem ? "Edit Production Record" : "Record Production"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the quantities for this production record." : "Pick what you made, enter how much, and we'll calculate the rest."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {!editingItem && (
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
            )}

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
                  {outputEquivalent && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1" data-testid="text-output-equivalent">
                      <Info className="h-3 w-3" />
                      Output equivalent: {parseFloat(outputQty)} units = {outputEquivalent.volume.toFixed(1)} {outputEquivalent.unitLabel}
                      {selectedProduct.packSizeLabel && <span className="text-muted-foreground">({selectedProduct.packSizeLabel} per unit)</span>}
                    </p>
                  )}
                </div>

                {matchedFormula && matchedFormula.type === "CONVERSION" && matchedFormula.conversion &&
                  getProductUnit(matchedFormula.conversion.inputProductId) !== selectedProduct.unitType &&
                  getProductUnit(matchedFormula.conversion.inputProductId) &&
                  !(selectedProduct.unitType === "UNIT" && selectedProduct.packSizeQty) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" data-testid="warning-unit-mismatch">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>Unit mismatch:</strong> Input is in {unitLabel(getProductUnit(matchedFormula.conversion.inputProductId))} but output is in {unitLabel(selectedProduct.unitType)}.
                      The formula ratio may account for this conversion, but double-check the quantities.
                    </span>
                  </div>
                )}

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
                        {user?.role === "ADMIN" && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {parseFloat(matchedFormula.conversion.ratioNumerator)}:{parseFloat(matchedFormula.conversion.ratioDenominator)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="font-medium">
                          How much {getProductName(matchedFormula.conversion.inputProductId)} did you use?
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder={user?.role === "ADMIN" && calculations?.expectedInput ? `Expected: ${calculations.expectedInput.toFixed(1)}` : "0"}
                            value={actualInputQty}
                            onChange={e => setActualInputQty(e.target.value)}
                            className={`flex-1 ${user?.role === "ADMIN" && calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5 ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            data-testid="input-actual-input"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {unitLabel(getProductUnit(matchedFormula.conversion.inputProductId))}
                          </span>
                        </div>
                        {user?.role === "ADMIN" && calculations?.expectedInput && (
                          <p className="text-xs text-muted-foreground">
                            Based on the formula, you should need about {calculations.expectedInput.toFixed(1)} {unitShort(getProductUnit(matchedFormula.conversion.inputProductId))}
                          </p>
                        )}
                      </div>

                      {user?.role === "ADMIN" && calculations?.variancePercent !== undefined && actualInputQty && (
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
                      <Label className="text-xs text-muted-foreground font-medium">Blend Components:</Label>
                      <div className="grid gap-2 text-sm">
                        {calculations.components.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-background p-2 rounded border">
                            <span className="flex-1 text-xs">{getProductName(c.componentProductId)}</span>
                            {user?.role === "ADMIN" && <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">{c.expectedQty.toFixed(1)}</span>}
                            <Input
                              type="number"
                              placeholder="Actual"
                              value={blendActuals[c.componentProductId] || ""}
                              onChange={e => setBlendActuals(prev => ({ ...prev, [c.componentProductId]: e.target.value }))}
                              className="w-20 h-7 text-xs"
                              data-testid={`input-blend-actual-${c.componentProductId}`}
                            />
                            <span className="text-xs text-muted-foreground">{unitShort(getProductUnit(c.componentProductId))}</span>
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

            {!editingItem && (
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="e.g. Valve issue, extra loss observed..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  data-testid="input-production-notes"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selectedProduct || !outputQty || createBatchMutation.isPending || updateLineItemMutation.isPending} data-testid="button-save-batch">
              {editingItem ? "Update" : "Save Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => { if (!open) setDeletingItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Production Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the record for {deletingItem ? getProductName(deletingItem.outputProductId) : ""} ({deletingItem ? `${parseFloat(deletingItem.outputQty).toLocaleString()} ${unitShort(getProductUnit(deletingItem.outputProductId))}` : ""}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!reviewingItem} onOpenChange={(open) => { if (!open) { setReviewingItem(null); setAdminNotesInput(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Production Record</DialogTitle>
            <DialogDescription>
              Mark this record as reviewed and optionally add admin notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewingItem?.notes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Operator Notes</Label>
                <p className="text-sm bg-muted/50 p-2 rounded">{reviewingItem.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Verified quantities, all correct..."
                value={adminNotesInput}
                onChange={e => setAdminNotesInput(e.target.value)}
                rows={2}
                data-testid="input-admin-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewingItem(null); setAdminNotesInput(""); }}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!reviewingItem) return;
                try {
                  await apiRequest("PATCH", "/api/admin/review", {
                    entityType: "LINE_ITEM",
                    entityId: reviewingItem.id,
                    adminNotes: adminNotesInput || null,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
                  toast({ title: "Reviewed", description: "Record marked as reviewed." });
                  setReviewingItem(null);
                  setAdminNotesInput("");
                } catch (err: any) {
                  toast({ variant: "destructive", title: "Error", description: err.message });
                }
              }}
              data-testid="button-confirm-review"
            >
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
