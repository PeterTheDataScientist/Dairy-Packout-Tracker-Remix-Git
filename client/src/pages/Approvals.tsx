import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

type ChangeRequest = {
  id: number; entityType: string; entityId: number; fieldName: string;
  proposedValue: string; currentValue: string | null;
  requestedByUserId: number; requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedByAdminUserId: number | null; reviewedAt: string | null; adminComment: string | null;
};

type AuditEvent = {
  id: number; timestamp: string; actorUserId: number; entityType: string;
  entityId: number; action: string; fieldName: string | null;
  oldValue: string | null; newValue: string | null; reason: string | null;
};

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const { data: requests = [] } = useQuery<ChangeRequest[]>({ queryKey: ["/api/change-requests"] });
  const { data: events = [] } = useQuery<AuditEvent[]>({ queryKey: ["/api/events"] });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/change-requests/${id}`, { status, adminComment: comment });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: vars.status === "APPROVED" ? "Change Approved" : "Change Rejected" });
      setSelectedRequest(null);
      setAdminComment("");
    },
  });

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Approvals & Audit</h2>
          <p className="text-muted-foreground">Review sensitive changes and operational overrides.</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-pending-count">
          {pendingCount} Pending Review
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Change Requests</CardTitle>
            <CardDescription>Queue of actions requiring admin authorization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(req)} data-testid={`row-request-${req.id}`}>
                    <TableCell>
                      <div className="font-medium">{req.entityType} #{req.entityId}</div>
                      <div className="text-xs text-muted-foreground">{req.fieldName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground line-through mr-2">{req.currentValue || "—"}</span>
                        <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                        <span className="font-bold text-primary">{req.proposedValue}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === "PENDING" ? "outline" : req.status === "APPROVED" ? "default" : "destructive"}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" && (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); reviewMutation.mutate({ id: req.id, status: "APPROVED", comment: "" }); }} data-testid={`button-approve-${req.id}`}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); reviewMutation.mutate({ id: req.id, status: "REJECTED", comment: "" }); }} data-testid={`button-reject-${req.id}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No change requests yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Log</CardTitle>
            <CardDescription>Immutable event ledger.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative border-l border-muted pl-4 space-y-6">
              {events.slice(0, 8).map((event) => (
                <div key={event.id} className="relative" data-testid={`event-${event.id}`}>
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/30 ring-4 ring-background" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {format(new Date(event.timestamp), "MMM d, h:mm a")}
                    </span>
                    <span className="text-sm font-medium">{event.action} {event.entityType}</span>
                    <span className="text-xs text-muted-foreground">User #{event.actorUserId}</span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-sm text-muted-foreground">No events recorded yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setAdminComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Change Request</DialogTitle>
            <DialogDescription>Review details before approving.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Entity</label>
                  <div className="font-medium">{selectedRequest.entityType} #{selectedRequest.entityId}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Field</label>
                  <div className="font-medium">{selectedRequest.fieldName}</div>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Value:</span>
                  <span className="font-mono line-through opacity-50">{selectedRequest.currentValue || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Proposed Value:</span>
                  <span className="font-mono font-bold text-primary">{selectedRequest.proposedValue}</span>
                </div>
              </div>
              {selectedRequest.status === "PENDING" && (
                <div className="space-y-2">
                  <Label>Admin Comment (optional)</Label>
                  <Input value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Reason for decision..." data-testid="input-admin-comment" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "PENDING" ? (
              <>
                <Button variant="outline" onClick={() => reviewMutation.mutate({ id: selectedRequest.id, status: "REJECTED", comment: adminComment })} data-testid="button-reject-dialog">Reject</Button>
                <Button onClick={() => reviewMutation.mutate({ id: selectedRequest.id, status: "APPROVED", comment: adminComment })} data-testid="button-approve-dialog">Approve Change</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
