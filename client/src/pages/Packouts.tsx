import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Product = { id: number; name: string; category: string; unitType: string; active: boolean };
type Packout = { id: number; date: string; productId: number; qty: string; unitType: string; packSizeLabel: string | null };

export default function Packouts() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ date: format(new Date(), "yyyy-MM-dd"), productId: "", qty: "", packSizeLabel: "" });

  const { data: packouts = [] } = useQuery<Packout[]>({ queryKey: ["/api/packouts"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const finishedGoods = products.filter(p => p.category !== "RAW_MILK" && p.active);
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || `#${id}`;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/packouts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packouts"] });
      toast({ title: "Packout Recorded", description: "Finished goods logged." });
      setIsDialogOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), productId: "", qty: "", packSizeLabel: "" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleSave = () => {
    if (!formData.productId || !formData.qty) return;
    const product = products.find(p => p.id === parseInt(formData.productId));
    createMutation.mutate({
      date: formData.date,
      productId: parseInt(formData.productId),
      qty: formData.qty,
      unitType: product?.unitType || "UNIT",
      packSizeLabel: formData.packSizeLabel || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packouts</h2>
          <p className="text-muted-foreground">Record finished goods inventory.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-add-packout">
          <Plus className="h-4 w-4" /> Log Packout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {finishedGoods.slice(0, 4).map(product => {
          const total = packouts
            .filter(p => p.productId === product.id)
            .reduce((sum, p) => sum + parseFloat(p.qty), 0);
          return (
            <div key={product.id} className="bg-card border rounded-lg p-4 flex items-center gap-4 hover-elevate transition-all" data-testid={`card-packout-product-${product.id}`}>
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">{product.name}</div>
                <div className="text-xl font-bold">{total.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{product.unitType}</span></div>
              </div>
            </div>
          );
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
              <TableHead>Pack Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packouts.map((p) => (
              <TableRow key={p.id} data-testid={`row-packout-${p.id}`}>
                <TableCell>{p.date}</TableCell>
                <TableCell className="font-medium">{getProductName(p.productId)}</TableCell>
                <TableCell className="text-right">{parseFloat(p.qty).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{p.unitType}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{p.packSizeLabel || "—"}</TableCell>
              </TableRow>
            ))}
            {packouts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No packouts recorded yet.</TableCell>
              </TableRow>
            )}
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
              <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} data-testid="input-packout-date" />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={formData.productId} onValueChange={val => setFormData({ ...formData, productId: val })}>
                <SelectTrigger data-testid="select-packout-product"><SelectValue placeholder="Select finished good" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.unitType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} placeholder="0" data-testid="input-packout-qty" />
            </div>
            <div className="space-y-2">
              <Label>Pack Size Label (optional)</Label>
              <Input value={formData.packSizeLabel} onChange={e => setFormData({ ...formData, packSizeLabel: e.target.value })} placeholder="e.g. 500ml, 1kg" data-testid="input-packout-size" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} data-testid="button-save-packout">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
