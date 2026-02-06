import { useState } from "react";
import { useStore, Packout, UnitType } from "@/lib/mockStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Packouts() {
  const { packouts = [], products } = useStore(); // Default to empty array if not in store yet
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Local state for packouts if store doesn't have it fully wired
  const [localPackouts, setLocalPackouts] = useState<Packout[]>([
    { id: 'pk1', date: '2023-10-25', productId: 'p5', qty: 1200, unitType: 'UNIT' }
  ]);

  const [formData, setFormData] = useState<Partial<Packout>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    qty: 0
  });

  const getProductName = (id?: string) => products.find(p => p.id === id)?.name || id;

  const handleSave = () => {
    if (!formData.productId || !formData.qty) return;

    const newPackout: Packout = {
      id: `pk${Date.now()}`,
      date: formData.date || format(new Date(), 'yyyy-MM-dd'),
      productId: formData.productId,
      qty: formData.qty,
      unitType: products.find(p => p.id === formData.productId)?.unitType || 'UNIT'
    };

    setLocalPackouts([newPackout, ...localPackouts]);
    toast({ title: "Packout Recorded", description: `${formData.qty} units logged.` });
    setIsDialogOpen(false);
    setFormData({ date: format(new Date(), 'yyyy-MM-dd'), qty: 0 });
  };

  // Only show Finished Goods
  const finishedGoods = products.filter(p => !p.isIntermediate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packouts</h2>
          <p className="text-muted-foreground">Record finished goods inventory.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Log Packout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {finishedGoods.slice(0, 4).map(product => {
           const total = localPackouts.filter(p => p.productId === product.id).reduce((sum, p) => sum + p.qty, 0);
           return (
             <div key={product.id} className="bg-card border rounded-lg p-4 flex items-center gap-4 hover-elevate transition-all">
               <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                 <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
               </div>
               <div>
                 <div className="text-sm font-medium text-muted-foreground">{product.name}</div>
                 <div className="text-xl font-bold">{total} <span className="text-xs font-normal text-muted-foreground">{product.unitType}</span></div>
               </div>
             </div>
           )
        })}
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localPackouts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.date}</TableCell>
                <TableCell className="font-medium">{getProductName(p.productId)}</TableCell>
                <TableCell className="text-right">{p.qty}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{p.unitType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Packout</DialogTitle>
            <DialogDescription>Record finished goods entering inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select onValueChange={val => setFormData({...formData, productId: val})}>
                <SelectTrigger><SelectValue placeholder="Select finished good" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={formData.qty || ''} onChange={e => setFormData({...formData, qty: parseFloat(e.target.value)})} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
