import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Ruler } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type CustomUnit = { id: number; name: string; abbreviation: string; active: boolean };

export default function CustomUnits() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CustomUnit | null>(null);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");

  const { data: units = [] } = useQuery<CustomUnit[]>({ queryKey: ["/api/custom-units"] });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; abbreviation: string }) => {
      const res = await apiRequest("POST", "/api/custom-units", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-units"] });
      toast({ title: "Unit Created", description: `${name} (${abbreviation}) has been added.` });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; abbreviation?: string; active?: boolean }) => {
      const res = await apiRequest("PATCH", `/api/custom-units/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-units"] });
      toast({ title: "Unit Updated" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingUnit(null);
    setName("");
    setAbbreviation("");
  };

  const openEdit = (unit: CustomUnit) => {
    setEditingUnit(unit);
    setName(unit.name);
    setAbbreviation(unit.abbreviation);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || !abbreviation.trim()) return;
    if (editingUnit) {
      updateMutation.mutate({ id: editingUnit.id, name: name.trim(), abbreviation: abbreviation.trim() });
    } else {
      createMutation.mutate({ name: name.trim(), abbreviation: abbreviation.trim() });
    }
  };

  const toggleActive = (unit: CustomUnit) => {
    updateMutation.mutate({ id: unit.id, active: !unit.active });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-custom-units-title">Custom Units</h2>
          <p className="text-muted-foreground">Add custom units of measure for products beyond the defaults (Litres, Kilograms, Units).</p>
        </div>
        <Button onClick={() => { closeDialog(); setIsDialogOpen(true); }} className="gap-2" data-testid="button-add-unit">
          <Plus className="h-4 w-4" /> Add Unit
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Abbreviation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-blue-50/50 dark:bg-blue-900/10">
              <TableCell className="font-medium">Litre</TableCell>
              <TableCell><Badge variant="outline">L</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">System Default</Badge></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="bg-blue-50/50 dark:bg-blue-900/10">
              <TableCell className="font-medium">Kilogram</TableCell>
              <TableCell><Badge variant="outline">kg</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">System Default</Badge></TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow className="bg-blue-50/50 dark:bg-blue-900/10">
              <TableCell className="font-medium">Unit</TableCell>
              <TableCell><Badge variant="outline">unit</Badge></TableCell>
              <TableCell><Badge variant="secondary" className="text-xs">System Default</Badge></TableCell>
              <TableCell></TableCell>
            </TableRow>
            {units.map((unit) => (
              <TableRow key={unit.id} data-testid={`row-unit-${unit.id}`}>
                <TableCell className="font-medium">{unit.name}</TableCell>
                <TableCell><Badge variant="outline">{unit.abbreviation}</Badge></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={unit.active}
                      onCheckedChange={() => toggleActive(unit)}
                      data-testid={`switch-unit-active-${unit.id}`}
                    />
                    <span className="text-xs text-muted-foreground">{unit.active ? "Active" : "Inactive"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(unit)} data-testid={`button-edit-unit-${unit.id}`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {units.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No custom units added yet. The three default units above are always available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5" />
              {editingUnit ? "Edit Unit" : "Add Custom Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingUnit ? "Update this unit of measure." : "Define a new unit of measure for your products."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unit Name</Label>
              <Input
                placeholder="e.g. Gallon, Cup, Sachet"
                value={name}
                onChange={e => setName(e.target.value)}
                data-testid="input-unit-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Abbreviation</Label>
              <Input
                placeholder="e.g. gal, cup, sach"
                value={abbreviation}
                onChange={e => setAbbreviation(e.target.value)}
                data-testid="input-unit-abbreviation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !abbreviation.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-unit"
            >
              {editingUnit ? "Update" : "Add Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
