import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowRight, TrendingDown, Bell, CheckCheck, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

type Notification = {
  id: number;
  type: "THRESHOLD_BREACH" | "CARRY_FORWARD_REQUEST" | "UNUSUAL_LOSS";
  title: string;
  message: string;
  entityType: string | null;
  entityId: number | null;
  severity: string;
  isRead: boolean;
  createdAt: string;
  metadata: any;
};

type NotificationCount = { count: number };

const typeIcons: Record<Notification["type"], typeof AlertTriangle> = {
  THRESHOLD_BREACH: AlertTriangle,
  CARRY_FORWARD_REQUEST: ArrowRight,
  UNUSUAL_LOSS: TrendingDown,
};

const typeLabels: Record<Notification["type"], string> = {
  THRESHOLD_BREACH: "Threshold Breach",
  CARRY_FORWARD_REQUEST: "Carry-Forward Request",
  UNUSUAL_LOSS: "Unusual Loss",
};

function getSeverityClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-800";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "info":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
}

function getIconBgClasses(severity: string) {
  switch (severity.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400";
    case "warning":
      return "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400";
    case "info":
    default:
      return "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400";
  }
}

export default function Notifications() {
  const { toast } = useToast();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const { data: countData } = useQuery<NotificationCount>({
    queryKey: ["/api/notifications/count"],
  });

  const unreadCount = countData?.count ?? notifications.filter((n) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/notifications/${id}/read`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      toast({ title: "Notification marked as read" });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/notifications/mark-all-read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, "MMM d, yyyy h:mm a");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">System alerts, threshold breaches, and operational notifications.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-unread-count">
            {unreadCount} Unread
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            data-testid="button-mark-all-read"
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notification) => {
          const Icon = typeIcons[notification.type];
          return (
            <Card
              key={notification.id}
              className={`transition-all duration-200 ${
                !notification.isRead
                  ? "border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10"
                  : "opacity-75"
              }`}
              data-testid={`card-notification-${notification.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${getIconBgClasses(notification.severity)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm" data-testid={`text-title-${notification.id}`}>
                        {notification.title}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 uppercase font-bold tracking-wider border ${getSeverityClasses(notification.severity)}`}
                        data-testid={`badge-severity-${notification.id}`}
                      >
                        {notification.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {typeLabels[notification.type]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-message-${notification.id}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 pt-1">
                      <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${notification.id}`}>
                        {formatTimestamp(notification.createdAt)}
                      </span>
                      {notification.entityType && notification.entityId && (
                        <span className="text-xs text-muted-foreground">
                          {notification.entityType.replace(/_/g, " ")} #{notification.entityId}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => markReadMutation.mutate(notification.id)}
                        disabled={markReadMutation.isPending}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark Read
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {notifications.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground max-w-sm" data-testid="text-empty-state">
                You're all caught up. Notifications for threshold breaches, carry-forward requests, and unusual losses will appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
