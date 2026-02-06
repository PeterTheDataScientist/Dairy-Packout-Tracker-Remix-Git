import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Product = { id: number; name: string; category: string; unitType: string; isIntermediate: boolean; active: boolean };

export default function Products() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "OTHER", unitType: "UNIT", isIntermediate: false, active: true });

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/products", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created" });
      setIsDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated" });
      setIsDialogOpen(false);
    },
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({ name: product.name, category: product.category, unitType: product.unitType, isIntermediate: product.isIntermediate, active: product.active });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", category: "OTHER", unitType: "UNIT", isIntermediate: false, active: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage raw materials, intermediates, and finished goods.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-product">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-products" />
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleEdit(product)} data-testid={`row-product-${product.id}`}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell><Badge variant="secondary" className="font-normal">{product.category}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-sm uppercase">{product.unitType}</TableCell>
                <TableCell>
                  {product.isIntermediate ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Intermediate</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Finished Good</span>
                  )}
                </TableCell>
                <TableCell><div className={`h-2.5 w-2.5 rounded-full ${product.active ? "bg-emerald-500" : "bg-gray-300"}`} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>Edit</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product" : "Create Product"}</DialogTitle>
            <DialogDescription>Configure the product details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="col-span-3" data-testid="input-product-name" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="col-span-3" data-testid="select-product-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAW_MILK">Raw Milk</SelectItem>
                  <SelectItem value="YOGURT">Yogurt</SelectItem>
                  <SelectItem value="DTY">DTY</SelectItem>
                  <SelectItem value="YOLAC">Yolac</SelectItem>
                  <SelectItem value="PROBIOTIC">Probiotic</SelectItem>
                  <SelectItem value="CREAM_CHEESE">Cream Cheese</SelectItem>
                  <SelectItem value="FETA">Feta</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Unit Type</Label>
              <Select value={formData.unitType} onValueChange={(val) => setFormData({ ...formData, unitType: val })}>
                <SelectTrigger className="col-span-3" data-testid="select-product-unit"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LITER">Liter (L)</SelectItem>
                  <SelectItem value="KG">Kilogram (kg)</SelectItem>
                  <SelectItem value="UNIT">Unit (Each)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Intermediate</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch checked={formData.isIntermediate} onCheckedChange={(c) => setFormData({ ...formData, isIntermediate: c })} data-testid="switch-intermediate" />
                <span className="text-xs text-muted-foreground">Is this used as an ingredient?</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Active</Label>
              <Switch checked={formData.active} onCheckedChange={(c) => setFormData({ ...formData, active: c })} className="col-span-3" data-testid="switch-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-product">Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
