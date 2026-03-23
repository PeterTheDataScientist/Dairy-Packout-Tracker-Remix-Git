import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Package,
  Info,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Download,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  category: string;
  unitType: string;
  active: boolean;
  isIntermediate: boolean;
  isIngredientOnly: boolean;
  packSizeQty: string | null;
  packSizeUnit: string | null;
  packSizeLabel: string | null;
};

type Packout = {
  id: number;
  date: string;
  productId: number;
  qty: string;
  unitType: string;
  packSizeLabel: string | null;
  sourceProductId: number | null;
  sourceQtyUsed: string | null;
  notes: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  adminNotes: string | null;
};

type ProductStock = {
  productId: number;
  productName: string;
  category: string;
  unitType: string;
  totalProduced: number;
  totalPacked: number;
  available: number;
};

// ─── Category display names ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  MILK: "Fresh Milk",
  YOGURT: "Plain Yogurt",
  DTY: "Double Thick Yogurt",
  YOLAC: "Yolac",
  PROBIOTIC: "Probiotic Yogurt",
  CREAM_CHEESE: "Cream Cheese",
  FETA: "Feta",
  SMOOTHY: "Smoothie",
  FRESH_CREAM: "Fresh Cream",
  DIP: "Dip",
  HODZEKO: "Hodzeko",
  CHEESE: "Cheese",
  OTHER: "Other",
};

// ─── Hierarchical Product Selector ───────────────────────────────────────────

function extractVariant(name: string): string {
  return name
    .replace(
      /\s+\d+(\.\d+)?\s*(ML|LTR|L|KG|G|LITRE|LITRES|GRAM|GRAMS)\b.*/i,
      "",
    )
    .replace(/\s+(TUB|BOTTLE|BUCKET|JAR|POT|SACHET|PACK|CAN|BAG)\s*\d*.*$/i, "")
    .trim();
}

