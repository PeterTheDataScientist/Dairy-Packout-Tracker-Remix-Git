import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Beaker,
  Info,
  Pencil,
  Trash2,
  Lock,
  Send,
  Clock,
  Check,
  X,
  Download,
  FileText,
  Droplets,
  Package,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  unitType: string;
  category: string;
  active: boolean;
  isIntermediate: boolean;
  isIngredientOnly: boolean;
  packSizeQty: string | null;
  packSizeUnit: string | null;
  packSizeLabel: string | null;
};

type FormulaWithDetails = {
  id: number;
  name: string;
  type: "CONVERSION" | "BLEND";
  outputProductId: number;
  active: boolean;
  conversion?: {
    inputProductId: number;
    ratioNumerator: string;
    ratioDenominator: string;
  };
  components?: { componentProductId: number; fraction: string }[];
};

type LineItem = {
  id: number;
  batchCode: string;
  batchDate: string;
  operationType: string;
  outputProductId: number;
  outputQty: string;
  inputProductId: number | null;
  inputQty: string | null;
  createdByUserId?: number;
  notes: string | null;
  reviewedAt: string | null;
  reviewedByUserId: number | null;
  adminNotes: string | null;
};

type StockItem = {
  productId: number;
  productName: string;
  category: string;
  unitType: string;
  produced: number;
  used: number;
  packed: number;
  stock: number;
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

/**
 * Drill-down product selector: Category → Variant → Pack Size
 * Replaces the flat searchable dropdown for "What did you make?"
 */
function HierarchicalProductSelect({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [step, setStep] = useState<"category" | "variant" | "size">("category");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<string>("");

  // Reset drill-down when value is cleared externally
  const selectedProduct = products.find((p) => String(p.id) === value);

  // Step 1: unique categories from active, non-ingredient products
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category));
    return Array.from(cats).sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
    );
  }, [products]);

  // Step 2: derive "variant" from product name within a category
  // Variant = everything before the pack size / last token that looks like a size
  function extractVariant(name: string): string {
    return name
      .replace(/\s+\d+(\.\d+)?\s*(ML|LTR|L|KG|G|LITRE|LITRES|GRAM|GRAMS)\b.*/i, "")
      .replace(/\s+(TUB|BOTTLE|BUCKET|JAR|POT|SACHET|PACK|CAN|BAG)\s*\d*.*$/i, "")
      .trim();
  }

  const variantsInCategory = useMemo(() => {
    if (!selectedCategory) return [];
    const inCat = products.filter((p) => p.category === selectedCategory);
    const variants = new Set(inCat.map((p) => extractVariant(p.name)));
    return Array.from(variants).sort();
  }, [products, selectedCategory]);

  // Step 3: products matching category + variant
  const sizesForVariant = useMemo(() => {
    if (!selectedCategory || !selectedVariant) return [];
    return products
      .filter(
        (p) =>
          p.category === selectedCategory &&
          extractVariant(p.name) === selectedVariant
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedCategory, selectedVariant]);

  // If a product is already selected, show it with a change button
  if (value && selectedProduct) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
          <p className="text-xs text-muted-foreground">
            {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
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
          data-testid="button-change-product"
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden" data-testid="hierarchical-product-select">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 py-2 bg-muted/40 border-b text-xs text-muted-foreground">
        <button
          className={`hover:text-foreground transition-colors ${step === "category" ? "text-foreground font-medium" : ""}`}
          onClick={() => { setStep("category"); setSelectedCategory(""); setSelectedVariant(""); }}
        >
          Category
        </button>
        {selectedCategory && (
          <>
            <ChevronRight className="h-3 w-3" />
            <button
              className={`hover:text-foreground transition-colors ${step === "variant" ? "text-foreground font-medium" : ""}`}
              onClick={() => { setStep("variant"); setSelectedVariant(""); }}
            >
              {CATEGORY_LABELS[selectedCategory] || selectedCategory}
            </button>
          </>
        )}
        {selectedVariant && (
          <>
            <ChevronRight className="h-3 w-3" />
            <span className={step === "size" ? "text-foreground font-medium" : ""}>
              Pack Size
            </span>
          </>
        )}
      </div>

      {/* Step 1 — Category */}
      {step === "category" && (
        <div className="max-h-56 overflow-y-auto divide-y" data-testid="step-category">
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
                data-testid={`category-${cat}`}
              >
                <span className="font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="text-xs">{count} products</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 2 — Variant */}
      {step === "variant" && (
        <div className="max-h-56 overflow-y-auto divide-y" data-testid="step-variant">
          {variantsInCategory.length === 1 ? (
            // Only one variant — skip straight to sizes
            (() => {
              // auto-advance
              if (selectedVariant !== variantsInCategory[0]) {
                setSelectedVariant(variantsInCategory[0]);
                setStep("size");
              }
              return <div className="p-3 text-sm text-muted-foreground">Loading sizes…</div>;
            })()
          ) : (
            variantsInCategory.map((variant) => {
              const count = products.filter(
                (p) => p.category === selectedCategory && extractVariant(p.name) === variant
              ).length;
              return (
                <button
                  key={variant}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                  onClick={() => {
                    setSelectedVariant(variant);
                    setStep("size");
                  }}
                  data-testid={`variant-${variant}`}
                >
                  <span>{variant}</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {count > 1 && <span className="text-xs">{count} sizes</span>}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Step 3 — Pack Size */}
      {step === "size" && (
        <div className="max-h-56 overflow-y-auto divide-y" data-testid="step-size">
          {sizesForVariant.map((product) => {
            const sizeLabel =
              product.packSizeLabel ||
              (product.name.replace(extractVariant(product.name), "").trim()) ||
              product.name;
            return (
              <button
                key={product.id}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                onClick={() => onChange(String(product.id))}
                data-testid={`size-product-${product.id}`}
              >
                <span className="font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">
                  {product.unitType === "LITER"
                    ? "Litres"
                    : product.unitType === "KG"
                    ? "kg"
                    : "Units"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unitShortFn(unitType: string) {
  if (unitType === "LITER") return "L";
  if (unitType === "KG") return "kg";
  return "units";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Production() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LineItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LineItem | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [outputQty, setOutputQty] = useState("");
  const [actualInputQty, setActualInputQty] = useState("");
  const [batchDate, setBatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [batchCode, setBatchCode] = useState(
    `B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`
  );
  const [blendActuals, setBlendActuals] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [reviewingItem, setReviewingItem] = useState<LineItem | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [remainingMilkInputs, setRemainingMilkInputs] = useState<Record<number, string>>({});
  const [shift, setShift] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [changeRequestDialog, setChangeRequestDialog] = useState<{
    open: boolean;
    item: LineItem | null;
    proposedQty: string;
    reason: string;
  }>({ open: false, item: null, proposedQty: "", reason: "" });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({
    queryKey: ["/api/formulas"],
  });

  const { data: lineItems = [] } = useQuery<LineItem[]>({
    queryKey: ["/api/production/line-items"],
  });

  // Fix 9: Intermediate stock balances
  const { data: intermediateStock = [] } = useQuery<StockItem[]>({
    queryKey: ["/api/stock/intermediates"],
    queryFn: async () => {
      const res = await fetch("/api/stock/intermediates", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: workflowCheck } = useQuery<{
    allowed: boolean;
    reason?: string;
    availableStock?: number;
  }>({
    queryKey: ["/api/workflow/check", batchDate],
    queryFn: async () => {
      const res = await fetch(`/api/workflow/check?date=${batchDate}&step=production`, {
        credentials: "include",
      });
      return res.json();
    },
  });

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["/api/production/batches", batchDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/production/batches?dateFrom=${batchDate}&dateTo=${batchDate}`,
        { credentials: "include" }
      );
      return res.json();
    },
  });

  const { data: dailyLock } = useQuery<any>({
    queryKey: ["/api/daily-locks", batchDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-locks/${batchDate}`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<LineItem[]>({
    queryKey: ["/api/production/line-items", "templates"],
    queryFn: async () => {
      const res = await fetch(`/api/production/line-items`, { credentials: "include" });
      const all: LineItem[] = await res.json();
      const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
      return all.filter((li) => li.batchDate === yesterday);
    },
    enabled: showTemplates,
  });

  // ── Fix 7: Filter output products — exclude ingredient-only AND raw milk ─────
  const outputProducts = useMemo(() => {
    return products.filter(
      (p) =>
        p.active &&
        !p.isIngredientOnly &&
        p.category !== "RAW_MILK"
    );
  }, [products]);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedProduct = products.find((p) => p.id === parseInt(selectedProductId));

  const matchedFormula = useMemo(() => {
    if (!selectedProductId) return null;
    const pid = parseInt(selectedProductId);
    return formulas.find((f) => f.outputProductId === pid && f.active) || null;
  }, [selectedProductId, formulas]);

  const getProductName = (id: number | null | undefined) =>
    id ? products.find((p) => p.id === id)?.name || `#${id}` : "";
  const getProductUnit = (id: number | null | undefined) =>
    id ? products.find((p) => p.id === id)?.unitType || "" : "";
  const unitLabel = (unitType: string) => {
    if (unitType === "LITER") return "Litres";
    if (unitType === "KG") return "Kilograms";
    return "Units";
  };
  const unitShort = (unitType: string) => unitShortFn(unitType);

  const outputEquivalent = useMemo(() => {
    if (!selectedProduct || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
    if (selectedProduct.unitType === "UNIT" && selectedProduct.packSizeQty) {
      const packSize = parseFloat(selectedProduct.packSizeQty);
      const volume = outQ * packSize;
      const unitLbl = selectedProduct.packSizeUnit === "KILOGRAM" ? "kg" : "L";
      return { volume, unitLabel: unitLbl, packSize };
    }
    return null;
  }, [selectedProduct, outputQty]);

  const calculations = useMemo(() => {
    if (!matchedFormula || !outputQty) return null;
    const outQ = parseFloat(outputQty);
    if (isNaN(outQ) || outQ <= 0) return null;
    if (matchedFormula.type === "CONVERSION" && matchedFormula.conversion) {
      const ratio =
        parseFloat(matchedFormula.conversion.ratioNumerator) /
        parseFloat(matchedFormula.conversion.ratioDenominator);
      let effectiveOutputQty = outQ;
      if (selectedProduct?.unitType === "UNIT" && selectedProduct?.packSizeQty) {
        effectiveOutputQty = outQ * parseFloat(selectedProduct.packSizeQty);
      }
      const expectedInput = effectiveOutputQty * ratio;
      let variance = 0;
      if (actualInputQty)
        variance = ((parseFloat(actualInputQty) - expectedInput) / expectedInput) * 100;
      return {
        expectedInput,
        variancePercent: variance,
        inputProductId: matchedFormula.conversion.inputProductId,
      };
    }
    if (matchedFormula.type === "BLEND" && matchedFormula.components) {
      return {
        components: matchedFormula.components.map((c) => ({
          ...c,
          expectedQty: outQ * parseFloat(c.fraction),
        })),
      };
    }
    return null;
  }, [matchedFormula, outputQty, actualInputQty]);

  // Stock split for display
  const stockWithBalance = intermediateStock.filter((s) => s.stock > 0);
  const stockEmpty = intermediateStock.filter((s) => s.stock <= 0);

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/production/batches", data);
      return res.json();
    },
  });

  const createLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/production/line-items", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/intermediates"] });
    },
  });

  const updateLineItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PUT", `/api/production/line-items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/intermediates"] });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/production/line-items/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/intermediates"] });
    },
  });

  const updateRemainingMutation = useMutation({
    mutationFn: async ({ batchId, remainingRawMilk }: { batchId: number; remainingRawMilk: string }) => {
      const res = await apiRequest("PATCH", `/api/production/batches/${batchId}/remaining`, {
        remainingRawMilk,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/batches"] });
      toast({ title: "Remaining Milk Saved", description: "Your remaining raw milk figure has been recorded." });
    },
  });

  const createChangeRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/change-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      toast({ title: "Edit Request Submitted", description: "Your proposed change has been sent for admin review." });
      setChangeRequestDialog({ open: false, item: null, proposedQty: "", reason: "" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const batchIds = batches.map((b: any) => b.id);

  const { data: allCarryForwards = [] } = useQuery<any[]>({
    queryKey: ["/api/carry-forward"],
    queryFn: async () => {
      const res = await fetch(`/api/carry-forward`, { credentials: "include" });
      return res.json();
    },
  });

  const carryForwards = allCarryForwards.filter((cf: any) => batchIds.includes(cf.fromBatchId));

  const createCarryForwardMutation = useMutation({
    mutationFn: async (data: { fromBatchId: number; amountLitres: string }) => {
      const res = await apiRequest("POST", "/api/carry-forward", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/carry-forward"] });
      toast({ title: "Request Sent", description: "Your carry-forward request has been submitted for admin approval." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const approveCarryForwardMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "APPROVED" | "REJECTED" }) => {
      const res = await apiRequest("PATCH", `/api/carry-forward/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/carry-forward"] });
      toast({ title: "Updated", description: "Carry-forward request has been updated." });
    },
  });

  const [carryForwardQty, setCarryForwardQty] = useState<Record<number, string>>({});

  const saveBlendUsageMutation = useMutation({
    mutationFn: async ({ lineItemId, components }: { lineItemId: number; components: any[] }) => {
      const res = await apiRequest("POST", `/api/production/line-items/${lineItemId}/blend-usage`, { components });
      return res.json();
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!selectedProduct || !outputQty) return;
    const operationType = matchedFormula?.type === "BLEND" ? "BLEND" : "CONVERT";
    try {
      if (editingItem) {
        await updateLineItemMutation.mutateAsync({
          id: editingItem.id,
          outputQty,
          inputQty: actualInputQty || null,
          outputProductId: selectedProduct.id,
          inputProductId:
            matchedFormula?.type === "CONVERSION" ? matchedFormula.conversion?.inputProductId : null,
          formulaId: matchedFormula?.id || null,
          operationType,
        });
        toast({ title: "Record Updated", description: `${selectedProduct.name} updated.` });
      } else {
        const batch = await createBatchMutation.mutateAsync({
          date: batchDate,
          batchCode,
          notes: null,
          ...(shift ? { shift } : {}),
        });
        const lineItem = await createLineItemMutation.mutateAsync({
          batchId: batch.id,
          operationType,
          formulaId: matchedFormula?.id || null,
          inputProductId:
            matchedFormula?.type === "CONVERSION" ? matchedFormula.conversion?.inputProductId : null,
          inputQty: actualInputQty || null,
          outputProductId: selectedProduct.id,
          outputQty,
          unitType: selectedProduct.unitType,
          notes: notes || null,
        });
        if (operationType === "BLEND" && Object.keys(blendActuals).length > 0 && calculations?.components) {
          await saveBlendUsageMutation.mutateAsync({
            lineItemId: lineItem.id,
            components: calculations.components.map((c: any) => ({
              componentProductId: c.componentProductId,
              expectedQty: String(c.expectedQty),
              actualQty: blendActuals[c.componentProductId] || String(c.expectedQty),
            })),
          });
        }
        if (lineItem.inputQtyAutoFilled) {
          toast({
            title: "Input Auto-Filled",
            description: `System calculated ${parseFloat(lineItem.inputQty).toFixed(1)} L from formula.`,
          });
        } else {
          toast({
            title: "Batch Recorded",
            description: `${selectedProduct.name} — ${parseFloat(outputQty).toLocaleString()} ${unitShort(selectedProduct.unitType)} logged.`,
          });
        }
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await deleteLineItemMutation.mutateAsync(deletingItem.id);
      toast({ title: "Record Deleted" });
      setDeletingItem(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleEditClick = (item: LineItem) => {
    if (user?.role === "ADMIN") {
      openEditDialog(item);
    } else {
      setChangeRequestDialog({ open: true, item, proposedQty: item.outputQty, reason: "" });
    }
  };

  const handleSubmitChangeRequest = () => {
    const item = changeRequestDialog.item;
    if (!item || !changeRequestDialog.reason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please explain why this change is needed." });
      return;
    }
    createChangeRequestMutation.mutate({
      entityType: "production_line_item",
      entityId: item.id,
      fieldName: "outputQty",
      proposedValue: changeRequestDialog.proposedQty,
      currentValue: item.outputQty,
      reason: changeRequestDialog.reason.trim(),
    });
  };

  const openEditDialog = (item: LineItem) => {
    setEditingItem(item);
    setSelectedProductId(String(item.outputProductId));
    setOutputQty(item.outputQty);
    setActualInputQty(item.inputQty || "");
    setBatchDate(item.batchDate);
    setBatchCode(item.batchCode);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setBatchCode(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);
    setBatchDate(format(new Date(), "yyyy-MM-dd"));
    setSelectedProductId("");
    setOutputQty("");
    setActualInputQty("");
    setBlendActuals({});
    setNotes("");
    setShift("");
  };

  const exportCSV = () => {
    const headers = ["Batch Code", "Date", "Operation", "Output Product", "Output Qty", "Input Product", "Input Qty", "Notes", "Status"];
    const rows = lineItems.map((li) => [
      li.batchCode, li.batchDate, li.operationType,
      getProductName(li.outputProductId), li.outputQty,
      li.inputProductId ? getProductName(li.inputProductId) : "",
      li.inputQty || "", li.notes || "",
      li.reviewedAt ? "Reviewed" : "Pending",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `production-${batchDate}.csv`;
    a.click();
  };

  const applyTemplate = (template: LineItem) => {
    setSelectedProductId(String(template.outputProductId));
    setOutputQty("");
    setActualInputQty("");
    setNotes("");
    setBatchCode(`B-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`);
    setBatchDate(format(new Date(), "yyyy-MM-dd"));
    setShowTemplates(false);
    setIsDialogOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-production-title">
            Production
          </h2>
          <p className="text-muted-foreground">
            Record what was made today and how much raw material was used.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
              data-testid="button-use-template"
            >
              <FileText className="h-4 w-4 mr-1" /> Use Template
            </Button>
            {showTemplates && (
              <div
                className="absolute right-0 top-full mt-1 w-72 bg-popover border rounded-md shadow-lg z-50 p-2 space-y-1"
                data-testid="dropdown-templates"
              >
                <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Yesterday's batches:</p>
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-2">No batches from yesterday found.</p>
                )}
                {templates.map((t) => (
                  <button
                    key={t.id}
                    className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center justify-between"
                    onClick={() => applyTemplate(t)}
                    data-testid={`template-item-${t.id}`}
                  >
                    <span className="truncate">{getProductName(t.outputProductId)}</span>
                    <span className="text-xs text-muted-foreground ml-2">{t.operationType}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => { resetForm(); setIsDialogOpen(true); }}
            className="gap-2"
            data-testid="button-add-production"
            disabled={(workflowCheck && !workflowCheck.allowed) || !!dailyLock}
          >
            <Plus className="h-4 w-4" /> Record Batch
          </Button>
        </div>
      </div>

      {/* Day locked warning */}
      {dailyLock && (
        <div
          className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800"
          data-testid="warning-locked"
        >
          <Lock className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Day Locked</p>
            <p className="text-sm">This date has been locked by admin. No changes allowed.</p>
          </div>
        </div>
      )}

      {/* Fix 2 (already built): Raw milk available stock banner */}
      {workflowCheck?.allowed && workflowCheck.availableStock !== undefined && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800"
          data-testid="banner-available-stock"
        >
          <Droplets className="h-4 w-4 shrink-0" />
          <p className="text-sm font-medium">
            Available raw milk in stock:{" "}
            <strong>{workflowCheck.availableStock.toLocaleString()} L</strong>
          </p>
        </div>
      )}

      {workflowCheck && !workflowCheck.allowed && (
        <div
          className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800"
          data-testid="warning-workflow"
        >
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cannot Record Production</p>
            <p className="text-sm">{workflowCheck.reason}</p>
          </div>
        </div>
      )}

      {/* Fix 9: Intermediate / base product stock panel */}
      {intermediateStock.length > 0 && (
        <Card data-testid="card-intermediate-stock">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              Base Product Stock
              <span className="text-xs text-muted-foreground font-normal ml-1">
                — available for production
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {stockWithBalance.map((s) => (
                <div
                  key={s.productId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  data-testid={`stock-badge-${s.productId}`}
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    {s.productName}
                  </span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                    {s.stock.toLocaleString()} {unitShortFn(s.unitType)}
                  </span>
                </div>
              ))}
              {stockEmpty.map((s) => (
                <div
                  key={s.productId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800"
                  data-testid={`stock-badge-empty-${s.productId}`}
                >
                  <div className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">
                    {s.productName}
                  </span>
                  <span className="text-xs text-red-500 font-mono">
                    0 {unitShortFn(s.unitType)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Production records table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Batch Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Product Made</TableHead>
              <TableHead className="text-right">Qty Produced</TableHead>
              <TableHead className="text-right">Raw Material Used</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
      {[...lineItems].sort((a, b) => b.id - a.id).map((log) => (
              <TableRow key={log.id} data-testid={`row-production-${log.id}`}>
                <TableCell className="font-medium font-mono text-xs">
                  <span>{log.batchCode}</span>
                  {batches.find((b: any) => b.batchCode === log.batchCode)?.shift && (
                    <Badge variant="outline" className="ml-1.5 text-[10px] py-0 px-1">
                      {batches.find((b: any) => b.batchCode === log.batchCode)?.shift}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{log.batchDate}</TableCell>
                <TableCell className="font-medium">{getProductName(log.outputProductId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {parseFloat(log.outputQty).toLocaleString()}{" "}
                  <span className="text-muted-foreground text-xs">
                    {unitShort(getProductUnit(log.outputProductId))}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {log.inputQty ? (
                    <>
                      {parseFloat(log.inputQty).toLocaleString()}{" "}
                      <span className="text-xs">{unitShort(getProductUnit(log.inputProductId))}</span>
                      {log.inputProductId && (
                        <span className="text-xs ml-1">({getProductName(log.inputProductId)})</span>
                      )}
                    </>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                  <div className="flex items-center gap-1">
                    {log.reviewedAt && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    <span className="truncate">{log.notes || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {(user?.role === "ADMIN" || log.createdByUserId === user?.id) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditClick(log)}
                        title={user?.role === "ADMIN" ? "Edit record" : "Request a correction"}
                        data-testid={`button-edit-production-${log.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {user?.role === "ADMIN" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingItem(log)}
                          data-testid={`button-delete-production-${log.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {!log.reviewedAt && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600"
                            onClick={() => { setReviewingItem(log); setAdminNotesInput(""); }}
                            data-testid={`button-review-production-${log.id}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {lineItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No production records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Report remaining raw milk */}
      {batches.filter((b: any) => !b.remainingRawMilk).length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-primary" />
              <Label className="font-medium">Report Remaining Raw Milk</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              How much raw milk is left after production? Enter the actual amount remaining in the tank.
            </p>
            {batches
              .filter((b: any) => !b.remainingRawMilk)
              .map((batch: any) => (
                <div key={batch.id} className="flex items-center gap-3" data-testid={`remaining-milk-${batch.id}`}>
                  <span className="text-sm font-mono text-muted-foreground">{batch.batchCode}</span>
                  <Input
                    type="number"
                    placeholder="Remaining litres"
                    value={remainingMilkInputs[batch.id] || ""}
                    onChange={(e) => setRemainingMilkInputs((prev) => ({ ...prev, [batch.id]: e.target.value }))}
                    className="w-40"
                    data-testid={`input-remaining-milk-${batch.id}`}
                  />
                  <span className="text-sm text-muted-foreground">Litres</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = remainingMilkInputs[batch.id];
                      if (val) updateRemainingMutation.mutate({ batchId: batch.id, remainingRawMilk: val });
                    }}
                    disabled={!remainingMilkInputs[batch.id] || updateRemainingMutation.isPending}
                    data-testid={`button-save-remaining-${batch.id}`}
                  >
                    Save
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Admin: Remaining milk tracker */}
      {user?.role === "ADMIN" && batches.filter((b: any) => b.remainingRawMilk).length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="font-medium text-sm">Remaining Milk Tracker</Label>
            {batches
              .filter((b: any) => b.remainingRawMilk)
              .map((batch: any) => {
                const clerk = parseFloat(batch.remainingRawMilk);
                const system = batch.systemCalculatedRemaining ? parseFloat(batch.systemCalculatedRemaining) : null;
                const variance = system ? ((clerk - system) / system) * 100 : null;
                return (
                  <div
                    key={batch.id}
                    className="flex items-center gap-4 p-2 rounded bg-muted/50 text-sm"
                    data-testid={`tracker-batch-${batch.id}`}
                  >
                    <span className="font-mono text-xs text-muted-foreground">{batch.batchCode}</span>
                    <span>Clerk: <strong>{clerk.toFixed(1)}L</strong></span>
                    {system !== null && (
                      <>
                        <span className="text-muted-foreground">System: {system.toFixed(1)}L</span>
                        {variance !== null && (
                          <Badge variant={Math.abs(variance) > 5 ? "destructive" : "secondary"} className="text-xs">
                            {variance > 0 ? "+" : ""}{variance.toFixed(1)}%
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Carry forward */}
      {batches.filter(
        (b: any) => b.remainingRawMilk && !carryForwards.some((cf: any) => cf.fromBatchId === b.id)
      ).length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              <Label className="font-medium text-blue-900 dark:text-blue-300">Carry Forward Remaining Milk</Label>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Want to use leftover raw milk in the next batch? Submit a carry-forward request for admin approval.
            </p>
            {batches
              .filter((b: any) => b.remainingRawMilk && !carryForwards.some((cf: any) => cf.fromBatchId === b.id))
              .map((batch: any) => (
                <div key={batch.id} className="space-y-2 p-3 rounded-lg bg-white dark:bg-background border" data-testid={`carry-forward-${batch.id}`}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-muted-foreground">{batch.batchCode}</span>
                    <span className="text-muted-foreground">|</span>
                    <span>Remaining: <strong>{parseFloat(batch.remainingRawMilk).toFixed(1)}L</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder={`Up to ${parseFloat(batch.remainingRawMilk).toFixed(1)}L`}
                      value={carryForwardQty[batch.id] || ""}
                      onChange={(e) => setCarryForwardQty((prev) => ({ ...prev, [batch.id]: e.target.value }))}
                      className="w-40"
                      data-testid={`input-carry-forward-qty-${batch.id}`}
                    />
                    <span className="text-sm text-muted-foreground">Litres</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        const qty = carryForwardQty[batch.id];
                        if (qty) createCarryForwardMutation.mutate({ fromBatchId: batch.id, amountLitres: qty });
                      }}
                      disabled={!carryForwardQty[batch.id] || createCarryForwardMutation.isPending}
                      data-testid={`button-carry-forward-${batch.id}`}
                    >
                      <Send className="h-3.5 w-3.5" /> Request
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Carry forward statuses */}
      {carryForwards.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="font-medium text-sm">Carry-Forward Requests</Label>
            </div>
            {carryForwards.map((cf: any) => (
              <div
                key={cf.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border text-sm"
                data-testid={`carry-forward-status-${cf.id}`}
              >
                <span className="font-mono text-xs text-muted-foreground">
                  {cf.fromBatchCode || `Batch #${cf.fromBatchId}`}
                </span>
                <span>{parseFloat(cf.amountLitres).toFixed(1)}L</span>
                <Badge
                  variant={cf.status === "APPROVED" ? "default" : cf.status === "REJECTED" ? "destructive" : "secondary"}
                  className={`text-xs ${cf.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : ""}`}
                >
                  {cf.status === "PENDING" && <Clock className="h-3 w-3 mr-1" />}
                  {cf.status === "APPROVED" && <Check className="h-3 w-3 mr-1" />}
                  {cf.status === "REJECTED" && <X className="h-3 w-3 mr-1" />}
                  {cf.status}
                </Badge>
                {user?.role === "ADMIN" && cf.status === "PENDING" && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => approveCarryForwardMutation.mutate({ id: cf.id, status: "APPROVED" })}
                      disabled={approveCarryForwardMutation.isPending}
                      data-testid={`button-approve-cf-${cf.id}`}
                    >
                      <Check className="h-3 w-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => approveCarryForwardMutation.mutate({ id: cf.id, status: "REJECTED" })}
                      disabled={approveCarryForwardMutation.isPending}
                      data-testid={`button-reject-cf-${cf.id}`}
                    >
                      <X className="h-3 w-3" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Record / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              {editingItem ? "Edit Production Record" : "Record Production"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the quantities for this production record."
                : "Select what you made, enter how much, and we'll calculate the rest."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Date + Batch Code */}
            {!editingItem && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <Input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    data-testid="input-batch-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Batch Code</Label>
                  <Input
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="font-mono text-sm"
                    data-testid="input-batch-code"
                    readOnly={user?.role !== "ADMIN"}
                    disabled={user?.role !== "ADMIN"}
                  />
                  {user?.role !== "ADMIN" && (
                    <p className="text-[11px] text-muted-foreground">System-generated</p>
                  )}
                </div>
              </div>
            )}

            {/* Shift */}
            {!editingItem && (
              <div className="space-y-2">
                <Label>Shift</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                  data-testid="select-shift"
                >
                  <option value="">No Shift</option>
                  <option value="MORNING">Morning</option>
                  <option value="AFTERNOON">Afternoon</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
            )}

            {/* Fix 8: Hierarchical product selection */}
            <div className="space-y-2">
              <Label className="font-medium">What did you make?</Label>
              {editingItem ? (
                // For edits, keep it simple — just show current product name
                <div className="p-3 rounded-lg border bg-muted/40 text-sm font-medium">
                  {getProductName(editingItem.outputProductId)}
                </div>
              ) : (
                <HierarchicalProductSelect
                  products={outputProducts}
                  value={selectedProductId}
                  onChange={(val) => {
                    setSelectedProductId(val);
                    setOutputQty("");
                    setActualInputQty("");
                  }}
                />
              )}
              {!editingItem && !selectedProductId && (
                <p className="text-xs text-muted-foreground">
                  Pulp, puree and raw ingredients are not listed here — only finished products.
                </p>
              )}
            </div>

            {/* Quantity + formula section */}
            {selectedProduct && (
              <>
                <div className="space-y-2">
                  <Label className="font-medium">How much did you make?</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="e.g. 500"
                      value={outputQty}
                      onChange={(e) => setOutputQty(e.target.value)}
                      className="text-lg font-medium flex-1"
                      autoFocus
                      data-testid="input-output-qty"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {unitLabel(selectedProduct.unitType)}
                    </span>
                  </div>
                  {outputEquivalent && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {parseFloat(outputQty)} units = {outputEquivalent.volume.toFixed(1)} {outputEquivalent.unitLabel}
                      {selectedProduct.packSizeLabel && (
                        <span className="text-muted-foreground">({selectedProduct.packSizeLabel} per unit)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Conversion formula */}
                {matchedFormula?.type === "CONVERSION" && matchedFormula.conversion && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {getProductName(matchedFormula.conversion.inputProductId)}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          {selectedProduct.name}
                        </Badge>
                        {user?.role === "ADMIN" && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {parseFloat(matchedFormula.conversion.ratioNumerator)}:{parseFloat(matchedFormula.conversion.ratioDenominator)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">
                          How much {getProductName(matchedFormula.conversion.inputProductId)} did you use?
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            placeholder={
                              user?.role === "ADMIN" && calculations?.expectedInput
                                ? `Expected: ${calculations.expectedInput.toFixed(1)}`
                                : "0"
                            }
                            value={actualInputQty}
                            onChange={(e) => setActualInputQty(e.target.value)}
                            className="flex-1"
                            data-testid="input-actual-input"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {unitLabel(getProductUnit(matchedFormula.conversion.inputProductId))}
                          </span>
                        </div>
                        {user?.role === "ADMIN" && calculations?.expectedInput && (
                          <p className="text-xs text-muted-foreground">
                            Based on formula: ~{calculations.expectedInput.toFixed(1)}{" "}
                            {unitShort(getProductUnit(matchedFormula.conversion.inputProductId))} expected
                          </p>
                        )}
                      </div>
                      {user?.role === "ADMIN" && calculations?.variancePercent !== undefined && actualInputQty && (
                        <div
                          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                            Math.abs(calculations.variancePercent) > 5
                              ? "bg-destructive/10 text-destructive"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {Math.abs(calculations.variancePercent) > 5 ? (
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                          )}
                          <span className="font-medium">
                            {Math.abs(calculations.variancePercent) <= 5
                              ? "Within range"
                              : `Variance: ${calculations.variancePercent > 0 ? "+" : ""}${calculations.variancePercent.toFixed(1)}%`}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Blend formula */}
                {matchedFormula?.type === "BLEND" && calculations?.components && (
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-4 space-y-3">
                      <Label className="text-xs text-muted-foreground font-medium">Blend Components:</Label>
                      <div className="grid gap-2 text-sm">
                        {calculations.components.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-background p-2 rounded border">
                            <span className="flex-1 text-xs">{getProductName(c.componentProductId)}</span>
                            {user?.role === "ADMIN" && (
                              <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                {c.expectedQty.toFixed(1)}
                              </span>
                            )}
                            <Input
                              type="number"
                              placeholder="Actual"
                              value={blendActuals[c.componentProductId] || ""}
                              onChange={(e) =>
                                setBlendActuals((prev) => ({ ...prev, [c.componentProductId]: e.target.value }))
                              }
                              className="w-20 h-7 text-xs"
                              data-testid={`input-blend-actual-${c.componentProductId}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {unitShort(getProductUnit(c.componentProductId))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!matchedFormula && outputQty && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No formula set up for this product yet. Production will be recorded without variance tracking.</span>
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            {!editingItem && (
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="e.g. Valve issue, extra loss observed..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  data-testid="input-production-notes"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !selectedProduct ||
                !outputQty ||
                createBatchMutation.isPending ||
                updateLineItemMutation.isPending ||
                (workflowCheck && !workflowCheck.allowed) ||
                !!dailyLock
              }
              data-testid="button-save-batch"
            >
              {editingItem ? "Update" : "Save Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clerk Change Request Dialog ──────────────────────────────────────── */}
      <Dialog
        open={changeRequestDialog.open}
        onOpenChange={(open) => {
          if (!open) setChangeRequestDialog({ open: false, item: null, proposedQty: "", reason: "" });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Correction</DialogTitle>
            <DialogDescription>
              You cannot edit records directly. Submit a correction and an admin will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {changeRequestDialog.item && (
              <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                <p><span className="font-medium">Batch:</span> {changeRequestDialog.item.batchCode}</p>
                <p><span className="font-medium">Product:</span> {getProductName(changeRequestDialog.item.outputProductId)}</p>
                <p>
                  <span className="font-medium">Current Qty:</span>{" "}
                  {parseFloat(changeRequestDialog.item.outputQty).toLocaleString()}{" "}
                  {unitShort(getProductUnit(changeRequestDialog.item.outputProductId))}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Correct Quantity <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                value={changeRequestDialog.proposedQty}
                onChange={(e) => setChangeRequestDialog((d) => ({ ...d, proposedQty: e.target.value }))}
                data-testid="input-proposed-qty"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Change <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="e.g. I entered the wrong quantity, correct amount is..."
                value={changeRequestDialog.reason}
                onChange={(e) => setChangeRequestDialog((d) => ({ ...d, reason: e.target.value }))}
                rows={3}
                data-testid="input-change-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeRequestDialog({ open: false, item: null, proposedQty: "", reason: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitChangeRequest}
              disabled={
                createChangeRequestMutation.isPending ||
                !changeRequestDialog.reason.trim() ||
                !changeRequestDialog.proposedQty
              }
              data-testid="button-submit-change-request"
            >
              {createChangeRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => { if (!open) setDeletingItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Production Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the record for{" "}
              {deletingItem ? getProductName(deletingItem.outputProductId) : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Admin Review Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!reviewingItem}
        onOpenChange={(open) => { if (!open) { setReviewingItem(null); setAdminNotesInput(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Production Record</DialogTitle>
            <DialogDescription>Mark this record as reviewed and optionally add admin notes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {reviewingItem?.notes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Operator Notes</Label>
                <p className="text-sm bg-muted/50 p-2 rounded">{reviewingItem.notes}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Admin Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Verified quantities, all correct..."
                value={adminNotesInput}
                onChange={(e) => setAdminNotesInput(e.target.value)}
                rows={2}
                data-testid="input-admin-review-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewingItem(null); setAdminNotesInput(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                if (!reviewingItem) return;
                try {
                  await apiRequest("PATCH", "/api/admin/review", {
                    entityType: "LINE_ITEM",
                    entityId: reviewingItem.id,
                    adminNotes: adminNotesInput || null,
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
                  toast({ title: "Reviewed", description: "Record marked as reviewed." });
                  setReviewingItem(null);
                  setAdminNotesInput("");
                } catch (err: any) {
                  toast({ variant: "destructive", title: "Error", description: err.message });
                }
              }}
              data-testid="button-confirm-review"
            >
              Mark as Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}