import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity } from "lucide-react";
import { format } from "date-fns";

type UserActivity = {
  id: number; name: string; email: string; role: string; active: boolean;
  intakesCreated: number; batchesCreated: number; packoutsCreated: number;
  totalRecords: number; totalEvents: number; lastActivity: string | null;
};

const today = () => format(new Date(), "yyyy-MM-dd");

export default function ActivityLog() {
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const { data: activities = [], isLoading } = useQuery<UserActivity[]>({
    queryKey: [`/api/reports/activity-log?dateFrom=${dateFrom}&dateTo=${dateTo}`],
  });

  const sorted = [...activities].sort((a, b) => b.totalRecords - a.totalRecords);

  const formatLastActivity = (ts: string | null) => {
    if (!ts) return "Never";
    try {
      return format(new Date(ts), "dd MMM yyyy HH:mm");
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-activity-log-title">Activity Log</h2>
          <p className="text-muted-foreground">User activity summary for the selected date range.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[180px]"
                data-testid="input-date-from"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[180px]"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table data-testid="table-activity-log">
          <TableHeader>
            <TableRow>
              <TableHead>User Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Intakes Created</TableHead>
              <TableHead className="text-right">Batches Created</TableHead>
              <TableHead className="text-right">Packouts Created</TableHead>
              <TableHead className="text-right">Total Records</TableHead>
              <TableHead>Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
                  No activity found for the selected date range.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-role-${user.id}`}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.active ? "default" : "secondary"}
                      data-testid={`badge-status-${user.id}`}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" data-testid={`text-intakes-${user.id}`}>{user.intakesCreated}</TableCell>
                  <TableCell className="text-right" data-testid={`text-batches-${user.id}`}>{user.batchesCreated}</TableCell>
                  <TableCell className="text-right" data-testid={`text-packouts-${user.id}`}>{user.packoutsCreated}</TableCell>
                  <TableCell className="text-right font-semibold" data-testid={`text-total-${user.id}`}>{user.totalRecords}</TableCell>
                  <TableCell data-testid={`text-last-active-${user.id}`}>{formatLastActivity(user.lastActivity)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
