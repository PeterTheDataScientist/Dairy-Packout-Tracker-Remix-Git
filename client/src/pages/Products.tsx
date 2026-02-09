import { useState, useMemo } from "react";
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
import { Plus, Search, Beaker, Link2, Link2Off } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Product = { id: number; name: string; category: string; unitType: string; isIntermediate: boolean; active: boolean; packSizeQty: string | null; packSizeUnit: string | null; packSizeLabel: string | null };
type FormulaWithDetails = {
  id: number; name: string; type: "CONVERSION" | "BLEND"; outputProductId: number; active: boolean; version: number;
  conversion?: { inputProductId: number; ratioNumerator: string; ratioDenominator: string };
  components?: { componentProductId: number; fraction: string }[];
};

const CATEGORIES = [
  { value: "RAW_MILK", label: "Raw Milk" },
  { value: "MILK", label: "Milk" },
  { value: "YOGURT", label: "Yogurt" },
  { value: "DTY", label: "DTY" },
  { value: "YOLAC", label: "Yolac" },
  { value: "PROBIOTIC", label: "Probiotic" },
  { value: "CREAM_CHEESE", label: "Cream Cheese" },
  { value: "FETA", label: "Feta" },
  { value: "SMOOTHY", label: "Smoothy" },
  { value: "FRESH_CREAM", label: "Fresh Cream" },
  { value: "DIP", label: "Dip" },
  { value: "HODZEKO", label: "Hodzeko" },
  { value: "CHEESE", label: "Cheese" },
  { value: "OTHER", label: "Other" },
];

const categoryLabel = (val: string) => CATEGORIES.find(c => c.value === val)?.label || val;

