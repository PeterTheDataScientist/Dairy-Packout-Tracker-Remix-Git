import { useStore, ProductionLineItem } from "@/lib/mockStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyHistory() {
  const { productionLog, products } = useStore();
  const { toast } = useToast();

  const getProductName = (id?: string) => products.find(p => p.id === id)?.name || id;
  const getProductUnit = (id?: string) => products.find(p => p.id === id)?.unitType || '';

  const handleEdit = (id: string) => {
    toast({
      title: "Change Request Created",
      description: `Edit request for Batch ${id} submitted to Admin.`,
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

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Batch Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Output</TableHead>
              <TableHead>Variance</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productionLog.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium font-mono text-xs">{log.batchCode}</TableCell>
                <TableCell>{log.date}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.operationType}</Badge>
                </TableCell>
                <TableCell>
                  {log.outputQty} {getProductUnit(log.outputProductId)} <span className="text-xs text-muted-foreground">({getProductName(log.outputProductId)})</span>
                </TableCell>
                <TableCell>
                  {log.variance ? (
                     <span className={Math.abs(log.variance) > 5 ? "text-destructive font-bold" : "text-emerald-600"}>
                       {log.variance > 0 ? '+' : ''}{log.variance.toFixed(1)}%
                     </span>
                  ) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(log.batchCode)}>
                    <Edit2 className="h-3 w-3 mr-2" /> Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