function HierarchicalProductSelect({
  products,
  value,
  onChange,
  stockMap,
  testId,
}: {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  stockMap: Map<number, ProductStock>;
  testId?: string;
}) {
  const [step, setStep] = useState<"category" | "variant" | "size">("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  const selectedProduct = products.find((p) => String(p.id) === value);

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b),
    );
  }, [products]);

  const variantsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const inCat = products.filter((p) => p.category === selectedCategory);
    const variants = new Set(inCat.map((p) => extractVariant(p.name)));
    return Array.from(variants).sort();
  }, [products, selectedCategory]);

  const sizesForVariant = useMemo(() => {
    if (!selectedCategory || !selectedVariant) return [];
    return products
      .filter(
        (p) =>
          p.category === selectedCategory &&
          extractVariant(p.name) === selectedVariant,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedCategory, selectedVariant]);

  if (value && selectedProduct) {
    const stock = stockMap.get(selectedProduct.id);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {selectedProduct.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABELS[selectedProduct.category] ||
                selectedProduct.category}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            onClick={() => {
              onChange("");
              setStep("category");
              setSelectedCategory("");
              setSelectedVariant("");
            }}
            data-testid={`${testId}-change`}
          >
            Change
          </Button>
        </div>
        {/* Available stock indicator */}
        {stock ? (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              stock.available <= 0
                ? "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                : "bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            }`}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span>
              Available to pack:{" "}
              <strong>
                {stock.available.toLocaleString()}{" "}
                {selectedProduct.unitType === "UNIT"
                  ? "units"
                  : selectedProduct.unitType}
              </strong>
              <span className="text-xs ml-2 opacity-70">
                ({stock.totalProduced.toLocaleString()} produced,{" "}
                {stock.totalPacked.toLocaleString()} already packed)
              </span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-amber-50 border border-amber-200 text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>No production recorded for this product yet.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid={testId}>
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
        <button
          className={`hover:text-foreground transition-colors ${step === "category" ? "text-foreground font-medium" : ""}`}
          onClick={() => {
            setStep("category");
            setSelectedCategory("");
            setSelectedVariant("");
          }}
        >
          Category
        </button>
        {selectedCategory && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              className={`hover:text-foreground transition-colors ${step === "variant" ? "text-foreground font-medium" : ""}`}
              onClick={() => {
                setStep("variant");
                setSelectedVariant("");
              }}
            >
              {CATEGORY_LABELS[selectedCategory] || selectedCategory}
            </button>
          </>
        )}
        {selectedVariant && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span
              className={step === "size" ? "text-foreground font-medium" : ""}
            >
              Pack Size
            </span>
          </>
        )}
      </div>

      {step === "category" && (
        <div className="max-h-52 overflow-y-auto divide-y">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={() => {
                  setSelectedCategory(cat);
                  setStep("variant");
                }}
              >
                <span className="font-medium">
                  {CATEGORY_LABELS[cat] || cat}
                </span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-xs">{count} products</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {step === "variant" && (
        <div className="max-h-52 overflow-y-auto divide-y">
          {variantsInCategory.length === 1
            ? (() => {
                if (selectedVariant !== variantsInCategory[0]) {
                  setSelectedVariant(variantsInCategory[0]);
                  setStep("size");
                }
                return (
                  <div className="p-3 text-sm text-muted-foreground">
                    Loading sizes…
                  </div>
                );
              })()
            : variantsInCategory.map((variant) => {
                const count = products.filter(
                  (p) =>
                    p.category === selectedCategory &&
                    extractVariant(p.name) === variant,
                ).length;
                return (
                  <button
                    key={variant}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                    onClick={() => {
                      setSelectedVariant(variant);
                      setStep("size");
                    }}
                  >
                    <span>{variant}</span>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {count > 1 && (
                        <span className="text-xs">{count} sizes</span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                );
              })}
        </div>
      )}

      {step === "size" && (
        <div className="max-h-52 overflow-y-auto divide-y">
          {sizesForVariant.map((product) => {
            const stock = stockMap.get(product.id);
            return (
              <button
                key={product.id}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={() => onChange(String(product.id))}
              >
                <span className="font-medium">{product.name}</span>
                <div className="flex items-center gap-2">
                  {stock && stock.available > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">
                      {stock.available.toLocaleString()} avail.
                    </span>
                  )}
                  {stock && stock.available <= 0 && stock.totalProduced > 0 && (
                    <span className="text-xs text-red-500">fully packed</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {product.unitType === "LITER"
                      ? "Litres"
                      : product.unitType === "KG"
                        ? "kg"
                        : "Units"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Packouts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<Packout | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    productId: "",
    qty: "",
    notes: "",
  });
  const [packoutDate, setPackoutDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: packouts = [] } = useQuery<Packout[]>({
    queryKey: ["/api/packouts"],
  });
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Fetch available stock per product from backend
  const { data: productStockList = [] } = useQuery<ProductStock[]>({
    queryKey: ["/api/stock/products"],
    queryFn: async () => {
      const res = await fetch("/api/stock/products", {
        credentials: "include",
      });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const stockMap = useMemo(() => {
    const map = new Map<number, ProductStock>();
    productStockList.forEach((s) => map.set(s.productId, s));
    return map;
  }, [productStockList]);

  const { data: workflowCheck } = useQuery<{
    allowed: boolean;
    reason?: string;
  }>({
    queryKey: ["/api/workflow/check-packout", packoutDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/workflow/check?date=${packoutDate}&step=packout`,
        { credentials: "include" },
      );
      return res.json();
    },
  });

  const { data: dailyLock } = useQuery<any>({
    queryKey: ["/api/daily-locks-packout", packoutDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-locks/${packoutDate}`, {
        credentials: "include",
      });
      return res.json();
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const outputProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.active &&
          !p.isIngredientOnly &&
          !p.isIntermediate &&
          p.category !== "RAW_MILK",
      ),
    [products],
  );

  const getProductName = (id: number) =>
    products.find((p) => p.id === id)?.name || `#${id}`;

  const selectedProduct = useMemo(
    () =>
      formData.productId
        ? products.find((p) => p.id === parseInt(formData.productId))
        : null,
    [formData.productId, products],
  );

  const selectedStock = formData.productId
    ? stockMap.get(parseInt(formData.productId))
    : null;

  // Qty validation against available stock
  const qtyWarning = useMemo(() => {
    if (!formData.qty || !selectedStock) return null;
    const requested = parseFloat(formData.qty);
    if (isNaN(requested) || requested <= 0) return null;
    if (requested > selectedStock.available) {
      return `Only ${selectedStock.available.toLocaleString()} available — cannot pack ${requested.toLocaleString()}.`;
    }
    return null;
  }, [formData.qty, selectedStock]);

  // Summary cards — only products that have packouts
  const summaryProducts = useMemo(() => {
    return packouts
      .reduce((acc, po) => {
        if (!acc.find((p) => p.id === po.productId)) {
          const product = products.find((p) => p.id === po.productId);
          if (product) acc.push(product);
        }
        return acc;
      }, [] as Product[])
      .slice(0, 4);
  }, [packouts, products]);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/packouts", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save packout");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/products"] });
      toast({
        title: "Packout Recorded",
        description: "Finished goods logged.",
      });
      setIsDialogOpen(false);
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        productId: "",
        qty: "",
        notes: "",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Cannot Record Packout",
        description: err.message,
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/admin/review", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packouts"] });
      toast({ title: "Reviewed", description: "Record marked as reviewed." });
      setReviewingItem(null);
      setAdminNotes("");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!formData.productId || !formData.qty) return;
    if (qtyWarning) {
      toast({
        variant: "destructive",
        title: "Stock Limit Exceeded",
        description: qtyWarning,
      });
      return;
    }
    const product = products.find((p) => p.id === parseInt(formData.productId));
    createMutation.mutate({
      date: formData.date,
      productId: parseInt(formData.productId),
      qty: formData.qty,
      unitType: product?.unitType || "UNIT",
      packSizeLabel: product?.packSizeLabel || null,
      sourceProductId: null,
      sourceQtyUsed: null,
      notes: formData.notes || null,
    });
  };

  const exportCSV = () => {
    const headers = ["Date", "Product", "Qty", "Pack Size", "Notes", "Status"];
    const rows = packouts.map((p) => [
      p.date,
      products.find((pr) => pr.id === p.productId)?.name || "",
      p.qty,
      p.packSizeLabel || "",
      p.notes || "",
      p.reviewedAt ? "Reviewed" : "Pending",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `packouts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packouts</h2>
          <p className="text-muted-foreground">
            Record finished goods packed for distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="gap-2"
            disabled={!!dailyLock || (workflowCheck && !workflowCheck.allowed)}
            data-testid="button-add-packout"
          >
            <Plus className="h-4 w-4" /> Log Packout
          </Button>
        </div>
      </div>

      {dailyLock && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800">
          <Lock className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Day Locked</p>
            <p className="text-sm">
              This date has been locked by admin. No changes allowed.
            </p>
          </div>
        </div>
      )}

      {workflowCheck && !workflowCheck.allowed && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cannot Record Packout</p>
            <p className="text-sm">{workflowCheck.reason}</p>
          </div>
        </div>
      )}

      {/* Summary cards — only products with actual packouts */}
      {summaryProducts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          {summaryProducts.map((product) => {
            const total = packouts
              .filter((p) => p.productId === product.id)
              .reduce((sum, p) => sum + parseFloat(p.qty), 0);
            const stock = stockMap.get(product.id);
            return (
              <div
                key={product.id}
                className="bg-card border rounded-lg p-4 flex items-center gap-4 transition-all"
                data-testid={`card-packout-product-${product.id}`}
              >
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-muted-foreground truncate">
                    {product.name}
                  </div>
                  <div className="text-xl font-bold">
                    {total.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      {product.unitType}
                    </span>
                  </div>
                  {stock && (
                    <div className="text-xs text-emerald-600">
                      {stock.available.toLocaleString()} still available
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Packouts table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Notes</TableHead>
              {user?.role === "ADMIN" && <TableHead>Review</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...packouts]
              .sort((a, b) => b.id - a.id)
              .map((p) => (
                <TableRow key={p.id} data-testid={`row-packout-${p.id}`}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell className="font-medium">
                    {getProductName(p.productId)}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(p.qty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {p.unitType}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.notes || "—"}
                    {p.reviewedAt && (
                      <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-green-500" />
                    )}
                  </TableCell>
                  {user?.role === "ADMIN" && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setReviewingItem(p);
                          setAdminNotes(p.adminNotes || "");
                        }}
                        data-testid={`button-review-packout-${p.id}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            {packouts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={user?.role === "ADMIN" ? 6 : 5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No packouts recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Log Packout Dialog — simplified */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open)
            setFormData({
              date: format(new Date(), "yyyy-MM-dd"),
              productId: "",
              qty: "",
              notes: "",
            });
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Log Packout</DialogTitle>
            <DialogDescription>
              Record finished goods packed from production stock.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  setPackoutDate(e.target.value);
                }}
                data-testid="input-packout-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <HierarchicalProductSelect
                products={outputProducts}
                value={formData.productId}
                onChange={(val) =>
                  setFormData({ ...formData, productId: val, qty: "" })
                }
                stockMap={stockMap}
                testId="select-packout-product"
              />
              {!formData.productId && (
                <p className="text-xs text-muted-foreground">
                  Only products with recorded production are available to pack.
                </p>
              )}
            </div>

            {formData.productId && (
              <div className="space-y-2">
                <Label>Quantity to Pack</Label>
                <Input
                  type="number"
                  value={formData.qty}
                  onChange={(e) =>
                    setFormData({ ...formData, qty: e.target.value })
                  }
                  placeholder={
                    selectedStock
                      ? `Max: ${selectedStock.available.toLocaleString()}`
                      : "0"
                  }
                  data-testid="input-packout-qty"
                />
                {qtyWarning && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {qtyWarning}
                  </div>
                )}
                {formData.qty &&
                  !qtyWarning &&
                  selectedStock &&
                  parseFloat(formData.qty) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      After packing:{" "}
                      {(
                        selectedStock.available - parseFloat(formData.qty)
                      ).toLocaleString()}{" "}
                      {selectedProduct?.unitType} remaining in stock
                    </div>
                  )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Spillage during transfer, valve issue..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                data-testid="input-packout-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                createMutation.isPending ||
                !formData.productId ||
                !formData.qty ||
                !!qtyWarning
              }
              data-testid="button-save-packout"
            >
              {createMutation.isPending ? "Saving..." : "Save Packout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Review Dialog */}
      {user?.role === "ADMIN" && (
        <Dialog
          open={!!reviewingItem}
          onOpenChange={(open) => {
            if (!open) {
              setReviewingItem(null);
              setAdminNotes("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Packout Record</DialogTitle>
              <DialogDescription>
                Add admin notes and mark this record as reviewed.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add review notes..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  data-testid="input-admin-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReviewingItem(null);
                  setAdminNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (reviewingItem) {
                    reviewMutation.mutate({
                      entityType: "PACKOUT",
                      entityId: reviewingItem.id,
                      adminNotes,
                    });
                  }
                }}
                disabled={reviewMutation.isPending}
                data-testid="button-mark-reviewed"
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Mark as Reviewed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
