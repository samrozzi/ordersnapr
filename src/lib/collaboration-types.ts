/**
 * Team Collaboration & Username System Types
 * Types for @mentions, comments, and user collaboration features
 */

// ============================================================================
// User Profile with Username
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string | null;
  created_at: string;
}

export interface MentionableUser {
  id: string;
  username: string | null;
  email: string;
  full_name: string;
  display_text: string; // @username or email
}

// ============================================================================
// Username Management
// ============================================================================

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UsernameAvailabilityResult {
  available: boolean;
  suggestions?: string[];
}

export interface SetUsernameResult {
  success: boolean;
  username?: string;
  error?: string;
}

// ============================================================================
// Mentions
// ============================================================================

export type MentionEntityType =
  | 'work_order'
  | 'comment'
  | 'note'
  | 'invoice'
  | 'form_submission';

export interface Mention {
  id: string;
  mentioned_user_id: string;
  mentioning_user_id: string;
  entity_type: MentionEntityType;
  entity_id: string;
  created_at: string;
  read_at: string | null;

  // Joined data
  mentioned_user?: UserProfile;
  mentioning_user?: UserProfile;
}

// ============================================================================
// Comments
// ============================================================================

export type CommentEntityType =
  | 'work_order'
  | 'note'
  | 'invoice'
  | 'customer'
  | 'property'
  | 'form_submission';

export interface Comment {
  id: string;
  user_id: string;
  organization_id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  // Joined data
  user?: UserProfile;
  replies?: Comment[];
  mention_count?: number;
}

export interface CreateCommentInput {
  entity_type: CommentEntityType;
  entity_id: string;
  content: string;
  parent_comment_id?: string;
}

export interface UpdateCommentInput {
  id: string;
  content: string;
}

// ============================================================================
// Share to User
// ============================================================================

export interface ShareableEntity {
  type: CommentEntityType;
  id: string;
  title: string;
  url: string;
}

export interface ShareToUserInput {
  entity: ShareableEntity;
  recipient_ids: string[];
  message?: string;
}

// ============================================================================
// Activity Feed
// ============================================================================

export type ActivityType =
  | 'mention'
  | 'comment'
  | 'share'
  | 'assignment'
  | 'status_change';

export interface Activity {
  id: string;
  type: ActivityType;
  user_id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  created_at: string;
  read_at: string | null;

  // Joined data
  user?: UserProfile;
}
