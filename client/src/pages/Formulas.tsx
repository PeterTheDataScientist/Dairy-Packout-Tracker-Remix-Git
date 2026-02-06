import { useState } from "react";
import { useStore, Formula, FormulaType, BlendComponent } from "@/lib/mockStore";
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

export default function Formulas() {
  const { formulas, products, addFormula } = useStore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Formula>>({
    name: "",
    type: "CONVERSION",
    active: true,
    version: 1,
    components: []
  });

  const getProductName = (id?: string) => products.find(p => p.id === id)?.name || id;

  const handleSave = () => {
    if (!formData.name || !formData.outputProductId) {
      toast({ variant: "destructive", title: "Error", description: "Missing required fields" });
      return;
    }

    if (formData.type === 'BLEND') {
      const sum = formData.components?.reduce((acc, c) => acc + c.fraction, 0) || 0;
      if (Math.abs(sum - 1) > 0.001) {
        toast({ variant: "destructive", title: "Invalid Blend", description: `Components sum to ${sum}, must be 1.0` });
        return;
      }
    }

    addFormula({
      id: `f${Date.now()}`,
      ...formData
    } as Formula);
    
    toast({ title: "Formula Created", description: "New formula version active." });
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "CONVERSION",
      active: true,
      version: 1,
      components: []
    });
  };

  const addComponent = () => {
    setFormData({
      ...formData,
      components: [
        ...(formData.components || []),
        { id: `c${Date.now()}`, componentProductId: "", fraction: 0 } as BlendComponent
      ]
    });
  };

  const updateComponent = (index: number, field: keyof BlendComponent, value: any) => {
    const newComponents = [...(formData.components || [])];
    newComponents[index] = { ...newComponents[index], [field]: value };
    setFormData({ ...formData, components: newComponents });
  };

  const removeComponent = (index: number) => {
    const newComponents = [...(formData.components || [])];
    newComponents.splice(index, 1);
    setFormData({ ...formData, components: newComponents });
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Formulas</h2>
          <p className="text-muted-foreground">Define conversion ratios and blend recipes.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
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
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.name}</TableCell>
                <TableCell>
                  <Badge variant={f.type === 'CONVERSION' ? 'default' : 'secondary'}>{f.type}</Badge>
                </TableCell>
                <TableCell>{getProductName(f.outputProductId)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {f.type === 'CONVERSION' ? (
                    <span>1 Unit Out = {(f.ratioNumerator! / f.ratioDenominator!).toFixed(2)} Units of {getProductName(f.inputProductId)}</span>
                  ) : (
                    <span>{f.components?.length} Components (Sum: {f.components?.reduce((a,b)=>a+b.fraction,0).toFixed(2)})</span>
                  )}
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
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Standard Yogurt Mix" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(val: FormulaType) => setFormData({...formData, type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONVERSION">Conversion (1 Input - 1 Output)</SelectItem>
                    <SelectItem value="BLEND">Blend (Many Inputs - 1 Output)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Output Product (What are we making?)</Label>
              <Select value={formData.outputProductId} onValueChange={val => setFormData({...formData, outputProductId: val})}>
                <SelectTrigger><SelectValue placeholder="Select output product" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.unitType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              {formData.type === 'CONVERSION' ? (
                <div className="space-y-4">
                   <h4 className="font-medium text-sm text-muted-foreground">Conversion Logic</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Input Product (Source)</Label>
                        <Select value={formData.inputProductId} onValueChange={val => setFormData({...formData, inputProductId: val})}>
                          <SelectTrigger><SelectValue placeholder="Select input source" /></SelectTrigger>
                          <SelectContent>
                            {products.filter(p => p.id !== formData.outputProductId).map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name} ({p.unitType})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label>Input Qty</Label>
                          <Input type="number" value={formData.ratioNumerator || ''} onChange={e => setFormData({...formData, ratioNumerator: parseFloat(e.target.value)})} placeholder="1.0" />
                        </div>
                        <div className="space-y-2">
                          <Label>Output Qty</Label>
                          <Input type="number" value={formData.ratioDenominator || ''} onChange={e => setFormData({...formData, ratioDenominator: parseFloat(e.target.value)})} placeholder="1.0" />
                        </div>
                      </div>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     Logic: To make {formData.ratioDenominator || 0} unit(s) of Output, we need {formData.ratioNumerator || 0} unit(s) of Input.
                   </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-muted-foreground">Blend Components</h4>
                    <Button variant="outline" size="sm" onClick={addComponent}><Plus className="h-3 w-3 mr-1"/> Add Component</Button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.components?.map((comp, idx) => (
                      <Card key={idx} className="bg-muted/30">
                        <CardContent className="p-3 flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Component</Label>
                            <Select value={comp.componentProductId} onValueChange={val => updateComponent(idx, 'componentProductId', val)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select ingredient" /></SelectTrigger>
                              <SelectContent>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-xs">Fraction (0-1)</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              className="h-8 text-sm" 
                              value={comp.fraction} 
                              onChange={e => updateComponent(idx, 'fraction', parseFloat(e.target.value))} 
                            />
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
                      <span className={(formData.components?.reduce((a,b)=>a+b.fraction,0) || 0) === 1 ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                        {(formData.components?.reduce((a,b)=>a+b.fraction,0) || 0).toFixed(3)} / 1.000
                      </span>
                   </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Formula</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
