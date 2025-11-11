/**
 * OfflineIndicator Component
 *
 * Shows a banner when the app is offline and displays sync status
 */

import { useOnlineStatus } from '@/hooks/use-online-status';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, lastOnline } = useOnlineStatus();

  if (isOnline) return null;

  const getOfflineDuration = () => {
    if (!lastOnline) return 'Just now';

    const now = new Date();
    const diff = now.getTime() - lastOnline.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top">
      <Alert
        variant="destructive"
        className={cn(
          "rounded-none border-x-0 border-t-0",
          "bg-orange-500 text-white border-orange-600"
        )}
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-2">
            <span className="font-medium">You're offline</span>
            <span className="text-xs opacity-90">
              • Last online {getOfflineDuration()}
            </span>
          </AlertDescription>
        </div>
      </Alert>
    </div>
  );
}

interface OnlineStatusBadgeProps {
  className?: string;
}

export function OnlineStatusBadge({ className }: OnlineStatusBadgeProps) {
  const { isOnline } = useOnlineStatus();

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      {isOnline ? (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">Online</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-muted-foreground">Offline</span>
        </>
      )}
    </div>
  );
}
