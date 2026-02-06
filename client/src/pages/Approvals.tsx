import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Mock Change Requests since we focused on Formula/Production in the store
const MOCK_REQUESTS = [
  { id: 'cr1', entity: 'Formula', entityName: 'Yogurt Base v1', action: 'UPDATE', field: 'Ratio', oldValue: '0.95', newValue: '0.96', user: 'Bob Brewer', date: '2023-10-26', status: 'PENDING' },
  { id: 'cr2', entity: 'Product', entityName: 'Strawberry Puree', action: 'UPDATE', field: 'Unit Cost', oldValue: '$2.50', newValue: '$2.80', user: 'Bob Brewer', date: '2023-10-26', status: 'PENDING' },
  { id: 'cr3', entity: 'Production', entityName: 'Batch B-20231025-001', action: 'EDIT_RECORD', field: 'Output Qty', oldValue: '500', newValue: '505', user: 'Bob Brewer', date: '2023-10-25', status: 'APPROVED' },
];

export default function Approvals() {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const { toast } = useToast();

  const handleAction = (id: string, action: 'APPROVED' | 'REJECTED') => {
    setRequests(requests.map(r => r.id === id ? { ...r, status: action } : r));
    setSelectedRequest(null);
    toast({ 
      title: action === 'APPROVED' ? "Change Approved" : "Change Rejected", 
      description: `Request ${id} has been processed.` 
    });
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Approvals & Audit</h2>
          <p className="text-muted-foreground">Review sensitive changes and operational overrides.</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
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
                  <TableHead>Requested By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedRequest(req)}>
                    <TableCell>
                      <div className="font-medium">{req.entityName}</div>
                      <div className="text-xs text-muted-foreground">{req.entity}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground line-through mr-2">{req.oldValue}</span>
                        <ArrowRightIcon className="inline h-3 w-3 mx-1 text-muted-foreground" />
                        <span className="font-bold text-primary">{req.newValue}</span>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">{req.field.toLowerCase()}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{req.user}</div>
                      <div className="text-xs text-muted-foreground">{req.date}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === 'PENDING' ? 'outline' : req.status === 'APPROVED' ? 'default' : 'destructive'}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'PENDING' && (
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); handleAction(req.id, 'APPROVED'); }}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleAction(req.id, 'REJECTED'); }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
              {[1,2,3,4,5].map((i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/30 ring-4 ring-background" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-muted-foreground">Today, 10:{30 + i} AM</span>
                    <span className="text-sm font-medium">Production Batch Created</span>
                    <span className="text-xs text-muted-foreground">User: Alice Admin • IP: 192.168.1.1</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
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
                  <div className="font-medium">{selectedRequest.entityName}</div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-bold">Requested By</label>
                  <div className="font-medium">{selectedRequest.user}</div>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-3">
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Field:</span>
                   <span className="font-mono">{selectedRequest.field}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Current Value:</span>
                   <span className="font-mono line-through opacity-50">{selectedRequest.oldValue}</span>
                 </div>
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-muted-foreground">Proposed Value:</span>
                   <span className="font-mono font-bold text-primary">{selectedRequest.newValue}</span>
                 </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAction(selectedRequest.id, 'REJECTED')}>Reject</Button>
            <Button onClick={() => handleAction(selectedRequest.id, 'APPROVED')}>Approve Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ArrowRightIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
