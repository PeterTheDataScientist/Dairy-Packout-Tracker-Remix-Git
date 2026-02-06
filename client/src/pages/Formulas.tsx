import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

type Product = { id: number; name: string; unitType: string };
type FormulaWithDetails = {
  id: number; name: string; type: "CONVERSION" | "BLEND"; outputProductId: number; active: boolean; version: number;
  conversion?: { inputProductId: number; ratioNumerator: string; ratioDenominator: string };
  components?: { componentProductId: number; fraction: string }[];
};

type BlendComp = { componentProductId: string; fraction: string };

export default function Formulas() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formulaType, setFormulaType] = useState<"CONVERSION" | "BLEND">("CONVERSION");
  const [name, setName] = useState("");
  const [outputProductId, setOutputProductId] = useState("");
  const [inputProductId, setInputProductId] = useState("");
  const [ratioNum, setRatioNum] = useState("");
  const [ratioDen, setRatioDen] = useState("");
  const [components, setComponents] = useState<BlendComp[]>([]);

  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const getProductName = (id: number | string) => products.find(p => p.id === Number(id))?.name || `#${id}`;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/formulas", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/formulas"] });
      toast({ title: "Formula Created" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleSave = () => {
    if (!name || !outputProductId) {
      toast({ variant: "destructive", title: "Error", description: "Missing required fields" });
      return;
    }

    if (formulaType === "BLEND") {
      const sum = components.reduce((acc, c) => acc + parseFloat(c.fraction || "0"), 0);
      if (Math.abs(sum - 1) > 0.001) {
        toast({ variant: "destructive", title: "Invalid Blend", description: `Components sum to ${sum.toFixed(3)}, must be 1.000` });
        return;
      }
    }

    const body: any = {
      name,
      type: formulaType,
      outputProductId: parseInt(outputProductId),
      active: true,
      version: 1,
      inputBasis: "PER_UNIT_OUTPUT",
    };

    if (formulaType === "CONVERSION") {
      body.conversion = {
        inputProductId: parseInt(inputProductId),
        ratioNumerator: ratioNum,
        ratioDenominator: ratioDen,
      };
    } else {
      body.components = components.map(c => ({
        componentProductId: parseInt(c.componentProductId),
        fraction: c.fraction,
      }));
    }

    createMutation.mutate(body);
  };

  const resetForm = () => {
    setName(""); setFormulaType("CONVERSION"); setOutputProductId(""); setInputProductId(""); setRatioNum(""); setRatioDen(""); setComponents([]);
  };

  const addComponent = () => setComponents([...components, { componentProductId: "", fraction: "" }]);
  const updateComponent = (index: number, field: keyof BlendComp, value: string) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };
  const removeComponent = (index: number) => setComponents(components.filter((_, i) => i !== index));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Formulas</h2>
          <p className="text-muted-foreground">Define conversion ratios and blend recipes.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-formula">
          <Plus className="h-4 w-4" /> Create Formula
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Formula Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Output Product</TableHead>
              <TableHead>Logic</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formulas.map((f) => (
              <TableRow key={f.id} data-testid={`row-formula-${f.id}`}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell><Badge variant={f.type === "CONVERSION" ? "default" : "secondary"}>{f.type}</Badge></TableCell>
                <TableCell>{getProductName(f.outputProductId)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {f.type === "CONVERSION" && f.conversion ? (
                    <span>1 Out = {(parseFloat(f.conversion.ratioNumerator) / parseFloat(f.conversion.ratioDenominator)).toFixed(2)} {getProductName(f.conversion.inputProductId)}</span>
                  ) : f.components ? (
                    <span>{f.components.length} Components (Sum: {f.components.reduce((a, b) => a + parseFloat(b.fraction), 0).toFixed(2)})</span>
                  ) : "—"}
                </TableCell>
                <TableCell>v{f.version}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Formula</DialogTitle>
            <DialogDescription>Define inputs and outputs. This drives yield calculations.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formula Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Yogurt Mix" data-testid="input-formula-name" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formulaType} onValueChange={(val: any) => setFormulaType(val)}>
                  <SelectTrigger data-testid="select-formula-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSION">Conversion (1 Input → 1 Output)</SelectItem>
                    <SelectItem value="BLEND">Blend (Many Inputs → 1 Output)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Output Product</Label>
              <Select value={outputProductId} onValueChange={setOutputProductId}>
                <SelectTrigger data-testid="select-formula-output"><SelectValue placeholder="Select output product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.unitType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              {formulaType === "CONVERSION" ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-muted-foreground">Conversion Logic</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Input Product</Label>
                      <Select value={inputProductId} onValueChange={setInputProductId}>
                        <SelectTrigger data-testid="select-formula-input"><SelectValue placeholder="Select input" /></SelectTrigger>
                        <SelectContent>
                          {products.filter(p => String(p.id) !== outputProductId).map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.unitType})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Input Qty</Label>
                        <Input type="number" value={ratioNum} onChange={e => setRatioNum(e.target.value)} placeholder="1.05" data-testid="input-ratio-num" />
                      </div>
                      <div className="space-y-2">
                        <Label>Output Qty</Label>
                        <Input type="number" value={ratioDen} onChange={e => setRatioDen(e.target.value)} placeholder="1" data-testid="input-ratio-den" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Logic: To make {ratioDen || 0} unit(s) of Output, we need {ratioNum || 0} unit(s) of Input.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">Blend Components</h4>
                    <Button variant="outline" size="sm" onClick={addComponent} data-testid="button-add-component"><Plus className="h-3 w-3 mr-1" /> Add</Button>
                  </div>
                  <div className="space-y-3">
                    {components.map((comp, idx) => (
                      <Card key={idx} className="bg-muted/30">
                        <CardContent className="p-3 flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Component</Label>
                            <Select value={comp.componentProductId} onValueChange={val => updateComponent(idx, "componentProductId", val)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                              <SelectContent>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-xs">Fraction (0-1)</Label>
                            <Input type="number" step="0.01" className="h-8 text-sm" value={comp.fraction} onChange={e => updateComponent(idx, "fraction", e.target.value)} />
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeComponent(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="flex justify-between items-center bg-muted p-2 rounded text-sm">
                    <span>Total Fraction:</span>
                    <span className={components.reduce((a, b) => a + parseFloat(b.fraction || "0"), 0) === 1 ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                      {components.reduce((a, b) => a + parseFloat(b.fraction || "0"), 0).toFixed(3)} / 1.000
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} data-testid="button-save-formula">Save Formula</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
