import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Package, Info, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

type Product = { id: number; name: string; category: string; unitType: string; active: boolean; packSizeQty: string | null; packSizeUnit: string | null; packSizeLabel: string | null };
type Packout = { id: number; date: string; productId: number; qty: string; unitType: string; packSizeLabel: string | null; sourceProductId: number | null; sourceQtyUsed: string | null; notes: string | null; reviewedAt: string | null; reviewedByUserId: number | null; adminNotes: string | null };

export default function Packouts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<Packout | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [formData, setFormData] = useState({ date: format(new Date(), "yyyy-MM-dd"), productId: "", qty: "", packSizeLabel: "", sourceProductId: "", sourceQtyUsed: "", notes: "" });

  const [packoutDate, setPackoutDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: packouts = [] } = useQuery<Packout[]>({ queryKey: ["/api/packouts"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const { data: workflowCheck } = useQuery<{ allowed: boolean; reason?: string }>({
    queryKey: ["/api/workflow/check-packout", packoutDate],
    queryFn: async () => {
      const res = await fetch(`/api/workflow/check?date=${packoutDate}&step=packout`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: dailyLock } = useQuery<any>({
    queryKey: ["/api/daily-locks-packout", packoutDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-locks/${packoutDate}`, { credentials: 'include' });
      return res.json();
    },
  });

  const finishedGoods = products.filter(p => p.category !== "RAW_MILK" && p.active);
  const getProductName = (id: number) => products.find(p => p.id === id)?.name || `#${id}`;

  const productOptions = useMemo(() =>
    finishedGoods.map(p => ({ value: String(p.id), label: `${p.name} (${p.unitType})` })).sort((a, b) => a.label.localeCompare(b.label)),
    [finishedGoods]
  );

  const sourceOptions = useMemo(() =>
    products.filter(p => p.active).map(p => ({ value: String(p.id), label: `${p.name} (${p.unitType})` })).sort((a, b) => a.label.localeCompare(b.label)),
    [products]
  );

  const selectedProduct = useMemo(() =>
    formData.productId ? products.find(p => p.id === parseInt(formData.productId)) : null,
    [formData.productId, products]
  );

  const outputEquivalent = useMemo(() => {
    if (!selectedProduct || !formData.qty) return null;
    const qty = parseFloat(formData.qty);
    if (isNaN(qty) || qty <= 0) return null;
    if (selectedProduct.unitType === "UNIT" && selectedProduct.packSizeQty) {
      const packSize = parseFloat(selectedProduct.packSizeQty);
      const volume = qty * packSize;
      const unitLabel = selectedProduct.packSizeUnit === "KILOGRAM" ? "kg" : "L";
      return { volume, unitLabel, packSize };
    }
    return null;
  }, [selectedProduct, formData.qty]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/packouts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packouts"] });
      toast({ title: "Packout Recorded", description: "Finished goods logged." });
      setIsDialogOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), productId: "", qty: "", packSizeLabel: "", sourceProductId: "", sourceQtyUsed: "", notes: "" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
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

  const handleSave = () => {
    if (!formData.productId || !formData.qty) return;
    const product = products.find(p => p.id === parseInt(formData.productId));
    createMutation.mutate({
      date: formData.date,
      productId: parseInt(formData.productId),
      qty: formData.qty,
      unitType: product?.unitType || "UNIT",
      packSizeLabel: formData.packSizeLabel || product?.packSizeLabel || null,
      sourceProductId: formData.sourceProductId ? parseInt(formData.sourceProductId) : null,
      sourceQtyUsed: formData.sourceQtyUsed || null,
      notes: formData.notes || null,
    });
  };

  const fillingLoss = useMemo(() => {
    if (!formData.sourceQtyUsed || !formData.qty) return null;
    const sourceUsed = parseFloat(formData.sourceQtyUsed);
    const outputVol = outputEquivalent ? outputEquivalent.volume : parseFloat(formData.qty);
    if (sourceUsed > outputVol) {
      const loss = sourceUsed - outputVol;
      return { loss: loss.toFixed(1), percent: ((loss / sourceUsed) * 100).toFixed(1) };
    }
    return null;
  }, [formData.sourceQtyUsed, formData.qty, outputEquivalent]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Packouts</h2>
          <p className="text-muted-foreground">Record finished goods inventory.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2" disabled={!!dailyLock || (workflowCheck && !workflowCheck.allowed)} data-testid="button-add-packout">
          <Plus className="h-4 w-4" /> Log Packout
        </Button>
      </div>

      {dailyLock && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800" data-testid="warning-locked">
          <Lock className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Day Locked</p>
            <p className="text-sm">This date has been locked by admin. No changes allowed.</p>
          </div>
        </div>
      )}

      {workflowCheck && !workflowCheck.allowed && (
        <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" data-testid="warning-workflow">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Cannot Record Packout</p>
            <p className="text-sm">{workflowCheck.reason}</p>
          </div>
        </div>
      )}

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
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Source Used</TableHead>
              <TableHead>Notes</TableHead>
              {user?.role === "ADMIN" && <TableHead>Review</TableHead>}
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
                <TableCell className="text-muted-foreground text-sm">{p.sourceProductId ? getProductName(p.sourceProductId) : "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{p.sourceQtyUsed ? parseFloat(p.sourceQtyUsed).toLocaleString() : "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {p.notes || "—"}
                  {p.reviewedAt && <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-green-500" />}
                </TableCell>
                {user?.role === "ADMIN" && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => { setReviewingItem(p); setAdminNotes(p.adminNotes || ""); }}
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
                <TableCell colSpan={user?.role === "ADMIN" ? 9 : 8} className="text-center py-8 text-muted-foreground">No packouts recorded yet.</TableCell>
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
              <Input type="date" value={formData.date} onChange={e => { setFormData({ ...formData, date: e.target.value }); setPackoutDate(e.target.value); }} data-testid="input-packout-date" />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <SearchableSelect
                options={productOptions}
                value={formData.productId}
                onValueChange={val => {
                  const prod = products.find(p => p.id === parseInt(val));
                  setFormData({
                    ...formData,
                    productId: val,
                    packSizeLabel: prod?.packSizeLabel || "",
                  });
                }}
                placeholder="Select finished good"
                searchPlaceholder="Search products..."
                data-testid="select-packout-product"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} placeholder="0" data-testid="input-packout-qty" />
              {outputEquivalent && (
                <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1" data-testid="text-packout-equivalent">
                  <Info className="h-3 w-3" />
                  Output equivalent: {parseFloat(formData.qty)} units = {outputEquivalent.volume.toFixed(1)} {outputEquivalent.unitLabel}
                  {selectedProduct?.packSizeLabel && <span className="text-muted-foreground">({selectedProduct.packSizeLabel} per unit)</span>}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pack Size Label (optional)</Label>
              <Input value={formData.packSizeLabel} onChange={e => setFormData({ ...formData, packSizeLabel: e.target.value })} placeholder="e.g. 500ml, 1kg" data-testid="input-packout-size" />
            </div>
            <div className="border-t pt-4 mt-2 space-y-3">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Filling Loss Tracking (optional)
              </Label>
              <div className="space-y-2">
                <Label className="text-xs">Source Product Used</Label>
                <SearchableSelect
                  options={sourceOptions}
                  value={formData.sourceProductId}
                  onValueChange={val => setFormData({ ...formData, sourceProductId: val })}
                  placeholder="Select source product"
                  searchPlaceholder="Search products..."
                  data-testid="select-packout-source"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source Qty Used (total for this record)</Label>
                <Input
                  type="number"
                  placeholder={outputEquivalent ? `Suggested: ${outputEquivalent.volume.toFixed(1)} ${outputEquivalent.unitLabel}` : "How much was used"}
                  value={formData.sourceQtyUsed}
                  onChange={e => setFormData({ ...formData, sourceQtyUsed: e.target.value })}
                  data-testid="input-packout-source-qty"
                />
                <p className="text-xs text-muted-foreground">How much bulk material was consumed to create this packout record (total, not per unit).</p>
              </div>
              {user?.role === "ADMIN" && fillingLoss && (
                <p className="text-xs text-amber-600" data-testid="text-filling-loss">
                  Filling loss: {fillingLoss.loss} ({fillingLoss.percent}%)
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="e.g. Spillage during transfer, valve issue..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                data-testid="input-packout-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending} data-testid="button-save-packout">Save Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user?.role === "ADMIN" && (
        <Dialog open={!!reviewingItem} onOpenChange={(open) => { if (!open) { setReviewingItem(null); setAdminNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Packout Record</DialogTitle>
              <DialogDescription>Add admin notes and mark this record as reviewed.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea
                  placeholder="Add review notes..."
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  data-testid="input-admin-notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReviewingItem(null); setAdminNotes(""); }}>Cancel</Button>
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
