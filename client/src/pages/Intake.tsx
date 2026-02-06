import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Milk } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Product = { id: number; name: string; unitType: string; isIntermediate: boolean };
type Supplier = { id: number; name: string; active: boolean };
type Intake = { id: number; date: string; supplierId: number | null; productId: number; qty: string; unitType: string };

export default function IntakePage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    supplierId: "",
    productId: "",
    qty: "",
  });

  const { data: intakes = [] } = useQuery<Intake[]>({ queryKey: ["/api/intakes"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/intakes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({ title: "Intake Recorded", description: "Delivery has been logged." });
      setIsDialogOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), supplierId: "", productId: "", qty: "" });
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
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
      productId: parseInt(formData.productId),
      qty: formData.qty,
      unitType: product?.unitType || "LITER",
    });
  };

  const getProductName = (id: number) => products.find(p => p.id === id)?.name || `#${id}`;
  const getSupplierName = (id: number | null) => (id ? suppliers.find(s => s.id === id)?.name || `#${id}` : "—");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Intake</h2>
          <p className="text-muted-foreground">Log raw material deliveries from suppliers.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-add-intake">
          <Plus className="h-4 w-4" /> Log Delivery
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {intakes.map((intake) => (
              <TableRow key={intake.id} data-testid={`row-intake-${intake.id}`}>
                <TableCell>{intake.date}</TableCell>
                <TableCell>{getSupplierName(intake.supplierId)}</TableCell>
                <TableCell className="font-medium">{getProductName(intake.productId)}</TableCell>
                <TableCell className="text-right font-medium">{parseFloat(intake.qty).toLocaleString()}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{intake.unitType}</TableCell>
              </TableRow>
            ))}
            {intakes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No intake records yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Delivery</DialogTitle>
            <DialogDescription>Record an incoming raw material delivery.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} data-testid="input-intake-date" />
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <SearchableSelect
                options={suppliers.filter(s => s.active).map(s => ({ value: String(s.id), label: s.name }))}
                value={formData.supplierId}
                onValueChange={val => setFormData({ ...formData, supplierId: val })}
                placeholder="Select supplier"
                searchPlaceholder="Search suppliers..."
                data-testid="select-intake-supplier"
              />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <SearchableSelect
                options={products.map(p => ({ value: String(p.id), label: `${p.name} (${p.unitType})` }))}
                value={formData.productId}
                onValueChange={val => setFormData({ ...formData, productId: val })}
                placeholder="Select product"
                searchPlaceholder="Search products..."
                data-testid="select-intake-product"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" placeholder="0" value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} data-testid="input-intake-qty" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} data-testid="button-save-intake">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
