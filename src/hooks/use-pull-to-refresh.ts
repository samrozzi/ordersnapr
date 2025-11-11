/**
 * usePullToRefresh Hook
 *
 * Implements pull-to-refresh gesture for mobile devices
 */

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxDistance?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxDistance = 120,
  enabled = true,
}: UsePullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let rafId: number;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if at top of page
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        setIsPulling(false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === 0) return;
      if (isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only pull down
      if (diff > 0 && window.scrollY === 0) {
        setIsPulling(true);

        // Prevent default scroll while pulling
        if (diff > 10) {
          e.preventDefault();
        }

        // Apply resistance to make it feel more natural
        const distance = Math.min(
          diff * 0.5,  // 50% resistance
          maxDistance
        );

        rafId = requestAnimationFrame(() => {
          setPullDistance(distance);
        });
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) {
        startY.current = 0;
        return;
      }

      const shouldRefresh = pullDistance >= threshold;

      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
            setIsPulling(false);
            startY.current = 0;
          }, 500);
        }
      } else {
        // Animate back to 0
        setPullDistance(0);
        setIsPulling(false);
        startY.current = 0;
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [enabled, onRefresh, threshold, maxDistance, isRefreshing, isPulling, pullDistance]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  };
}
