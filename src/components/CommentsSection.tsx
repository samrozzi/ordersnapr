/**
 * Comments Section Component
 * Display and manage comments with @mention support
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, MoreVertical, Edit, Trash2, Reply } from 'lucide-react';
import { MentionTextarea } from '@/components/MentionTextarea';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '@/hooks/use-mentions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { CommentEntityType, Comment } from '@/lib/collaboration-types';

interface CommentsSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  title?: string;
  description?: string;
}

export function CommentsSection({
  entityType,
  entityId,
  title = 'Comments',
  description = 'Discuss and collaborate with your team',
}: CommentsSectionProps) {
  const { toast } = useToast();
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments = [], isLoading } = useComments(entityType, entityId);
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const handleCreateComment = async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        content: newComment.trim(),
      });

      setNewComment('');
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) return;

    try {
      await createComment.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        content: replyContent.trim(),
        parent_comment_id: parentId,
      });

      setReplyContent('');
      setReplyingTo(null);
      toast({
        title: 'Reply posted',
        description: 'Your reply has been added',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post reply',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await updateComment.mutateAsync({
        id: commentId,
        content: editContent.trim(),
      });

      setEditingComment(null);
      setEditContent('');
      toast({
        title: 'Comment updated',
        description: 'Your changes have been saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
      toast({
        title: 'Comment deleted',
        description: 'The comment has been removed',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingComment(null);
    setEditContent('');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {!isLoading && (
            <Badge variant="secondary">{comments.length} comment{comments.length !== 1 ? 's' : ''}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* New Comment */}
        <div className="space-y-3">
          <MentionTextarea
            value={newComment}
            onChange={setNewComment}
            placeholder="Add a comment... Use @ to mention teammates"
            onSubmit={handleCreateComment}
            disabled={createComment.isPending}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleCreateComment}
              disabled={!newComment.trim() || createComment.isPending}
            >
              Post Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isEditing={editingComment === comment.id}
                editContent={editContent}
                onEditContentChange={setEditContent}
                onStartEdit={() => startEdit(comment)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => handleUpdateComment(comment.id)}
                onDelete={() => handleDeleteComment(comment.id)}
                onReply={() => setReplyingTo(comment.id)}
                isReplying={replyingTo === comment.id}
                replyContent={replyContent}
                onReplyContentChange={setReplyContent}
                onCancelReply={() => setReplyingTo(null)}
                onSaveReply={() => handleReply(comment.id)}
                isUpdating={updateComment.isPending}
                isDeleting={deleteComment.isPending}
                isCreatingReply={createComment.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Comment Item Component
// ============================================================================

interface CommentItemProps {
  comment: Comment;
  isEditing: boolean;
  editContent: string;
  onEditContentChange: (content: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  isReplying: boolean;
  replyContent: string;
  onReplyContentChange: (content: string) => void;
  onCancelReply: () => void;
  onSaveReply: () => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isCreatingReply: boolean;
}

function CommentItem({
  comment,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
  isReplying,
  replyContent,
  onReplyContentChange,
  onCancelReply,
  onSaveReply,
  isUpdating,
  isDeleting,
  isCreatingReply,
}: CommentItemProps) {
  const user = comment.user;
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div className="space-y-3">
      {/* Main Comment */}
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{user?.full_name || 'Unknown'}</span>
                {user?.username && (
                  <span className="text-xs text-muted-foreground">@{user.username}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onStartEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <MentionTextarea
                value={editContent}
                onChange={onEditContentChange}
                minRows={2}
                disabled={isUpdating}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={onSaveEdit} disabled={isUpdating}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                {renderContentWithMentions(comment.content)}
              </div>
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={onReply}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reply Input */}
      {isReplying && (
        <div className="ml-12 space-y-2">
          <MentionTextarea
            value={replyContent}
            onChange={onReplyContentChange}
            placeholder="Write a reply..."
            minRows={2}
            disabled={isCreatingReply}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveReply} disabled={isCreatingReply}>
              Reply
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelReply}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 space-y-3 border-l-2 pl-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isEditing={false}
              editContent=""
              onEditContentChange={() => {}}
              onStartEdit={() => {}}
              onCancelEdit={() => {}}
              onSaveEdit={() => {}}
              onDelete={() => {}}
              onReply={() => {}}
              isReplying={false}
              replyContent=""
              onReplyContentChange={() => {}}
              onCancelReply={() => {}}
              onSaveReply={() => {}}
              isUpdating={false}
              isDeleting={false}
              isCreatingReply={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function renderContentWithMentions(content: string) {
  // Highlight @mentions in the content
  const parts = content.split(/(@[a-zA-Z0-9_-]+)/g);

  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
