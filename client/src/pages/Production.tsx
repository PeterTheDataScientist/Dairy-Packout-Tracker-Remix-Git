import { useState, useMemo } from "react";
import { useStore, ProductionLineItem, ProductionOperation, Formula } from "@/lib/mockStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Production() {
  const { productionLog, formulas, products, addProductionRecord } = useStore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [operationType, setOperationType] = useState<ProductionOperation>("CONVERT");
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>("");
  const [outputQty, setOutputQty] = useState<string>("");
  const [actualInputQty, setActualInputQty] = useState<string>("");
  const [batchCode, setBatchCode] = useState(`B-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`);

  // Derived State
  const selectedFormula = formulas.find(f => f.id === selectedFormulaId);
  
  const getProductName = (id?: string) => products.find(p => p.id === id)?.name || id;
  const getProductUnit = (id?: string) => products.find(p => p.id === id)?.unitType || '';

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    
    if (selectedFormula.type === 'CONVERSION') {
      // ratio = Input / Output -> Input = Output * (num/den)
      const ratio = (selectedFormula.ratioNumerator || 1) / (selectedFormula.ratioDenominator || 1);
      const expectedInput = outQ * ratio;
      
      let variance = 0;
      let variancePercent = 0;
      
      if (actualInputQty) {
        const actIn = parseFloat(actualInputQty);
        variance = actIn - expectedInput;
        variancePercent = (variance / expectedInput) * 100;
      }

      return {
        expectedInput,
        variance,
        variancePercent
      };
    } 
    
    if (selectedFormula.type === 'BLEND') {
      // Calculate component usage
      const components = selectedFormula.components?.map(c => ({
        ...c,
        expectedQty: outQ * c.fraction
      }));
      return { components };
    }

    return null;
  }, [selectedFormula, outputQty, actualInputQty]);

  const handleSave = () => {
    if (!selectedFormula || !outputQty) return;

    const outQ = parseFloat(outputQty);
    const inQ = actualInputQty ? parseFloat(actualInputQty) : undefined;
    
    // Variance check logic
    const isHighVariance = calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5;
    
    addProductionRecord({
      id: `prod${Date.now()}`,
      batchCode,
      date: format(new Date(), 'yyyy-MM-dd'),
      operationType,
      formulaId: selectedFormulaId,
      outputProductId: selectedFormula.outputProductId,
      outputQty: outQ,
      inputProductId: selectedFormula.inputProductId,
      inputQty: inQ,
      expectedInputQty: calculations?.expectedInput,
      variance: calculations?.variancePercent,
      notes: isHighVariance ? `Variance detected: ${calculations?.variancePercent.toFixed(1)}%` : undefined
    } as ProductionLineItem);

    toast({ 
      title: "Batch Recorded", 
      description: `Batch ${batchCode} saved successfully.`,
      variant: isHighVariance ? "destructive" : "default" 
    });
    
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setBatchCode(`B-${format(new Date(), 'yyyyMMdd')}-${Math.floor(Math.random() * 1000)}`);
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
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
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
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productionLog.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium font-mono text-xs">{log.batchCode}</TableCell>
                <TableCell>{log.date}</TableCell>
                <TableCell>
                  <Badge variant={log.operationType === 'CONVERT' ? 'outline' : 'secondary'}>
                    {log.operationType}
                  </Badge>
                </TableCell>
                <TableCell>{getProductName(log.outputProductId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {log.outputQty} <span className="text-muted-foreground text-xs">{getProductUnit(log.outputProductId)}</span>
                </TableCell>
                <TableCell className="text-right">
                  {log.variance ? (
                     <Badge variant={Math.abs(log.variance) > 5 ? "destructive" : "outline"} className={Math.abs(log.variance) <= 5 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400" : ""}>
                       {log.variance > 0 ? '+' : ''}{log.variance.toFixed(1)}%
                     </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Record Production Batch</DialogTitle>
            <DialogDescription>Select operation type and formula.</DialogDescription>
          </DialogHeader>
          
          <Tabs value={operationType} onValueChange={(v) => { setOperationType(v as ProductionOperation); setSelectedFormulaId(""); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="CONVERT">Conversion (Process)</TabsTrigger>
              <TabsTrigger value="BLEND">Blend (Mix)</TabsTrigger>
            </TabsList>

            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Batch Code</Label>
                   <Input value={batchCode} onChange={e => setBatchCode(e.target.value)} className="font-mono" />
                 </div>
                 <div className="space-y-2">
                   <Label>Select Formula</Label>
                   <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
                     <SelectTrigger>
                       <SelectValue placeholder="Choose formula..." />
                     </SelectTrigger>
                     <SelectContent>
                       {filteredFormulas.map(f => (
                         <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
              </div>

              {selectedFormula && (
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <span className="font-medium text-foreground">{getProductName(selectedFormula.inputProductId) || "Inputs"}</span>
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
                        />
                      </div>

                      {operationType === 'CONVERT' && (
                        <div className="space-y-2">
                           <Label>Actual Input Used ({getProductUnit(selectedFormula.inputProductId)})</Label>
                           <Input 
                             type="number" 
                             placeholder={`Expected: ${calculations?.expectedInput?.toFixed(1) || '...'}`}
                             value={actualInputQty}
                             onChange={e => setActualInputQty(e.target.value)}
                             className={calculations?.variancePercent && Math.abs(calculations.variancePercent) > 5 ? "border-destructive focus-visible:ring-destructive bg-destructive/5" : ""}
                           />
                           {calculations?.expectedInput && (
                             <p className="text-xs text-muted-foreground">
                               Target: {calculations.expectedInput.toFixed(1)}
                             </p>
                           )}
                        </div>
                      )}
                    </div>

                    {/* Variance / Component Feedback */}
                    {operationType === 'CONVERT' && calculations?.variancePercent !== undefined && actualInputQty && (
                      <div className={`mt-2 p-2 rounded text-sm flex items-center gap-2 ${Math.abs(calculations.variancePercent) > 5 ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                        {Math.abs(calculations.variancePercent) > 5 ? <AlertTriangle className="h-4 w-4"/> : <CheckCircle2 className="h-4 w-4"/>}
                        <span className="font-medium">Variance: {calculations.variancePercent > 0 ? '+' : ''}{calculations.variancePercent.toFixed(1)}%</span>
                        <span className="text-xs opacity-80">({(parseFloat(actualInputQty) - calculations.expectedInput).toFixed(1)} diff)</span>
                      </div>
                    )}

                    {operationType === 'BLEND' && calculations?.components && (
                      <div className="mt-2 space-y-2">
                        <Label className="text-xs text-muted-foreground">Expected Component Usage:</Label>
                        <div className="grid gap-2 text-sm">
                          {calculations.components.map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center bg-background p-2 rounded border">
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
            <Button onClick={handleSave} disabled={!selectedFormula || !outputQty}>
              Save Batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
