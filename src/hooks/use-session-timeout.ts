import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours

export const useSessionTimeout = (session: Session | null) => {
  useEffect(() => {
    if (!session) return;

    const SESSION_START_KEY = 'session_start_time';

    const checkSessionTimeout = () => {
      // Get or set session start time
      let sessionStartTime = localStorage.getItem(SESSION_START_KEY);
      
      if (!sessionStartTime) {
        // First time seeing this session, store the current time
        sessionStartTime = Date.now().toString();
        localStorage.setItem(SESSION_START_KEY, sessionStartTime);
      }
      
      const now = Date.now();
      const sessionStart = parseInt(sessionStartTime);
      
      if (now - sessionStart > SESSION_TIMEOUT_MS) {
        console.log('Session expired after 6 hours, logging out...');
        localStorage.removeItem(SESSION_START_KEY);
        supabase.auth.signOut();
      }
    };

    // Check immediately
    checkSessionTimeout();

    // Check every minute
    const interval = setInterval(checkSessionTimeout, 60000);

    return () => clearInterval(interval);
  }, [session]);

  // Clean up session start time on logout
  useEffect(() => {
    if (!session) {
      localStorage.removeItem('session_start_time');
    }
  }, [session]);
};
