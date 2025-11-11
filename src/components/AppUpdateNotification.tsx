/**
 * AppUpdateNotification Component
 *
 * Notifies users when a new app version is available and allows them to update
 */

import { usePWAUpdate } from '@/hooks/use-pwa-update';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export function AppUpdateNotification() {
  const { needRefresh, offlineReady, updateApp, dismissUpdate } = usePWAUpdate();

  const handleUpdate = async () => {
    try {
      await updateApp();
      toast.success('App updated successfully! Refreshing...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Failed to update app:', error);
      toast.error('Failed to update app. Please refresh manually.');
    }
  };

  // Show offline ready message
  if (offlineReady && !needRefresh) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom">
        <Alert className="relative border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-900 dark:text-green-100">
            App ready to work offline!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            OrderSnapr is now available offline.
          </AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={dismissUpdate}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      </div>
    );
  }

  // Show update available message
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom">
        <Alert className="relative border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertTitle className="text-blue-900 dark:text-blue-100">
            New version available!
          </AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-300 space-y-3">
            <p>A new version of OrderSnapr is ready to install.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Update Now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismissUpdate}
              >
                Later
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
