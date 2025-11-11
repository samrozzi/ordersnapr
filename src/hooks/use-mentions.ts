/**
 * Mentions & Comments Hooks
 * Handle @mentions, user search, and commenting functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveOrg } from '@/hooks/use-active-org';
import type {
  MentionableUser,
  Mention,
  Comment,
  CreateCommentInput,
  UpdateCommentInput,
  CommentEntityType,
} from '@/lib/collaboration-types';

// ============================================================================
// Search Users for Mentions
// ============================================================================

/**
 * Hook to search users for @mention autocomplete
 */
export function useUserSearch(searchQuery: string, enabled: boolean = true) {
  const { activeOrg } = useActiveOrg();

  return useQuery({
    queryKey: ['user-search', searchQuery, activeOrg?.id],
    queryFn: async (): Promise<MentionableUser[]> => {
      if (!searchQuery || searchQuery.length < 1) {
        return [];
      }

      const { data, error } = await supabase.rpc('search_users_for_mention', {
        search_query: searchQuery,
        org_filter: activeOrg?.id || null,
      });

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return (data as MentionableUser[]) || [];
    },
    enabled: enabled && searchQuery.length >= 1,
    staleTime: 30000, // Cache for 30 seconds
  });
}

// ============================================================================
// Get User Mentions
// ============================================================================

/**
 * Hook to get mentions for current user
 */
export function useUserMentions() {
  return useQuery({
    queryKey: ['user-mentions'],
    queryFn: async (): Promise<Mention[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('mentions')
        .select(
          `
          *,
          mentioning_user:profiles!mentions_mentioning_user_id_fkey(id, username, email, full_name)
        `
        )
        .eq('mentioned_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching mentions:', error);
        return [];
      }

      return (data as any[]) || [];
    },
  });
}

/**
 * Hook to get unread mention count
 */
export function useUnreadMentionCount() {
  return useQuery({
    queryKey: ['unread-mentions-count'],
    queryFn: async (): Promise<number> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return 0;
      }

      const { count, error } = await supabase
        .from('mentions')
        .select('*', { count: 'exact', head: true })
        .eq('mentioned_user_id', user.id)
        .is('read_at', null);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Mark mention as read
 */
export function useMarkMentionRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mentionId: string) => {
      const { error } = await supabase
        .from('mentions')
        .update({ read_at: new Date().toISOString() })
        .eq('id', mentionId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['unread-mentions-count'] });
    },
  });
}

// ============================================================================
// Comments
// ============================================================================

/**
 * Hook to get comments for an entity
 */
export function useComments(entityType: CommentEntityType, entityId: string) {
  return useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey(id, username, email, full_name)
        `
        )
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        return [];
      }

      // Organize into threaded structure
      const comments = (data as any[]) || [];
      const topLevel = comments.filter((c) => !c.parent_comment_id);
      const replies = comments.filter((c) => c.parent_comment_id);

      // Attach replies to parent comments
      topLevel.forEach((comment) => {
        comment.replies = replies.filter((r) => r.parent_comment_id === comment.id);
      });

      return topLevel;
    },
  });
}

/**
 * Create a new comment
 */
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { activeOrg } = useActiveOrg();

  return useMutation({
    mutationFn: async (input: CreateCommentInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!activeOrg) {
        throw new Error('No active organization');
      }

      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          organization_id: activeOrg.id,
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          content: input.content,
          parent_comment_id: input.parent_comment_id || null,
        })
        .select(
          `
          *,
          user:profiles!comments_user_id_fkey(id, username, email, full_name)
        `
        )
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.entity_type, variables.entity_id],
      });
    },
  });
}

/**
 * Update a comment
 */
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateCommentInput) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ content: input.content })
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', data.entity_type, data.entity_id],
      });
    },
  });
}

/**
 * Delete a comment (soft delete)
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const { data, error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', data.entity_type, data.entity_id],
      });
    },
  });
}
