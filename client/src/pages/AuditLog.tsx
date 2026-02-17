import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText, Clock } from "lucide-react";
import { format } from "date-fns";

type AuditEvent = {
  id: number; timestamp: string; actorUserId: number; actorName: string;
  entityType: string; entityId: number; action: string;
  fieldName: string | null; oldValue: string | null; newValue: string | null;
  reason: string | null;
};

type User = { id: number; name: string; email: string; role: string; active: boolean };

const ENTITY_TYPES = [
  "intake", "line_item", "packout", "batch", "formula", "product", "carry_forward_request",
];

export default function AuditLog() {
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});

  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const buildQueryKey = () => {
    const params = new URLSearchParams();
    if (searchParams.entityType) params.set("entityType", searchParams.entityType);
    if (searchParams.action) params.set("action", searchParams.action);
    if (searchParams.userId) params.set("userId", searchParams.userId);
    if (searchParams.dateFrom) params.set("dateFrom", searchParams.dateFrom);
    if (searchParams.dateTo) params.set("dateTo", searchParams.dateTo);
    params.set("limit", "100");
    return `/api/events/search?${params.toString()}`;
  };

  const { data: events = [], isLoading } = useQuery<AuditEvent[]>({
    queryKey: [buildQueryKey()],
    enabled: Object.keys(searchParams).length > 0,
  });

  const handleSearch = () => {
    const params: Record<string, string> = {};
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    if (userId) params.userId = userId;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    setSearchParams(params);
  };

  const formatTimestamp = (ts: string) => {
    try {
      return format(new Date(ts), "dd MMM yyyy HH:mm:ss");
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-audit-log-title">Audit Log</h2>
          <p className="text-muted-foreground">View all system events and changes.</p>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Entity Type</label>
          <Select value={entityType} onValueChange={setEntityType} data-testid="select-entity-type">
            <SelectTrigger className="w-[180px]" data-testid="select-entity-type-trigger">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t} data-testid={`select-entity-type-${t}`}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Action</label>
          <Input
            placeholder="e.g. CREATE"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-[150px]"
            data-testid="input-action"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">User</label>
          <Select value={userId} onValueChange={setUserId} data-testid="select-user">
            <SelectTrigger className="w-[180px]" data-testid="select-user-trigger">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)} data-testid={`select-user-${u.id}`}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Date From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            data-testid="input-date-from"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Date To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
            data-testid="input-date-to"
          />
        </div>

        <Button onClick={handleSearch} data-testid="button-search">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="rounded-md border">
        <Table data-testid="table-audit-events">
          <TableHeader>
            <TableRow>
              <TableHead><Clock className="h-4 w-4 inline mr-1" />Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Field Changed</TableHead>
              <TableHead>Old → New Value</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground" data-testid="text-no-events">
                  {Object.keys(searchParams).length === 0 ? "Use the filters above to search for events." : "No events found."}
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="whitespace-nowrap text-sm" data-testid={`text-timestamp-${event.id}`}>
                    {formatTimestamp(event.timestamp)}
                  </TableCell>
                  <TableCell data-testid={`text-actor-${event.id}`}>{event.actorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-action-${event.id}`}>{event.action}</Badge>
                  </TableCell>
                  <TableCell data-testid={`text-entity-${event.id}`}>
                    {event.entityType} #{event.entityId}
                  </TableCell>
                  <TableCell data-testid={`text-field-${event.id}`}>
                    {event.fieldName || "—"}
                  </TableCell>
                  <TableCell data-testid={`text-values-${event.id}`}>
                    {event.oldValue || event.newValue ? (
                      <span>
                        <span className="text-red-600 line-through">{event.oldValue || "—"}</span>
                        {" → "}
                        <span className="text-green-600">{event.newValue || "—"}</span>
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell data-testid={`text-reason-${event.id}`}>
                    {event.reason || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
