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
import { Plus, Milk, CheckCircle2, Lock, Download, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

type Product = { id: number; name: string; unitType: string; isIntermediate: boolean; category: string };
type Supplier = { id: number; name: string; active: boolean };
type Intake = { id: number; date: string; supplierId: number | null; productId: number; qty: string; unitType: string; deliveredQty: string | null; acceptedQty: string | null; notes: string | null; reviewedAt: string | null; reviewedByUserId: number | null; adminNotes: string | null };

export default function IntakePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<Intake | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [intakeDate, setIntakeDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    supplierId: "",
    deliveredQty: "",
    acceptedQty: "",
    notes: "",
  });

  const { data: dailyLock } = useQuery<any>({
    queryKey: ["/api/daily-locks-intake", intakeDate],
    queryFn: async () => {
      const res = await fetch(`/api/daily-locks/${intakeDate}`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: intakes = [] } = useQuery<Intake[]>({ queryKey: ["/api/intakes"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: suppliers = [] } = useQuery<Supplier[]>({ queryKey: ["/api/suppliers"] });

  const rawMilkProduct = useMemo(() =>
    products.find(p => p.category === "RAW_MILK"),
    [products]
  );

  const supplierOptions = useMemo(() =>
    suppliers.filter(s => s.active).map(s => ({ value: String(s.id), label: s.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [suppliers]
  );

  // Receiving loss is calculated from the 2 fields
  const receivingLoss = useMemo(() => {
    const delivered = parseFloat(formData.deliveredQty);
    const accepted = parseFloat(formData.acceptedQty);
    if (formData.deliveredQty && formData.acceptedQty && delivered > 0 && accepted >= 0 && delivered > accepted) {
      const loss = delivered - accepted;
      return { loss: loss.toFixed(1), percent: ((loss / delivered) * 100).toFixed(1) };
    }
    return null;
  }, [formData.deliveredQty, formData.acceptedQty]);

  const isFormValid = useMemo(() => {
    if (!rawMilkProduct) return false;
    if (!formData.supplierId) return false;
    const delivered = parseFloat(formData.deliveredQty);
    const accepted = parseFloat(formData.acceptedQty);
    if (!formData.deliveredQty || isNaN(delivered) || delivered <= 0) return false;
    if (!formData.acceptedQty || isNaN(accepted) || accepted <= 0) return false;
    if (accepted > delivered) return false;
    return true;
  }, [rawMilkProduct, formData]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/intakes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      toast({ title: "Intake Recorded", description: "Delivery has been logged successfully." });
      setIsDialogOpen(false);
      const resetDate = format(new Date(), "yyyy-MM-dd");
      setFormData({ date: resetDate, supplierId: "", deliveredQty: "", acceptedQty: "", notes: "" });
      setIntakeDate(resetDate);
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

  const handleSave = () => {
    if (!isFormValid || !rawMilkProduct) return;
    // qty = acceptedQty (what went into stock). deliveredQty is tracked separately for loss.
    createMutation.mutate({
      date: formData.date,
      supplierId: formData.supplierId ? parseInt(formData.supplierId) : null,
      productId: rawMilkProduct.id,
      qty: formData.acceptedQty,           // stock = accepted
      unitType: "LITER",
      deliveredQty: formData.deliveredQty,
      acceptedQty: formData.acceptedQty,
      notes: formData.notes || null,
    });
  };

  const getSupplierName = (id: number | null) =>
    id ? suppliers.find(s => s.id === id)?.name || `#${id}` : "—";

  const exportCSV = () => {
    const headers = ["Date", "Supplier", "Delivered (L)", "Accepted (L)", "Loss (L)", "Loss %", "Notes", "Status"];
    const rows = intakes.map((i: any) => {
      const delivered = i.deliveredQty ? parseFloat(i.deliveredQty) : null;
      const accepted = i.acceptedQty ? parseFloat(i.acceptedQty) : parseFloat(i.qty);
      const loss = delivered ? (delivered - accepted) : null;
      const lossPct = delivered && loss ? ((loss / delivered) * 100).toFixed(1) : "";
      return [
        i.date,
        suppliers.find((s: any) => s.id === i.supplierId)?.name || "",
        i.deliveredQty || i.qty,
        i.acceptedQty || i.qty,
        loss?.toFixed(1) || "",
        lossPct,
        i.notes || "",
        i.reviewedAt ? "Reviewed" : "Pending",
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `intake-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Milk Intake</h2>
          <p className="text-muted-foreground">Log raw milk deliveries from suppliers (in litres).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2" disabled={!!dailyLock} data-testid="button-add-intake">
            <Plus className="h-4 w-4" /> Log Delivery
          </Button>
        </div>
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

      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Delivered (L)</TableHead>
              <TableHead className="text-right">Accepted (L)</TableHead>
              {user?.role === "ADMIN" && <TableHead className="text-right">Loss</TableHead>}
              <TableHead>Notes</TableHead>
              {user?.role === "ADMIN" && <TableHead>Review</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {intakes.map((intake) => {
              const delivered = intake.deliveredQty ? parseFloat(intake.deliveredQty) : null;
              const accepted = intake.acceptedQty ? parseFloat(intake.acceptedQty) : parseFloat(intake.qty);
              const lossAmt = delivered ? delivered - accepted : 0;
              const lossPct = delivered && lossAmt > 0 ? ((lossAmt / delivered) * 100) : 0;
              const hasLoss = lossAmt > 0.01;
              return (
                <TableRow key={intake.id} data-testid={`row-intake-${intake.id}`}>
                  <TableCell>{intake.date}</TableCell>
                  <TableCell>{getSupplierName(intake.supplierId)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {delivered ? delivered.toLocaleString() : parseFloat(intake.qty).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {accepted.toLocaleString()}
                  </TableCell>
                  {user?.role === "ADMIN" && (
                    <TableCell className="text-right">
                      {hasLoss ? (
                        <span className="text-amber-600 text-sm font-medium">
                          -{lossAmt.toFixed(0)}L ({lossPct.toFixed(1)}%)
                        </span>
                      ) : (
                        <span className="text-green-600 text-sm">—</span>
                      )}
                    </TableCell>
                  )}
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
                <TableCell colSpan={user?.role === "ADMIN" ? 7 : 5} className="text-center py-8 text-muted-foreground">
                  No intake records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* LOG DELIVERY DIALOG — 2 fields only */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Milk Delivery</DialogTitle>
            <DialogDescription>Record an incoming raw milk delivery from a supplier.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={e => { setFormData({ ...formData, date: e.target.value }); setIntakeDate(e.target.value); }}
                data-testid="input-intake-date"
              />
            </div>

            <div className="space-y-2">
              <Label>Supplier <span className="text-red-500">*</span></Label>
              <SearchableSelect
                options={supplierOptions}
                value={formData.supplierId}
                onValueChange={val => setFormData({ ...formData, supplierId: val })}
                placeholder="Select supplier"
                searchPlaceholder="Search suppliers..."
                data-testid="select-intake-supplier"
              />
            </div>

            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Milk className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Raw Milk — Litres</span>
              </div>
            </div>

            {/* THE 2 FIELDS */}
            <div className="space-y-2">
              <Label>Quantity Delivered <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="How many litres did the truck bring?"
                value={formData.deliveredQty}
                onChange={e => setFormData({ ...formData, deliveredQty: e.target.value })}
                data-testid="input-intake-delivered"
              />
              <p className="text-xs text-muted-foreground">Total litres on the delivery truck.</p>
            </div>

            <div className="space-y-2">
              <Label>Quantity Accepted <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="How many litres went into stock?"
                value={formData.acceptedQty}
                onChange={e => setFormData({ ...formData, acceptedQty: e.target.value })}
                data-testid="input-intake-accepted"
              />
              <p className="text-xs text-muted-foreground">Litres actually accepted into stock. Must be ≤ delivered.</p>
            </div>

            {/* Auto-calculated loss shown inline */}
            {receivingLoss && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800" data-testid="text-receiving-loss">
                <TrendingDown className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Receiving loss: <strong>{receivingLoss.loss} L</strong> ({receivingLoss.percent}%)
                </p>
              </div>
            )}

            {/* Accepted > Delivered warning */}
            {formData.deliveredQty && formData.acceptedQty &&
              parseFloat(formData.acceptedQty) > parseFloat(formData.deliveredQty) && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                Accepted cannot be more than delivered.
              </div>
            )}

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
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || !isFormValid}
              data-testid="button-save-intake"
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADMIN REVIEW DIALOG */}
      {user?.role === "ADMIN" && (
        <Dialog open={!!reviewingItem} onOpenChange={(open) => { if (!open) { setReviewingItem(null); setAdminNotes(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Intake Record</DialogTitle>
              <DialogDescription>Add admin notes and mark this record as reviewed.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {reviewingItem && (
                <div className="p-3 rounded-md bg-muted text-sm space-y-1">
                  <p><span className="font-medium">Date:</span> {reviewingItem.date}</p>
                  <p><span className="font-medium">Supplier:</span> {getSupplierName(reviewingItem.supplierId)}</p>
                  <p><span className="font-medium">Delivered:</span> {reviewingItem.deliveredQty ? `${parseFloat(reviewingItem.deliveredQty).toLocaleString()} L` : "—"}</p>
                  <p><span className="font-medium">Accepted:</span> {reviewingItem.acceptedQty ? `${parseFloat(reviewingItem.acceptedQty).toLocaleString()} L` : `${parseFloat(reviewingItem.qty).toLocaleString()} L`}</p>
                </div>
              )}
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