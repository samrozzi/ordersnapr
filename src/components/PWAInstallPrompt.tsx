/**
 * PWAInstallPrompt Component
 *
 * Displays installation prompt for PWA with platform-specific instructions
 */

import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, X, Share, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PWAInstallPrompt() {
  const { shouldShowPrompt, isIOS, promptInstall, dismissInstallPrompt } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Show prompt after 3 seconds if applicable
    if (shouldShowPrompt) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [shouldShowPrompt]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setIsVisible(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  if (!isVisible) return null;

  // Minimized floating button
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
        aria-label="Open install prompt"
      >
        <Download className="h-6 w-6" />
      </button>
    );
  }

  // Full prompt card
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom",
      "md:bottom-4 md:left-auto md:right-4 md:max-w-sm"
    )}>
      <Card className="shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Install OrderSnapr</CardTitle>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={handleMinimize}>
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Install our app for a better mobile experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isIOS ? (
            // iOS installation instructions
            <div className="space-y-2 text-sm">
              <p className="font-medium">To install on iOS:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span>1.</span>
                  <span>Tap the share button <Share className="h-4 w-4 inline" /> in Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>2.</span>
                  <span>Scroll down and tap "Add to Home Screen"</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>3.</span>
                  <span>Tap "Add" in the top right corner</span>
                </li>
              </ol>
            </div>
          ) : (
            // Android/Desktop installation
            <div className="space-y-3">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Work offline</li>
                <li>✓ Faster loading times</li>
                <li>✓ Home screen access</li>
                <li>✓ Native app experience</li>
              </ul>
              <Button onClick={handleInstall} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="w-full text-xs"
          >
            Maybe later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
