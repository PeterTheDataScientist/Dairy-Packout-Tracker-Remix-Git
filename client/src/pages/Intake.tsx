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
import { Plus, Milk, Info, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

type Product = { id: number; name: string; unitType: string; isIntermediate: boolean };
type Supplier = { id: number; name: string; active: boolean };
type Intake = { id: number; date: string; supplierId: number | null; productId: number; qty: string; unitType: string; deliveredQty: string | null; acceptedQty: string | null; notes: string | null; reviewedAt: string | null; reviewedByUserId: number | null; adminNotes: string | null };

export default function IntakePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<Intake | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    supplierId: "",
    productId: "",
    qty: "",
    deliveredQty: "",
    acceptedQty: "",
    notes: "",
  });

  const { data: intakes = [] } = useQuery<Intake[]>({ queryKey: ["/api/intakes"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const supplierOptions = useMemo(() =>
    suppliers.filter(s => s.active).map(s => ({ value: String(s.id), label: s.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [suppliers]
  );

  const productOptions = useMemo(() =>
    products.map(p => ({ value: String(p.id), label: `${p.name} (${p.unitType})` })).sort((a, b) => a.label.localeCompare(b.label)),
    [products]
  );

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/intakes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({ title: "Intake Recorded", description: "Delivery has been logged." });
      setIsDialogOpen(false);
      setFormData({ date: format(new Date(), "yyyy-MM-dd"), supplierId: "", productId: "", qty: "", deliveredQty: "", acceptedQty: "", notes: "" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({ title: "Reviewed", description: "Record marked as reviewed." });
      setReviewingItem(null);
      setAdminNotes("");
    },
  });

  const effectiveQty = useMemo(() => {
    if (formData.deliveredQty && formData.acceptedQty) {
      return formData.acceptedQty;
    }
    return formData.qty;
  }, [formData.qty, formData.deliveredQty, formData.acceptedQty]);

  const receivingLoss = useMemo(() => {
    if (formData.deliveredQty && formData.acceptedQty) {
      const delivered = parseFloat(formData.deliveredQty);
      const accepted = parseFloat(formData.acceptedQty);
      if (delivered > 0 && accepted >= 0 && delivered > accepted) {
        const loss = delivered - accepted;
        return { loss: loss.toFixed(1), percent: ((loss / delivered) * 100).toFixed(1) };
      }
    }
    return null;
  }, [formData.deliveredQty, formData.acceptedQty]);

  const handleSave = () => {
    const finalQty = (formData.deliveredQty && formData.acceptedQty)
      ? formData.acceptedQty
      : formData.qty;

    if (!formData.productId || !finalQty) return;
    const product = products.find(p => p.id === parseInt(formData.productId));
    createMutation.mutate({
      date: formData.date,
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
      productId: parseInt(formData.productId),
      qty: finalQty,
      unitType: product?.unitType || "LITER",
      deliveredQty: formData.deliveredQty || null,
      acceptedQty: formData.acceptedQty || null,
      notes: formData.notes || null,
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
              <TableHead className="text-right">Stock Added</TableHead>
              <TableHead className="text-right">Delivered</TableHead>
              <TableHead className="text-right">Accepted</TableHead>
              <TableHead className="text-right">Loss</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Notes</TableHead>
              {user?.role === "ADMIN" && <TableHead>Review</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {intakes.map((intake) => {
              const hasLoss = intake.deliveredQty && intake.acceptedQty &&
                parseFloat(intake.deliveredQty) > parseFloat(intake.acceptedQty);
              const lossAmt = hasLoss ? (parseFloat(intake.deliveredQty!) - parseFloat(intake.acceptedQty!)) : 0;
              const lossPct = hasLoss ? ((lossAmt / parseFloat(intake.deliveredQty!)) * 100) : 0;
              return (
                <TableRow key={intake.id} data-testid={`row-intake-${intake.id}`}>
                  <TableCell>{intake.date}</TableCell>
                  <TableCell>{getSupplierName(intake.supplierId)}</TableCell>
                  <TableCell className="font-medium">{getProductName(intake.productId)}</TableCell>
                  <TableCell className="text-right font-medium">{parseFloat(intake.qty).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{intake.deliveredQty ? parseFloat(intake.deliveredQty).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{intake.acceptedQty ? parseFloat(intake.acceptedQty).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    {hasLoss ? (
                      <span className="text-amber-600 text-sm">{lossAmt.toFixed(0)} ({lossPct.toFixed(1)}%)</span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{intake.unitType}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {intake.notes || "—"}
                    {intake.reviewedAt && <CheckCircle2 className="inline-block ml-1 h-3.5 w-3.5 text-green-500" />}
                  </TableCell>
                  {user?.role === "ADMIN" && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => { setReviewingItem(intake); setAdminNotes(intake.adminNotes || ""); }}
                        data-testid={`button-review-intake-${intake.id}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {intakes.length === 0 && (
              <TableRow>
                <TableCell colSpan={user?.role === "ADMIN" ? 10 : 9} className="text-center py-8 text-muted-foreground">No intake records yet.</TableCell>
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
                options={supplierOptions}
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
                options={productOptions}
                value={formData.productId}
                onValueChange={val => setFormData({ ...formData, productId: val })}
                placeholder="Select product"
                searchPlaceholder="Search products..."
                data-testid="select-intake-product"
              />
            </div>

            {!(formData.deliveredQty && formData.acceptedQty) && (
              <div className="space-y-2">
                <Label>Quantity (stock added)</Label>
                <Input type="number" placeholder="0" value={formData.qty} onChange={e => setFormData({ ...formData, qty: e.target.value })} data-testid="input-intake-qty" />
                <p className="text-xs text-muted-foreground">Amount added to stock. If you track receiving loss below, this is set automatically from accepted qty.</p>
              </div>
            )}

            <div className="border-t pt-4 mt-2 space-y-3">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Receiving Loss Tracking (optional)
              </Label>
              <p className="text-xs text-muted-foreground">Enter both fields to track loss. Accepted qty becomes the stock quantity.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Delivered by Supplier</Label>
                  <Input type="number" placeholder="Truck qty" value={formData.deliveredQty} onChange={e => setFormData({ ...formData, deliveredQty: e.target.value })} data-testid="input-intake-delivered" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Accepted into Stock</Label>
                  <Input type="number" placeholder="Accepted qty" value={formData.acceptedQty} onChange={e => setFormData({ ...formData, acceptedQty: e.target.value })} data-testid="input-intake-accepted" />
                </div>
              </div>
              {formData.deliveredQty && formData.acceptedQty && (
                <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300" data-testid="text-auto-qty">
                  Stock qty will be set to accepted qty: <strong>{parseFloat(formData.acceptedQty).toLocaleString()}</strong>
                </div>
              )}
              {receivingLoss && (
                <p className="text-xs text-amber-600" data-testid="text-receiving-loss">
                  Receiving loss: {receivingLoss.loss} ({receivingLoss.percent}%)
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
                data-testid="input-intake-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || (!effectiveQty && !formData.qty)} data-testid="button-save-intake">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {user?.role === "ADMIN" && (
        <Dialog open={!!reviewingItem} onOpenChange={(open) => { if (!open) { setReviewingItem(null); setAdminNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Intake Record</DialogTitle>
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
                      entityType: "INTAKE",
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
