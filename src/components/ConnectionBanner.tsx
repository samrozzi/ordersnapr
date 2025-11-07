import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, CloudOff, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getPendingSyncCount, processSyncQueue } from '@/lib/sync-queue';
import { toast } from 'sonner';

export function ConnectionBanner() {
  const { isOnline, lastOnline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const syncWhenOnline = async () => {
      if (isOnline && pendingCount > 0 && !isSyncing) {
        setIsSyncing(true);
        try {
          const results = await processSyncQueue();
          
          if (results.successful > 0) {
            toast.success(`Synced ${results.successful} change${results.successful > 1 ? 's' : ''} to cloud`);
          }
          
          if (results.failed > 0) {
            toast.error(`Failed to sync ${results.failed} change${results.failed > 1 ? 's' : ''}`);
          }
          
          const count = await getPendingSyncCount();
          setPendingCount(count);
        } catch (error) {
          console.error('Sync error:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncWhenOnline();
  }, [isOnline, pendingCount, isSyncing]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50">
      {!isOnline && (
        <Alert variant="default" className="rounded-none border-x-0 border-t-0 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-800 dark:text-yellow-400">Working Offline</AlertTitle>
          <AlertDescription className="text-yellow-700 dark:text-yellow-500">
            Your changes are being saved locally and will sync when connection returns.
            {lastOnline && ` Last online: ${formatDistanceToNow(lastOnline, { addSuffix: true })}`}
          </AlertDescription>
        </Alert>
      )}

      {isOnline && pendingCount > 0 && (
        <Alert variant="default" className="rounded-none border-x-0 border-t-0 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          {isSyncing ? (
            <CloudOff className="h-4 w-4 text-blue-600 dark:text-blue-500 animate-pulse" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          )}
          <AlertTitle className="text-blue-800 dark:text-blue-400">
            {isSyncing ? 'Syncing...' : 'Sync Pending'}
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-500">
            {isSyncing 
              ? `Uploading ${pendingCount} change${pendingCount > 1 ? 's' : ''} to cloud...`
              : `${pendingCount} change${pendingCount > 1 ? 's' : ''} waiting to sync`
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
