/**
 * usePWAUpdate Hook
 *
 * Manages PWA service worker updates and provides update functionality
 */

import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const {
    needRefresh: [swNeedRefresh, setSwNeedRefresh],
    offlineReady: [swOfflineReady, setSwOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);

      // Check for updates every hour
      setInterval(() => {
        registration?.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    setNeedRefresh(swNeedRefresh);
  }, [swNeedRefresh]);

  useEffect(() => {
    setOfflineReady(swOfflineReady);
  }, [swOfflineReady]);

  const updateApp = async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
  };

  const dismissUpdate = () => {
    setSwNeedRefresh(false);
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateApp,
    dismissUpdate,
  };
}
