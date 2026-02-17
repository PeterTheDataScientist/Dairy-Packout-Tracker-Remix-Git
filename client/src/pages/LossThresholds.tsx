import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchableSelect } from "@/components/ui/searchable-select";

type LossThreshold = {
  id: number;
  formulaId: number | null;
  stage: "PRODUCTION" | "PACKOUT";
  minLossPercent: string;
  maxLossPercent: string;
  isGlobal: boolean;
  active: boolean;
};

type FormulaWithDetails = {
  id: number;
  name: string;
  type: "CONVERSION" | "BLEND";
  outputProductId: number;
  active: boolean;
};

export default function LossThresholds() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    isGlobal: true,
    formulaId: "",
    stage: "PRODUCTION" as "PRODUCTION" | "PACKOUT",
    minLossPercent: "",
    maxLossPercent: "",
    active: true,
  });

  const { data: thresholds = [] } = useQuery<LossThreshold[]>({
    queryKey: ["/api/loss-thresholds"],
  });

  const { data: formulas = [] } = useQuery<FormulaWithDetails[]>({
    queryKey: ["/api/formulas"],
  });

  const getFormulaName = (id: number | null) =>
    formulas.find((f) => f.id === id)?.name || `Formula #${id}`;

  const formulaOptions = formulas.map((f) => ({
    value: String(f.id),
    label: f.name,
  }));

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/loss-thresholds", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loss-thresholds"] });
      toast({ title: "Threshold created" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/loss-thresholds/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loss-thresholds"] });
      toast({ title: "Threshold updated" });
      setIsDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/loss-thresholds/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loss-thresholds"] });
      toast({ title: "Threshold deleted" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      isGlobal: true,
      formulaId: "",
      stage: "PRODUCTION",
      minLossPercent: "",
      maxLossPercent: "",
      active: true,
    });
  };

  const handleEdit = (threshold: LossThreshold) => {
    setEditingId(threshold.id);
    setFormData({
      isGlobal: threshold.isGlobal,
      formulaId: threshold.formulaId ? String(threshold.formulaId) : "",
      stage: threshold.stage,
      minLossPercent: threshold.minLossPercent,
      maxLossPercent: threshold.maxLossPercent,
      active: threshold.active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.minLossPercent || !formData.maxLossPercent) {
      toast({ variant: "destructive", title: "Error", description: "Min and Max loss percentages are required." });
      return;
    }
    if (!formData.isGlobal && !formData.formulaId) {
      toast({ variant: "destructive", title: "Error", description: "Please select a formula for formula-specific thresholds." });
      return;
    }

    const payload = {
      isGlobal: formData.isGlobal,
      formulaId: formData.isGlobal ? null : parseInt(formData.formulaId),
      stage: formData.stage,
      minLossPercent: formData.minLossPercent,
      maxLossPercent: formData.maxLossPercent,
      active: formData.active,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Loss Thresholds</h2>
          <p className="text-muted-foreground" data-testid="text-page-description">Configure acceptable loss ranges for production and packout operations.</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-threshold">
          <Plus className="h-4 w-4" /> Add Threshold
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Min Loss %</TableHead>
              <TableHead>Max Loss %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thresholds.map((threshold) => (
              <TableRow key={threshold.id} data-testid={`row-threshold-${threshold.id}`}>
                <TableCell>
                  {threshold.isGlobal ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200" data-testid={`badge-type-${threshold.id}`}>
                      Global
                    </Badge>
                  ) : (
                    <span className="font-medium" data-testid={`text-formula-name-${threshold.id}`}>
                      {getFormulaName(threshold.formulaId)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={threshold.stage === "PRODUCTION" ? "default" : "secondary"}
                    data-testid={`badge-stage-${threshold.id}`}
                  >
                    {threshold.stage}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`text-min-loss-${threshold.id}`}>{threshold.minLossPercent}%</TableCell>
                <TableCell data-testid={`text-max-loss-${threshold.id}`}>{threshold.maxLossPercent}%</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={threshold.active
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-50 text-gray-500 border-gray-200"
                    }
                    data-testid={`badge-status-${threshold.id}`}
                  >
                    {threshold.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(threshold)}
                      data-testid={`button-edit-threshold-${threshold.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(threshold.id)}
                      data-testid={`button-delete-threshold-${threshold.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {thresholds.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground" data-testid="text-empty-state">
                  No loss thresholds configured yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-xs text-muted-foreground text-right" data-testid="text-threshold-count">
        {thresholds.length} threshold{thresholds.length !== 1 ? "s" : ""} configured
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Threshold" : "Create Threshold"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update the threshold configuration below." : "Define acceptable loss ranges for a stage."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div>
                <Label className="font-medium">Global Threshold</Label>
                <p className="text-xs text-muted-foreground">Applies to all formulas unless overridden.</p>
              </div>
              <Switch
                checked={formData.isGlobal}
                onCheckedChange={(checked) => setFormData({ ...formData, isGlobal: checked, formulaId: "" })}
                data-testid="switch-global"
              />
            </div>

            {!formData.isGlobal && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Formula</Label>
                <div className="col-span-3">
                  <SearchableSelect
                    options={formulaOptions}
                    value={formData.formulaId}
                    onValueChange={(val) => setFormData({ ...formData, formulaId: val })}
                    placeholder="Select formula..."
                    searchPlaceholder="Search formulas..."
                    emptyMessage="No formulas found."
                    data-testid="select-formula"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Stage</Label>
              <Select value={formData.stage} onValueChange={(val: "PRODUCTION" | "PACKOUT") => setFormData({ ...formData, stage: val })}>
                <SelectTrigger className="col-span-3" data-testid="select-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRODUCTION">Production</SelectItem>
                  <SelectItem value="PACKOUT">Packout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Min Loss %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.minLossPercent}
                onChange={(e) => setFormData({ ...formData, minLossPercent: e.target.value })}
                className="col-span-3"
                placeholder="e.g. 0.5"
                data-testid="input-min-loss"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Max Loss %</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.maxLossPercent}
                onChange={(e) => setFormData({ ...formData, maxLossPercent: e.target.value })}
                className="col-span-3"
                placeholder="e.g. 5.0"
                data-testid="input-max-loss"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Active</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                className="col-span-3"
                data-testid="switch-active"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-threshold"
            >
              {editingId ? "Update Threshold" : "Save Threshold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