const categoryColors: Record<string, string> = {
  RAW_MILK: "bg-amber-100 text-amber-800 border-amber-200",
  MILK: "bg-blue-100 text-blue-800 border-blue-200",
  YOGURT: "bg-pink-100 text-pink-800 border-pink-200",
  DTY: "bg-purple-100 text-purple-800 border-purple-200",
  YOLAC: "bg-lime-100 text-lime-800 border-lime-200",
  PROBIOTIC: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CREAM_CHEESE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  FETA: "bg-orange-100 text-orange-800 border-orange-200",
  SMOOTHY: "bg-violet-100 text-violet-800 border-violet-200",
  FRESH_CREAM: "bg-sky-100 text-sky-800 border-sky-200",
  DIP: "bg-rose-100 text-rose-800 border-rose-200",
  HODZEKO: "bg-teal-100 text-teal-800 border-teal-200",
  CHEESE: "bg-orange-100 text-orange-800 border-orange-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function Products() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", category: "OTHER", unitType: "UNIT", active: true, packSizeQty: "", packSizeUnit: "LITER", packSizeLabel: "" });

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({ queryKey: ["/api/formulas"] });

  const formulasByProduct = useMemo(() => {
    const map: Record<number, FormulaWithDetails[]> = {};
    for (const f of formulas) {
      if (!map[f.outputProductId]) map[f.outputProductId] = [];
      map[f.outputProductId].push(f);
    }
    return map;
  }, [formulas]);

  const usedAsInput = useMemo(() => {
    const ids = new Set<number>();
    for (const f of formulas) {
      if (f.type === "CONVERSION" && f.conversion) {
        ids.add(f.conversion.inputProductId);
      }
      if (f.type === "BLEND" && f.components) {
        for (const c of f.components) ids.add(c.componentProductId);
      }
    }
    return ids;
  }, [formulas]);

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
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
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
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const usedCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return CATEGORIES.filter(c => cats.has(c.value));
  }, [products]);

  const filteredProducts = products.filter(p => {
    const matchSearch = searchTerm === "" ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "ALL" || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleSave = () => {
    if (!formData.name) return;
    const packSizeFields = formData.unitType === "UNIT" && formData.packSizeQty && formData.packSizeLabel
      ? { packSizeQty: formData.packSizeQty, packSizeUnit: formData.packSizeUnit, packSizeLabel: formData.packSizeLabel }
      : { packSizeQty: null, packSizeUnit: null, packSizeLabel: null };
    const payload = { name: formData.name, category: formData.category, unitType: formData.unitType, active: formData.active, ...packSizeFields };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({ name: product.name, category: product.category, unitType: product.unitType, active: product.active, packSizeQty: product.packSizeQty || "", packSizeUnit: product.packSizeUnit || "LITER", packSizeLabel: product.packSizeLabel || "" });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ name: "", category: "OTHER", unitType: "UNIT", active: true, packSizeQty: "", packSizeUnit: "LITER", packSizeLabel: "" });
  };

  const getProductName = (id: number) => products.find(p => p.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog. {products.length} products across {usedCategories.length} categories.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-product">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} data-testid="input-search-products" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            {usedCategories.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Pack Size</TableHead>
              <TableHead>Formula</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => {
              const linkedFormulas = formulasByProduct[product.id] || [];
              const hasFormula = linkedFormulas.length > 0;
              return (
                <TableRow key={product.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleEdit(product)} data-testid={`row-product-${product.id}`}>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-normal border ${categoryColors[product.category] || categoryColors.OTHER}`}>
                      {categoryLabel(product.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm uppercase">{product.unitType}</TableCell>
                  <TableCell className="text-sm">
                    {product.packSizeLabel ? (
                      <span>{product.packSizeLabel}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {hasFormula ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Link2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">
                              {linkedFormulas.map(f => f.name).join(", ")}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          {linkedFormulas.map(f => (
                            <div key={f.id} className="text-xs">
                              <span className="font-semibold">{f.name}</span> ({f.type})
                              {f.type === "CONVERSION" && f.conversion && (
                                <span> — {getProductName(f.conversion.inputProductId)} @ {parseFloat(f.conversion.ratioDenominator) ? (parseFloat(f.conversion.ratioNumerator) / parseFloat(f.conversion.ratioDenominator)).toFixed(2) : "N/A"}:1</span>
                              )}
                              {f.type === "BLEND" && f.components && (
                                <span> — {f.components.length} components</span>
                              )}
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground/50">
                        <Link2Off className="h-4 w-4" />
                        <span className="text-xs">No formula</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {hasFormula && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">Output</Badge>}
                      {usedAsInput.has(product.id) && <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">Input</Badge>}
                      {!hasFormula && !usedAsInput.has(product.id) && <span className="text-xs text-muted-foreground/50">—</span>}
                    </div>
                  </TableCell>
                  <TableCell><div className={`h-2.5 w-2.5 rounded-full ${product.active ? "bg-emerald-500" : "bg-gray-300"}`} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>Edit</Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || categoryFilter !== "ALL" ? "No products match your filters." : "No products yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-right">
        Showing {filteredProducts.length} of {products.length} products
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
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
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
              <Label className="text-right">Active</Label>
              <Switch checked={formData.active} onCheckedChange={(c) => setFormData({ ...formData, active: c })} className="col-span-3" data-testid="switch-active" />
            </div>

            {formData.unitType === "UNIT" && (
              <div className="border rounded-md p-4 space-y-4">
                <Label className="text-sm font-medium">Pack Size</Label>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Qty</Label>
                  <Input type="number" step="0.001" value={formData.packSizeQty} onChange={(e) => setFormData({ ...formData, packSizeQty: e.target.value })} className="col-span-3" data-testid="input-pack-size-qty" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Unit</Label>
                  <Select value={formData.packSizeUnit} onValueChange={(val) => setFormData({ ...formData, packSizeUnit: val })}>
                    <SelectTrigger className="col-span-3" data-testid="select-pack-size-unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LITER">Liter</SelectItem>
                      <SelectItem value="KILOGRAM">Kilogram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Label</Label>
                  <Input value={formData.packSizeLabel} onChange={(e) => setFormData({ ...formData, packSizeLabel: e.target.value })} className="col-span-3" data-testid="input-pack-size-label" />
                </div>
              </div>
            )}

            {editingId && (
              <div className="border-t pt-4 mt-2">
                <Label className="text-sm font-medium">Linked Formulas</Label>
                <div className="mt-2 space-y-2">
                  {(formulasByProduct[editingId] || []).length > 0 ? (
                    (formulasByProduct[editingId] || []).map(f => (
                      <div key={f.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                        <Beaker className="h-4 w-4 text-primary" />
                        <span className="font-medium">{f.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{f.type}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No formulas linked. Create one on the Formulas page with this product as output.</p>
                  )}
                </div>
              </div>
            )}
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
