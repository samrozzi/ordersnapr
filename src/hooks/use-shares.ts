/**
 * Shares Hooks
 * Handle sharing entities to OrderSnapr users
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveOrg } from '@/hooks/use-active-org';
import type { Share, CreateShareInput, ShareToUserInput } from '@/lib/collaboration-types';

// ============================================================================
// Get Shares
// ============================================================================

/**
 * Hook to get shares received by current user
 */
export function useReceivedShares() {
  return useQuery({
    queryKey: ['received-shares'],
    queryFn: async (): Promise<Share[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('shares')
        .select('id, created_at, entity_id, entity_type, permission_level, shared_by, shared_with')
        .eq('shared_with', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching received shares:', error);
        return [];
      }

      return (data as any[]) || [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to get shares sent by current user
 */
export function useSentShares() {
  return useQuery({
    queryKey: ['sent-shares'],
    queryFn: async (): Promise<Share[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('shares')
        .select('id, created_at, entity_id, entity_type, permission_level, shared_by, shared_with')
        .eq('shared_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching sent shares:', error);
        return [];
      }

      return (data as any[]) || [];
    },
  });
}

/**
 * Hook to get unread shares count
 */
export function useUnreadSharesCount() {
  return useQuery({
    queryKey: ['unread-shares-count'],
    queryFn: async (): Promise<number> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return 0;
      }

      // Note: This RPC function doesn't exist in schema, returning 0
      return 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// ============================================================================
// Create Share
// ============================================================================

/**
 * Hook to share an entity with multiple users
 */
export function useShareToUsers() {
  const queryClient = useQueryClient();
  const { activeOrg } = useActiveOrg();

  return useMutation({
    mutationFn: async (input: ShareToUserInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!activeOrg) {
        throw new Error('No active organization');
      }

      // Create a share for each recipient
      const shares = input.recipient_ids.map((recipientId) => ({
        shared_by: user.id,
        shared_with: recipientId,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
      }));

      const { data, error } = await supabase.from('shares').insert(shares).select();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-shares'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

/**
 * Hook to mark a share as read
 */
export function useMarkShareRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shareId: string) => {
      // Note: read_at field doesn't exist in current schema
      // This would need to be added via migration
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-shares'] });
      queryClient.invalidateQueries({ queryKey: ['unread-shares-count'] });
    },
  });
}
