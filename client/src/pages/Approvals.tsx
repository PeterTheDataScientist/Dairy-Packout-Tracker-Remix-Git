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
  proposedValue: string; currentValue: string | null; reason: string | null;
  requestedByUserId: number; requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedByAdminUserId: number | null; reviewedAt: string | null; adminComment: string | null;
};

type AuditEvent = {
  id: number; timestamp: string; actorUserId: number; entityType: string;
  entityId: number; action: string; fieldName: string | null;
  oldValue: string | null; newValue: string | null; reason: string | null;
};

type UserInfo = { id: number; name: string; email: string; role: string };

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const { data: requests = [] } = useQuery<ChangeRequest[]>({ queryKey: ["/api/change-requests"] });
  const { data: events = [] } = useQuery<AuditEvent[]>({ queryKey: ["/api/events"] });
  const { data: allUsers = [] } = useQuery<UserInfo[]>({ queryKey: ["/api/users"] });

  const getUserName = (userId: number) => allUsers.find(u => u.id === userId)?.name || `User #${userId}`;

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: number; status: string; comment: string }) => {
      const res = await apiRequest("PATCH", `/api/change-requests/${id}`, { status, adminComment: comment });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/intakes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/packouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/line-items"] });
      toast({ title: vars.status === "APPROVED" ? "Change Approved & Applied" : "Change Rejected" });
      setSelectedRequest(null);
      setAdminComment("");
    },
  });

  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  const formatEntityType = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Approvals & Audit</h2>
          <p className="text-muted-foreground">Review change requests and operational audit trail.</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-pending-count">
          {pendingCount} Pending Review
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Change Requests</CardTitle>
            <CardDescription>Queue of edit requests requiring admin authorization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requester</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedRequest(req); setAdminComment(""); }} data-testid={`row-request-${req.id}`}>
                    <TableCell className="text-xs">{getUserName(req.requestedByUserId)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-xs">{formatEntityType(req.entityType)} #{req.entityId}</div>
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
                      <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={req.reason || ""}>
                        {req.reason || "—"}
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
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); setAdminComment(""); }} data-testid={`button-review-${req.id}`}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No change requests yet.</TableCell>
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
                    {event.fieldName && (
                      <span className="text-xs text-muted-foreground">
                        {event.fieldName}: <span className="line-through">{event.oldValue || "—"}</span> → <span className="font-semibold">{event.newValue || "—"}</span>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{getUserName(event.actorUserId)}</span>
                    {event.reason && <span className="text-xs text-muted-foreground italic">"{event.reason}"</span>}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Change Request #{selectedRequest?.id}</DialogTitle>
            <DialogDescription>Review the proposed change before deciding.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Entity</label>
                  <div className="font-medium">{formatEntityType(selectedRequest.entityType)} #{selectedRequest.entityId}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Field</label>
                  <div className="font-medium">{selectedRequest.fieldName}</div>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase font-bold">Requested By</label>
                <div className="text-sm font-medium">{getUserName(selectedRequest.requestedByUserId)}</div>
                <div className="text-xs text-muted-foreground">{format(new Date(selectedRequest.requestedAt), "MMM d, yyyy h:mm a")}</div>
              </div>
              {selectedRequest.reason && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <label className="text-xs text-blue-700 dark:text-blue-300 uppercase font-bold">Reason for Change</label>
                  <div className="text-sm mt-1">{selectedRequest.reason}</div>
                </div>
              )}
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div className="text-xs text-muted-foreground uppercase font-bold mb-2">Before / After Diff</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-mono bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded line-through">{selectedRequest.currentValue || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Proposed:</span>
                  <span className="font-mono bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded font-bold">{selectedRequest.proposedValue}</span>
                </div>
              </div>
              {selectedRequest.status === "PENDING" && (
                <div className="space-y-2">
                  <Label>Admin Comment (optional)</Label>
                  <Input value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Reason for decision..." data-testid="input-admin-comment" />
                </div>
              )}
              {selectedRequest.status !== "PENDING" && selectedRequest.adminComment && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Admin Comment</label>
                  <div className="text-sm">{selectedRequest.adminComment}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedRequest?.status === "PENDING" ? (
              <>
                <Button variant="destructive" onClick={() => reviewMutation.mutate({ id: selectedRequest.id, status: "REJECTED", comment: adminComment })} disabled={reviewMutation.isPending} data-testid="button-reject-dialog">Reject</Button>
                <Button onClick={() => reviewMutation.mutate({ id: selectedRequest.id, status: "APPROVED", comment: adminComment })} disabled={reviewMutation.isPending} data-testid="button-approve-dialog">Approve & Apply</Button>
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
