import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/use-notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Check,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notification } from "@/hooks/use-notifications";

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsRead()}
              className="h-8 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = iconMap[notification.type];
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-accent/50 transition-colors cursor-pointer group relative",
                      !notification.is_read && "bg-accent/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-0.5", colorMap[notification.type])}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAllRead()}
                className="w-full text-xs"
              >
                <Trash2 className="mr-2 h-3 w-3" />
                Clear read notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
