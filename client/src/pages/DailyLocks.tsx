import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock, Unlock, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type DailyLock = {
  id: number;
  date: string;
  lockedByUserId: number;
  lockedAt: string;
};

export default function DailyLocks() {
  const { toast } = useToast();
  const [dateInput, setDateInput] = useState("");
  const [unlockDate, setUnlockDate] = useState<string | null>(null);

  const { data: locks = [] } = useQuery<DailyLock[]>({
    queryKey: ["/api/daily-locks"],
  });

  const lockMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiRequest("POST", "/api/daily-locks", { date });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-locks"] });
      toast({ title: "Day locked", description: `${dateInput} has been locked.` });
      setDateInput("");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (date: string) => {
      await apiRequest("DELETE", `/api/daily-locks/${date}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-locks"] });
      toast({ title: "Day unlocked", description: "The day has been unlocked." });
      setUnlockDate(null);
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setUnlockDate(null);
    },
  });

  const handleLock = () => {
    if (!dateInput) return;
    lockMutation.mutate(dateInput);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T00:00:00"), "EEEE, MMMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      return format(new Date(ts), "MMM d, yyyy h:mm a");
    } catch {
      return ts;
    }
  };

  const sortedLocks = [...locks].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" data-testid="text-daily-locks-title">Daily Locks</h2>
        <p className="text-muted-foreground" data-testid="text-daily-locks-description">
          Lock completed days to prevent further changes. Locked days require a Change Request to modify.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Lock a Day</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="grid gap-2">
              <Label htmlFor="lock-date">Date</Label>
              <Input
                id="lock-date"
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                data-testid="input-lock-date"
              />
            </div>
            <Button
              onClick={handleLock}
              disabled={!dateInput || lockMutation.isPending}
              className="gap-2"
              data-testid="button-lock-day"
            >
              <Lock className="h-4 w-4" /> Lock
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Locked By</TableHead>
              <TableHead>Locked At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLocks.map((lock) => (
              <TableRow key={lock.id} data-testid={`row-lock-${lock.id}`}>
                <TableCell>
                  <Badge variant="secondary" className="gap-1" data-testid={`badge-locked-${lock.id}`}>
                    <Lock className="h-3 w-3" /> Locked
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium" data-testid={`text-lock-date-${lock.id}`}>
                    {formatDate(lock.date)}
                  </div>
                </TableCell>
                <TableCell data-testid={`text-lock-user-${lock.id}`}>
                  User #{lock.lockedByUserId}
                </TableCell>
                <TableCell data-testid={`text-lock-timestamp-${lock.id}`}>
                  {formatTimestamp(lock.lockedAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => setUnlockDate(lock.date)}
                    data-testid={`button-unlock-${lock.id}`}
                  >
                    <Unlock className="h-4 w-4" /> Unlock
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {sortedLocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground" data-testid="text-no-locks">
                  No days are currently locked.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!unlockDate} onOpenChange={(open) => !open && setUnlockDate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock this day?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock {unlockDate ? formatDate(unlockDate) : "this day"}? 
              This will allow users to modify data for this date without a Change Request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-unlock">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unlockDate && unlockMutation.mutate(unlockDate)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-unlock"
            >
              <Trash2 className="h-4 w-4 mr-2" /> Unlock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
