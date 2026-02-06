import { useState } from "react";
import { useStore, Product, ProductCategory, UnitType } from "@/lib/mockStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Products() {
  const { products, addProduct, updateProduct } = useStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    category: "OTHER",
    unitType: "UNIT",
    isIntermediate: false,
    active: true
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name) return;

    if (editingProduct) {
      updateProduct({ ...editingProduct, ...formData } as Product);
      toast({ title: "Product updated", description: `${formData.name} has been updated.` });
    } else {
      addProduct({
        id: `p${Date.now()}`,
        ...formData
      } as Product);
      toast({ title: "Product created", description: `${formData.name} has been added.` });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      category: "OTHER",
      unitType: "UNIT",
      isIntermediate: false,
      active: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage raw materials, intermediates, and finished goods.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="gap-2 text-muted-foreground">
          <Filter className="h-4 w-4" /> Filter
        </Button>
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
              <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleEdit(product)}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">{product.category}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm uppercase">{product.unitType}</TableCell>
                <TableCell>
                  {product.isIntermediate ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      Intermediate
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Finished Good
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className={`h-2.5 w-2.5 rounded-full ${product.active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                </TableCell>
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
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Create Product'}</DialogTitle>
            <DialogDescription>
              Configure the product details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val: ProductCategory) => setFormData({...formData, category: val})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
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
              <Label htmlFor="unit" className="text-right">Unit Type</Label>
              <Select 
                value={formData.unitType} 
                onValueChange={(val: UnitType) => setFormData({...formData, unitType: val})}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LITER">Liter (L)</SelectItem>
                  <SelectItem value="KG">Kilogram (kg)</SelectItem>
                  <SelectItem value="UNIT">Unit (Each)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="intermediate" className="text-right">Intermediate</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch 
                  id="intermediate" 
                  checked={formData.isIntermediate}
                  onCheckedChange={(c) => setFormData({...formData, isIntermediate: c})}
                />
                <span className="text-xs text-muted-foreground">Is this used as an ingredient in other products?</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="active" className="text-right">Active</Label>
              <Switch 
                id="active" 
                checked={formData.active}
                onCheckedChange={(c) => setFormData({...formData, active: c})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
