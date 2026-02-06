import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LineItem = { id: number; batchCode: string; batchDate: string; operationType: string; outputProductId: number; outputQty: string; inputProductId: number | null; inputQty: string | null };
type Product = { id: number; name: string; unitType: string };
type Packout = { id: number; date: string; productId: number; qty: string; unitType: string };

export default function MyHistory() {
  const { toast } = useToast();
  const [editDialog, setEditDialog] = useState<{ open: boolean; entityType: string; entityId: number; fieldName: string; currentValue: string }>({ open: false, entityType: "", entityId: 0, fieldName: "", currentValue: "" });
  const [proposedValue, setProposedValue] = useState("");

  const { data: lineItems = [] } = useQuery<LineItem[]>({ queryKey: ["/api/production/line-items"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const { data: packouts = [] } = useQuery<Packout[]>({ queryKey: ["/api/packouts"] });

  const getProductName = (id: number | null) => id ? products.find(p => p.id === id)?.name || `#${id}` : "";
  const getProductUnit = (id: number | null) => id ? products.find(p => p.id === id)?.unitType || "" : "";

  const createChangeRequest = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/change-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Change Request Submitted", description: "Your edit request has been sent to admin for review." });
      setEditDialog({ ...editDialog, open: false });
      setProposedValue("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const handleRequestEdit = (entityType: string, entityId: number, fieldName: string, currentValue: string) => {
    setEditDialog({ open: true, entityType, entityId, fieldName, currentValue });
    setProposedValue(currentValue);
  };

  const handleSubmitEdit = () => {
    createChangeRequest.mutate({
      entityType: editDialog.entityType,
      entityId: editDialog.entityId,
      fieldName: editDialog.fieldName,
      proposedValue,
      currentValue: editDialog.currentValue,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My History</h2>
          <p className="text-muted-foreground">Review your captured data. Edits require approval.</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Production Records</h3>
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Batch Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Output</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((log) => (
                <TableRow key={log.id} data-testid={`row-history-${log.id}`}>
                  <TableCell className="font-medium font-mono text-xs">{log.batchCode}</TableCell>
                  <TableCell>{log.batchDate}</TableCell>
                  <TableCell><Badge variant="secondary">{log.operationType}</Badge></TableCell>
                  <TableCell>
                    {parseFloat(log.outputQty).toLocaleString()} {getProductUnit(log.outputProductId)} <span className="text-xs text-muted-foreground">({getProductName(log.outputProductId)})</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRequestEdit("production_line_item", log.id, "outputQty", log.outputQty)} data-testid={`button-edit-${log.id}`}>
                      <Edit2 className="h-3 w-3 mr-2" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {lineItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No production records yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Packout Records</h3>
        <div className="rounded-md border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packouts.map((p) => (
                <TableRow key={p.id} data-testid={`row-packout-history-${p.id}`}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell className="font-medium">{getProductName(p.productId)}</TableCell>
                  <TableCell className="text-right">{parseFloat(p.qty).toLocaleString()} {p.unitType}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRequestEdit("packout", p.id, "qty", p.qty)}>
                      <Edit2 className="h-3 w-3 mr-2" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {packouts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No packout records yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Edit</DialogTitle>
            <DialogDescription>Propose a correction. An admin will review your request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Field</Label>
              <Input value={editDialog.fieldName} disabled />
            </div>
            <div className="space-y-2">
              <Label>Current Value</Label>
              <Input value={editDialog.currentValue} disabled className="text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <Label>Proposed Value</Label>
              <Input value={proposedValue} onChange={e => setProposedValue(e.target.value)} data-testid="input-proposed-value" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ ...editDialog, open: false })}>Cancel</Button>
            <Button onClick={handleSubmitEdit} disabled={createChangeRequest.isPending} data-testid="button-submit-edit">Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
