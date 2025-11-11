/**
 * Username Management Hooks
 * Handles username validation, availability checking, and setting
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  UsernameValidationResult,
  UsernameAvailabilityResult,
  SetUsernameResult,
} from '@/lib/collaboration-types';

// ============================================================================
// Username Validation
// ============================================================================

/**
 * Validates username format client-side
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 30) {
    return { isValid: false, error: 'Username must be at most 30 characters' };
  }

  if (!/^[a-zA-Z0-9]/.test(username)) {
    return { isValid: false, error: 'Username must start with a letter or number' };
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,29}$/.test(username)) {
    return {
      isValid: false,
      error: 'Username can only contain letters, numbers, underscores, and hyphens',
    };
  }

  return { isValid: true };
}

// ============================================================================
// Check Username Availability
// ============================================================================

/**
 * Hook to check if a username is available
 */
export function useUsernameAvailability(username: string) {
  return useQuery({
    queryKey: ['username-availability', username],
    queryFn: async (): Promise<UsernameAvailabilityResult> => {
      if (!username || username.length < 3) {
        return { available: false };
      }

      console.log('[DEBUG] Checking availability for username:', username);

      const { data, error } = await supabase.rpc('is_username_available', {
        check_username: username,
      });

      console.log('[DEBUG] RPC response - data:', data, 'error:', error);

      if (error) {
        console.error('Error checking username availability:', error);
        return { available: false };
      }

      console.log('[DEBUG] Returning availability:', data);
      // Parse JSON response from database function
      const result = data as { available: boolean };
      return { available: result.available };
    },
    enabled: username.length >= 3,
    staleTime: 0, // Disable caching to always fetch fresh data
    cacheTime: 0, // Don't cache results
  });
}

// ============================================================================
// Set Username
// ============================================================================

/**
 * Hook to set/update user's username
 */
export function useSetUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (username: string): Promise<SetUsernameResult> => {
      console.log('[useSetUsername] Setting username:', username);
      
      // Client-side validation
      const validation = validateUsername(username);
      if (!validation.isValid) {
        console.log('[useSetUsername] Validation failed:', validation.error);
        return { success: false, error: validation.error };
      }

      // Call server function to set username
      const { data, error } = await supabase.rpc('set_username', {
        new_username: username,
      });

      if (error) {
        console.error('[useSetUsername] Error setting username:', error);
        return { success: false, error: error.message };
      }

      console.log('[useSetUsername] RPC response:', data);
      return data as SetUsernameResult;
    },
    onSuccess: (result) => {
      console.log('[useSetUsername] Mutation success:', result);
      if (result.success) {
        console.log('[useSetUsername] Invalidating queries...');
        // Invalidate user profile queries
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['user-has-username'] });
      }
    },
  });
}

// ============================================================================
// Check if Current User Has Username
// ============================================================================

/**
 * Hook to check if current user has set a username
 */
export function useHasUsername() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return useQuery({
    queryKey: ['user-has-username', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) {
        console.log('[useHasUsername] No user ID available');
        return false;
      }

      console.log('[useHasUsername] Checking username for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[useHasUsername] Error checking username:', error);
        return false;
      }

      const hasUsername = !!data?.username;
      console.log('[useHasUsername] Username from DB:', data?.username, 'Has username:', hasUsername);
      
      return hasUsername;
    },
    enabled: !!userId, // Only run when we have a user ID
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });
}

// ============================================================================
// Generate Username Suggestions
// ============================================================================

/**
 * Generate username suggestions based on user's name or email
 */
export async function generateUsernameSuggestions(
  fullName?: string,
  email?: string
): Promise<string[]> {
  const suggestions: string[] = [];

  // From full name
  if (fullName) {
    const nameParts = fullName.toLowerCase().split(' ').filter(Boolean);
    if (nameParts.length >= 2) {
      // firstname_lastname
      suggestions.push(nameParts.join('_'));
      // firstnamelastname
      suggestions.push(nameParts.join(''));
      // firstname.lastname
      suggestions.push(nameParts.join('.'));
      // first initial + lastname
      suggestions.push(nameParts[0][0] + nameParts[nameParts.length - 1]);
    } else if (nameParts.length === 1) {
      suggestions.push(nameParts[0]);
    }
  }

  // From email
  if (email) {
    const emailUsername = email.split('@')[0].toLowerCase();
    suggestions.push(emailUsername);
    // Remove dots and underscores
    suggestions.push(emailUsername.replace(/[._]/g, ''));
  }

  // Add random numbers to make unique
  const baseSuggestions = [...new Set(suggestions)].slice(0, 3);
  const withNumbers = baseSuggestions.flatMap((base) => [
    base,
    `${base}${Math.floor(Math.random() * 100)}`,
    `${base}${Math.floor(Math.random() * 1000)}`,
  ]);

  // Clean up suggestions - remove invalid characters, ensure valid length
  const cleanSuggestions = withNumbers
    .map((s) => s.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter((s) => s.length >= 3 && s.length <= 30)
    .filter((s) => /^[a-zA-Z0-9]/.test(s));

  // Check availability and return only available ones
  const availableChecks = await Promise.all(
    cleanSuggestions.slice(0, 6).map(async (username) => {
      const { data } = await supabase.rpc('is_username_available', {
        check_username: username,
      });
      const result = data as { available: boolean };
      return { username, available: result.available };
    })
  );

  return availableChecks
    .filter((check) => check.available)
    .map((check) => check.username)
    .slice(0, 3);
}
