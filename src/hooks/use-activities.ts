/**
 * Activity Feed Hooks
 * Manage team activity feed and notifications
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveOrg } from '@/hooks/use-active-org';
import type { Activity } from '@/lib/collaboration-types';

// ============================================================================
// Activity Feed
// ============================================================================

/**
 * Hook to get recent activities for the organization
 */
export function useActivities(limit: number = 50) {
  const { activeOrg } = useActiveOrg();

  return useQuery({
    queryKey: ['activities', activeOrg?.id, limit],
    queryFn: async (): Promise<Activity[]> => {
      if (!activeOrg?.id) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_recent_activities', {
        org_id: activeOrg.id,
        limit_count: limit,
      });

      if (error) {
        console.error('Error fetching activities:', error);
        return [];
      }

      return (data as Activity[]) || [];
    },
    enabled: !!activeOrg?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to get activities for a specific entity
 */
export function useEntityActivities(entityType: string, entityId: string) {
  const { activeOrg } = useActiveOrg();

  return useQuery({
    queryKey: ['entity-activities', entityType, entityId],
    queryFn: async (): Promise<Activity[]> => {
      if (!activeOrg?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('activities')
        .select(
          `
          *,
          user:profiles!activities_user_id_fkey(id, username, email, full_name)
        `
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('organization_id', activeOrg.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching entity activities:', error);
        return [];
      }

      return (data as any[]).map((activity) => ({
        ...activity,
        username: activity.user?.username,
        user_full_name: activity.user?.full_name,
        user_email: activity.user?.email,
      })) as Activity[];
    },
    enabled: !!activeOrg?.id && !!entityId,
  });
}
