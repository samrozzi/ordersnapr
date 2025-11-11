/**
 * Username Guard Component
 * Checks if user has username and prompts them to set one if not
 */

import { useEffect, useState } from 'react';
import { useHasUsername } from '@/hooks/use-username';
import { UsernamePrompt } from '@/components/UsernamePrompt';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

interface UsernameGuardProps {
  children: React.ReactNode;
}

export function UsernameGuard({ children }: UsernameGuardProps) {
  const { user } = useAuth();
  const { data: hasUsername, isLoading } = useHasUsername();
  const [userInfo, setUserInfo] = useState<{ email?: string; fullName?: string }>({});

  useEffect(() => {
    // Get user info for suggestions
    const fetchUserInfo = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserInfo({
            email: profile.email,
            fullName: profile.full_name,
          });
        }
      }
    };

    if (!isLoading && hasUsername === false && user) {
      fetchUserInfo();
    }
  }, [hasUsername, isLoading, user]);

  // Only show prompt if user is authenticated, not loading, and has no username
  const shouldShowPrompt = !!user && !isLoading && hasUsername === false;

  return (
    <>
      {children}
      <UsernamePrompt
        open={shouldShowPrompt}
        userEmail={userInfo.email}
        userFullName={userInfo.fullName}
      />
    </>
  );
}
