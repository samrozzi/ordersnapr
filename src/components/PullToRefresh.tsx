/**
 * PullToRefresh Component
 *
 * Displays pull-to-refresh indicator for mobile devices
 */

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, enabled = true, threshold = 80 }: PullToRefreshProps) {
  const { isPulling, isRefreshing, pullDistance, pullProgress } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled,
  });

  // Only show on mobile devices
  if (!('ontouchstart' in window)) {
    return null;
  }

  const shouldShow = isPulling || isRefreshing;
  const opacity = Math.min(pullProgress, 1);

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 flex items-center justify-center transition-all",
        "pointer-events-none"
      )}
      style={{
        height: `${pullDistance}px`,
        opacity,
      }}
    >
      <div className="bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
        <RefreshCw
          className={cn(
            "h-6 w-6 text-primary transition-transform",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? '' : `rotate(${pullProgress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
